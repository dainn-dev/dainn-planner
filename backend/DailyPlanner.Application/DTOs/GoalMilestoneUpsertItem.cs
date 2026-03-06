namespace DailyPlanner.Application.DTOs;

public class GoalMilestoneUpsertItem
{
    public Guid? Id { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
    public bool? IsCompleted { get; set; }
}
