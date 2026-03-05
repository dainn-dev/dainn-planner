namespace DailyPlanner.Application.Interfaces;

public interface IRecurringTaskRenewalService
{
    Task RunRenewalAsync(CancellationToken cancellationToken = default);
}
