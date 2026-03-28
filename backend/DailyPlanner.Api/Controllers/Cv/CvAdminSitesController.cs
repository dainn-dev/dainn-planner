using System.Security.Claims;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyPlanner.Api.Controllers.Cv;

[ApiController]
[Authorize(Roles = "Admin,platform_admin")]
[Route("api/v1/cv/admin/sites")]
[Tags("CV — platform admin")]
public class CvAdminSitesController : ControllerBase
{
    private readonly ICvService _cv;

    public CvAdminSitesController(ICvService cv) => _cv = cv;

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Missing user id claim.");

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] int? limit,
        [FromQuery] int? offset,
        CancellationToken ct)
    {
        var lim = Math.Clamp(limit ?? 50, 1, 200);
        var off = Math.Max(offset ?? 0, 0);
        var r = await _cv.AdminListSitesAsync(status, q, lim, off, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve([FromRoute] Guid id, CancellationToken ct)
    {
        var r = await _cv.AdminApproveSiteAsync(UserId, id, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    public sealed class RejectBody
    {
        public string Reason { get; set; } = "";
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject([FromRoute] Guid id, [FromBody] RejectBody body, CancellationToken ct)
    {
        if (body == null)
            return BadRequest(new { error = "Invalid body" });
        var r = await _cv.AdminRejectSiteAsync(UserId, id, body.Reason, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPost("{id:guid}/suspend")]
    public async Task<IActionResult> Suspend([FromRoute] Guid id, CancellationToken ct)
    {
        var r = await _cv.AdminSuspendSiteAsync(UserId, id, ct);
        return StatusCode(r.StatusCode, r.Body);
    }
}
