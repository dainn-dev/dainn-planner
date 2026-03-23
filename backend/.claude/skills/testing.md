# Testing Skill

## Framework

- **Unit Tests:** xUnit + FluentAssertions + Moq
- **DB:** InMemory EF Core (`TestHelpers.CreateInMemoryDbContext()`)
- **Location:** `DailyPlanner.Infrastructure.Tests/Services/`

## Chạy Tests

```bash
# Toàn bộ test suite
dotnet test

# Specific test class
dotnet test --filter "FullyQualifiedName~DailyTaskServiceTests"

# Specific test method
dotnet test --filter "FullyQualifiedName~GetTasksAsync_ShouldReturnAllTasks"

# Với output chi tiết
dotnet test --verbosity normal

# Với coverage (nếu có coverlet)
dotnet test --collect:"XPlat Code Coverage"
```

## Test Setup Pattern

```csharp
public class MyServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly MyService _service;

    public MyServiceTests()
    {
        _context = TestHelpers.CreateInMemoryDbContext();
        _mapper = TestHelpers.CreateMapper();
        var dependencyMock = new Mock<IDependency>();
        _service = new MyService(_context, _mapper, dependencyMock.Object);
    }

    [Fact]
    public async Task MethodName_ShouldDoX_WhenCondition()
    {
        // Arrange
        var userId = Guid.NewGuid().ToString();
        var user = TestHelpers.CreateTestUser(userId);
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.MethodAsync(userId, ...);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
    }

    public void Dispose() => _context.Dispose();
}
```

## Test Requirements

- **New feature:** Viết tests TRƯỚC implementation (TDD khi có thể)
- **Bug fix:** Viết regression test trước khi fix
- **Service method:** Test happy path + error path + auth (wrong userId)
- **Naming:** `MethodName_ShouldDoX_WhenCondition`

## Helpers Available

```csharp
TestHelpers.CreateInMemoryDbContext()   // Fresh InMemory DB
TestHelpers.CreateMapper()              // AutoMapper với MappingProfile
TestHelpers.CreateConfiguration()      // Config với JWT test keys
TestHelpers.CreateTestUser(id, email)  // ApplicationUser với default timezone vi
```

## Sau khi Test

Report: "Tests: X passed, Y failed, Z skipped."
Nếu có failure: fix trước khi tiếp tục.
