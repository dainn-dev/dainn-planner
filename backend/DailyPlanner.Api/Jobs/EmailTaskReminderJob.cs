using System.Text.Json;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Api.Jobs;

/// <summary>
/// Runs every minute. Finds users with notifications.emailTaskReminders enabled and sends them
/// an email when their tasks' ReminderTime is reached (task date + ReminderTime in user timezone).
/// </summary>
public class EmailTaskReminderJob
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailTaskReminderJob> _logger;

    public EmailTaskReminderJob(
        ApplicationDbContext context,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<EmailTaskReminderJob> logger)
    {
        _context = context;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_configuration["Email:SmtpHost"]))
        {
            _logger.LogDebug("Email:SmtpHost not configured; skipping email task reminder job");
            return;
        }

        var nowUtc = DateTime.UtcNow;
        var fromDate = nowUtc.Date.AddDays(-1);
        var toDate = nowUtc.Date.AddDays(1);

        var settingsWithUser = await _context.UserSettings
            .Include(s => s.User)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var enabledUserIds = new HashSet<string>();
        foreach (var setting in settingsWithUser)
        {
            if (setting.User?.EmailConfirmed != true || string.IsNullOrWhiteSpace(setting.User.Email))
                continue;
            if (!HasEmailTaskRemindersEnabled(setting.Data))
                continue;
            enabledUserIds.Add(setting.UserId);
        }

        if (enabledUserIds.Count == 0)
            return;

        var tasks = await _context.DailyTasks
            .AsNoTracking()
            .Where(t => !t.IsCompleted
                && t.ReminderTime != null
                && t.ReminderTime != ""
                && t.Date >= fromDate
                && t.Date <= toDate
                && enabledUserIds.Contains(t.UserId))
            .Include(t => t.User)
            .ToListAsync(cancellationToken);

        var windowStart = nowUtc.AddSeconds(-90);
        var windowEnd = nowUtc.AddSeconds(30);
        var dueTasks = new List<(DailyTask task, DateTime reminderUtc)>();

        foreach (var task in tasks)
        {
            if (!ParseReminderTime(task.ReminderTime!, out var timeOfDay))
                continue;

            var reminderUtc = GetReminderUtc(task.Date, timeOfDay, task.User?.Timezone);
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
            .Where(n => n.Type == "EmailTaskReminder"
                && n.ReferenceId != null
                && taskIds.Contains(n.ReferenceId.Value)
                && n.CreatedAt >= cutoff)
            .Select(n => n.ReferenceId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var toSend = dueTasks.Where(x => !alreadySentIds.Contains(x.task.Id)).ToList();
        if (toSend.Count == 0)
            return;

        var byUser = toSend.GroupBy(x => x.task.UserId).ToList();

        foreach (var group in byUser)
        {
            var userId = group.Key;
            var userTasks = group.Select(x => x.task).ToList();
            var user = userTasks[0].User;
            if (user == null || string.IsNullOrWhiteSpace(user.Email))
                continue;

            try
            {
                var subject = "Task reminder – MyPlanner";
                var body = BuildEmailBody(userTasks);
                await _emailSender.SendAsync(user.Email, subject, body, cancellationToken);

                foreach (var task in userTasks)
                {
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Type = "EmailTaskReminder",
                        Title = "Task reminder",
                        Message = $"Task: {task.Title}",
                        Icon = "schedule",
                        IconColor = "text-primary",
                        IsRead = false,
                        ReferenceId = task.Id,
                    });
                }

                _logger.LogInformation("Email task reminder sent to {Email} for {Count} task(s)", user.Email, userTasks.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email task reminder to user {UserId} ({Email})", userId, user.Email);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static bool HasEmailTaskRemindersEnabled(string settingsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(settingsJson);
            if (doc.RootElement.TryGetProperty("notifications", out var notifications) &&
                notifications.TryGetProperty("emailTaskReminders", out var value))
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

    private static string BuildEmailBody(List<DailyTask> userTasks)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("<p>You have the following task(s) due:</p>");
        sb.AppendLine("<ul>");
        foreach (var task in userTasks)
        {
            var title = System.Net.WebUtility.HtmlEncode(task.Title);
            var dateStr = task.Date.ToString("yyyy-MM-dd");
            sb.AppendLine($"<li><strong>{title}</strong> (due {dateStr})</li>");
        }
        sb.AppendLine("</ul>");
        sb.AppendLine("<p>— MyPlanner</p>");
        return sb.ToString();
    }

    private static bool ParseReminderTime(string reminderTime, out TimeSpan timeOfDay)
    {
        timeOfDay = TimeSpan.Zero;
        if (string.IsNullOrWhiteSpace(reminderTime))
            return false;
        return TimeSpan.TryParse(reminderTime.Trim(), null, out timeOfDay)
            && timeOfDay.TotalHours < 24
            && timeOfDay.TotalMinutes >= 0;
    }

    private static DateTime? GetReminderUtc(DateTime taskDateUtc, TimeSpan timeOfDay, string? userTimezone)
    {
        try
        {
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
