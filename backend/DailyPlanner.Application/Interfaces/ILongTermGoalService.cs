using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface ILongTermGoalService
{
    Task<ApiResponse<List<LongTermGoalDto>>> GetGoalsAsync(string userId, string? status, string? category, int page = 1, int pageSize = 10);
    Task<ApiResponse<LongTermGoalDto>> GetGoalByIdAsync(string userId, Guid goalId);
    Task<ApiResponse<LongTermGoalDto>> CreateGoalAsync(string userId, CreateLongTermGoalRequest request);
    Task<ApiResponse<LongTermGoalDto>> UpdateGoalAsync(string userId, Guid goalId, UpdateLongTermGoalRequest request);
    Task<ApiResponse<object>> DeleteGoalAsync(string userId, Guid goalId);
    Task<ApiResponse<GoalMilestoneDto>> CreateMilestoneAsync(string userId, Guid goalId, CreateGoalMilestoneRequest request);
    Task<ApiResponse<GoalMilestoneDto>> UpdateMilestoneAsync(string userId, Guid goalId, Guid milestoneId, UpdateGoalMilestoneRequest request);
    Task<ApiResponse<object>> DeleteMilestoneAsync(string userId, Guid goalId, Guid milestoneId);
    Task<ApiResponse<GoalMilestoneDto>> ToggleMilestoneAsync(string userId, Guid goalId, Guid milestoneId);
    Task<ApiResponse<GoalTaskDto>> CreateGoalTaskAsync(string userId, Guid goalId, CreateGoalTaskRequest request);
    Task<ApiResponse<GoalTaskDto>> UpdateGoalTaskAsync(string userId, Guid goalId, Guid taskId, UpdateGoalTaskRequest request);
    Task<ApiResponse<object>> DeleteGoalTaskAsync(string userId, Guid goalId, Guid taskId);
    Task<ApiResponse<GoalTaskDto>> ToggleGoalTaskAsync(string userId, Guid goalId, Guid taskId);
}

