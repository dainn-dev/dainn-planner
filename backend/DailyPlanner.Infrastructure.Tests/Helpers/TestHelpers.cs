using DailyPlanner.Application.Mappings;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using AutoMapper;
using System.Linq.Expressions;

namespace DailyPlanner.Infrastructure.Tests.Helpers;

public static class TestHelpers
{
    public static ApplicationDbContext CreateInMemoryDbContext(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName ?? Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }

    public static IMapper CreateMapper()
    {
        var configuration = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<MappingProfile>();
        });
        return configuration.CreateMapper();
    }

    public static IConfiguration CreateConfiguration()
    {
        var configuration = new Dictionary<string, string>
        {
            { "Jwt:Key", "TestKeyThatIsAtLeast32CharactersLongForJWT!" },
            { "Jwt:Issuer", "TestIssuer" },
            { "Jwt:Audience", "TestAudience" }
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(configuration)
            .Build();
    }

    public static ApplicationUser CreateTestUser(string? id = null, string email = "test@test.com")
    {
        return new ApplicationUser
        {
            Id = id ?? Guid.NewGuid().ToString(),
            Email = email,
            UserName = email,
            FullName = "Test User",
            Timezone = "Asia/Ho_Chi_Minh",
            Language = "vi",
            CreatedAt = DateTime.UtcNow
        };
    }
}

public static class QueryableExtensions
{
    public static IQueryable<T> BuildMock<T>(this IQueryable<T> source) where T : class
    {
        return source;
    }
}

