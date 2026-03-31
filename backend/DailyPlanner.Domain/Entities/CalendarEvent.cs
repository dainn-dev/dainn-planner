namespace DailyPlanner.Domain.Entities;

public class CalendarEvent
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Location { get; set; }
    public string? Color { get; set; }
    public bool IsAllDay { get; set; }
    /// <summary>
    /// UI/semantic type for the event (e.g. "meeting", "deep-focus", "casual-sync").
    /// This is a lightweight label used by the frontend to render type-specific fields.
    /// </summary>
    public string? EventType { get; set; }
    /// <summary>Optional emoji/icon selected for casual events.</summary>
    public string? Icon { get; set; }
    /// <summary>Optional "Do Not Disturb" flag for focus blocks.</summary>
    public bool? DndEnabled { get; set; }
    /// <summary>Optional reminder offset in minutes.</summary>
    public int? ReminderMinutes { get; set; }
    /// <summary>JSON array of attendee display names/emails (UI-only for now).</summary>
    public string? AttendeesJson { get; set; }
    /// <summary>JSON array of project tags (UI-only for now).</summary>
    public string? ProjectTagsJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    /// <summary>Google Calendar event id when this row was pushed to the user's primary calendar.</summary>
    public string? GoogleEventId { get; set; }

    // Navigation property
    public ApplicationUser User { get; set; } = null!;
}

