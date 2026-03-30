using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/integrations/google/events")]
[Authorize]
public class GoogleCalendarEventsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IGoogleCalendarService _googleCalendarService;

    public GoogleCalendarEventsController(ApplicationDbContext context, IGoogleCalendarService googleCalendarService)
    {
        _context = context;
        _googleCalendarService = googleCalendarService;
    }

    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    [HttpPut("{googleEventId}")]
    public async Task<ActionResult<ApiResponse<object>>> UpsertGoogleEvent([FromRoute] string googleEventId, [FromBody] CreateCalendarEventRequest request, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var existing = await _context.CalendarEvents
            .FirstOrDefaultAsync(e => e.UserId == userId && e.GoogleEventId == googleEventId, ct);

        if (existing == null)
        {
            existing = new CalendarEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                GoogleEventId = googleEventId,
            };
            _context.CalendarEvents.Add(existing);
        }

        existing.Title = request.Title;
        existing.Description = request.Description;
        existing.StartDate = ToUtcFull(request.StartDate);
        existing.EndDate = ToUtcFull(request.EndDate);
        existing.Location = request.Location;
        existing.Color = request.Color;
        existing.IsAllDay = request.IsAllDay;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        // This will PATCH an existing google event when GoogleEventId is provided.
        await _googleCalendarService.PushCalendarEventToGoogleAsync(userId, existing, ct);

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Google event saved successfully"
        });
    }

    [HttpPatch("{googleEventId}")]
    public Task<ActionResult<ApiResponse<object>>> UpsertGoogleEventPatch([FromRoute] string googleEventId, [FromBody] CreateCalendarEventRequest request, CancellationToken ct)
        => UpsertGoogleEvent(googleEventId, request, ct);

    [HttpDelete("{googleEventId}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteGoogleEvent([FromRoute] string googleEventId, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        // Delete local mirror row (if exists), then delete in Google.
        // We delete local first so UI refresh doesn't show stale data.
        var existing = await _context.CalendarEvents
            .FirstOrDefaultAsync(e => e.UserId == userId && e.GoogleEventId == googleEventId, ct);

        if (existing != null)
        {
            _context.CalendarEvents.Remove(existing);
            await _context.SaveChangesAsync(ct);
        }

        await _googleCalendarService.DeleteGoogleCalendarEventAsync(userId, googleEventId, ct);

        return Ok(new ApiResponse<object>
        {
            Success = true,
            Message = "Google event deleted successfully"
        });
    }
}

