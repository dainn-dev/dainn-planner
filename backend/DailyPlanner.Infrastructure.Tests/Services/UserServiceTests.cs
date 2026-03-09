using System.Text.Json;
using Xunit;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Moq;
using AutoMapper;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class UserServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly IMapper _mapper;
    private readonly Mock<IWebHostEnvironment> _environmentMock;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
        
        _environmentMock = new Mock<IWebHostEnvironment>();
        _environmentMock.Setup(e => e.ContentRootPath).Returns(Path.GetTempPath());
        _environmentMock.Setup(e => e.WebRootPath).Returns((string)null);

        _service = new UserService(_userManagerMock.Object, _mapper, _context, _environmentMock.Object);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ShouldReturnUser_WhenExists()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);

        // Act
        var result = await _service.GetCurrentUserAsync(user.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Email.Should().Be(user.Email);
    }

    [Fact]
    public async Task GetCurrentUserAsync_ShouldReturnError_WhenUserNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        _userManagerMock.Setup(x => x.FindByIdAsync(userId)).ReturnsAsync((ApplicationUser)null);

        // Act
        var result = await _service.GetCurrentUserAsync(userId);

        // Assert
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found");
    }

    [Fact]
    public async Task UpdateUserAsync_ShouldUpdateUser()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var request = new UpdateUserRequest { FullName = "Updated Name", Phone = "123456789" };

        // Act
        var result = await _service.UpdateUserAsync(user.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        user.FullName.Should().Be("Updated Name");
        user.Phone.Should().Be("123456789");
        _userManagerMock.Verify(x => x.UpdateAsync(user), Times.Once);
    }

    [Fact]
    public async Task UpdateUserAsync_ShouldReturnError_WhenUserNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        _userManagerMock.Setup(x => x.FindByIdAsync(userId)).ReturnsAsync((ApplicationUser)null);
        var request = new UpdateUserRequest { FullName = "Updated Name" };

        // Act
        var result = await _service.UpdateUserAsync(userId, request);

        // Assert
        result.Success.Should().BeFalse();
    }

    [Fact]
    public async Task UploadAvatarAsync_ShouldSaveFileAndUpdateUser()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        _userManagerMock.Setup(x => x.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        var fileStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes("test image content"));
        var fileName = "avatar.jpg";

        // Act
        var result = await _service.UploadAvatarAsync(user.Id, fileStream, fileName);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNullOrEmpty();
        result.Data.Should().Contain("/uploads/avatars/");
        user.AvatarUrl.Should().NotBeNull();
    }

    [Fact]
    public async Task UploadAvatarAsync_ShouldReturnError_WhenUserNotFound()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        _userManagerMock.Setup(x => x.FindByIdAsync(userId)).ReturnsAsync((ApplicationUser)null);
        var fileStream = new MemoryStream();
        var fileName = "avatar.jpg";

        // Act
        var result = await _service.UploadAvatarAsync(userId, fileStream, fileName);

        // Assert
        result.Success.Should().BeFalse();
    }

    [Fact]
    public async Task GetSettingsAsync_ShouldReturnSettings()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);

        // Act
        var result = await _service.GetSettingsAsync(user.Id);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Data.Should().NotBeNull();
        var dataJson = JsonSerializer.Serialize(result.Data.Data);
        dataJson.Should().Contain("general");
        dataJson.Should().Contain("plans");
    }

    [Fact]
    public async Task UpdateSettingsAsync_ShouldUpdateSettings()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.FindByIdAsync(user.Id)).ReturnsAsync(user);
        var request = JsonDocument.Parse("{\"general\":{\"language\":\"en\",\"timezone\":\"UTC\"}}").RootElement;

        // Act
        var result = await _service.UpdateSettingsAsync(user.Id, request);

        // Assert
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Data.Should().NotBeNull();
        var row = await _context.UserSettings.FirstOrDefaultAsync(s => s.UserId == user.Id);
        row.Should().NotBeNull();
        row!.Data.Should().Contain("en");
        row.Data.Should().Contain("UTC");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

