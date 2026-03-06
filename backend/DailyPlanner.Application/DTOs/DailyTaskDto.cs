namespace DailyPlanner.Application.DTOs;

public class DailyTaskDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime Date { get; set; }
    public bool IsCompleted { get; set; }
    public int Priority { get; set; }
    public int Recurrence { get; set; }
    public string? ReminderTime { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public Guid? GoalMilestoneId { get; set; }
    public Guid? GoalId { get; set; }
}

