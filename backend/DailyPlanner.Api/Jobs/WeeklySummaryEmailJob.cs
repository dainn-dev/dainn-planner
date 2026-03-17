using System.Text.Json;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Api.Jobs;

/// <summary>
/// Runs weekly (e.g. Monday 09:00 UTC). Finds users with notifications.emailWeeklySummary enabled,
/// computes last week's performance (tasks and goal milestones), records UserStatistics, and sends a summary email.
/// </summary>
public class WeeklySummaryEmailJob
{
    private readonly ApplicationDbContext _context;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WeeklySummaryEmailJob> _logger;

    public WeeklySummaryEmailJob(
        ApplicationDbContext context,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<WeeklySummaryEmailJob> logger)
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
            _logger.LogWarning("Email:SmtpHost not configured; skipping weekly summary job");
            return;
        }

        var (periodStart, periodEnd) = GetLastWeekUtc();
        _logger.LogInformation("Weekly summary job running for period {PeriodStart:yyyy-MM-dd} to {PeriodEnd:yyyy-MM-dd}", periodStart, periodEnd);

        var settingsWithUser = await _context.UserSettings
            .Include(s => s.User)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var recipients = new List<ApplicationUser>();
        foreach (var setting in settingsWithUser)
        {
            if (setting.User?.EmailConfirmed != true || string.IsNullOrWhiteSpace(setting.User.Email))
                continue;
            if (!HasEmailWeeklySummaryEnabled(setting.Data))
                continue;
            recipients.Add(setting.User);
        }

        foreach (var user in recipients)
        {
            try
            {
                await ProcessUserAsync(user.Id, user.Email!, user.FullName ?? "User", periodStart, periodEnd, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send weekly summary to user {UserId} ({Email})", user.Id, user.Email);
            }
        }
    }

    private static (DateTime PeriodStart, DateTime PeriodEnd) GetLastWeekUtc()
    {
        var today = DateTime.UtcNow.Date;
        var daysSinceMonday = ((int)today.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
        var lastMonday = today.AddDays(-7 - daysSinceMonday);
        var periodStart = lastMonday;
        var periodEnd = lastMonday.AddDays(7).AddTicks(-1);
        return (periodStart, periodEnd);
    }

    private static bool HasEmailWeeklySummaryEnabled(string settingsJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(settingsJson);
            if (doc.RootElement.TryGetProperty("notifications", out var notifications) &&
                notifications.TryGetProperty("emailWeeklySummary", out var value))
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

    private async Task ProcessUserAsync(string userId, string email, string displayName, DateTime periodStart, DateTime periodEnd, CancellationToken cancellationToken)
    {
        var periodEndInclusive = periodEnd.Date.AddDays(1).AddTicks(-1);

        var tasksInPeriod = await _context.DailyTasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.Date >= periodStart && t.Date <= periodEndInclusive)
            .Select(t => new { t.IsCompleted })
            .ToListAsync(cancellationToken);

        var tasksTotal = tasksInPeriod.Count;
        var tasksCompleted = tasksInPeriod.Count(t => t.IsCompleted);

        var milestonesCompleted = await _context.GoalMilestones
            .AsNoTracking()
            .Where(m => m.CompletedDate != null && m.CompletedDate >= periodStart && m.CompletedDate <= periodEndInclusive)
            .Join(_context.LongTermGoals,
                m => m.GoalId,
                g => g.Id,
                (m, g) => g)
            .Where(g => g.UserId == userId)
            .CountAsync(cancellationToken);

        var existing = await _context.UserStatistics
            .FirstOrDefaultAsync(s => s.UserId == userId && s.PeriodStart == periodStart, cancellationToken);

        if (existing != null)
        {
            existing.TasksTotal = tasksTotal;
            existing.TasksCompleted = tasksCompleted;
            existing.GoalsMilestonesCompleted = milestonesCompleted;
            existing.PeriodEnd = periodEnd;
        }
        else
        {
            _context.UserStatistics.Add(new UserStatistics
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                TasksCompleted = tasksCompleted,
                TasksTotal = tasksTotal,
                GoalsMilestonesCompleted = milestonesCompleted,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        var subject = "Your weekly summary – MyPlanner";
        var body = BuildEmailBody(displayName, periodStart, periodEnd, tasksCompleted, tasksTotal, milestonesCompleted);

        await _emailSender.SendAsync(email, subject, body, cancellationToken);
        _logger.LogInformation("Weekly summary sent to {Email}", email);
    }

    private static string BuildEmailBody(string displayName, DateTime periodStart, DateTime periodEnd, int tasksCompleted, int tasksTotal, int milestonesCompleted)
    {
        var periodLabel = $"{periodStart:MMM d} – {periodEnd:MMM d, yyyy}";
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"<p>Hi " + System.Net.WebUtility.HtmlEncode(displayName) + ",</p>");
        sb.AppendLine("<p>Here's your work summary for the past week (" + periodLabel + ").</p>");
        sb.AppendLine("<ul>");
        sb.AppendLine($"<li><strong>Tasks:</strong> You completed {tasksCompleted} of {tasksTotal} tasks.</li>");
        if (milestonesCompleted > 0)
            sb.AppendLine($"<li><strong>Goals:</strong> {milestonesCompleted} goal milestone(s) completed.</li>");
        sb.AppendLine("</ul>");
        sb.AppendLine("<p>Keep up the great work!</p>");
        sb.AppendLine("<p>— MyPlanner</p>");
        return sb.ToString();
    }
}
