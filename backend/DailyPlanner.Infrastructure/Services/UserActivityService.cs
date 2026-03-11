using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class UserActivityService : IUserActivityService
{
    private readonly ApplicationDbContext _context;

    public UserActivityService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task RecordAsync(string userId, string type, string action, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default)
    {
        var activity = new UserActivity
        {
            UserId = userId,
            Type = type,
            Action = action,
            CreatedAt = DateTime.UtcNow,
            EntityType = entityType,
            EntityId = entityId
        };
        _context.UserActivities.Add(activity);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
