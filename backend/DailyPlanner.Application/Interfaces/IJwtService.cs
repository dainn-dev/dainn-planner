using DailyPlanner.Domain.Entities;

namespace DailyPlanner.Application.Interfaces;

public interface IJwtService
{
    string GenerateToken(ApplicationUser user);
    Task<string> GenerateTokenAsync(ApplicationUser user);
    string GenerateRefreshToken();
    Task<bool> ValidateRefreshTokenAsync(string token, string userId);
    Task SaveRefreshTokenAsync(string userId, string refreshToken);
    Task RevokeRefreshTokenAsync(string token);
}

