using Xunit;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using AutoMapper;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class AdminServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<RoleManager<IdentityRole>> _roleManagerMock;
    private readonly IMapper _mapper;
    private readonly AdminService _service;

    public AdminServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        
        var userStore = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(userStore.Object, null, null, null, null, null, null, null, null);
        _userManagerMock.Setup(x => x.Users).Returns(new List<ApplicationUser>().AsQueryable().BuildMock());

        var roleStore = new Mock<IRoleStore<IdentityRole>>();
        _roleManagerMock = new Mock<RoleManager<IdentityRole>>(roleStore.Object, null, null, null, null);

        var userActivityServiceMock = new Mock<IUserActivityService>();

        var emailSender = new Mock<IEmailSender>();
        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();
        _service = new AdminService(_context, _userManagerMock.Object, _roleManagerMock.Object, _mapper, userActivityServiceMock.Object, emailSender.Object, config);
    }

    [Fact]
    public async Task GetDashboardStatsAsync_ShouldReturnStats()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        _context.DailyTasks.Add(new DailyTask { Id = Guid.NewGuid(), UserId = user.Id, Title = "Task" });
        _context.LongTermGoals.Add(new LongTermGoal { Id = Guid.NewGuid(), UserId = user.Id, Title = "Goal" });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetDashboardStatsAsync();

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.TotalUsers.Should().BeGreaterThan(0);
        result.Data.TotalTasks.Should().BeGreaterThan(0);
        result.Data.TotalGoals.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetUsersAsync_ShouldReturnUsers()
    {
        // Arrange
        var user1 = TestHelpers.CreateTestUser(email: "user1@test.com");
        var user2 = TestHelpers.CreateTestUser(email: "user2@test.com");
        _context.Users.AddRange(user1, user2);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string> { "User" });

        // Act
        var result = await _service.GetUsersAsync(null, null, null, null, null, 1, 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(2);
        result.Data.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetUsersAsync_ShouldFilterBySearch()
    {
        // Arrange
        var user1 = TestHelpers.CreateTestUser(email: "john@test.com", id: "1");
        user1.FullName = "John Doe";
        var user2 = TestHelpers.CreateTestUser(email: "jane@test.com", id: "2");
        user2.FullName = "Jane Smith";
        _context.Users.AddRange(user1, user2);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string> { "User" });

        // Act
        var result = await _service.GetUsersAsync("john", null, null, null, null, 1, 10);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Items.Should().HaveCount(1);
        result.Data.Items.First().Email.Should().Contain("john");
        result.Data.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task GetUserByIdAsync_ShouldReturnUser_WhenExists()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });

        // Act
        var result = await _service.GetUserByIdAsync(user.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be(user.Id);
    }

    [Fact]
    public async Task UpdateUserAsync_ShouldUpdateUser()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });

        var request = new AdminUpdateUserRequest { FullName = "Updated Name", EmailConfirmed = true };

        // Act
        var result = await _service.UpdateUserAsync(user.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        user.FullName.Should().Be("Updated Name");
        user.EmailConfirmed.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateUserAsync_ShouldUpdateRoles()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.GetRolesAsync(user)).ReturnsAsync(new List<string> { "User" });
        _userManagerMock.Setup(x => x.RemoveFromRolesAsync(user, It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(IdentityResult.Success);
        _userManagerMock.Setup(x => x.AddToRolesAsync(user, It.IsAny<IEnumerable<string>>()))
            .ReturnsAsync(IdentityResult.Success);
        _roleManagerMock.Setup(x => x.RoleExistsAsync("Admin")).ReturnsAsync(false);
        _roleManagerMock.Setup(x => x.CreateAsync(It.IsAny<IdentityRole>())).ReturnsAsync(IdentityResult.Success);

        var request = new AdminUpdateUserRequest { Roles = new List<string> { "Admin" } };

        // Act
        var result = await _service.UpdateUserAsync(user.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        _userManagerMock.Verify(x => x.AddToRolesAsync(user, It.IsAny<IEnumerable<string>>()), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_ShouldDeleteUser()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.DeleteAsync(user)).ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _service.DeleteUserAsync(user.Id);

        // Assert
        result.Success.Should().BeTrue();
        _userManagerMock.Verify(x => x.DeleteAsync(user), Times.Once);
    }

    [Fact]
    public async Task DeleteUserAsync_ShouldReturnError_WhenDeletionFails()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.DeleteAsync(user))
            .ReturnsAsync(IdentityResult.Failed(new IdentityError { Code = "Error", Description = "Failed" }));

        // Act
        var result = await _service.DeleteUserAsync(user.Id);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().NotBeNull();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

