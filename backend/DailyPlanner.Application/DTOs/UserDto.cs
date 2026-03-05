namespace DailyPlanner.Application.DTOs;

public class UserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }
    public string Timezone { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
}

