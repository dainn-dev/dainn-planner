using System.Security.Claims;
using System.Text.Json;
using DailyPlanner.Application.DTOs.Cv;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DailyPlanner.Api.Controllers.Cv;

[ApiController]
[Authorize]
[Route("api/v1/cv/me/site")]
[Tags("CV — owner")]
public class CvMeSiteController : ControllerBase
{
    private readonly ICvService _cv;

    public CvMeSiteController(ICvService cv) => _cv = cv;

    private string UserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new InvalidOperationException("Missing user id claim.");

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var r = await _cv.GetMySiteAsync(UserId, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    public sealed class SiteRequestBody
    {
        public string Slug { get; set; } = "anhnh";
    }

    [HttpPost("request")]
    public async Task<IActionResult> RequestSite([FromBody] SiteRequestBody body, CancellationToken ct)
    {
        if (body == null || string.IsNullOrWhiteSpace(body.Slug))
            return BadRequest(new { error = "Invalid body" });
        var r = await _cv.RequestSiteAsync(UserId, body.Slug, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPut("content")]
    public async Task<IActionResult> PutContent([FromBody] JsonElement body, CancellationToken ct)
    {
        var r = await _cv.PutContentAsync(UserId, body, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPost("upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file uploaded" });
        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "File too large (max 5 MB)" });
        using var stream = file.OpenReadStream();
        var r = await _cv.UploadCvImageAsync(UserId, stream, file.FileName, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpPatch("theme")]
    public async Task<IActionResult> PatchTheme([FromBody] CvThemePatchRequest body, CancellationToken ct)
    {
        if (body == null)
            return BadRequest(new { error = "Invalid body" });
        var r = await _cv.PatchThemeAsync(UserId, body, ct);
        return StatusCode(r.StatusCode, r.Body);
    }
}
