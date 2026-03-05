using DailyPlanner.Application.Interfaces;

namespace DailyPlanner.Api.Jobs;

public class RecurringTaskRenewalJob
{
    private readonly IRecurringTaskRenewalService _renewalService;

    public RecurringTaskRenewalJob(IRecurringTaskRenewalService renewalService)
    {
        _renewalService = renewalService;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        await _renewalService.RunRenewalAsync(cancellationToken);
    }
}
