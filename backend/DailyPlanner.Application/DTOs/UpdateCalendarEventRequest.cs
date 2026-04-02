namespace DailyPlanner.Application.DTOs;

public class UpdateCalendarEventRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Location { get; set; }
    public string? Color { get; set; }
    public bool? IsAllDay { get; set; }
    public string? EventType { get; set; }
    public string? Icon { get; set; }
    public bool? DndEnabled { get; set; }
    public int? ReminderMinutes { get; set; }
    // When false, update will not push changes to Google Calendar.
    // When null, the existing behavior (push) is preserved.
    public bool? PushToGoogle { get; set; }
    public List<string>? Attendees { get; set; }
    public List<string>? ProjectTags { get; set; }
}

