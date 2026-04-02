namespace DailyPlanner.Application.DTOs;

public class CreateCalendarEventRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Location { get; set; }
    public string? Color { get; set; }
    // When false, the event will be created only in the app (no Google Calendar sync).
    public bool PushToGoogle { get; set; } = true;
    public bool IsAllDay { get; set; }
    public string? EventType { get; set; }
    public string? Icon { get; set; }
    public bool? DndEnabled { get; set; }
    public int? ReminderMinutes { get; set; }
    public List<string>? Attendees { get; set; }
    public List<string>? ProjectTags { get; set; }
}

