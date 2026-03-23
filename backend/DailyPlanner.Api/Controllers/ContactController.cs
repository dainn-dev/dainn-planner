using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.DTOs.Cv;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IContactService _contactService;
    private readonly IGoogleRecaptchaService _recaptchaService;
    private readonly ICvService _cvService;

    public ContactController(IContactService contactService, IGoogleRecaptchaService recaptchaService, ICvService cvService)
    {
        _contactService = contactService;
        _recaptchaService = recaptchaService;
        _cvService = cvService;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<object>>> Submit([FromBody] ContactRequestDto request, CancellationToken cancellationToken)
    {
        var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (string.IsNullOrWhiteSpace(request.RecaptchaToken))
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "CAPTCHA is required.",
                Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "Please complete the CAPTCHA." } } }
            });
        }

        var verified = await _recaptchaService.VerifyAsync(request.RecaptchaToken, remoteIp, cancellationToken);
        if (!verified)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "CAPTCHA verification failed. Please try again.",
                Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "CAPTCHA verification failed." } } }
            });
        }

        var userId = User.Identity?.IsAuthenticated == true
            ? User.FindFirstValue(ClaimTypes.NameIdentifier)
            : null;

        var result = await _contactService.SubmitAsync(request, userId, cancellationToken);

        if (!result.Success)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("/api/v1/cv/contact")]
    [Tags("CV — public")]
    public async Task<IActionResult> SubmitCvContact([FromBody] CvContactRequest body, CancellationToken cancellationToken)
    {
        if (body == null)
            return BadRequest(new { success = false, error = "Invalid body" });
        var r = await _cvService.SubmitContactAsync(body, cancellationToken);
        return StatusCode(r.StatusCode, r.Body);
    }
}
