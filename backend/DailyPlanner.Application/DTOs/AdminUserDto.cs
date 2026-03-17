namespace DailyPlanner.Application.DTOs;

public class AdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }
    public string Timezone { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public bool EmailConfirmed { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<string> Roles { get; set; } = new();
    public List<UserActivityItemDto> RecentActivity { get; set; } = new();
    public int TotalGoals { get; set; }
    public int CompletedGoals { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public DateTime? LastActiveAt { get; set; }
}

