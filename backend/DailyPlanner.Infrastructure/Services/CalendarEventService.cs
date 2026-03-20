using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class CalendarEventService : ICalendarEventService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IGoogleCalendarService _googleCalendarService;

    private static DateTime ToUtc(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public CalendarEventService(ApplicationDbContext context, IMapper mapper, IGoogleCalendarService googleCalendarService)
    {
        _context = context;
        _mapper = mapper;
        _googleCalendarService = googleCalendarService;
    }

    public async Task<ApiResponse<List<CalendarEventDto>>> GetEventsAsync(string userId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.CalendarEvents.Where(e => e.UserId == userId);

        var startUtc = startDate.HasValue ? ToUtc(startDate.Value) : DateTime.UtcNow.Date;
        var endUtc = endDate.HasValue
            ? DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc)
            : startUtc.AddYears(1);

        if (startDate.HasValue)
            query = query.Where(e => e.StartDate >= startUtc);
        if (endDate.HasValue)
            query = query.Where(e => e.EndDate <= endUtc);

        var events = await query.OrderBy(e => e.StartDate).ToListAsync();
        var dtos = _mapper.Map<List<CalendarEventDto>>(events);

        var googleEvents = await _googleCalendarService.GetEventsAsync(userId, startUtc, endUtc);
        if (googleEvents.Count > 0)
        {
            dtos.AddRange(googleEvents);
            dtos = dtos.OrderBy(e => e.StartDate).ToList();
        }

        return new ApiResponse<List<CalendarEventDto>>
        {
            Success = true,
            Data = dtos
        };
    }

    public async Task<ApiResponse<CalendarEventDto>> GetEventByIdAsync(string userId, Guid eventId)
    {
        var eventEntity = await _context.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);

        if (eventEntity == null)
        {
            return new ApiResponse<CalendarEventDto>
            {
                Success = false,
                Message = "Event not found"
            };
        }

        return new ApiResponse<CalendarEventDto>
        {
            Success = true,
            Data = _mapper.Map<CalendarEventDto>(eventEntity)
        };
    }

    public async Task<ApiResponse<CalendarEventDto>> CreateEventAsync(string userId, CreateCalendarEventRequest request)
    {
        var eventEntity = new CalendarEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title,
            Description = request.Description,
            StartDate = ToUtcFull(request.StartDate),
            EndDate = ToUtcFull(request.EndDate),
            Location = request.Location,
            Color = request.Color,
            IsAllDay = request.IsAllDay
        };

        _context.CalendarEvents.Add(eventEntity);
        await _context.SaveChangesAsync();

        var pushedId = await _googleCalendarService.PushCalendarEventToGoogleAsync(userId, eventEntity);
        if (!string.IsNullOrEmpty(pushedId) && eventEntity.GoogleEventId != pushedId)
        {
            eventEntity.GoogleEventId = pushedId;
            await _context.SaveChangesAsync();
        }

        return new ApiResponse<CalendarEventDto>
        {
            Success = true,
            Message = "Event created successfully",
            Data = _mapper.Map<CalendarEventDto>(eventEntity)
        };
    }

    public async Task<ApiResponse<CalendarEventDto>> UpdateEventAsync(string userId, Guid eventId, UpdateCalendarEventRequest request)
    {
        var eventEntity = await _context.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);

        if (eventEntity == null)
        {
            return new ApiResponse<CalendarEventDto>
            {
                Success = false,
                Message = "Event not found"
            };
        }

        if (!string.IsNullOrEmpty(request.Title))
            eventEntity.Title = request.Title;
        if (request.Description != null)
            eventEntity.Description = request.Description;
        if (request.StartDate.HasValue)
            eventEntity.StartDate = ToUtcFull(request.StartDate.Value);
        if (request.EndDate.HasValue)
            eventEntity.EndDate = ToUtcFull(request.EndDate.Value);
        if (request.Location != null)
            eventEntity.Location = request.Location;
        if (request.Color != null)
            eventEntity.Color = request.Color;
        if (request.IsAllDay.HasValue)
            eventEntity.IsAllDay = request.IsAllDay.Value;

        eventEntity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var pushedId = await _googleCalendarService.PushCalendarEventToGoogleAsync(userId, eventEntity);
        if (!string.IsNullOrEmpty(pushedId) && eventEntity.GoogleEventId != pushedId)
        {
            eventEntity.GoogleEventId = pushedId;
            await _context.SaveChangesAsync();
        }

        return new ApiResponse<CalendarEventDto>
        {
            Success = true,
            Message = "Event updated successfully",
            Data = _mapper.Map<CalendarEventDto>(eventEntity)
        };
    }

    public async Task<ApiResponse<object>> DeleteEventAsync(string userId, Guid eventId)
    {
        var eventEntity = await _context.CalendarEvents
            .FirstOrDefaultAsync(e => e.Id == eventId && e.UserId == userId);

        if (eventEntity == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Event not found"
            };
        }

        var googleEventId = eventEntity.GoogleEventId;
        _context.CalendarEvents.Remove(eventEntity);
        await _context.SaveChangesAsync();
        await _googleCalendarService.DeleteGoogleCalendarEventAsync(userId, googleEventId);

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Event deleted successfully"
        };
    }
}

