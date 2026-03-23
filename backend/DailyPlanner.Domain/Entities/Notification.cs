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
    /// <summary>Optional CV-style payload JSON (site_approved / site_rejected / site_suspended).</summary>
    public string? PayloadJson { get; set; }
    /// <summary>Optional read timestamp (aligned with CV API readAt; planner rows may leave null).</summary>
    public DateTime? ReadAt { get; set; }
    /// <summary>Optional idempotency key for CV site moderation notifications.</summary>
    public string? IdempotencyKey { get; set; }

    // Navigation property
    public ApplicationUser User { get; set; } = null!;
}

