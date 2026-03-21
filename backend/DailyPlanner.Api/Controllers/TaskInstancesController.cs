using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/task-instances")]
[Authorize]
public class TaskInstancesController : ControllerBase
{
    private readonly IDailyTaskService _taskService;

    public TaskInstancesController(IDailyTaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<TaskInstanceDto>>> UpsertTaskInstance([FromBody] UpsertTaskInstanceRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.UpsertTaskInstanceAsync(userId, request);
        return Ok(result);
    }
}

