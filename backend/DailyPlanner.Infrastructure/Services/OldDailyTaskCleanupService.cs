using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class OldDailyTaskCleanupService : IOldDailyTaskCleanupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<OldDailyTaskCleanupService> _logger;

    public OldDailyTaskCleanupService(ApplicationDbContext context, ILogger<OldDailyTaskCleanupService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> CleanupOldTasksAsync(int olderThanDays = 7, CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-olderThanDays), DateTimeKind.Utc);
        var toDelete = await _context.DailyTasks
            .Where(t => t.Date < cutoff)
            .ToListAsync(cancellationToken);

        var count = toDelete.Count;
        if (count == 0)
        {
            _logger.LogDebug("No daily tasks older than {Days} days to clean.", olderThanDays);
            return 0;
        }

        _context.DailyTasks.RemoveRange(toDelete);
        await _context.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Cleaned {Count} daily task(s) older than {Days} days (before {Cutoff:yyyy-MM-dd}).", count, olderThanDays, cutoff);
        return count;
    }
}
