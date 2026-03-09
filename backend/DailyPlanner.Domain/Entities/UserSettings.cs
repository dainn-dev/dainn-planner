namespace DailyPlanner.Domain.Entities;

public class UserSettings
{
    public string UserId { get; set; } = string.Empty;
    public string Data { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
