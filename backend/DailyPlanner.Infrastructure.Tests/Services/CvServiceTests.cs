using System.Text.Json;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using DailyPlanner.Infrastructure.Services;
using DailyPlanner.Infrastructure.Tests.Helpers;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class CvServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;

    public CvServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
    }

    public void Dispose() => _context.Dispose();

    private CvService CreateService(Mock<UserManager<ApplicationUser>>? userManagerMock = null)
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        var um = userManagerMock ?? new Mock<UserManager<ApplicationUser>>(
            store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        var email = new Mock<IEmailSender>();
        var opts = Options.Create(new CvOptions
        {
            RootDomain = "dainn.online",
            DashboardBaseUrl = "http://localhost:3000",
            ContactToEmail = "",
        });
        var resolver = new CvTenantResolver(opts);
        var logger = Mock.Of<ILogger<CvService>>();
        var config = new ConfigurationBuilder().AddInMemoryCollection().Build();
        var env = Mock.Of<Microsoft.AspNetCore.Hosting.IWebHostEnvironment>();
        return new CvService(_context, um.Object, email.Object, opts, resolver, config, logger, env);
    }

    [Fact]
    public async Task GetPublicSiteAsync_Returns404_WhenSlugNull()
    {
        var svc = CreateService();
        var r = await svc.GetPublicSiteAsync(null);
        r.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task RequestSiteAsync_CreatesPendingSite()
    {
        var owner = TestHelpers.CreateTestUser();
        _context.Users.Add(owner);
        await _context.SaveChangesAsync();

        var svc = CreateService();
        var r = await svc.RequestSiteAsync(owner.Id, "newslug");
        r.StatusCode.Should().Be(200);

        var site = await _context.CvSites.SingleAsync();
        site.Slug.Should().Be("newslug");
        site.Status.Should().Be("pending");
        site.OwnerUserId.Should().Be(owner.Id);
    }

    [Fact]
    public async Task AdminApproveSiteAsync_SetsApproved_AndNotification()
    {
        var owner = TestHelpers.CreateTestUser(email: "o@test.com");
        _context.Users.Add(owner);
        await _context.SaveChangesAsync();

        var site = new CvSite
        {
            Id = Guid.NewGuid(),
            OwnerUserId = owner.Id,
            Slug = "s1",
            Status = "pending",
            RequestedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _context.CvSites.Add(site);
        await _context.SaveChangesAsync();

        var store = new Mock<IUserStore<ApplicationUser>>();
        var um = new Mock<UserManager<ApplicationUser>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        um.Setup(x => x.FindByIdAsync(owner.Id)).ReturnsAsync(owner);

        var svc = CreateService(um);
        var adminId = Guid.NewGuid().ToString();
        var r = await svc.AdminApproveSiteAsync(adminId, site.Id);

        r.StatusCode.Should().Be(200);
        var reloaded = await _context.CvSites.AsNoTracking().FirstAsync(s => s.Id == site.Id);
        reloaded.Status.Should().Be("approved");
        (await _context.Notifications.CountAsync(n => n.Type == "site_approved")).Should().Be(1);
    }

    [Fact]
    public async Task ListNotificationsAsync_OnlyReturnsCvSiteTypes()
    {
        var owner = TestHelpers.CreateTestUser();
        _context.Users.Add(owner);
        _context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Type = "TaskReminder",
            Title = "Planner",
            Message = "x",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        _context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = owner.Id,
            Type = "site_approved",
            Title = "CV",
            Message = "ok",
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
        });
        await _context.SaveChangesAsync();

        var svc = CreateService();
        var r = await svc.ListNotificationsAsync(owner.Id, unreadOnly: false, limit: 10, offset: 0);

        r.StatusCode.Should().Be(200);
        var json = JsonSerializer.Serialize(r.Body);
        json.Should().Contain("site_approved");
        json.Should().NotContain("TaskReminder");
    }
}
