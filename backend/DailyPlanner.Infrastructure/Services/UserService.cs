using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Constants;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IMapper _mapper;
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IUserActivityService _userActivityService;

    public UserService(
        UserManager<ApplicationUser> userManager,
        IMapper mapper,
        ApplicationDbContext context,
        IWebHostEnvironment environment,
        IUserActivityService userActivityService)
    {
        _userManager = userManager;
        _mapper = mapper;
        _context = context;
        _environment = environment;
        _userActivityService = userActivityService;
    }

    public async Task<ApiResponse<UserDto>> GetCurrentUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<UserDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        return new ApiResponse<UserDto>
        {
            Success = true,
            Data = _mapper.Map<UserDto>(user)
        };
    }

    public async Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<UserDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        // Check if 2FA is enabled and verify code if provided
        var is2FAEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (is2FAEnabled)
        {
            if (string.IsNullOrEmpty(request.TwoFactorCode))
            {
                return new ApiResponse<UserDto>
                {
                    Success = false,
                    Message = "Two-factor authentication code is required"
                };
            }

            var isValidCode = await _userManager.VerifyTwoFactorTokenAsync(
                user, 
                _userManager.Options.Tokens.AuthenticatorTokenProvider, 
                request.TwoFactorCode);

            if (!isValidCode)
            {
                // Try recovery codes
                var recoveryCodes = await _userManager.RedeemTwoFactorRecoveryCodeAsync(user, request.TwoFactorCode);
                if (!recoveryCodes.Succeeded)
                {
                    return new ApiResponse<UserDto>
                    {
                        Success = false,
                        Message = "Invalid two-factor authentication code"
                    };
                }
            }
        }

        if (!string.IsNullOrEmpty(request.FullName))
            user.FullName = request.FullName;
        if (request.Phone != null)
            user.Phone = request.Phone;
        if (request.Location != null)
            user.Location = request.Location;

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        await _userActivityService.RecordAsync(userId, "settings", "admin.activity.updatedProfile");

        return new ApiResponse<UserDto>
        {
            Success = true,
            Message = "User updated successfully",
            Data = _mapper.Map<UserDto>(user)
        };
    }

    public async Task<ApiResponse<string>> UploadAvatarAsync(string userId, Stream fileStream, string fileName)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<string>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "avatars");
        Directory.CreateDirectory(uploadsFolder);

        var fileExtension = Path.GetExtension(fileName);
        var newFileName = $"{userId}_{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, newFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
        }

        var avatarUrl = $"/uploads/avatars/{newFileName}";
        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        await _userActivityService.RecordAsync(userId, "settings", "admin.activity.updatedAvatar");

        return new ApiResponse<string>
        {
            Success = true,
            Message = "Avatar uploaded successfully",
            Data = avatarUrl
        };
    }

    public async Task<ApiResponse<UserSettingsDto>> GetSettingsAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<UserSettingsDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var entity = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (entity == null)
        {
            entity = new UserSettings
            {
                UserId = userId,
                Data = DefaultUserSettings.Json,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserSettings.Add(entity);
            await _context.SaveChangesAsync();
        }

        var data = JsonSerializer.Deserialize<JsonElement>(entity.Data);
        return new ApiResponse<UserSettingsDto>
        {
            Success = true,
            Data = new UserSettingsDto { Data = data }
        };
    }

    public async Task<ApiResponse<UserSettingsDto>> UpdateSettingsAsync(string userId, JsonElement request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<UserSettingsDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var entity = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId);
        if (entity == null)
        {
            entity = new UserSettings
            {
                UserId = userId,
                Data = DefaultUserSettings.Json,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserSettings.Add(entity);
            await _context.SaveChangesAsync();
        }

        var current = JsonSerializer.Deserialize<JsonElement>(entity.Data);
        var merged = MergeSettings(current, request);
        entity.Data = JsonSerializer.Serialize(merged);
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var data = JsonSerializer.Deserialize<JsonElement>(entity.Data);
        return new ApiResponse<UserSettingsDto>
        {
            Success = true,
            Message = "Settings updated successfully",
            Data = new UserSettingsDto { Data = data }
        };
    }

    private static JsonElement MergeSettings(JsonElement current, JsonElement incoming)
    {
        var currentObj = JsonNode.Parse(current.GetRawText()) as JsonObject ?? new JsonObject();
        var incomingObj = JsonNode.Parse(incoming.GetRawText()) as JsonObject;
        if (incomingObj != null)
        {
            foreach (var prop in incomingObj)
                currentObj[prop.Key] = prop.Value != null ? JsonNode.Parse(prop.Value.ToJsonString()) : null;
        }
        var mergedJson = currentObj.ToJsonString();
        return JsonSerializer.Deserialize<JsonElement>(mergedJson);
    }

    public async Task<ApiResponse<Setup2FAResponse>> Setup2FAAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<Setup2FAResponse>
            {
                Success = false,
                Message = "User not found"
            };
        }

        // Reset authenticator key - this generates a new key
        await _userManager.ResetAuthenticatorKeyAsync(user);

        var key = await _userManager.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(key))
        {
            return new ApiResponse<Setup2FAResponse>
            {
                Success = false,
                Message = "Failed to generate authenticator key"
            };
        }

        var email = await _userManager.GetEmailAsync(user);
        var issuer = "Daily Planner";
        var qrCodeUri = $"otpauth://totp/{UrlEncoder.Default.Encode(issuer)}:{UrlEncoder.Default.Encode(email ?? "")}?secret={key}&issuer={UrlEncoder.Default.Encode(issuer)}";

        // Recovery codes will be generated when 2FA is enabled
        // For now, return empty array - they'll be provided after enabling
        return new ApiResponse<Setup2FAResponse>
        {
            Success = true,
            Message = "2FA setup initiated. Scan the QR code with your authenticator app.",
            Data = new Setup2FAResponse
            {
                SharedKey = key,
                QrCodeUri = qrCodeUri,
                RecoveryCodes = Array.Empty<string>()
            }
        };
    }

    public async Task<ApiResponse<object>> Enable2FAAsync(string userId, Enable2FARequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var isValidCode = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code);

        if (!isValidCode)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Invalid verification code"
            };
        }

        await _userManager.SetTwoFactorEnabledAsync(user, true);

        // Generate recovery codes after enabling 2FA
        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        
        return new ApiResponse<object>
        {
            Success = true,
            Message = recoveryCodes != null && recoveryCodes.Any()
                ? "Two-factor authentication has been enabled. Recovery codes have been generated. Please save them securely."
                : "Two-factor authentication has been enabled. Please generate recovery codes separately."
        };
    }

    public async Task<ApiResponse<object>> Disable2FAAsync(string userId, Verify2FARequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var is2FAEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (!is2FAEnabled)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Two-factor authentication is not enabled"
            };
        }

        // Verify code before disabling
        var isValidCode = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code);

        if (!isValidCode)
        {
            // Try recovery codes
            var recoveryCodes = await _userManager.RedeemTwoFactorRecoveryCodeAsync(user, request.Code);
            if (!recoveryCodes.Succeeded)
            {
                return new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid verification code"
                };
            }
        }

        await _userManager.SetTwoFactorEnabledAsync(user, false);
        await _userManager.ResetAuthenticatorKeyAsync(user);

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Two-factor authentication has been disabled"
        };
    }

    public async Task<ApiResponse<bool>> Is2FAEnabledAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var isEnabled = await _userManager.GetTwoFactorEnabledAsync(user);

        return new ApiResponse<bool>
        {
            Success = true,
            Data = isEnabled
        };
    }

    public async Task<ApiResponse<string[]>> GenerateRecoveryCodesAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<string[]>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var is2FAEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (!is2FAEnabled)
        {
            return new ApiResponse<string[]>
            {
                Success = false,
                Message = "Two-factor authentication is not enabled"
            };
        }

        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        
        if (recoveryCodes == null || !recoveryCodes.Any())
        {
            return new ApiResponse<string[]>
            {
                Success = false,
                Message = "Failed to generate recovery codes"
            };
        }

        // Recovery codes are returned as IEnumerable<string>
        var recoveryCodesArray = recoveryCodes.ToArray();
        
        return new ApiResponse<string[]>
        {
            Success = true,
            Message = "Recovery codes have been regenerated. Old codes are no longer valid. Please save these codes securely.",
            Data = recoveryCodesArray
        };
    }

    public async Task<ApiResponse<List<UserDeviceDto>>> GetMyDevicesAsync(string userId)
    {
        var devices = await _context.UserDevices
            .Where(d => d.UserId == userId)
            .OrderByDescending(d => d.LastUsedAt)
            .Select(d => new UserDeviceDto
            {
                Id = d.Id,
                DeviceId = d.DeviceId,
                DeviceName = d.DeviceName,
                Platform = d.Platform,
                LastUsedAt = d.LastUsedAt,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        return new ApiResponse<List<UserDeviceDto>>
        {
            Success = true,
            Data = devices
        };
    }

    public async Task<ApiResponse<object>> RevokeDeviceAsync(string userId, Guid deviceId)
    {
        var device = await _context.UserDevices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == userId);
        if (device == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Device not found or access denied"
            };
        }

        _context.UserDevices.Remove(device);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Device revoked"
        };
    }

    public async Task<ApiResponse<object>> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var message = result.Errors?.FirstOrDefault()?.Description ?? "Failed to change password";
            return new ApiResponse<object>
            {
                Success = false,
                Message = message
            };
        }

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Password changed successfully"
        };
    }
}

