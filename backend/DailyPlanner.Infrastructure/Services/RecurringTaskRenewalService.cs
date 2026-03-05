using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class RecurringTaskRenewalService : IRecurringTaskRenewalService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RecurringTaskRenewalService> _logger;

    public RecurringTaskRenewalService(ApplicationDbContext context, ILogger<RecurringTaskRenewalService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RunRenewalAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var recurring = await _context.DailyTasks
            .Where(t => t.Recurrence != 0)
            .ToListAsync(cancellationToken);

        int renewed = 0;

        foreach (var task in recurring)
        {
            var createdAtDate = DateTime.SpecifyKind(task.CreatedAt.Date, DateTimeKind.Utc);

            if (task.Recurrence == 1)
            {
                task.Date = today;
                task.IsCompleted = false;
                task.UpdatedAt = DateTime.UtcNow;
                renewed++;
            }
            else if (task.Recurrence == 2 && createdAtDate != today && today.DayOfWeek == DayOfWeek.Monday)
            {
                task.Date = today;
                task.IsCompleted = false;
                task.UpdatedAt = DateTime.UtcNow;
                renewed++;
            }
            else if (task.Recurrence == 3 && createdAtDate != today && today.Day == 1)
            {
                task.Date = today;
                task.IsCompleted = false;
                task.UpdatedAt = DateTime.UtcNow;
                renewed++;
            }
        }

        if (renewed > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Recurring task renewal completed. Renewed {Count} task(s).", renewed);
        }
    }
}
