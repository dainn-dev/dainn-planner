using DailyPlanner.Domain.Entities;

namespace DailyPlanner.Api.Services;

public interface IWebPushService
{
    bool IsConfigured { get; }
    Task SendTaskReminderAsync(ApplicationUser user, DailyTask task, DateTime reminderUtc, CancellationToken cancellationToken = default);
}

