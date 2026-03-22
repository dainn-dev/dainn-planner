namespace DailyPlanner.Application.DTOs.Auth;

public class RegisterRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;

    /// <summary>Google reCAPTCHA v2 token when <c>Recaptcha:SecretKey</c> is configured.</summary>
    public string? RecaptchaToken { get; set; }
}

