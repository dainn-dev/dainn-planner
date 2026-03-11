namespace DailyPlanner.Application.DTOs.Auth;

public class AuthResponse
{
    public bool RequiresTwoFactor { get; set; }
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public UserDto? User { get; set; }
}

