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
        _context.DailyTasks.AddRange(task1, task2);
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
        _context.DailyTasks.AddRange(task1, task2);
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
        var task1 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 1", IsCompleted = true };
        var task2 = new DailyTask { Id = Guid.NewGuid(), UserId = userId, Title = "Task 2", IsCompleted = false };
        _context.DailyTasks.AddRange(task1, task2);
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

        var task = await _context.DailyTasks.FirstOrDefaultAsync(t => t.Id == result.Data.Id);
        task.Should().NotBeNull();
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
    }

    [Fact]
    public async Task GetMainGoalAsync_ShouldReturnGoal_WhenExists()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var date = DateTime.Today;
        var goal = new MainDailyGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal", Date = date };
        _context.MainDailyGoals.Add(goal);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetMainGoalAsync(userId, date);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("Goal");
    }

    [Fact]
    public async Task GetMainGoalAsync_ShouldReturnNull_WhenDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var date = DateTime.Today;

        // Act
        var result = await _service.GetMainGoalAsync(userId, date);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().BeNull();
    }

    [Fact]
    public async Task UpsertMainGoalAsync_ShouldCreate_WhenDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var date = DateTime.Today;
        var request = new UpdateMainDailyGoalRequest { Title = "New Goal" };

        // Act
        var result = await _service.UpsertMainGoalAsync(userId, date, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("New Goal");

        var goal = await _context.MainDailyGoals.FirstOrDefaultAsync(g => g.UserId == userId && g.Date.Date == date.Date);
        goal.Should().NotBeNull();
    }

    [Fact]
    public async Task UpsertMainGoalAsync_ShouldUpdate_WhenExists()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var date = DateTime.Today;
        var goal = new MainDailyGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Original", Date = date };
        _context.MainDailyGoals.Add(goal);
        await _context.SaveChangesAsync();

        var request = new UpdateMainDailyGoalRequest { Title = "Updated" };

        // Act
        var result = await _service.UpsertMainGoalAsync(userId, date, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Title.Should().Be("Updated");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

