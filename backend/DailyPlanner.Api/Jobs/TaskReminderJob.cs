using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using DailyPlanner.Api.Services;

namespace DailyPlanner.Api.Jobs;

/// <summary>
/// Runs every minute to send in-app notifications at the exact reminder time (hours and minutes)
/// for tasks that have ReminderTime set. Uses the task's date and the user's timezone to compute
/// the reminder moment in UTC, then creates a notification when that time is reached.
/// </summary>
public class TaskReminderJob
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TaskReminderJob> _logger;
    private readonly IWebPushService _webPushService;

    public TaskReminderJob(ApplicationDbContext context, ILogger<TaskReminderJob> logger, IWebPushService webPushService)
    {
        _context = context;
        _logger = logger;
        _webPushService = webPushService;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        // Look at tasks from yesterday to today (UTC) so we cover all timezones
        var fromDate = nowUtc.Date.AddDays(-1);
        var toDate = nowUtc.Date.AddDays(1);

        var taskInstances = await _context.TaskInstances
            .AsNoTracking()
            .Where(i =>
                i.Status == TaskInstance.StatusIncomplete
                && i.InstanceDate >= fromDate
                && i.InstanceDate <= toDate
                && i.Task.ReminderTime != null
                && i.Task.ReminderTime != "")
            .Include(i => i.Task)
            .ThenInclude(t => t.User)
            .ToListAsync(cancellationToken);

        var windowStart = nowUtc.AddSeconds(-90);
        var windowEnd = nowUtc.AddSeconds(30);
        var dueTasks = new List<(DailyTask task, DateTime reminderUtc)>();

        foreach (var inst in taskInstances)
        {
            var task = inst.Task;
            if (task == null)
                continue;

            if (!ParseReminderTime(task.ReminderTime!, out var timeOfDay))
                continue;

            var reminderUtc = GetReminderUtc(inst.InstanceDate, timeOfDay, task.User?.Timezone);
            if (reminderUtc == null)
                continue;

            if (reminderUtc < windowStart || reminderUtc > windowEnd)
                continue;

            dueTasks.Add((task, reminderUtc.Value));
        }

        if (dueTasks.Count == 0)
            return;

        var taskIds = dueTasks.Select(x => x.task.Id).Distinct().ToList();
        var cutoff = nowUtc.AddMinutes(-5);
        var alreadySentIds = await _context.Notifications
            .Where(n => n.Type == "TaskReminder"
                && n.ReferenceId != null
                && taskIds.Contains(n.ReferenceId.Value)
                && n.CreatedAt >= cutoff)
            .Select(n => n.ReferenceId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var (task, reminderUtc) in dueTasks)
        {
            if (alreadySentIds.Contains(task.Id))
                continue;

            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = task.UserId,
                Type = "TaskReminder",
                Title = "Reminder",
                Message = $"Task: {task.Title}",
                Icon = "schedule",
                IconColor = "text-primary",
                IsRead = false,
                ReferenceId = task.Id,
            });
            _logger.LogInformation("Task reminder created for task {TaskId} at {ReminderUtc}", task.Id, reminderUtc);

            try
            {
                if (task.User != null)
                {
                    await _webPushService.SendTaskReminderAsync(task.User, task, reminderUtc, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Web push send failed for task {TaskId}", task.Id);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static bool ParseReminderTime(string reminderTime, out TimeSpan timeOfDay)
    {
        timeOfDay = TimeSpan.Zero;
        if (string.IsNullOrWhiteSpace(reminderTime))
            return false;
        // Support "HH:mm" or "H:mm"
        return TimeSpan.TryParse(reminderTime.Trim(), null, out timeOfDay)
            && timeOfDay.TotalHours < 24
            && timeOfDay.TotalMinutes >= 0;
    }

    private static DateTime? GetReminderUtc(DateTime taskDateUtc, TimeSpan timeOfDay, string? userTimezone)
    {
        try
        {
            taskDateUtc = DateTime.SpecifyKind(taskDateUtc.Date, DateTimeKind.Utc);
            var tz = TimeZoneInfo.Utc;
            if (!string.IsNullOrWhiteSpace(userTimezone))
            {
                try
                {
                    tz = TimeZoneInfo.FindSystemTimeZoneById(userTimezone);
                }
                catch (TimeZoneNotFoundException)
                {
                    // Fall back to UTC
                }
            }

            // Task date in user's timezone (to get the correct calendar day)
            var taskDateInUserTz = TimeZoneInfo.ConvertTimeFromUtc(taskDateUtc, tz);
            var reminderLocal = taskDateInUserTz.Date.Add(timeOfDay);
            if (reminderLocal.Kind != DateTimeKind.Unspecified)
                reminderLocal = DateTime.SpecifyKind(reminderLocal, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(reminderLocal, tz);
        }
        catch
        {
            return null;
        }
    }
}
