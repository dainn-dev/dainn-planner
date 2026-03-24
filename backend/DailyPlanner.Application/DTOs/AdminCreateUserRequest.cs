namespace DailyPlanner.Application.DTOs;

public class AdminCreateUserRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool EmailConfirmed { get; set; } = true;
}
