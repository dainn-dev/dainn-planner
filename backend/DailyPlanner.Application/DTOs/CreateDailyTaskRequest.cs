namespace DailyPlanner.Application.DTOs;

public class CreateDailyTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    public int Priority { get; set; }
    public int Recurrence { get; set; }
    public string? ReminderTime { get; set; }
    public List<string>? Tags { get; set; }
}

