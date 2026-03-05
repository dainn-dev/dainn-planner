namespace DailyPlanner.Application.DTOs;

public class CreateGoalTaskRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int Priority { get; set; }
}

