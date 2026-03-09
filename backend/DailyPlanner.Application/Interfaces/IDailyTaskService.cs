using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IDailyTaskService
{
    Task<ApiResponse<PagedTasksResult>> GetTasksAsync(string userId, DateTime? date, bool? completed, int? page, int? pageSize, int? priority = null, string? tag = null, string? sortOrder = null, Guid? goalId = null);
    Task<ApiResponse<DailyTaskDto>> CreateTaskAsync(string userId, CreateDailyTaskRequest request);
    Task<ApiResponse<DailyTaskDto>> UpdateTaskAsync(string userId, Guid taskId, UpdateDailyTaskRequest request);
    Task<ApiResponse<object>> DeleteTaskAsync(string userId, Guid taskId);
    Task<ApiResponse<DailyTaskDto>> ToggleTaskAsync(string userId, Guid taskId);
    Task<ApiResponse<MainDailyGoalDto?>> GetMainGoalAsync(string userId, DateTime date);
    Task<ApiResponse<MainDailyGoalDto>> UpsertMainGoalAsync(string userId, DateTime date, UpdateMainDailyGoalRequest request);
    Task<ApiResponse<TagsWithUsageResult>> GetTagsWithUsageAsync(string userId, DateTime? dateFrom = null, DateTime? dateTo = null);
}

