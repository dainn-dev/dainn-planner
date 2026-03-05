namespace DailyPlanner.Application.DTOs.Auth;

public class SocialLoginRequest
{
    public string Provider { get; set; } = string.Empty; // "Google", "Facebook", "GitHub"
    public string AccessToken { get; set; } = string.Empty;
}

