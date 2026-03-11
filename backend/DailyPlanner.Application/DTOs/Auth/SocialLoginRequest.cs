namespace DailyPlanner.Application.DTOs.Auth;

public class SocialLoginRequest
{
    public string Provider { get; set; } = string.Empty; // "Google", "Facebook", "GitHub"
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>Optional. When provided, records or updates this device for the user.</summary>
    public string? DeviceId { get; set; }
    public string? DeviceName { get; set; }
    public string? Platform { get; set; }
}

