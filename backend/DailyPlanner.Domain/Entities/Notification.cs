namespace DailyPlanner.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // TaskReminder, GoalUpdate, System, etc.
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? IconColor { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Optional reference for de-duplication (e.g. DailyTask.Id for TaskReminder).</summary>
    public Guid? ReferenceId { get; set; }

    // Navigation property
    public ApplicationUser User { get; set; } = null!;
}

