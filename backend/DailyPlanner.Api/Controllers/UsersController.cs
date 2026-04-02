using System.Collections.Generic;
using System.Text.Json;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IConfiguration _configuration;
    private readonly IGoogleRecaptchaService _recaptchaService;
    private readonly ApplicationDbContext _context;

    public UsersController(IUserService userService, IConfiguration configuration, IGoogleRecaptchaService recaptchaService, ApplicationDbContext context)
    {
        _userService = userService;
        _configuration = configuration;
        _recaptchaService = recaptchaService;
        _context = context;
    }

    [HttpGet("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.GetCurrentUserAsync(userId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("me")]
    public async Task<ActionResult<ApiResponse<UserDto>>> UpdateUser([FromBody] UpdateUserRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.UpdateUserAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("me/avatar")]
    public async Task<ActionResult<ApiResponse<string>>> UploadAvatar(IFormFile file)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest(new ApiResponse<string> { Success = false, Message = "No file uploaded" });

        using var stream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, stream, file.FileName);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me/settings")]
    public async Task<ActionResult<ApiResponse<UserSettingsDto>>> GetSettings()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.GetSettingsAsync(userId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("me/settings")]
    public async Task<ActionResult<ApiResponse<UserSettingsDto>>> UpdateSettings([FromBody] JsonElement request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.UpdateSettingsAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("me/change-password")]
    public async Task<ActionResult<ApiResponse<object>>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var secret = _configuration["Recaptcha:SecretKey"];
        if (!string.IsNullOrEmpty(secret))
        {
            if (string.IsNullOrWhiteSpace(request.RecaptchaToken))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "CAPTCHA is required.",
                    Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "Please complete the CAPTCHA." } } }
                });
            }

            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            if (!await _recaptchaService.VerifyAsync(request.RecaptchaToken, remoteIp, cancellationToken))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "CAPTCHA verification failed. Please try again.",
                    Errors = new Dictionary<string, string[]> { { "recaptcha", new[] { "CAPTCHA verification failed." } } }
                });
            }
        }

        var result = await _userService.ChangePasswordAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    // 2FA Endpoints
    [HttpGet("me/2fa/setup")]
    public async Task<ActionResult<ApiResponse<Setup2FAResponse>>> Setup2FA()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.Setup2FAAsync(userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("me/2fa/enable")]
    public async Task<ActionResult<ApiResponse<object>>> Enable2FA([FromBody] Enable2FARequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.Enable2FAAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("me/2fa/disable")]
    public async Task<ActionResult<ApiResponse<object>>> Disable2FA([FromBody] Verify2FARequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.Disable2FAAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me/2fa/status")]
    public async Task<ActionResult<ApiResponse<bool>>> Get2FAStatus()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.Is2FAEnabledAsync(userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("me/2fa/recovery-codes")]
    public async Task<ActionResult<ApiResponse<string[]>>> GenerateRecoveryCodes()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.GenerateRecoveryCodesAsync(userId);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("me/devices")]
    public async Task<ActionResult<ApiResponse<List<UserDeviceDto>>>> GetMyDevices()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.GetMyDevicesAsync(userId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("me/devices/{id}")]
    public async Task<ActionResult> RevokeDevice(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _userService.RevokeDeviceAsync(userId, id);
        if (!result.Success)
            return NotFound(result);
        return NoContent();
    }

    public class SavePushSubscriptionRequest
    {
        public string? Endpoint { get; set; }
        public KeysPayload? Keys { get; set; }
        public DateTime? ExpirationTime { get; set; }
        public string? DeviceLabel { get; set; }

        public class KeysPayload
        {
            public string? P256dh { get; set; }
            public string? Auth { get; set; }
        }
    }

    [HttpPost("me/push-subscription")]
    public async Task<ActionResult> SaveMyPushSubscription([FromBody] SavePushSubscriptionRequest request, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var endpoint = (request.Endpoint ?? "").Trim();
        var p256dh = (request.Keys?.P256dh ?? "").Trim();
        var auth = (request.Keys?.Auth ?? "").Trim();
        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(p256dh) || string.IsNullOrWhiteSpace(auth))
        {
            return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid push subscription" });
        }

        var existing = await _context.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint, cancellationToken);

        if (existing == null)
        {
            _context.UserPushSubscriptions.Add(new UserPushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Endpoint = endpoint,
                P256dh = p256dh,
                Auth = auth,
                ExpirationTime = request.ExpirationTime,
                DeviceLabel = string.IsNullOrWhiteSpace(request.DeviceLabel) ? null : request.DeviceLabel.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        else
        {
            existing.P256dh = p256dh;
            existing.Auth = auth;
            existing.ExpirationTime = request.ExpirationTime;
            existing.DeviceLabel = string.IsNullOrWhiteSpace(request.DeviceLabel) ? null : request.DeviceLabel.Trim();
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}

