using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/goals")]
[Authorize]
public class GoalsController : ControllerBase
{
    private readonly ILongTermGoalService _goalService;

    public GoalsController(ILongTermGoalService goalService)
    {
        _goalService = goalService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<LongTermGoalDto>>>> GetGoals(
        [FromQuery] string? status,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.GetGoalsAsync(userId, status, category, page, pageSize);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<LongTermGoalDto>>> GetGoal(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.GetGoalByIdAsync(userId, id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<LongTermGoalDto>>> CreateGoal([FromBody] CreateLongTermGoalRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.CreateGoalAsync(userId, request);
        return result.Success ? CreatedAtAction(nameof(GetGoal), new { id = result.Data?.Id }, result) : BadRequest(result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ApiResponse<LongTermGoalDto>>> UpdateGoal(Guid id, [FromBody] UpdateLongTermGoalRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.UpdateGoalAsync(userId, id, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteGoal(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.DeleteGoalAsync(userId, id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("{goalId}/milestones")]
    public async Task<ActionResult<ApiResponse<GoalMilestoneDto>>> CreateMilestone(Guid goalId, [FromBody] CreateGoalMilestoneRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.CreateMilestoneAsync(userId, goalId, request);
        return result.Success ? CreatedAtAction(nameof(GetGoal), new { id = goalId }, result) : BadRequest(result);
    }

    [HttpPut("{goalId}/milestones/{milestoneId}")]
    public async Task<ActionResult<ApiResponse<GoalMilestoneDto>>> UpdateMilestone(Guid goalId, Guid milestoneId, [FromBody] UpdateGoalMilestoneRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.UpdateMilestoneAsync(userId, goalId, milestoneId, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("{goalId}/milestones/{milestoneId}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMilestone(Guid goalId, Guid milestoneId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.DeleteMilestoneAsync(userId, goalId, milestoneId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPatch("{goalId}/milestones/{milestoneId}/toggle")]
    public async Task<ActionResult<ApiResponse<GoalMilestoneDto>>> ToggleMilestone(Guid goalId, Guid milestoneId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.ToggleMilestoneAsync(userId, goalId, milestoneId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("{goalId}/tasks")]
    public async Task<ActionResult<ApiResponse<GoalTaskDto>>> CreateGoalTask(Guid goalId, [FromBody] CreateGoalTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.CreateGoalTaskAsync(userId, goalId, request);
        return result.Success ? CreatedAtAction(nameof(GetGoal), new { id = goalId }, result) : BadRequest(result);
    }

    [HttpPut("{goalId}/tasks/{taskId}")]
    public async Task<ActionResult<ApiResponse<GoalTaskDto>>> UpdateGoalTask(Guid goalId, Guid taskId, [FromBody] UpdateGoalTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.UpdateGoalTaskAsync(userId, goalId, taskId, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("{goalId}/tasks/{taskId}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteGoalTask(Guid goalId, Guid taskId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.DeleteGoalTaskAsync(userId, goalId, taskId);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPatch("{goalId}/tasks/{taskId}/toggle")]
    public async Task<ActionResult<ApiResponse<GoalTaskDto>>> ToggleGoalTask(Guid goalId, Guid taskId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var result = await _goalService.ToggleGoalTaskAsync(userId, goalId, taskId);
        return result.Success ? Ok(result) : NotFound(result);
    }
}

