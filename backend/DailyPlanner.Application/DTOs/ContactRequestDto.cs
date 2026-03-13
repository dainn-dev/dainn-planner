namespace DailyPlanner.Application.DTOs;

public class ContactRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Source { get; set; }
    public string? RecaptchaToken { get; set; }
}
