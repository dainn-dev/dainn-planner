using System.Net.Http.Headers;
using System.Text.Json;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.DTOs.Auth;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Constants;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Json.Nodes;
using DailyPlanner.Api.OAuth;
using Microsoft.Extensions.Logging;
using System.Text;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string GoogleStateCachePrefix = "google_oauth_state:";
    private static readonly TimeSpan GoogleStateExpiration = TimeSpan.FromMinutes(10);

    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GoogleCalendarOptions _googleOptions;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;
    private readonly IGoogleRecaptchaService _recaptchaService;

    public AuthController(
        IAuthService authService,
        ApplicationDbContext context,
        IMemoryCache cache,
        IHttpClientFactory httpClientFactory,
        IOptions<GoogleCalendarOptions> googleOptions,
        IConfiguration configuration,
        ILogger<AuthController> logger,
        IGoogleRecaptchaService recaptchaService)
    {
        _authService = authService;
        _context = context;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _googleOptions = googleOptions.Value;
        _configuration = configuration;
        _logger = logger;
        _recaptchaService = recaptchaService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var captcha = await RequireRecaptchaWhenConfiguredAsync(request.RecaptchaToken, cancellationToken);
        if (captcha != null) return captcha;

        var result = await _authService.RegisterAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var captcha = await RequireRecaptchaWhenConfiguredAsync(request.RecaptchaToken, cancellationToken);
        if (captcha != null) return captcha;

        var result = await _authService.LoginAsync(request);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("verify-2fa")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Verify2FA([FromBody] Verify2FALoginRequest request)
    {
        var result = await _authService.Verify2FAAndLoginAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("refresh-token")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        return result.Success ? Ok(result) : Unauthorized(result);
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var captcha = await RequireRecaptchaWhenConfiguredAsync(request.RecaptchaToken, cancellationToken);
        if (captcha != null) return captcha;

        var result = await _authService.ForgotPasswordAsync(request);
        return Ok(result);
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var captcha = await RequireRecaptchaWhenConfiguredAsync(request.RecaptchaToken, cancellationToken);
        if (captcha != null) return captcha;

        var result = await _authService.ResetPasswordAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("confirm-email")]
    public async Task<ActionResult<ApiResponse<object>>> ConfirmEmail([FromQuery] string email, [FromQuery] string token)
    {
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(token))
            return BadRequest(new ApiResponse<object> { Success = false, Message = "Email and token are required" });

        var result = await _authService.ConfirmEmailAsync(email, token);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("resend-confirmation")]
    public async Task<ActionResult<ApiResponse<object>>> ResendConfirmation([FromBody] ForgotPasswordRequest request)
    {
        var result = await _authService.ResendConfirmationEmailAsync(request.Email);
        return Ok(result);
    }

    [HttpPost("social-login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> SocialLogin([FromBody] SocialLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Provider) || string.IsNullOrWhiteSpace(request.AccessToken))
            return BadRequest(new ApiResponse<AuthResponse> { Success = false, Message = "Provider and AccessToken are required." });
        var result = await _authService.SocialLoginAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Starts Google OAuth for sign-in only (identity scopes; no Calendar API). Callback is GET google/callback.
    /// </summary>
    [HttpGet("google/authorize")]
    [AllowAnonymous]
    public IActionResult GoogleAuthorize()
    {
        var state = Guid.NewGuid().ToString("N");
        _cache.Set(GoogleStateCachePrefix + state, "login", GoogleStateExpiration);
        var redirectUri = GoogleOAuthRedirectUriHelper.Resolve(Request, _googleOptions);
        var url = GoogleOAuthAuthorizationUrl.Build(
            _googleOptions.ClientId,
            redirectUri,
            GoogleOAuthScopes.Login,
            state,
            forCalendarIntegration: false);
        return Redirect(url);
    }

    /// <summary>
    /// Google OAuth callback. Login flow (state=login): JWT only, no stored Google tokens. Calendar flow (state=userId): save tokens and set connected.
    /// </summary>
    [HttpGet("google/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? state, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(code) || string.IsNullOrEmpty(state))
            return BadRequest("Missing code or state.");

        if (!_cache.TryGetValue(GoogleStateCachePrefix + state, out string? stateValue) || string.IsNullOrEmpty(stateValue))
            return BadRequest("Invalid or expired state.");

        _cache.Remove(GoogleStateCachePrefix + state);

        var (tokenResponse, exchangeError) = await ExchangeGoogleCodeAsync(code, ct);
        if (tokenResponse == null)
        {
            var redirectUsed = GoogleOAuthRedirectUriHelper.Resolve(Request, _googleOptions);
            var body = BuildGoogleTokenExchangeUserMessage(exchangeError, redirectUsed);
            return new ContentResult
            {
                StatusCode = StatusCodes.Status500InternalServerError,
                Content = body,
                ContentType = "text/plain; charset=utf-8",
            };
        }

        var frontendBaseUrl = GetFrontendBaseUrl();

        if (stateValue == "login")
        {
            var loginResult = await _authService.SocialLoginAsync(new SocialLoginRequest { Provider = "Google", AccessToken = tokenResponse.AccessToken });
            if (!loginResult.Success || loginResult.Data?.User == null)
                return BadRequest(loginResult.Message ?? "Login failed.");
            var tokenForFrontend = loginResult.Data.Token;
            return Redirect(frontendBaseUrl.TrimEnd('/') + "/login?token=" + Uri.EscapeDataString(tokenForFrontend));
        }

        var userId = stateValue;
        await SaveGoogleCalendarTokensAsync(userId, tokenResponse, ct);
        await SetGoogleCalendarConnectedAsync(userId, true, ct);

        return Redirect(frontendBaseUrl.TrimEnd('/') + "/settings/goals?google=connected");
    }

    [HttpPost("logout")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<ActionResult<ApiResponse<object>>> Logout()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _authService.LogoutAsync(userId);
        return Ok(result);
    }

    private async Task<(GoogleTokenResponse? Response, string? GoogleError)> ExchangeGoogleCodeAsync(string code, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_googleOptions.ClientId) || string.IsNullOrWhiteSpace(_googleOptions.ClientSecret))
        {
            _logger.LogWarning("Google OAuth token exchange skipped: ClientId or ClientSecret is empty in configuration.");
            return (null, "configuration: ClientId or ClientSecret is missing. Set Authentication:Google in appsettings, user secrets, or environment variables.");
        }

        var redirectUri = GoogleOAuthRedirectUriHelper.Resolve(Request, _googleOptions);
        using var http = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _googleOptions.ClientId,
            ["client_secret"] = _googleOptions.ClientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        });
        var response = await http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            var googleErr = TryFormatGoogleTokenError(json);
            _logger.LogWarning(
                "Google token exchange failed ({StatusCode}). redirect_uri used: {RedirectUri}. Response: {Body}",
                (int)response.StatusCode,
                redirectUri,
                json.Length > 500 ? json[..500] + "…" : json);
            return (null, googleErr);
        }

        var tokenResponse = JsonSerializer.Deserialize<GoogleTokenResponse>(json);
        if (tokenResponse == null || string.IsNullOrWhiteSpace(tokenResponse.AccessToken))
        {
            _logger.LogWarning(
                "Google token response missing access_token. redirect_uri: {RedirectUri}. Body: {Body}",
                redirectUri,
                json.Length > 400 ? json[..400] + "…" : json);
            return (null, "Token response from Google was empty or invalid.");
        }

        return (tokenResponse, null);
    }

    private static string? TryFormatGoogleTokenError(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("error", out var errEl))
                return null;
            var code = errEl.GetString();
            root.TryGetProperty("error_description", out var descEl);
            var desc = descEl.ValueKind == JsonValueKind.String ? descEl.GetString() : null;
            if (string.IsNullOrEmpty(code))
                return null;
            return string.IsNullOrEmpty(desc) ? code : $"{code}: {desc}";
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// <see href="https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse">Google token errors</see>:
    /// <c>invalid_client</c> = bad/missing client secret or wrong credential type; <c>invalid_grant</c> often = redirect_uri_mismatch or reused code.
    /// </summary>
    private static string BuildGoogleTokenExchangeUserMessage(string? googleErr, string redirectUsed)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Failed to exchange code for tokens.");
        if (!string.IsNullOrEmpty(googleErr))
            sb.AppendLine($"Google: {googleErr}");

        var errLower = googleErr?.ToLowerInvariant() ?? string.Empty;
        if (errLower.Contains("invalid_client"))
        {
            sb.AppendLine();
            sb.AppendLine("invalid_client usually means Client ID / Client Secret are wrong, missing, or not from the same \"Web application\" OAuth client.");
            sb.AppendLine("Fix: Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID → copy Client ID and Client secret, set Authentication:Google (or env Authentication__Google__ClientId / ClientSecret), restart the API. Regenerate the secret if unsure.");
        }
        else if (errLower.Contains("redirect_uri_mismatch"))
        {
            sb.AppendLine();
            sb.AppendLine($"Add this exact Authorized redirect URI for that same OAuth client: {redirectUsed}");
        }
        else
        {
            sb.AppendLine();
            sb.AppendLine($"redirect_uri used: {redirectUsed}");
            sb.AppendLine("(If Google says redirect_uri_mismatch, add that URI in the OAuth client.)");
        }

        sb.AppendLine();
        sb.AppendLine("Do not refresh this callback URL — the authorization code is single-use.");
        return sb.ToString();
    }

    private async Task SaveGoogleCalendarTokensAsync(string userId, GoogleTokenResponse tokenResponse, CancellationToken ct)
    {
        var expiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
        var integration = await _context.UserGoogleIntegrations.FindAsync(new object[] { userId }, ct);
        if (integration == null)
        {
            integration = new UserGoogleIntegration
            {
                UserId = userId,
                AccessToken = tokenResponse.AccessToken,
                RefreshToken = tokenResponse.RefreshToken ?? string.Empty,
                ExpiresAtUtc = expiresAt,
                UpdatedAtUtc = DateTime.UtcNow
            };
            _context.UserGoogleIntegrations.Add(integration);
        }
        else
        {
            integration.AccessToken = tokenResponse.AccessToken;
            integration.RefreshToken = tokenResponse.RefreshToken ?? integration.RefreshToken;
            integration.ExpiresAtUtc = expiresAt;
            integration.UpdatedAtUtc = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(ct);
    }

    private async Task SetGoogleCalendarConnectedAsync(string userId, bool connected, CancellationToken ct)
    {
        var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (settings == null)
        {
            settings = new UserSettings { UserId = userId, Data = DefaultUserSettings.Json, UpdatedAt = DateTime.UtcNow };
            _context.UserSettings.Add(settings);
            await _context.SaveChangesAsync(ct);
        }
        var node = JsonNode.Parse(settings.Data) as JsonObject;
        if (node != null && node["plans"] is JsonObject plans)
        {
            plans["googleCalendarConnected"] = connected;
            settings.Data = node.ToJsonString();
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }
    }

    private string GetFrontendBaseUrl()
    {
        var origins = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        return origins?.FirstOrDefault() ?? "http://localhost:3005";
    }

    /// <summary>When <c>Recaptcha:SecretKey</c> is set, requires a valid v2 token; otherwise skips.</summary>
    private async Task<ActionResult?> RequireRecaptchaWhenConfiguredAsync(string? recaptchaToken, CancellationToken cancellationToken)
    {
        var secret = _configuration["Recaptcha:SecretKey"];
        if (string.IsNullOrEmpty(secret))
            return null;

        if (string.IsNullOrWhiteSpace(recaptchaToken))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "CAPTCHA is required.",
                Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "Please complete the CAPTCHA." } } }
            });
        }

        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        if (!await _recaptchaService.VerifyAsync(recaptchaToken, remoteIp, cancellationToken))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "CAPTCHA verification failed. Please try again.",
                Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "CAPTCHA verification failed." } } }
            });
        }

        return null;
    }

    private sealed class GoogleTokenResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string AccessToken { get; set; } = string.Empty;
        [System.Text.Json.Serialization.JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }
}

