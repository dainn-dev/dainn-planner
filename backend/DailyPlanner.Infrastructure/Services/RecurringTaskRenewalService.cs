using System.Text.Json;
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
        var yesterday = today.AddDays(-1);

        var enabledUserIds = await GetAutoMoveIncompleteEnabledUserIdsAsync(cancellationToken);

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

        int moved = 0;
        if (enabledUserIds.Count > 0)
        {
            var incompleteYesterday = await _context.DailyTasks
                .Where(t => !t.IsCompleted
                    && t.Date >= yesterday
                    && t.Date < today
                    && enabledUserIds.Contains(t.UserId))
                .ToListAsync(cancellationToken);

            foreach (var task in incompleteYesterday)
            {
                task.Date = today;
                task.UpdatedAt = DateTime.UtcNow;
                moved++;
            }
        }

        if (renewed > 0 || moved > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            if (renewed > 0)
                _logger.LogInformation("Recurring task renewal completed. Renewed {Count} task(s).", renewed);
            if (moved > 0)
                _logger.LogInformation("Auto-move incomplete: moved {Count} task(s) for users with autoMoveIncomplete enabled.", moved);
        }
    }

    private static bool IsAutoMoveIncompleteEnabled(string? dataJson)
    {
        if (string.IsNullOrWhiteSpace(dataJson))
            return false;
        try
        {
            using var doc = JsonDocument.Parse(dataJson);
            if (doc.RootElement.TryGetProperty("plans", out var plans) &&
                plans.TryGetProperty("autoMoveIncomplete", out var value))
            {
                return value.ValueKind == JsonValueKind.True || (value.ValueKind == JsonValueKind.String && value.GetString() == "true");
            }
            return false;
        }
        catch
        {
            return false;
        }
    }

    private async Task<HashSet<string>> GetAutoMoveIncompleteEnabledUserIdsAsync(CancellationToken cancellationToken)
    {
        var settings = await _context.UserSettings
            .AsNoTracking()
            .Select(s => new { s.UserId, s.Data })
            .ToListAsync(cancellationToken);

        var enabled = new HashSet<string>(StringComparer.Ordinal);
        foreach (var s in settings)
        {
            if (IsAutoMoveIncompleteEnabled(s.Data))
                enabled.Add(s.UserId);
        }
        return enabled;
    }
}
