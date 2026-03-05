using Xunit;
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
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class JwtServiceTests
{
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly JwtService _jwtService;

    public JwtServiceTests()
    {
        _configuration = TestHelpers.CreateConfiguration();
        _context = TestHelpers.CreateInMemoryDbContext();
        
        var store = new Mock<IUserStore<ApplicationUser>>();
        _userManagerMock = new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
        _userManagerMock.Setup(x => x.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string>());
        
        _jwtService = new JwtService(_configuration, _context, _userManagerMock.Object);
    }

    [Fact]
    public void GenerateToken_ShouldReturnValidToken()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();

        // Act
        var token = _jwtService.GenerateToken(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Should().Contain(".");
    }

    [Fact]
    public void GenerateToken_ShouldThrowException_WhenKeyNotConfigured()
    {
        // Arrange
        var config = new ConfigurationBuilder().Build();
        var store = new Mock<IUserStore<ApplicationUser>>();
        var userManager = new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
        var service = new JwtService(config, _context, userManager.Object);
        var user = TestHelpers.CreateTestUser();

        // Act & Assert
        Assert.Throws<InvalidOperationException>(() => service.GenerateToken(user));
    }

    [Fact]
    public void GenerateRefreshToken_ShouldReturnNonEmptyString()
    {
        // Act
        var token1 = _jwtService.GenerateRefreshToken();
        var token2 = _jwtService.GenerateRefreshToken();

        // Assert
        token1.Should().NotBeNullOrEmpty();
        token2.Should().NotBeNullOrEmpty();
        token1.Should().NotBe(token2); // Should be unique
    }

    [Fact]
    public async Task ValidateRefreshTokenAsync_ShouldReturnTrue_WhenTokenIsValid()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(userId, refreshToken);

        // Act
        var isValid = await _jwtService.ValidateRefreshTokenAsync(refreshToken, userId);

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateRefreshTokenAsync_ShouldReturnFalse_WhenTokenDoesNotExist()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = "invalid-token";

        // Act
        var isValid = await _jwtService.ValidateRefreshTokenAsync(refreshToken, userId);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public async Task ValidateRefreshTokenAsync_ShouldReturnFalse_WhenTokenIsRevoked()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(userId, refreshToken);
        await _jwtService.RevokeRefreshTokenAsync(refreshToken);

        // Act
        var isValid = await _jwtService.ValidateRefreshTokenAsync(refreshToken, userId);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public async Task ValidateRefreshTokenAsync_ShouldReturnFalse_WhenTokenIsExpired()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = _jwtService.GenerateRefreshToken();
        var token = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(-1), // Expired
            IsRevoked = false
        };
        _context.RefreshTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var isValid = await _jwtService.ValidateRefreshTokenAsync(refreshToken, userId);

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public async Task SaveRefreshTokenAsync_ShouldSaveTokenToDatabase()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = _jwtService.GenerateRefreshToken();

        // Act
        await _jwtService.SaveRefreshTokenAsync(userId, refreshToken);

        // Assert
        var savedToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken && rt.UserId == userId);
        savedToken.Should().NotBeNull();
        savedToken!.IsRevoked.Should().BeFalse();
        savedToken.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_ShouldMarkTokenAsRevoked()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var refreshToken = _jwtService.GenerateRefreshToken();
        await _jwtService.SaveRefreshTokenAsync(userId, refreshToken);

        // Act
        await _jwtService.RevokeRefreshTokenAsync(refreshToken);

        // Assert
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);
        token.Should().NotBeNull();
        token!.IsRevoked.Should().BeTrue();
    }

    [Fact]
    public async Task RevokeRefreshTokenAsync_ShouldNotThrow_WhenTokenDoesNotExist()
    {
        // Arrange
        var refreshToken = "non-existent-token";

        // Act
        var act = async () => await _jwtService.RevokeRefreshTokenAsync(refreshToken);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task GenerateTokenAsync_ShouldReturnValidToken()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(new List<string>());

        // Act
        var token = await _jwtService.GenerateTokenAsync(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Should().Contain(".");
    }

    [Fact]
    public async Task GenerateTokenAsync_ShouldIncludeRoleClaims()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        var roles = new List<string> { "Admin", "User" };
        _userManagerMock.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(roles);

        // Act
        var token = await _jwtService.GenerateTokenAsync(user);

        // Assert
        token.Should().NotBeNullOrEmpty();
        
        var handler = new JwtSecurityTokenHandler();
        var jsonToken = handler.ReadJwtToken(token);
        var roleClaims = jsonToken.Claims.Where(c => c.Type == ClaimTypes.Role).ToList();
        
        roleClaims.Should().HaveCount(2);
        roleClaims.Should().Contain(c => c.Value == "Admin");
        roleClaims.Should().Contain(c => c.Value == "User");
    }

    [Fact]
    public async Task GenerateTokenAsync_ShouldIncludeUserClaims()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(new List<string>());

        // Act
        var token = await _jwtService.GenerateTokenAsync(user);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jsonToken = handler.ReadJwtToken(token);
        
        jsonToken.Claims.Should().Contain(c => c.Type == ClaimTypes.NameIdentifier && c.Value == user.Id);
        jsonToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Email && c.Value == user.Email);
        jsonToken.Claims.Should().Contain(c => c.Type == ClaimTypes.Name && c.Value == user.FullName);
    }

    [Fact]
    public async Task GenerateTokenAsync_ShouldThrowException_WhenKeyNotConfigured()
    {
        // Arrange
        var config = new ConfigurationBuilder().Build();
        var service = new JwtService(config, _context, _userManagerMock.Object);
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(new List<string>());

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(async () => await service.GenerateTokenAsync(user));
    }

    [Fact]
    public async Task GenerateTokenAsync_ShouldNotIncludeRoles_WhenUserHasNoRoles()
    {
        // Arrange
        var user = TestHelpers.CreateTestUser();
        _userManagerMock.Setup(x => x.GetRolesAsync(user))
            .ReturnsAsync(new List<string>());

        // Act
        var token = await _jwtService.GenerateTokenAsync(user);

        // Assert
        var handler = new JwtSecurityTokenHandler();
        var jsonToken = handler.ReadJwtToken(token);
        var roleClaims = jsonToken.Claims.Where(c => c.Type == ClaimTypes.Role).ToList();
        
        roleClaims.Should().BeEmpty();
    }
}

