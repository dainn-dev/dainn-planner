namespace DailyPlanner.Domain.Entities;

public class UserStatistics
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int TasksCompleted { get; set; }
    public int TasksTotal { get; set; }
    public int GoalsMilestonesCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
