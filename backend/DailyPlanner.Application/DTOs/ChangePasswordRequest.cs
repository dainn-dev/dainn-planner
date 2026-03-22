namespace DailyPlanner.Application.DTOs;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>Google reCAPTCHA v2 token when <c>Recaptcha:SecretKey</c> is configured.</summary>
    public string? RecaptchaToken { get; set; }
}
