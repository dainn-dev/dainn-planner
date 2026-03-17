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

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string GoogleStateCachePrefix = "google_oauth_state:";
    private static readonly TimeSpan GoogleStateExpiration = TimeSpan.FromMinutes(10);
    private static readonly string[] GoogleScopes = { "openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events.readonly" };

    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GoogleCalendarOptions _googleOptions;
    private readonly IConfiguration _configuration;

    public AuthController(
        IAuthService authService,
        ApplicationDbContext context,
        IMemoryCache cache,
        IHttpClientFactory httpClientFactory,
        IOptions<GoogleCalendarOptions> googleOptions,
        IConfiguration configuration)
    {
        _authService = authService;
        _context = context;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
        _googleOptions = googleOptions.Value;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("login")]
    public async Task<ActionResult<ApiResponse<AuthResponse>>> Login([FromBody] LoginRequest request)
    {
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
    public async Task<ActionResult<ApiResponse<object>>> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        var result = await _authService.ForgotPasswordAsync(request);
        return Ok(result);
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetPassword([FromBody] ResetPasswordRequest request)
    {
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
    /// Starts Google OAuth for login (with calendar sync). Redirects to Google; callback is GET google/callback.
    /// </summary>
    [HttpGet("google/authorize")]
    [AllowAnonymous]
    public IActionResult GoogleAuthorize()
    {
        var state = Guid.NewGuid().ToString("N");
        _cache.Set(GoogleStateCachePrefix + state, "login", GoogleStateExpiration);
        var redirectUri = Uri.EscapeDataString(_googleOptions.RedirectUri);
        var scope = Uri.EscapeDataString(string.Join(" ", GoogleScopes));
        var clientId = Uri.EscapeDataString(_googleOptions.ClientId);
        var url = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&scope={scope}&state={state}&access_type=offline&prompt=consent";
        return Redirect(url);
    }

    /// <summary>
    /// Google OAuth callback. Handles both login (state=login) and calendar-only (state=userId). Single redirect URI for both flows.
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

        var tokenResponse = await ExchangeGoogleCodeAsync(code, ct);
        if (tokenResponse == null)
            return StatusCode(500, "Failed to exchange code for tokens.");

        string userId;
        string? tokenForFrontend = null;

        if (stateValue == "login")
        {
            var loginResult = await _authService.SocialLoginAsync(new SocialLoginRequest { Provider = "Google", AccessToken = tokenResponse.AccessToken });
            if (!loginResult.Success || loginResult.Data?.User == null)
                return BadRequest(loginResult.Message ?? "Login failed.");
            userId = loginResult.Data.User.Id;
            tokenForFrontend = loginResult.Data.Token;
        }
        else
        {
            userId = stateValue;
        }

        await SaveGoogleCalendarTokensAsync(userId, tokenResponse, ct);
        await SetGoogleCalendarConnectedAsync(userId, true, ct);

        var frontendBaseUrl = GetFrontendBaseUrl();
        if (tokenForFrontend != null)
            return Redirect(frontendBaseUrl.TrimEnd('/') + "/login?token=" + Uri.EscapeDataString(tokenForFrontend));
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

    private async Task<GoogleTokenResponse?> ExchangeGoogleCodeAsync(string code, CancellationToken ct)
    {
        using var http = _httpClientFactory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = _googleOptions.ClientId,
            ["client_secret"] = _googleOptions.ClientSecret,
            ["redirect_uri"] = _googleOptions.RedirectUri,
            ["grant_type"] = "authorization_code"
        });
        var response = await http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode) return null;
        return JsonSerializer.Deserialize<GoogleTokenResponse>(json);
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

