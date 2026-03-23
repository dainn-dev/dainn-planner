# .NET Workflow Skill

Dùng khi thêm service mới, controller mới, hoặc feature mới vào backend.

## Thêm Service Mới

### 1. Interface (Application layer)

`DailyPlanner.Application/Interfaces/IMyService.cs`:
```csharp
namespace DailyPlanner.Application.Interfaces;

public interface IMyService
{
    Task<ApiResponse<MyDto>> GetAsync(string userId, Guid id);
    Task<ApiResponse<MyDto>> CreateAsync(string userId, CreateMyRequest request);
}
```

### 2. Implementation (Infrastructure layer)

`DailyPlanner.Infrastructure/Services/MyService.cs`:
```csharp
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure.Data;
using AutoMapper;

namespace DailyPlanner.Infrastructure.Services;

public class MyService : IMyService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public MyService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<MyDto>> GetAsync(string userId, Guid id)
    {
        var entity = await _context.MyEntities
            .FirstOrDefaultAsync(e => e.Id == id && e.UserId == userId);

        if (entity == null)
            return ApiResponse<MyDto>.Fail("Not found");

        return ApiResponse<MyDto>.Ok(_mapper.Map<MyDto>(entity));
    }
}
```

### 3. Register DI

`DailyPlanner.Infrastructure/DependencyInjection.cs` — thêm:
```csharp
services.AddScoped<IMyService, MyService>();
```

### 4. Thêm Mapping

`DailyPlanner.Application/Mappings/MappingProfile.cs`:
```csharp
CreateMap<MyEntity, MyDto>();
CreateMap<CreateMyRequest, MyEntity>();
```

## Thêm Controller Mới

`DailyPlanner.Api/Controllers/MyController.cs`:
```csharp
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/my-resource")]
[Authorize]
public class MyController : ControllerBase
{
    private readonly IMyService _service;

    public MyController(IMyService service)
    {
        _service = service;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<MyDto>>> Get(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _service.GetAsync(userId, id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MyDto>>> Create([FromBody] CreateMyRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _service.CreateAsync(userId, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}
```

## Thêm Hangfire Job

### Job class

`DailyPlanner.Api/Jobs/MyJob.cs`:
```csharp
using DailyPlanner.Application.Interfaces;

namespace DailyPlanner.Api.Jobs;

public class MyJob
{
    private readonly IMyService _service;
    private readonly ILogger<MyJob> _logger;

    public MyJob(IMyService service, ILogger<MyJob> logger)
    {
        _service = service;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken ct)
    {
        _logger.LogInformation("MyJob starting");
        // ...
    }
}
```

### Register + Schedule (Program.cs)

```csharp
// Register
builder.Services.AddScoped<MyJob>();

// Schedule
RecurringJob.AddOrUpdate<MyJob>(
    "my-job-id",
    j => j.ExecuteAsync(CancellationToken.None),
    "0 3 * * *"); // daily at 03:00 UTC
```

## Build & Check

```bash
dotnet build                    # Check compile errors
dotnet run --project DailyPlanner.Api  # Run dev server
```

Swagger UI: http://localhost:5113/swagger — verify endpoints appear correctly.

## ApiResponse Pattern

```csharp
// Success
return ApiResponse<T>.Ok(data, "Optional message");

// Failure
return ApiResponse<T>.Fail("Error message");

// Check at controller
var result = await _service.DoSomethingAsync(...);
return result.Success ? Ok(result) : BadRequest(result);
```
