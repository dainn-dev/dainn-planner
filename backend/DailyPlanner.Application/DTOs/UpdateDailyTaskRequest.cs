namespace DailyPlanner.Application.DTOs;

public class UpdateDailyTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? Date { get; set; }
    public Guid? InstanceId { get; set; }
    public int? Priority { get; set; }
    public int? Recurrence { get; set; }
    public string? ReminderTime { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public List<string>? Tags { get; set; }
    public Guid? GoalMilestoneId { get; set; }
    public Guid? GoalId { get; set; }
}

