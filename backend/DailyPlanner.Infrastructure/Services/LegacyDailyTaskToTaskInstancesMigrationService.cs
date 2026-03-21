using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class LegacyDailyTaskToTaskInstancesMigrationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<LegacyDailyTaskToTaskInstancesMigrationService> _logger;

    public LegacyDailyTaskToTaskInstancesMigrationService(
        ApplicationDbContext context,
        ILogger<LegacyDailyTaskToTaskInstancesMigrationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken = default)
    {
        // Idempotent: creates TaskInstances only when a matching (TaskId, InstanceDate) doesn't already exist.
        var existingKeys = await _context.TaskInstances
            .AsNoTracking()
            .Select(i => new
            {
                i.TaskId,
                Date = DateTime.SpecifyKind(i.InstanceDate.Date, DateTimeKind.Utc)
            })
            .ToListAsync(cancellationToken);

        var existingKeySet = new HashSet<(Guid TaskId, DateTime InstanceDate)>(existingKeys.Select(k => (k.TaskId, k.Date)));

        var dailyTasks = await _context.DailyTasks
            .AsNoTracking()
            .Select(t => new
            {
                t.Id,
                t.Date,
                t.Description,
                t.IsCompleted,
                t.CompletedDate,
                t.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var toInsert = new List<TaskInstance>();

        foreach (var t in dailyTasks)
        {
            var instanceDateUtc = DateTime.SpecifyKind(t.Date.Date, DateTimeKind.Utc);
            var key = (t.Id, instanceDateUtc);

            if (existingKeySet.Contains(key))
                continue;

            DateTime? completedDateUtc = t.CompletedDate.HasValue
                ? DateTime.SpecifyKind(t.CompletedDate.Value, DateTimeKind.Utc)
                : null;

            toInsert.Add(new TaskInstance
            {
                Id = Guid.NewGuid(),
                TaskId = t.Id,
                InstanceDate = instanceDateUtc,
                Description = t.Description,
                Status = t.IsCompleted ? TaskInstance.StatusCompleted : TaskInstance.StatusIncomplete,
                CompletedDate = t.IsCompleted ? completedDateUtc : null,
                IsOverride = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = t.UpdatedAt
            });
        }

        if (toInsert.Count == 0)
        {
            _logger.LogInformation("Legacy DailyTask -> TaskInstances migration: nothing to insert.");
            return;
        }

        _context.TaskInstances.AddRange(toInsert);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Legacy DailyTask -> TaskInstances migration: inserted {Count} TaskInstance(s).", toInsert.Count);
    }
}

