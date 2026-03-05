namespace DailyPlanner.Application.DTOs;

public class UpdateLongTermGoalRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? TargetDate { get; set; }
}

