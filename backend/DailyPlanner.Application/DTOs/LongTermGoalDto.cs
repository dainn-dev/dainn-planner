namespace DailyPlanner.Application.DTOs;

public class LongTermGoalDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal Progress { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<GoalMilestoneDto> Milestones { get; set; } = new();
    public List<GoalTaskDto> Tasks { get; set; } = new();
}

