namespace DailyPlanner.Application.DTOs;

public class CalendarEventDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Location { get; set; }
    public string? Color { get; set; }
    public bool IsAllDay { get; set; }
    public string? EventType { get; set; }
    public string? Icon { get; set; }
    public bool? DndEnabled { get; set; }
    public int? ReminderMinutes { get; set; }
    public List<string>? Attendees { get; set; }
    public List<string>? ProjectTags { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Optional source identifier, e.g. "Google" for Google Calendar events.</summary>
    public string? Source { get; set; }
    /// <summary>External id from the source (e.g. Google event id). Used as stable key when Source is set.</summary>
    public string? ExternalId { get; set; }
}

