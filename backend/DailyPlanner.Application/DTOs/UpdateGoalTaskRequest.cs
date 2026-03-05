namespace DailyPlanner.Application.DTOs;

public class UpdateGoalTaskRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public DateTime? DueDate { get; set; }
    public int? Priority { get; set; }
    public bool? IsCompleted { get; set; }
}

