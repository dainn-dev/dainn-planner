namespace DailyPlanner.Application.Interfaces;

public interface IOldDailyTaskCleanupService
{
    /// <summary>
    /// Deletes daily tasks whose date is older than the specified number of days.
    /// </summary>
    Task<int> CleanupOldTasksAsync(int olderThanDays = 7, CancellationToken cancellationToken = default);
}
