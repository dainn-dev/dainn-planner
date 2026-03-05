using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<ApiResponse<AdminDashboardStatsDto>>> GetDashboardStats()
    {
        var result = await _adminService.GetDashboardStatsAsync();
        return Ok(result);
    }

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<List<AdminUserDto>>>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _adminService.GetUsersAsync(search, page, pageSize);
        return Ok(result);
    }

    [HttpGet("users/{id}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> GetUser(string id)
    {
        var result = await _adminService.GetUserByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("users/{id}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> UpdateUser(string id, [FromBody] AdminUpdateUserRequest request)
    {
        var result = await _adminService.UpdateUserAsync(id, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpDelete("users/{id}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteUser(string id)
    {
        var result = await _adminService.DeleteUserAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }
}

