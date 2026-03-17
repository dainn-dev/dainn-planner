using System.Security.Claims;
using System.Text.Json.Nodes;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Constants;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/integrations/google")]
public class GoogleIntegrationController : ControllerBase
{
    private const string StateCacheKeyPrefix = "google_oauth_state:";
    private static readonly TimeSpan StateExpiration = TimeSpan.FromMinutes(10);
    private static readonly string[] Scopes = { "openid", "email", "profile", "https://www.googleapis.com/auth/calendar.events.readonly" };

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly GoogleCalendarOptions _options;

    public GoogleIntegrationController(
        ApplicationDbContext context,
        IMemoryCache cache,
        IOptions<DailyPlanner.Application.Options.GoogleCalendarOptions> options)
    {
        _context = context;
        _cache = cache;
        _options = options.Value;
    }

    /// <summary>
    /// Starts OAuth flow for calendar-only (user already logged in). Redirects to Google; callback is GET api/auth/google/callback.
    /// </summary>
    [HttpGet("authorize")]
    [Authorize]
    public IActionResult Authorize()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var state = Guid.NewGuid().ToString("N");
        _cache.Set(StateCacheKeyPrefix + state, userId, StateExpiration);

        var redirectUri = Uri.EscapeDataString(_options.RedirectUri);
        var scope = Uri.EscapeDataString(string.Join(" ", Scopes));
        var clientId = Uri.EscapeDataString(_options.ClientId);
        var url = $"https://accounts.google.com/o/oauth2/v2/auth?client_id={clientId}&redirect_uri={redirectUri}&response_type=code&scope={scope}&state={state}&access_type=offline&prompt=consent";
        return Redirect(url);
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
