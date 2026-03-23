using Xunit;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using AutoMapper;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class DailyTaskServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly DailyTaskService _service;

    public DailyTaskServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        var userActivityServiceMock = new Mock<IUserActivityService>();
        _service = new DailyTaskService(_context, _mapper, userActivityServiceMock.Object);
    }

    [Fact]
    public async Task GetTasksAsync_ShouldReturnAllTasks_WhenNoFilters()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var task1 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 1", Date = DateTime.Today };
        var task2 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 2", Date = DateTime.Today.AddDays(1) };
        var inst1 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task1.Id,
            InstanceDate = DateTime.SpecifyKind(task1.Date.Date, DateTimeKind.Utc),
            Description = "d1",
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };
        var inst2 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task2.Id,
            InstanceDate = DateTime.SpecifyKind(task2.Date.Date, DateTimeKind.Utc),
            Description = "d2",
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.DailyTasks.AddRange(task1, task2);
        _context.TaskInstances.AddRange(inst1, inst2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTasksAsync(userId, null, null, 1, 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(2);
        result.Data.Page.Should().Be(1);
        result.Data.PageSize.Should().Be(10);
    }

    [Fact]
    public async Task GetTasksAsync_ShouldFilterByDate()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var targetDate = DateTime.Today;
        var task1 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 1", Date = targetDate };
        var task2 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 2", Date = targetDate.AddDays(1) };
        var inst1 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task1.Id,
            InstanceDate = DateTime.SpecifyKind(task1.Date.Date, DateTimeKind.Utc),
            Description = "d1",
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };
        var inst2 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task2.Id,
            InstanceDate = DateTime.SpecifyKind(task2.Date.Date, DateTimeKind.Utc),
            Description = "d2",
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.DailyTasks.AddRange(task1, task2);
        _context.TaskInstances.AddRange(inst1, inst2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTasksAsync(userId, targetDate, null, 1, 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.TotalCount.Should().Be(1);
        result.Data.Items!.First().Date.Date.Should().Be(targetDate.Date);
    }

    [Fact]
    public async Task GetTasksAsync_ShouldFilterByCompleted()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var instanceDate = DateTime.Today;
        var task1 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 1", Date = instanceDate };
        var task2 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 2", Date = instanceDate };
        var inst1 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task1.Id,
            InstanceDate = DateTime.SpecifyKind(instanceDate.Date, DateTimeKind.Utc),
            Description = "d1",
            Status = TaskInstance.StatusCompleted,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow,
            CompletedDate = DateTime.UtcNow
        };
        var inst2 = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task2.Id,
            InstanceDate = DateTime.SpecifyKind(instanceDate.Date, DateTimeKind.Utc),
            Description = "d2",
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.DailyTasks.AddRange(task1, task2);
        _context.TaskInstances.AddRange(inst1, inst2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTasksAsync(userId, null, true, 1, 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.TotalCount.Should().Be(1);
        result.Data.Items!.First().IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task CreateTaskAsync_ShouldCreateTask()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var request = new CreateDailyTaskRequest
        {
            Title = "New Task",
            Description = "Description",
            Date = DateTime.Today,
            Priority = 1
        };

        // Act
        var result = await _service.CreateTaskAsync(userId, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("New Task");
        result.Data.IsCompleted.Should().BeFalse();

        result.Data.Description.Should().Be("Description");

        var instanceDateUtc = DateTime.SpecifyKind(request.Date.Date, DateTimeKind.Utc);
        var instance = await _context.TaskInstances.FirstOrDefaultAsync(i => i.TaskId == result.Data.Id && i.InstanceDate.Date == instanceDateUtc.Date);
        instance.Should().NotBeNull();
        instance!.Status.Should().Be(TaskInstance.StatusIncomplete);
    }

    [Fact]
    public async Task UpdateTaskAsync_ShouldUpdateTask()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var task = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Original", Date = DateTime.Today };
        _context.DailyTasks.Add(task);
        await _context.SaveChangesAsync();

        var request = new UpdateDailyTaskRequest { Title = "Updated" };

        // Act
        var result = await _service.UpdateTaskAsync(userId, task.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Title.Should().Be("Updated");
    }

    [Fact]
    public async Task UpdateTaskAsync_ShouldReturnNotFound_WhenTaskDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var request = new UpdateDailyTaskRequest { Title = "Updated" };

        // Act
        var result = await _service.UpdateTaskAsync(userId, Guid.NewGuid(), request);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Task not found");
    }

    [Fact]
    public async Task DeleteTaskAsync_ShouldDeleteTask()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var task = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task" };
        _context.DailyTasks.Add(task);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteTaskAsync(userId, task.Id);

        // Assert
        result.Success.Should().BeTrue();
        var deletedTask = await _context.DailyTasks.FindAsync(task.Id);
        deletedTask.Should().BeNull();

        var taskInstances = await _context.TaskInstances.Where(i => i.TaskId == task.Id).ToListAsync();
        taskInstances.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteTaskAsync_ShouldReturnNotFound_WhenTaskDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.DeleteTaskAsync(userId, Guid.NewGuid());

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Task not found");
    }

    [Fact]
    public async Task ToggleTaskAsync_ShouldToggleCompletionStatus()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var task = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task", IsCompleted = false };
        _context.DailyTasks.Add(task);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ToggleTaskAsync(userId, task.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.IsCompleted.Should().BeTrue();

        // Toggle again
        var result2 = await _service.ToggleTaskAsync(userId, task.Id);
        result2.Data!.IsCompleted.Should().BeFalse();

        var todayUtc = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var instance = await _context.TaskInstances.FirstOrDefaultAsync(i => i.TaskId == task.Id && i.InstanceDate.Date == todayUtc.Date);
        instance.Should().NotBeNull();
        instance!.Status.Should().Be(TaskInstance.StatusIncomplete);
    }

    [Fact]
    public async Task RecurringTaskRenewalService_ShouldBeIdempotent()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var todayUtc = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        var recurring = new DailyTask
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = "Recurring",
            Priority = 0,
            Recurrence = 1, // daily
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            Date = DateTime.UtcNow.AddDays(-2)
        };
        _context.DailyTasks.Add(recurring);
        await _context.SaveChangesAsync();

        var logger = new Mock<ILogger<RecurringTaskRenewalService>>();
        var renewalService = new RecurringTaskRenewalService(_context, logger.Object);

        // Act
        await renewalService.RunRenewalAsync();
        await renewalService.RunRenewalAsync();

        // Assert
        var instances = await _context.TaskInstances
            .Where(i => i.TaskId == recurring.Id && i.InstanceDate.Date == todayUtc.Date)
            .ToListAsync();

        instances.Should().HaveCount(1);
        instances[0].Status.Should().Be(TaskInstance.StatusIncomplete);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

