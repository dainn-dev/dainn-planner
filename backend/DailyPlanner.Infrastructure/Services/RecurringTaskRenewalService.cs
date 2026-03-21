using System.Text.Json;
using DailyPlanner.Domain.Entities;
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

        // Track existing instances for today to keep the job idempotent.
        var existingTodayTaskIdsList = await _context.TaskInstances
            .Where(i => i.InstanceDate.Date == today.Date)
            .Select(i => i.TaskId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var existingTodayTaskIds = new HashSet<Guid>(existingTodayTaskIdsList);

        var recurringTemplates = await _context.DailyTasks
            .Where(t => t.Recurrence != 0)
            .ToListAsync(cancellationToken);

        int renewed = 0;

        foreach (var task in recurringTemplates)
        {
            if (!ShouldRunToday(task, today))
                continue;

            if (existingTodayTaskIds.Contains(task.Id))
                continue;

            _context.TaskInstances.Add(new TaskInstance
            {
                Id = Guid.NewGuid(),
                TaskId = task.Id,
                InstanceDate = today,
                Description = null,
                Status = TaskInstance.StatusIncomplete,
                IsOverride = false,
                CreatedAt = DateTime.UtcNow
            });

            existingTodayTaskIds.Add(task.Id);
            renewed++;
        }

        int moved = 0;
        if (enabledUserIds.Count > 0)
        {
            var incompleteYesterday = await
                (from inst in _context.TaskInstances
                 join task in _context.DailyTasks on inst.TaskId equals task.Id
                 where inst.Status == TaskInstance.StatusIncomplete
                       && inst.InstanceDate.Date == yesterday.Date
                       && enabledUserIds.Contains(task.UserId)
                 select new { inst.TaskId, inst.Description })
                .ToListAsync(cancellationToken);

            foreach (var row in incompleteYesterday)
            {
                // Only copy if today doesn't already have an instance for the task.
                if (existingTodayTaskIds.Contains(row.TaskId))
                    continue;

                _context.TaskInstances.Add(new TaskInstance
                {
                    Id = Guid.NewGuid(),
                    TaskId = row.TaskId,
                    InstanceDate = today,
                    Description = row.Description,
                    Status = TaskInstance.StatusIncomplete,
                    IsOverride = false,
                    CreatedAt = DateTime.UtcNow
                });

                existingTodayTaskIds.Add(row.TaskId);
                moved++;
            }
        }

        if (renewed > 0 || moved > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            if (renewed > 0)
                _logger.LogInformation("Recurring task renewal completed. Created {Count} task instance(s).", renewed);
            if (moved > 0)
                _logger.LogInformation("Auto-move incomplete: copied {Count} instance(s) for users with autoMoveIncomplete enabled.", moved);
        }
    }

    private static bool ShouldRunToday(DailyTask task, DateTime today)
    {
        var createdAtDate = DateTime.SpecifyKind(task.CreatedAt.Date, DateTimeKind.Utc);

        return task.Recurrence switch
        {
            1 => true,
            2 => today.DayOfWeek == DayOfWeek.Monday && createdAtDate != today,
            3 => today.Day == 1 && createdAtDate != today,
            _ => false
        };
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
