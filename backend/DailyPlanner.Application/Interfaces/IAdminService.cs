using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IAdminService
{
    Task<ApiResponse<AdminDashboardStatsDto>> GetDashboardStatsAsync();
    Task<ApiResponse<UserGrowthResultDto>> GetUserGrowthAsync(int days = 30);
    Task<ApiResponse<AdminUserStatsDto>> GetUserStatsAsync();
    Task<ApiResponse<PagedUsersResultDto>> GetUsersAsync(string? search, string? status, string? role, string? dateRange, string? sort, int page = 1, int pageSize = 10);
    Task<byte[]> GetUsersExportAsync(string format, string? search, string? status, string? role, string? dateRange, string? sort, IReadOnlyList<string>? ids = null);
    Task<ApiResponse<AdminUserDto>> CreateUserAsync(AdminCreateUserRequest request);
    Task<ApiResponse<AdminUserDto>> GetUserByIdAsync(string userId);
    Task<ApiResponse<AdminUserDto>> UpdateUserAsync(string userId, AdminUpdateUserRequest request);
    Task<ApiResponse<object>> DeleteUserAsync(string userId);
    Task<ApiResponse<object>> ResetUserPasswordAsync(string userId, AdminResetPasswordRequest request);
}

