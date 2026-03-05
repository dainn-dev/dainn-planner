namespace DailyPlanner.Domain.Entities;

public class DailyTask
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    public int Priority { get; set; }
    public int Recurrence { get; set; }
    public string? ReminderTime { get; set; }
    public string[]? Tags { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation property
    public ApplicationUser User { get; set; } = null!;
}

