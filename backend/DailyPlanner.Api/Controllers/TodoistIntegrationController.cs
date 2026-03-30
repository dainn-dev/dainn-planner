using System.Security.Claims;
using System.Text.Json.Nodes;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Constants;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Api.OAuth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/integrations/todoist")]
public class TodoistIntegrationController : ControllerBase
{
    private const string StateCacheKeyPrefix = "todoist_oauth_state:";
    private static readonly TimeSpan StateExpiration = TimeSpan.FromMinutes(10);

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly TodoistOptions _options;
    private readonly ITodoistIntegrationService _todoistIntegrationService;

    public TodoistIntegrationController(
        ApplicationDbContext context,
        IMemoryCache cache,
        IOptions<TodoistOptions> options,
        ITodoistIntegrationService todoistIntegrationService)
    {
        _context = context;
        _cache = cache;
        _options = options.Value;
        _todoistIntegrationService = todoistIntegrationService;
    }

    /// <summary>Returns Todoist OAuth URL; SPA redirects with <c>window.location</c>.</summary>
    [HttpGet("authorize-url")]
    [Authorize]
    public ActionResult<AuthorizeUrlResponse> GetAuthorizeUrl()
    {
        var url = BuildTodoistAuthorizeUrl(out var error);
        if (error != null)
            return Unauthorized();
        if (string.IsNullOrEmpty(url))
            return StatusCode(500, new { error = "authorize_url_unavailable" });
        return Ok(new AuthorizeUrlResponse { Url = url });
    }

    [HttpPost("disconnect")]
    [Authorize]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var integration = await _context.UserTodoistIntegrations.FindAsync(new object[] { userId }, ct);
        if (integration != null)
        {
            _context.UserTodoistIntegrations.Remove(integration);
            await _context.SaveChangesAsync(ct);
        }

        await SetTodoistConnectedAsync(userId, false, ct);
        return Ok();
    }

    /// <summary>Active Todoist tasks (not stored in DailyPlanner DB).</summary>
    [HttpGet("tasks")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<List<TodoistTaskViewDto>>>> GetTasks(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _todoistIntegrationService.GetActiveTasksAsync(userId, ct);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpPost("tasks/{todoistTaskId}/close")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<object?>>> CloseTask([FromRoute] string todoistTaskId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _todoistIntegrationService.CloseTaskAsync(userId, todoistTaskId, ct);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    private string? BuildTodoistAuthorizeUrl(out string? error)
    {
        error = null;
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        if (string.IsNullOrEmpty(userId))
        {
            error = "unauthorized";
            return null;
        }

        if (string.IsNullOrWhiteSpace(_options.ClientId))
        {
            error = "not_configured";
            return null;
        }

        var state = Guid.NewGuid().ToString("N");
        var scope = string.IsNullOrWhiteSpace(_options.Scopes) ? "data:read_write" : _options.Scopes.Trim();
        _cache.Set(
            StateCacheKeyPrefix + state,
            new TodoistOAuthStatePayload { UserId = userId!, RequestedScopes = scope },
            StateExpiration);

        var redirectUri = TodoistOAuthRedirectUriHelper.Resolve(Request, _options);
        return TodoistOAuthRedirectUriHelper.BuildAuthorizeUrl(_options.ClientId, redirectUri, scope, state);
    }

    private async Task SetTodoistConnectedAsync(string userId, bool connected, CancellationToken ct)
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
            plans["todoistConnected"] = connected;
            settings.Data = node.ToJsonString();
            settings.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }
    }

    public sealed class AuthorizeUrlResponse
    {
        public string Url { get; set; } = string.Empty;
    }
}
