using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface ITodoistIntegrationService
{
    Task<ApiResponse<List<TodoistTaskViewDto>>> GetActiveTasksAsync(string userId, CancellationToken cancellationToken = default);

    Task<ApiResponse<object?>> CloseTaskAsync(string userId, string todoistTaskId, CancellationToken cancellationToken = default);
}
