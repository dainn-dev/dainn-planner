namespace DailyPlanner.Application.DTOs.Auth;

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;

    /// <summary>Google reCAPTCHA v2 token when <c>Recaptcha:SecretKey</c> is configured.</summary>
    public string? RecaptchaToken { get; set; }
}

