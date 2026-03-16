using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class OldUserActivityCleanupService : IOldUserActivityCleanupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<OldUserActivityCleanupService> _logger;

    public OldUserActivityCleanupService(ApplicationDbContext context, ILogger<OldUserActivityCleanupService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<int> CleanupOldActivitiesAsync(int olderThanDays = 7, CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.SpecifyKind(DateTime.UtcNow.Date.AddDays(-olderThanDays), DateTimeKind.Utc);
        var count = await _context.UserActivities
            .Where(a => a.CreatedAt < cutoff)
            .ExecuteDeleteAsync(cancellationToken);

        if (count == 0)
        {
            _logger.LogDebug("No user activities older than {Days} days to clean.", olderThanDays);
        }
        else
        {
            _logger.LogInformation("Cleaned {Count} user activity record(s) older than {Days} days (before {Cutoff:yyyy-MM-dd}).", count, olderThanDays, cutoff);
        }

        return count;
    }
}
