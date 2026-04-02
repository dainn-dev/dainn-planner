using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace DailyPlanner.Api.Services;

public class WebPushService : IWebPushService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<WebPushService> _logger;
    private readonly string? _publicKey;
    private readonly string? _privateKey;
    private readonly string _subject;

    public WebPushService(ApplicationDbContext context, IConfiguration configuration, ILogger<WebPushService> logger)
    {
        _context = context;
        _logger = logger;
        _publicKey = configuration["Vapid:PublicKey"];
        _privateKey = configuration["Vapid:PrivateKey"];
        _subject = configuration["Vapid:Subject"] ?? "mailto:admin@example.com";
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_publicKey) && !string.IsNullOrWhiteSpace(_privateKey);

    public async Task SendTaskReminderAsync(DailyPlanner.Domain.Entities.ApplicationUser user, DailyPlanner.Domain.Entities.DailyTask task, DateTime reminderUtc, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return;

        var subs = await _context.UserPushSubscriptions
            .AsNoTracking()
            .Where(s => s.UserId == user.Id)
            .ToListAsync(cancellationToken);

        if (subs.Count == 0)
            return;

        var minutes = ComputeMinutesUntilStart(task, reminderUtc, user.Timezone);
        var body = minutes != null && minutes >= 0 && minutes <= 24 * 60
            ? $"{task.Title} — starting in {minutes} min"
            : $"Task: {task.Title}";

        var payload = System.Text.Json.JsonSerializer.Serialize(new
        {
            title = "Task reminder",
            body,
            url = "/daily"
        });

        var vapid = new VapidDetails(_subject, _publicKey!, _privateKey!);
        var client = new WebPushClient();

        foreach (var sub in subs)
        {
            try
            {
                var pushSub = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                client.SendNotification(pushSub, payload, vapid);
            }
            catch (WebPushException wpe)
            {
                _logger.LogWarning(wpe, "WebPush failed for user {UserId}, endpoint {Endpoint} (status {StatusCode})", user.Id, sub.Endpoint, wpe.StatusCode);
                if (wpe.StatusCode == System.Net.HttpStatusCode.Gone || wpe.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    await DeleteSubscriptionAsync(sub.Id, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WebPush failed for user {UserId}, endpoint {Endpoint}", user.Id, sub.Endpoint);
            }
        }
    }

    private async Task DeleteSubscriptionAsync(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            var entity = await _context.UserPushSubscriptions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
            if (entity == null) return;
            _context.UserPushSubscriptions.Remove(entity);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to delete stale push subscription {Id}", id);
        }
    }

    private static int? ComputeMinutesUntilStart(DailyPlanner.Domain.Entities.DailyTask task, DateTime reminderUtc, string? timezone)
    {
        try
        {
            // Prefer StartTime if set; otherwise use task.Date as the scheduled time.
            if (!string.IsNullOrWhiteSpace(task.StartTime) && TimeSpan.TryParse(task.StartTime.Trim(), out var tod))
            {
                var tz = TimeZoneInfo.Utc;
                if (!string.IsNullOrWhiteSpace(timezone))
                {
                    try { tz = TimeZoneInfo.FindSystemTimeZoneById(timezone); } catch { /* ignore */ }
                }

                var taskDateUtc = DateTime.SpecifyKind(task.Date.Date, DateTimeKind.Utc);
                var taskDateInUserTz = TimeZoneInfo.ConvertTimeFromUtc(taskDateUtc, tz);
                var startLocal = taskDateInUserTz.Date.Add(tod);
                startLocal = DateTime.SpecifyKind(startLocal, DateTimeKind.Unspecified);
                var startUtc = TimeZoneInfo.ConvertTimeToUtc(startLocal, tz);
                return (int)Math.Round((startUtc - reminderUtc).TotalMinutes, MidpointRounding.AwayFromZero);
            }

            var scheduledUtc = task.Date.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(task.Date, DateTimeKind.Utc)
                : task.Date.ToUniversalTime();

            return (int)Math.Round((scheduledUtc - reminderUtc).TotalMinutes, MidpointRounding.AwayFromZero);
        }
        catch
        {
            return null;
        }
    }
}

