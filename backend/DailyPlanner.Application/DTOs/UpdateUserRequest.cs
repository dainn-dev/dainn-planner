namespace DailyPlanner.Application.DTOs;

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? TwoFactorCode { get; set; } // Required if 2FA is enabled
}

