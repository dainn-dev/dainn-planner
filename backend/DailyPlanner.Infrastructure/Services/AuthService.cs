using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.DTOs.Auth;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;

namespace DailyPlanner.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IJwtService _jwtService;
    private readonly IMapper _mapper;
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IUserActivityService _userActivityService;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IJwtService jwtService,
        IMapper mapper,
        ApplicationDbContext context,
        IConfiguration configuration,
        IUserActivityService userActivityService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _jwtService = jwtService;
        _mapper = mapper;
        _context = context;
        _configuration = configuration;
        _userActivityService = userActivityService;
    }

    public async Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser != null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "User with this email already exists",
                Errors = new Dictionary<string, string[]> { { "Email", new[] { "Email already registered" } } }
            };
        }

        var user = new ApplicationUser
        {
            Email = request.Email,
            UserName = request.Email,
            FullName = request.FullName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Registration failed",
                Errors = errors
            };
        }

        var token = await _jwtService.GenerateTokenAsync(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(user.Id, refreshToken);

        var userDto = await MapUserWithRoleAsync(user);
        return new ApiResponse<AuthResponse>
        {
            Success = true,
            Message = "Registration successful",
            Data = new AuthResponse
            {
                Token = token,
                RefreshToken = refreshToken,
                User = userDto
            }
        };
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid email or password"
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid email or password"
            };
        }

        var is2FAEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (is2FAEnabled)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = true,
                Message = "Two-factor authentication required",
                Data = new AuthResponse { RequiresTwoFactor = true }
            };
        }

        var token = await _jwtService.GenerateTokenAsync(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(user.Id, refreshToken);
        await _userActivityService.RecordAsync(user.Id, "login", "admin.activity.login");
        await EnsureUserDeviceAsync(user.Id, request.DeviceId, request.DeviceName, request.Platform);
        var userDto = await MapUserWithRoleAsync(user);

        return new ApiResponse<AuthResponse>
        {
            Success = true,
            Message = "Login successful",
            Data = new AuthResponse
            {
                Token = token,
                RefreshToken = refreshToken,
                User = userDto
            }
        };
    }

    public async Task<ApiResponse<AuthResponse>> Verify2FAAndLoginAsync(Verify2FALoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid email or password"
            };
        }

        var is2FAEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (!is2FAEnabled)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Two-factor authentication is not enabled for this account"
            };
        }

        var isValidCode = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            request.Code);

        if (!isValidCode)
        {
            var recoveryResult = await _userManager.RedeemTwoFactorRecoveryCodeAsync(user, request.Code);
            if (!recoveryResult.Succeeded)
            {
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "Invalid verification code"
                };
            }
        }

        var token = await _jwtService.GenerateTokenAsync(user);
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(user.Id, refreshToken);
        await _userActivityService.RecordAsync(user.Id, "login", "admin.activity.login");
        await EnsureUserDeviceAsync(user.Id, request.DeviceId, request.DeviceName, request.Platform);
        var userDto = await MapUserWithRoleAsync(user);

        return new ApiResponse<AuthResponse>
        {
            Success = true,
            Message = "Login successful",
            Data = new AuthResponse
            {
                Token = token,
                RefreshToken = refreshToken,
                User = userDto
            }
        };
    }

    public async Task<ApiResponse<AuthResponse>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var principal = GetPrincipalFromExpiredToken(request.Token);
        if (principal == null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid token"
            };
        }

        var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid token"
            };
        }

        var isValid = await _jwtService.ValidateRefreshTokenAsync(request.RefreshToken, userId);
        if (!isValid)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "Invalid refresh token"
            };
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = "User not found"
            };
        }

        // Revoke old refresh token and generate new one
        await _jwtService.RevokeRefreshTokenAsync(request.RefreshToken);
        var newToken = await _jwtService.GenerateTokenAsync(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(user.Id, newRefreshToken);
        var userDto = await MapUserWithRoleAsync(user);

        return new ApiResponse<AuthResponse>
        {
            Success = true,
            Message = "Token refreshed successfully",
            Data = new AuthResponse
            {
                Token = newToken,
                RefreshToken = newRefreshToken,
                User = userDto
            }
        };
    }

    private async Task<UserDto> MapUserWithRoleAsync(ApplicationUser user)
    {
        var userDto = _mapper.Map<UserDto>(user);
        var roles = await _userManager.GetRolesAsync(user);
        userDto.Role = roles.Contains("Admin") ? "Admin" : (roles.Count > 0 ? roles[0] : "User");
        return userDto;
    }

    public async Task<ApiResponse<object>> ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            // Don't reveal if user exists
            return new ApiResponse<object>
            {
                Success = true,
                Message = "If the email exists, a password reset link has been sent"
            };
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        // TODO: Send email with token
        // For now, just return success

        return new ApiResponse<object>
        {
            Success = true,
            Message = "If the email exists, a password reset link has been sent"
        };
    }

    public async Task<ApiResponse<object>> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Password reset failed",
                Errors = errors
            };
        }

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Password reset successful"
        };
    }

    public async Task<ApiResponse<object>> LogoutAsync(string userId)
    {
        // Revoke all refresh tokens for the user
        var tokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
        }

        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Logout successful"
        };
    }

    public async Task<ApiResponse<AuthResponse>> SocialLoginAsync(SocialLoginRequest request)
    {
        try
        {
            var userInfo = await ValidateSocialTokenAsync(request.Provider, request.AccessToken);
            if (userInfo == null)
            {
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "Invalid access token"
                };
            }

            // Find existing user by email or create new one
            var user = await _userManager.FindByEmailAsync(userInfo.Email);
            if (user == null)
            {
                // Create new user
                user = new ApplicationUser
                {
                    Email = userInfo.Email,
                    UserName = userInfo.Email,
                    FullName = userInfo.FullName ?? userInfo.Email.Split('@')[0],
                    EmailConfirmed = true // Social logins are pre-verified
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
                    return new ApiResponse<AuthResponse>
                    {
                        Success = false,
                        Message = "Failed to create user account",
                        Errors = errors
                    };
                }

                // Add to User role by default
                await _userManager.AddToRoleAsync(user, "User");
            }

            // Check if user has login for this provider
            var logins = await _userManager.GetLoginsAsync(user);
            var providerLogin = logins.FirstOrDefault(l => l.LoginProvider == request.Provider);
            
            if (providerLogin == null)
            {
                // Add external login
                var loginInfo = new UserLoginInfo(request.Provider, userInfo.Id, request.Provider);
                await _userManager.AddLoginAsync(user, loginInfo);
            }

            // Update avatar if provided
            if (!string.IsNullOrEmpty(userInfo.AvatarUrl) && string.IsNullOrEmpty(user.AvatarUrl))
            {
                user.AvatarUrl = userInfo.AvatarUrl;
                await _userManager.UpdateAsync(user);
            }

            // Generate tokens
            var token = await _jwtService.GenerateTokenAsync(user);
            var refreshToken = _jwtService.GenerateRefreshToken();
            await _jwtService.SaveRefreshTokenAsync(user.Id, refreshToken);
            await _userActivityService.RecordAsync(user.Id, "login", "admin.activity.loginSocial");
            await EnsureUserDeviceAsync(user.Id, request.DeviceId, request.DeviceName, request.Platform);
            var userDto = await MapUserWithRoleAsync(user);

            return new ApiResponse<AuthResponse>
            {
                Success = true,
                Message = "Social login successful",
                Data = new AuthResponse
                {
                    Token = token,
                    RefreshToken = refreshToken,
                    User = userDto
                }
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = $"Social login failed: {ex.Message}"
            };
        }
    }

    private async Task<SocialUserInfo?> ValidateSocialTokenAsync(string provider, string accessToken)
    {
        using var httpClient = new HttpClient();
        
        return provider.ToLower() switch
        {
            "google" => await ValidateGoogleTokenAsync(httpClient, accessToken),
            "facebook" => await ValidateFacebookTokenAsync(httpClient, accessToken),
            "github" => await ValidateGitHubTokenAsync(httpClient, accessToken),
            _ => null
        };
    }

    private async Task<SocialUserInfo?> ValidateGoogleTokenAsync(HttpClient httpClient, string accessToken)
    {
        try
        {
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");
            if (!response.IsSuccessStatusCode)
                return null;

            var content = await response.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<GoogleUserInfo>(content, new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            });

            if (userInfo == null || string.IsNullOrEmpty(userInfo.Email))
                return null;

            return new SocialUserInfo
            {
                Id = userInfo.Id,
                Email = userInfo.Email,
                FullName = userInfo.Name,
                AvatarUrl = userInfo.Picture
            };
        }
        catch
        {
            return null;
        }
    }

    private async Task<SocialUserInfo?> ValidateFacebookTokenAsync(HttpClient httpClient, string accessToken)
    {
        try
        {
            var url = $"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={accessToken}";
            var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return null;

            var content = await response.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<FacebookUserInfo>(content, new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            });

            if (userInfo == null || string.IsNullOrEmpty(userInfo.Email))
                return null;

            return new SocialUserInfo
            {
                Id = userInfo.Id,
                Email = userInfo.Email,
                FullName = userInfo.Name,
                AvatarUrl = userInfo.Picture?.Data?.Url
            };
        }
        catch
        {
            return null;
        }
    }

    private async Task<SocialUserInfo?> ValidateGitHubTokenAsync(HttpClient httpClient, string accessToken)
    {
        try
        {
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            httpClient.DefaultRequestHeaders.Add("User-Agent", "DailyPlanner-API");

            var response = await httpClient.GetAsync("https://api.github.com/user");
            if (!response.IsSuccessStatusCode)
                return null;

            var content = await response.Content.ReadAsStringAsync();
            var userInfo = JsonSerializer.Deserialize<GitHubUserInfo>(content, new JsonSerializerOptions 
            { 
                PropertyNameCaseInsensitive = true 
            });

            if (userInfo == null || string.IsNullOrEmpty(userInfo.Email))
                return null;

            return new SocialUserInfo
            {
                Id = userInfo.Id.ToString(),
                Email = userInfo.Email,
                FullName = userInfo.Name ?? userInfo.Login,
                AvatarUrl = userInfo.AvatarUrl
            };
        }
        catch
        {
            return null;
        }
    }

    private class SocialUserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
    }

    private class GoogleUserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Picture { get; set; } = string.Empty;
    }

    private class FacebookUserInfo
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public FacebookPicture? Picture { get; set; }
    }

    private class FacebookPicture
    {
        public FacebookPictureData? Data { get; set; }
    }

    private class FacebookPictureData
    {
        public string? Url { get; set; }
    }

    private class GitHubUserInfo
    {
        public long Id { get; set; }
        public string Login { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Name { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public async Task<ApiResponse<AuthResponse>> HandleExternalLoginAsync(Microsoft.AspNetCore.Authentication.AuthenticateResult externalAuth)
    {
        try
        {
            if (externalAuth?.Succeeded != true)
            {
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "External authentication failed"
                };
            }

            var claims = externalAuth.Principal?.Claims.ToList();
            if (claims == null || !claims.Any())
            {
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "No claims found in external authentication"
                };
            }

            // Extract user info from claims
            var email = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email || c.Type == "email")?.Value;
            var name = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Name || c.Type == "name")?.Value;
            var provider = externalAuth.Principal?.Identity?.AuthenticationType ?? "Unknown";
            var providerKey = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                ?? claims.FirstOrDefault(c => c.Type == "sub")?.Value 
                ?? string.Empty;
            var picture = claims.FirstOrDefault(c => c.Type == "picture" || c.Type == "avatar_url")?.Value;

            if (string.IsNullOrEmpty(email))
            {
                return new ApiResponse<AuthResponse>
                {
                    Success = false,
                    Message = "Email claim not found in external authentication"
                };
            }

            // Find or create user
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    Email = email,
                    UserName = email,
                    FullName = name ?? email.Split('@')[0],
                    EmailConfirmed = true,
                    AvatarUrl = picture
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
                    return new ApiResponse<AuthResponse>
                    {
                        Success = false,
                        Message = "Failed to create user account",
                        Errors = errors
                    };
                }

                await _userManager.AddToRoleAsync(user, "User");
            }

            // Add external login if not exists
            var logins = await _userManager.GetLoginsAsync(user);
            var existingLogin = logins.FirstOrDefault(l => l.LoginProvider == provider);
            
            if (existingLogin == null)
            {
                var loginInfo = new UserLoginInfo(provider, providerKey, provider);
                await _userManager.AddLoginAsync(user, loginInfo);
            }

            // Update avatar if provided and not set
            if (!string.IsNullOrEmpty(picture) && string.IsNullOrEmpty(user.AvatarUrl))
            {
                user.AvatarUrl = picture;
                await _userManager.UpdateAsync(user);
            }

            // Generate tokens
            var token = await _jwtService.GenerateTokenAsync(user);
            var refreshToken = _jwtService.GenerateRefreshToken();
            await _jwtService.SaveRefreshTokenAsync(user.Id, refreshToken);
            await _userActivityService.RecordAsync(user.Id, "login", "admin.activity.loginExternal");
            var userDto = await MapUserWithRoleAsync(user);

            return new ApiResponse<AuthResponse>
            {
                Success = true,
                Message = "External login successful",
                Data = new AuthResponse
                {
                    Token = token,
                    RefreshToken = refreshToken,
                    User = userDto
                }
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AuthResponse>
            {
                Success = false,
                Message = $"External login failed: {ex.Message}"
            };
        }
    }

    private async Task EnsureUserDeviceAsync(string userId, string? deviceId, string? deviceName, string? platform)
    {
        var id = string.IsNullOrWhiteSpace(deviceId) ? "web" : deviceId.Trim();
        if (id.Length > 200)
            id = id[..200];
        var name = string.IsNullOrWhiteSpace(deviceName) ? "Web browser" : (deviceName.Length > 500 ? deviceName[..500] : deviceName);
        var plat = string.IsNullOrWhiteSpace(platform) ? "web" : (platform.Length > 100 ? platform[..100] : platform);

        var existing = await _context.UserDevices
            .FirstOrDefaultAsync(d => d.UserId == userId && d.DeviceId == id);
        var now = DateTime.UtcNow;

        if (existing != null)
        {
            existing.LastUsedAt = now;
            existing.DeviceName = name;
            existing.Platform = plat;
        }
        else
        {
            _context.UserDevices.Add(new UserDevice
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                DeviceId = id,
                DeviceName = name,
                Platform = plat,
                LastUsedAt = now,
                CreatedAt = now
            });
        }

        await _context.SaveChangesAsync();
    }

    private System.Security.Claims.ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = false,
            ValidateIssuer = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured"))),
            ValidateLifetime = false
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out SecurityToken securityToken);

        if (securityToken is not JwtSecurityToken jwtSecurityToken ||
            !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
        {
            return null;
        }

        return principal;
    }
}

