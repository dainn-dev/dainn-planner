using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IAdminService
{
    Task<ApiResponse<AdminDashboardStatsDto>> GetDashboardStatsAsync();
    Task<ApiResponse<List<AdminUserDto>>> GetUsersAsync(string? search, int page = 1, int pageSize = 10);
    Task<ApiResponse<AdminUserDto>> GetUserByIdAsync(string userId);
    Task<ApiResponse<AdminUserDto>> UpdateUserAsync(string userId, AdminUpdateUserRequest request);
    Task<ApiResponse<object>> DeleteUserAsync(string userId);
}

