using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.DTOs.Auth;

namespace DailyPlanner.Application.Interfaces;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<AuthResponse>> Verify2FAAndLoginAsync(Verify2FALoginRequest request);
    Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request);
    Task<ApiResponse<object>> ForgotPasswordAsync(ForgotPasswordRequest request);
    Task<ApiResponse<object>> ResetPasswordAsync(ResetPasswordRequest request);
    Task<ApiResponse<object>> LogoutAsync(string userId);
    Task<ApiResponse<AuthResponse>> SocialLoginAsync(SocialLoginRequest request);
    Task<ApiResponse<AuthResponse>> HandleExternalLoginAsync(Microsoft.AspNetCore.Authentication.AuthenticateResult externalAuth);
}

