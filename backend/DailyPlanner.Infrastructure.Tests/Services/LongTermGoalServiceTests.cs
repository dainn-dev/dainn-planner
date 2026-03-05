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

public class LongTermGoalServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly LongTermGoalService _service;

    public LongTermGoalServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        _service = new LongTermGoalService(_context, _mapper);
    }

    [Fact]
    public async Task GetGoalsAsync_ShouldReturnAllGoals_WhenNoFilters()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal1 = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal 1", Status = "Active" };
        var goal2 = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal 2", Status = "Completed" };
        _context.LongTermGoals.AddRange(goal1, goal2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetGoalsAsync(userId, null, null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetGoalsAsync_ShouldFilterByStatus()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal1 = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal 1", Status = "Active" };
        var goal2 = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal 2", Status = "Completed" };
        _context.LongTermGoals.AddRange(goal1, goal2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetGoalsAsync(userId, "Active", null);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().HaveCount(1);
        result.Data!.First().Status.Should().Be("Active");
    }

    [Fact]
    public async Task GetGoalByIdAsync_ShouldReturnGoal_WhenExists()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal", Status = "Active" };
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetGoalByIdAsync(userId, goal.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Title.Should().Be("Goal");
    }

    [Fact]
    public async Task CreateGoalAsync_ShouldCreateGoal()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var request = new CreateLongTermGoalRequest
        {
            Title = "New Goal",
            Description = "Description",
            Category = "Career",
            StartDate = DateTime.Today,
            TargetDate = DateTime.Today.AddMonths(6)
        };

        // Act
        var result = await _service.CreateGoalAsync(userId, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Status.Should().Be("Active");
        result.Data.Progress.Should().Be(0);
    }

    [Fact]
    public async Task UpdateGoalAsync_ShouldUpdateGoal()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Original", Status = "Active" };
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        var request = new UpdateLongTermGoalRequest { Title = "Updated", Status = "Completed" };

        // Act
        var result = await _service.UpdateGoalAsync(userId, goal.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Title.Should().Be("Updated");
        result.Data.Status.Should().Be("Completed");
    }

    [Fact]
    public async Task DeleteGoalAsync_ShouldDeleteGoal()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteGoalAsync(userId, goal.Id);

        // Assert
        result.Success.Should().BeTrue();
        var deleted = await _context.LongTermGoals.FindAsync(goal.Id);
        deleted.Should().BeNull();
    }

    [Fact]
    public async Task CreateMilestoneAsync_ShouldCreateMilestone()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        var request = new CreateGoalMilestoneRequest { Title = "Milestone", TargetDate = DateTime.Today.AddMonths(3) };

        // Act
        var result = await _service.CreateMilestoneAsync(userId, goal.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        var milestone = await _context.GoalMilestones.FirstOrDefaultAsync(m => m.GoalId == goal.Id);
        milestone.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateMilestoneAsync_ShouldUpdateMilestone()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        var milestone = new GoalMilestone { Id = Guid.NewGuid(), GoalId = goal.Id, Title = "Original", Goal = goal };
        _context.LongTermGoals.Add(goal);
        _context.GoalMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        var request = new UpdateGoalMilestoneRequest { Title = "Updated", IsCompleted = true };

        // Act
        var result = await _service.UpdateMilestoneAsync(userId, goal.Id, milestone.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.Title.Should().Be("Updated");
        result.Data.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleMilestoneAsync_ShouldToggleCompletion()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        var milestone = new GoalMilestone { Id = Guid.NewGuid(), GoalId = goal.Id, Title = "Milestone", IsCompleted = false, Goal = goal };
        _context.LongTermGoals.Add(goal);
        _context.GoalMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ToggleMilestoneAsync(userId, goal.Id, milestone.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task CreateGoalTaskAsync_ShouldCreateTask()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        var request = new CreateGoalTaskRequest { Title = "Task", Priority = 1 };

        // Act
        var result = await _service.CreateGoalTaskAsync(userId, goal.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        var task = await _context.GoalTasks.FirstOrDefaultAsync(t => t.GoalId == goal.Id);
        task.Should().NotBeNull();
    }

    [Fact]
    public async Task ToggleGoalTaskAsync_ShouldToggleCompletion()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal" };
        var task = new GoalTask { Id = Guid.NewGuid(), GoalId = goal.Id, Title = "Task", IsCompleted = false, Goal = goal };
        _context.LongTermGoals.Add(goal);
        _context.GoalTasks.Add(task);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ToggleGoalTaskAsync(userId, goal.Id, task.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data!.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task RecalculateProgressAsync_ShouldCalculateProgressBasedOnMilestones()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var goal = new LongTermGoal { Id = Guid.NewGuid(), UserId = userId, Title = "Goal", Progress = 0 };
        var milestone1 = new GoalMilestone { Id = Guid.NewGuid(), GoalId = goal.Id, IsCompleted = true, Goal = goal };
        var milestone2 = new GoalMilestone { Id = Guid.NewGuid(), GoalId = goal.Id, IsCompleted = false, Goal = goal };
        goal.Milestones.Add(milestone1);
        goal.Milestones.Add(milestone2);
        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();

        // Act - Update goal to trigger recalculation
        var request = new UpdateLongTermGoalRequest { Title = "Updated" };
        await _service.UpdateGoalAsync(userId, goal.Id, request);

        // Assert
        var updatedGoal = await _context.LongTermGoals.Include(g => g.Milestones).FirstOrDefaultAsync(g => g.Id == goal.Id);
        updatedGoal!.Progress.Should().Be(50); // 1 of 2 completed = 50%
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

