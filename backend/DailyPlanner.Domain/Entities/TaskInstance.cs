namespace DailyPlanner.Domain.Entities;

public class TaskInstance
{
    public Guid Id { get; set; }

    // Points to the recurring task template (DailyTask).
    public Guid TaskId { get; set; }
    public DailyTask Task { get; set; } = null!;

    // Stored as a date (not a DateTime timestamp) in the DB schema.
    public DateTime InstanceDate { get; set; }

    // Per-day editable fields.
    public string? Description { get; set; }

    // Completion state for this instance.
    public const string StatusCompleted = "Completed";
    public const string StatusIncomplete = "Incomplete";

    // Note: migration-created schema uses a required string column named "Status".
    public string Status { get; set; } = StatusIncomplete;

    // Optional behavior flag (kept for compatibility with the existing migration schema).
    public bool IsOverride { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Added by a follow-up migration (needed to return `completedDate` to the UI).
    public DateTime? CompletedDate { get; set; }

    // Per-instance time override (overrides DailyTask.StartTime / EndTime for this day only).
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }

    // Convenience helper (not mapped).
    public bool IsCompleted => string.Equals(Status, StatusCompleted, StringComparison.OrdinalIgnoreCase);

    public void MarkCompleted(DateTime completedAtUtc)
    {
        Status = StatusCompleted;
        CompletedDate = completedAtUtc;
        UpdatedAt = completedAtUtc;
    }

    public void MarkIncomplete()
    {
        Status = StatusIncomplete;
        CompletedDate = null;
        UpdatedAt = DateTime.UtcNow;
    }
}

