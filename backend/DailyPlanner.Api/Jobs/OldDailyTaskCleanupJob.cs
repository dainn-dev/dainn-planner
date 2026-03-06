using DailyPlanner.Application.Interfaces;

namespace DailyPlanner.Api.Jobs;

public class OldDailyTaskCleanupJob
{
    private const int OlderThanDays = 7;
    private readonly IOldDailyTaskCleanupService _cleanupService;

    public OldDailyTaskCleanupJob(IOldDailyTaskCleanupService cleanupService)
    {
        _cleanupService = cleanupService;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        await _cleanupService.CleanupOldTasksAsync(OlderThanDays, cancellationToken);
    }
}
