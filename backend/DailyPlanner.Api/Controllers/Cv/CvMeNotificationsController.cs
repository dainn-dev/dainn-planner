using System.Security.Claims;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyPlanner.Api.Controllers.Cv;

[ApiController]
[Authorize]
[Route("api/v1/cv/me/notifications")]
[Tags("CV — owner")]
public class CvMeNotificationsController : ControllerBase
{
    private readonly ICvService _cv;

    public CvMeNotificationsController(ICvService cv) => _cv = cv;

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Missing user id claim.");

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? unread,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken ct)
    {
        var unreadOnly = unread == "1";
        var lim = Math.Clamp(limit ?? 30, 1, 100);
        var off = Math.Max(offset ?? 0, 0);
        var r = await _cv.ListNotificationsAsync(UserId, unreadOnly, lim, off, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkRead([FromRoute] Guid id, CancellationToken ct)
    {
        var r = await _cv.MarkNotificationReadAsync(UserId, id, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken ct)
    {
        var r = await _cv.MarkAllNotificationsReadAsync(UserId, ct);
        return StatusCode(r.StatusCode, r.Body);
    }
}
