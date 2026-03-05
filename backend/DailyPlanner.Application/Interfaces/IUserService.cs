using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IUserService
{
    Task<ApiResponse<UserDto>> GetCurrentUserAsync(string userId);
    Task<ApiResponse<UserDto>> UpdateUserAsync(string userId, UpdateUserRequest request);
    Task<ApiResponse<string>> UploadAvatarAsync(string userId, Stream fileStream, string fileName);
    Task<ApiResponse<UserSettingsDto>> GetSettingsAsync(string userId);
    Task<ApiResponse<UserSettingsDto>> UpdateSettingsAsync(string userId, UpdateSettingsRequest request);
    
    // 2FA Methods
    Task<ApiResponse<Setup2FAResponse>> Setup2FAAsync(string userId);
    Task<ApiResponse<object>> Enable2FAAsync(string userId, Enable2FARequest request);
    Task<ApiResponse<object>> Disable2FAAsync(string userId, Verify2FARequest request);
    Task<ApiResponse<bool>> Is2FAEnabledAsync(string userId);
    Task<ApiResponse<string[]>> GenerateRecoveryCodesAsync(string userId);
}

