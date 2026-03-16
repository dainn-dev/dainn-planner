using DailyPlanner.Application.Interfaces;

namespace DailyPlanner.Api.Jobs;

public class OldUserActivityCleanupJob
{
    private const int OlderThanDays = 7;
    private readonly IOldUserActivityCleanupService _cleanupService;

    public OldUserActivityCleanupJob(IOldUserActivityCleanupService cleanupService)
    {
        _cleanupService = cleanupService;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        await _cleanupService.CleanupOldActivitiesAsync(OlderThanDays, cancellationToken);
    }
}
