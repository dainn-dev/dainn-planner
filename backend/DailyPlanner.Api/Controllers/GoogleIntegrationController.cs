using System.Security.Claims;
using System.Text.Json.Nodes;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Constants;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using DailyPlanner.Api.OAuth;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/integrations/google")]
public class GoogleIntegrationController : ControllerBase
{
    private const string StateCacheKeyPrefix = "google_oauth_state:";
    private static readonly TimeSpan StateExpiration = TimeSpan.FromMinutes(10);

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly GoogleCalendarOptions _options;
    private readonly IGoogleCalendarService _googleCalendarService;

    public GoogleIntegrationController(
        ApplicationDbContext context,
        IMemoryCache cache,
        IOptions<DailyPlanner.Application.Options.GoogleCalendarOptions> options,
        IGoogleCalendarService googleCalendarService)
    {
        _context = context;
        _cache = cache;
        _options = options.Value;
        _googleCalendarService = googleCalendarService;
    }

    /// <summary>
    /// Returns the Google OAuth URL for Calendar (identity + <c>calendar.events</c>, offline refresh token). SPAs call with Bearer, then <c>window.location</c> to the URL.
    /// </summary>
    [HttpGet("authorize-url")]
    [Authorize]
    public ActionResult<AuthorizeUrlResponse> GetAuthorizeUrl()
    {
        var url = BuildGoogleAuthorizeUrl(out var error);
        if (error != null)
            return Unauthorized();
        if (string.IsNullOrEmpty(url))
            return StatusCode(500, new { error = "authorize_url_unavailable" });
        return Ok(new AuthorizeUrlResponse { Url = url });
    }

    /// <summary>
    /// Starts OAuth flow (server-side or clients that attach cookies). Redirects to Google; callback is GET api/auth/google/callback.
    /// </summary>
    [HttpGet("authorize")]
    [Authorize]
    public IActionResult Authorize()
    {
        var url = BuildGoogleAuthorizeUrl(out var error);
        if (error != null)
            return Unauthorized();
        if (string.IsNullOrEmpty(url))
            return StatusCode(500, "Authorize URL could not be built.");
        return Redirect(url);
    }

    private string? BuildGoogleAuthorizeUrl(out string? error)
    {
        error = null;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
        {
            error = "unauthorized";
            return null;
        }

        var state = Guid.NewGuid().ToString("N");
        _cache.Set(StateCacheKeyPrefix + state, userId, StateExpiration);

        var redirectUri = GoogleOAuthRedirectUriHelper.Resolve(Request, _options);
        return GoogleOAuthAuthorizationUrl.Build(
            _options.ClientId,
            redirectUri,
            GoogleOAuthScopes.CalendarIntegration,
            state,
            forCalendarIntegration: true);
    }

    public sealed class AuthorizeUrlResponse
    {
        public string Url { get; set; } = string.Empty;
    }

    /// <summary>
    /// Primary calendar id for the Google account linked in Settings (use as embed <c>src</c>).
    /// Matches the account that receives API-created events; null if not connected.
    /// </summary>
    [HttpGet("calendar-embed-src")]
    [Authorize]
    public async Task<ActionResult<object>> GetCalendarEmbedSrc(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var src = await _googleCalendarService.GetGoogleCalendarEmbedSrcAsync(userId, ct);
        return Ok(new { src });
    }

    /// <summary>
    /// Disconnects Google Calendar: removes stored tokens and sets googleCalendarConnected to false.
    /// </summary>
    [HttpPost("disconnect")]
    [Authorize]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var integration = await _context.UserGoogleIntegrations.FindAsync(new object[] { userId }, ct);
        if (integration != null)
        {
            _context.UserGoogleIntegrations.Remove(integration);
            await _context.SaveChangesAsync(ct);
        }

        await SetGoogleCalendarConnectedAsync(userId, false, ct);
        return Ok();
    }

    private async Task SetGoogleCalendarConnectedAsync(string userId, bool connected, CancellationToken ct)
    {
        var settings = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (settings == null)
        {
            settings = new UserSettings
            {
                UserId = userId,
                Data = DefaultUserSettings.Json,
                UpdatedAt = DateTime.UtcNow
            };
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
}
