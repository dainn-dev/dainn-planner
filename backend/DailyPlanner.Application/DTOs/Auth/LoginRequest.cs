namespace DailyPlanner.Application.DTOs.Auth;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;

    /// <summary>Optional. When provided, records or updates this device for the user (e.g. browser fingerprint or app device id).</summary>
    public string? DeviceId { get; set; }
    /// <summary>Optional. Human-readable device name (e.g. "Chrome on Windows").</summary>
    public string? DeviceName { get; set; }
    /// <summary>Optional. Platform identifier (e.g. "web", "android", "ios").</summary>
    public string? Platform { get; set; }
}

