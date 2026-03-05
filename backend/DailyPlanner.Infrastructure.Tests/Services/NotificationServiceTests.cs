using Xunit;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using AutoMapper;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class NotificationServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly NotificationService _service;

    public NotificationServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        _service = new NotificationService(_context, _mapper);
    }

    [Fact]
    public async Task GetNotificationsAsync_ShouldReturnAllNotifications_WhenNoFilters()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notif1 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 1", IsRead = false };
        var notif2 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 2", IsRead = true };
        _context.Notifications.AddRange(notif1, notif2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetNotificationsAsync(userId, null, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetNotificationsAsync_ShouldFilterByUnread()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notif1 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 1", IsRead = false };
        var notif2 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 2", IsRead = true };
        _context.Notifications.AddRange(notif1, notif2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetNotificationsAsync(userId, true, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(1);
        result.Data!.First().IsRead.Should().BeFalse();
    }

    [Fact]
    public async Task GetNotificationsAsync_ShouldFilterByType()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notif1 = new Notification { Id = Guid.NewGuid(), UserId = userId, Type = "TaskReminder", Title = "Notif 1" };
        var notif2 = new Notification { Id = Guid.NewGuid(), UserId = userId, Type = "System", Title = "Notif 2" };
        _context.Notifications.AddRange(notif1, notif2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetNotificationsAsync(userId, null, "TaskReminder");

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(1);
        result.Data!.First().Type.Should().Be("TaskReminder");
    }

    [Fact]
    public async Task GetNotificationsAsync_ShouldSupportPagination()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        for (int i = 0; i < 15; i++)
        {
            _context.Notifications.Add(new Notification 
            { 
                Id = Guid.NewGuid(), 
                UserId = userId, 
                Title = $"Notif {i}" 
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetNotificationsAsync(userId, null, null, page: 1, pageSize: 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(10);
    }

    [Fact]
    public async Task MarkAsReadAsync_ShouldMarkNotificationAsRead()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notification = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif", IsRead = false };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.MarkAsReadAsync(userId, notification.Id);

        // Assert
        result.Success.Should().BeTrue();
        var updated = await _context.Notifications.FindAsync(notification.Id);
        updated!.IsRead.Should().BeTrue();
    }

    [Fact]
    public async Task MarkAsReadAsync_ShouldReturnError_WhenNotificationNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.MarkAsReadAsync(userId, Guid.NewGuid());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Notification not found");
    }

    [Fact]
    public async Task MarkAllAsReadAsync_ShouldMarkAllAsRead()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notif1 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 1", IsRead = false };
        var notif2 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 2", IsRead = false };
        _context.Notifications.AddRange(notif1, notif2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.MarkAllAsReadAsync(userId);

        // Assert
        result.Success.Should().BeTrue();
        var notifications = await _context.Notifications.Where(n => n.UserId == userId).ToListAsync();
        notifications.All(n => n.IsRead).Should().BeTrue();
    }

    [Fact]
    public async Task DeleteNotificationAsync_ShouldDeleteNotification()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notification = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif" };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteNotificationAsync(userId, notification.Id);

        // Assert
        result.Success.Should().BeTrue();
        var deleted = await _context.Notifications.FindAsync(notification.Id);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAllNotificationsAsync_ShouldDeleteAllNotifications()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var notif1 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 1" };
        var notif2 = new Notification { Id = Guid.NewGuid(), UserId = userId, Title = "Notif 2" };
        _context.Notifications.AddRange(notif1, notif2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteAllNotificationsAsync(userId);

        // Assert
        result.Success.Should().BeTrue();
        var notifications = await _context.Notifications.Where(n => n.UserId == userId).ToListAsync();
        notifications.Should().BeEmpty();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

