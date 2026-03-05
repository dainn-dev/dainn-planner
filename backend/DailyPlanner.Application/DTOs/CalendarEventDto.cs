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
    public DateTime CreatedAt { get; set; }
}

