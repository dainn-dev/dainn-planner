using DailyPlanner.Application.DTOs;
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

    public ContactController(IContactService contactService, IGoogleRecaptchaService recaptchaService)
    {
        _contactService = contactService;
        _recaptchaService = recaptchaService;
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
}
