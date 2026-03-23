using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace DailyPlanner.Api.Controllers.Cv;

[ApiController]
[Route("api/v1/cv")]
[Tags("CV — public")]
public class CvPublicController : ControllerBase
{
    private readonly ICvService _cv;
    private readonly CvTenantResolver _tenantResolver;

    public CvPublicController(ICvService cv, CvTenantResolver tenantResolver)
    {
        _cv = cv;
        _tenantResolver = tenantResolver;
    }

    [HttpGet("site")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetSite(CancellationToken ct)
    {
        var slug = _tenantResolver.ResolveSlug(Request);
        var r = await _cv.GetPublicSiteAsync(slug, ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpGet("themes")]
    public async Task<IActionResult> GetThemes(CancellationToken ct)
    {
        var r = await _cv.GetThemesAsync(ct);
        return StatusCode(r.StatusCode, r.Body);
    }

    [HttpGet("portfolio/{id}")]
    [ProducesResponseType(typeof(object), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetPortfolioItem([FromRoute] string id, CancellationToken ct)
    {
        var slug = _tenantResolver.ResolveSlug(Request);
        var r = await _cv.GetPortfolioItemAsync(slug, id, ct);
        return StatusCode(r.StatusCode, r.Body);
    }
}
