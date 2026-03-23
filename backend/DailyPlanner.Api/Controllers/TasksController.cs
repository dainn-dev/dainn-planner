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
    public async Task<ActionResult<ApiResponse<PagedTasksResult>>> GetTasks([FromQuery] DateTime? date, [FromQuery] bool? completed, [FromQuery] int? page, [FromQuery] int? pageSize, [FromQuery] int? priority, [FromQuery] string? tag, [FromQuery] string? sortOrder, [FromQuery] Guid? goalId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.GetTasksAsync(userId, date, completed, page, pageSize, priority, tag, sortOrder, goalId);
        return Ok(result);
    }

    [HttpGet("tags")]
    public async Task<ActionResult<ApiResponse<TagsWithUsageResult>>> GetTagsWithUsage([FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.GetTagsWithUsageAsync(userId, dateFrom, dateTo);
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

    [HttpGet("{taskId}/history")]
    public async Task<ActionResult<ApiResponse<TaskHistoryResult>>> GetTaskHistory([FromRoute] Guid taskId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _taskService.GetTaskHistoryAsync(userId, taskId);
        return Ok(result);
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
}

