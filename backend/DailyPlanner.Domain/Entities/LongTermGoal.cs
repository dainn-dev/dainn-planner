namespace DailyPlanner.Domain.Entities;

public class LongTermGoal
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = "Active"; // Active, Completed, Paused, Cancelled
    public DateTime? StartDate { get; set; }
    public DateTime? TargetDate { get; set; }
    public decimal Progress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ApplicationUser User { get; set; } = null!;
    public ICollection<GoalMilestone> Milestones { get; set; } = new List<GoalMilestone>();
    public ICollection<GoalTask> Tasks { get; set; } = new List<GoalTask>();
}

