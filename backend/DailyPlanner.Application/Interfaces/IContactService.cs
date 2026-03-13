using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IContactService
{
    Task<ApiResponse<object>> SubmitAsync(ContactRequestDto request, string? userId, CancellationToken cancellationToken = default);
}
