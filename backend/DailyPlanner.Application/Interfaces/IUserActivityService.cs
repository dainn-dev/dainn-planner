namespace DailyPlanner.Application.Interfaces;

public interface IUserActivityService
{
    Task RecordAsync(string userId, string type, string action, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default);
}
