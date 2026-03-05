using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface INotificationService
{
    Task<ApiResponse<List<NotificationDto>>> GetNotificationsAsync(string userId, bool? unread, string? type, int page = 1, int pageSize = 10);
    Task<ApiResponse<object>> MarkAsReadAsync(string userId, Guid notificationId);
    Task<ApiResponse<object>> MarkAllAsReadAsync(string userId);
    Task<ApiResponse<object>> DeleteNotificationAsync(string userId, Guid notificationId);
    Task<ApiResponse<object>> DeleteAllNotificationsAsync(string userId);
}

