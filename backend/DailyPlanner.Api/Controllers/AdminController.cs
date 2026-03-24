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
    private readonly ILogsService _logsService;
    private readonly DailyPlanner.Infrastructure.Services.LogStreamService _logStreamService;

    public AdminController(IAdminService adminService, ILogsService logsService, DailyPlanner.Infrastructure.Services.LogStreamService logStreamService)
    {
        _adminService = adminService;
        _logsService = logsService;
        _logStreamService = logStreamService;
    }

    [HttpGet("dashboard/stats")]
    public async Task<ActionResult<ApiResponse<AdminDashboardStatsDto>>> GetDashboardStats()
    {
        var result = await _adminService.GetDashboardStatsAsync();
        return Ok(result);
    }

    [HttpGet("dashboard/user-growth")]
    public async Task<ActionResult<ApiResponse<UserGrowthResultDto>>> GetUserGrowth([FromQuery] int days = 30)
    {
        var result = await _adminService.GetUserGrowthAsync(days);
        return Ok(result);
    }

    [HttpGet("users")]
    public async Task<ActionResult<ApiResponse<PagedUsersResultDto>>> GetUsers(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? role,
        [FromQuery] string? dateRange,
        [FromQuery] string? sort,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _adminService.GetUsersAsync(search, status, role, dateRange, sort, page, pageSize);
        return Ok(result);
    }

    [HttpGet("users/stats")]
    public async Task<ActionResult<ApiResponse<AdminUserStatsDto>>> GetUserStats()
    {
        var result = await _adminService.GetUserStatsAsync();
        return Ok(result);
    }

    [HttpPost("users")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> CreateUser([FromBody] AdminCreateUserRequest request)
    {
        var result = await _adminService.CreateUserAsync(request ?? new AdminCreateUserRequest());
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpGet("users/export")]
    public async Task<IActionResult> ExportUsers(
        [FromQuery] string format,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? role,
        [FromQuery] string? dateRange,
        [FromQuery] string? sort,
        [FromQuery] string? ids)
    {
        var formatLower = (format ?? "").ToLowerInvariant();
        if (formatLower is not "csv" and not "excel" and not "pdf")
            return BadRequest(new { message = "Invalid format. Use csv, excel, or pdf." });

        IReadOnlyList<string>? idList = null;
        if (!string.IsNullOrWhiteSpace(ids))
        {
            idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (idList.Count == 0) idList = null;
        }

        var bytes = await _adminService.GetUsersExportAsync(formatLower, search, status, role, dateRange, sort, idList);

        var (contentType, fileName) = formatLower switch
        {
            "csv" => ("text/csv", "users_export.csv"),
            "excel" => ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "users_export.xlsx"),
            "pdf" => ("application/pdf", "users_export.pdf"),
            _ => ("application/octet-stream", "users_export.bin")
        };

        return File(bytes, contentType, fileName);
    }

    [HttpGet("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> GetUser(string id)
    {
        var result = await _adminService.GetUserByIdAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPut("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<AdminUserDto>>> UpdateUser(string id, [FromBody] AdminUpdateUserRequest request)
    {
        var result = await _adminService.UpdateUserAsync(id, request);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<ActionResult<ApiResponse<object>>> ResetUserPassword(string id, [FromBody] AdminResetPasswordRequest request)
    {
        var result = await _adminService.ResetUserPasswordAsync(id, request ?? new AdminResetPasswordRequest());
        if (!result.Success && result.Message?.Contains("not found") == true)
            return NotFound(result);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }

    [HttpDelete("users/{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteUser(string id)
    {
        var result = await _adminService.DeleteUserAsync(id);
        return result.Success ? Ok(result) : NotFound(result);
    }

    [HttpGet("logs/stream")]
    public async Task StreamLog([FromQuery] string? file, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(file) || !DailyPlanner.Infrastructure.Services.LogStreamService.IsValidFileName(file))
        {
            Response.StatusCode = 400;
            Response.ContentType = "application/json";
            await Response.WriteAsJsonAsync(new { success = false, message = "Missing or invalid file name." });
            return;
        }

        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";

        var bodyFeature = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpResponseBodyFeature>();
        bodyFeature?.DisableBuffering();

        var ct = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, HttpContext.RequestAborted).Token;
        await _logStreamService.StreamLogFileAsync(file, Response.Body, ct);
    }

    [HttpGet("logs")]
    public async Task<ActionResult<ApiResponse<List<LogFileEntryDto>>>> GetLogFiles(CancellationToken cancellationToken = default)
    {
        var result = await _logsService.GetLogFilesAsync(cancellationToken);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpGet("logs/{fileName}")]
    public async Task<ActionResult<ApiResponse<LogContentDto>>> GetLogContent(
        string fileName,
        [FromQuery] int? tail,
        [FromQuery] int? offset,
        [FromQuery] int? limit,
        CancellationToken cancellationToken = default)
    {
        var result = await _logsService.GetLogContentAsync(fileName, tail, offset, limit, cancellationToken);
        if (!result.Success && result.Message?.Contains("not found") == true)
            return NotFound(result);
        if (!result.Success)
            return BadRequest(result);
        return Ok(result);
    }
}

