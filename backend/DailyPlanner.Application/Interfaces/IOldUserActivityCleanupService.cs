namespace DailyPlanner.Application.Interfaces;

public interface IOldUserActivityCleanupService
{
    /// <summary>
    /// Deletes user activities whose CreatedAt is older than the specified number of days.
    /// </summary>
    Task<int> CleanupOldActivitiesAsync(int olderThanDays = 7, CancellationToken cancellationToken = default);
}
