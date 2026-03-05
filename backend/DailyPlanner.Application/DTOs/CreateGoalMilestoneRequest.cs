namespace DailyPlanner.Application.DTOs;

public class CreateGoalMilestoneRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
}

