namespace DailyPlanner.Domain.Entities;

public class UserActivity
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // login, task, goal, settings, account, ban, etc.
    public string Action { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }

    public ApplicationUser User { get; set; } = null!;
}
