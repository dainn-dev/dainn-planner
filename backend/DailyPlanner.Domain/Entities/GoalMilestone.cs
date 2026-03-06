namespace DailyPlanner.Domain.Entities;

public class GoalMilestone
{
    public Guid Id { get; set; }
    public Guid GoalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime? TargetDate { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public LongTermGoal Goal { get; set; } = null!;
    public ICollection<DailyTask> DailyTasks { get; set; } = new List<DailyTask>();
}

