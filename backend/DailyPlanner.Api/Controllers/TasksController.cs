using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly IDailyTaskService _taskService;

    public TasksController(IDailyTaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedTasksResult>>> GetTasks([FromQuery] DateTime? date, [FromQuery] bool? completed, [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] int? priority, [FromQuery] string? tag, [FromQuery] string? sortOrder)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.GetTasksAsync(userId, date, completed, page, pageSize, priority, tag, sortOrder);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<DailyTaskDto>>> CreateTask([FromBody] CreateDailyTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.CreateTaskAsync(userId, request);
        return result.Success ? CreatedAtAction(nameof(GetTasks), new { id = result.Data?.Id }, result) : BadRequest(result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<DailyTaskDto>>> UpdateTask(Guid id, [FromBody] UpdateDailyTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.UpdateTaskAsync(userId, id, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteTask(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.DeleteTaskAsync(userId, id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPatch("{id}/toggle")]
    public async Task<ActionResult<ApiResponse<DailyTaskDto>>> ToggleTask(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.ToggleTaskAsync(userId, id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("main-goal")]
    public async Task<ActionResult<ApiResponse<MainDailyGoalDto?>>> GetMainGoal([FromQuery] DateTime date)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.GetMainGoalAsync(userId, date);
        return Ok(result);
    }

    [HttpPut("main-goal")]
    public async Task<ActionResult<ApiResponse<MainDailyGoalDto>>> UpsertMainGoal([FromQuery] DateTime date, [FromBody] UpdateMainDailyGoalRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.UpsertMainGoalAsync(userId, date, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }
}

