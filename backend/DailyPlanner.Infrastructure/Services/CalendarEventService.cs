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

    private static DateTime ToUtc(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public CalendarEventService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<List<CalendarEventDto>>> GetEventsAsync(string userId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.CalendarEvents.Where(e => e.UserId == userId);

        if (startDate.HasValue)
        {
            var startUtc = ToUtc(startDate.Value);
            query = query.Where(e => e.StartDate >= startUtc);
        }
        if (endDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            query = query.Where(e => e.EndDate <= endUtc);
        }

        var events = await query.OrderBy(e => e.StartDate).ToListAsync();

        return new ApiResponse<List<CalendarEventDto>>
        {
            Success = true,
            Data = _mapper.Map<List<CalendarEventDto>>(events)
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

        _context.CalendarEvents.Remove(eventEntity);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Event deleted successfully"
        };
    }
}

