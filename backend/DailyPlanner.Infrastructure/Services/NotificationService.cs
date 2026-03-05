using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public NotificationService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<List<NotificationDto>>> GetNotificationsAsync(string userId, bool? unread, string? type, int page = 1, int pageSize = 10)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);

        if (unread.HasValue)
            query = query.Where(n => n.IsRead == !unread.Value);
        if (!string.IsNullOrEmpty(type))
            query = query.Where(n => n.Type == type);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ApiResponse<List<NotificationDto>>
        {
            Success = true,
            Data = _mapper.Map<List<NotificationDto>>(notifications)
        };
    }

    public async Task<ApiResponse<object>> MarkAsReadAsync(string userId, Guid notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Notification not found"
            };
        }

        notification.IsRead = true;
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Notification marked as read"
        };
    }

    public async Task<ApiResponse<object>> MarkAllAsReadAsync(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "All notifications marked as read"
        };
    }

    public async Task<ApiResponse<object>> DeleteNotificationAsync(string userId, Guid notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Notification not found"
            };
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Notification deleted successfully"
        };
    }

    public async Task<ApiResponse<object>> DeleteAllNotificationsAsync(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync();

        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "All notifications deleted successfully"
        };
    }
}

