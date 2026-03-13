namespace DailyPlanner.Application.Interfaces;

public interface IGoogleRecaptchaService
{
    Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken cancellationToken = default);
}
