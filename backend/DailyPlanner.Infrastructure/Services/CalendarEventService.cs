using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DailyPlanner.Infrastructure.Services;

public class CalendarEventService : ICalendarEventService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IGoogleCalendarService _googleCalendarService;

    private static DateTime ToUtc(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public CalendarEventService(ApplicationDbContext context, IMapper mapper, IGoogleCalendarService googleCalendarService)
    {
        _context = context;
        _mapper = mapper;
        _googleCalendarService = googleCalendarService;
    }

    private static string? ToJsonOrNull(List<string>? items)
    {
        if (items == null) return null;
        var cleaned = items.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Distinct().ToList();
        return cleaned.Count == 0 ? null : JsonSerializer.Serialize(cleaned, JsonOptions);
    }

    private static List<string>? FromJsonList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private CalendarEventDto MapWithUiFields(CalendarEvent entity)
    {
        var dto = _mapper.Map<CalendarEventDto>(entity);
        dto.Attendees = FromJsonList(entity.AttendeesJson);
        dto.ProjectTags = FromJsonList(entity.ProjectTagsJson);
        return dto;
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
        var dtos = events.Select(MapWithUiFields).ToList();

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
            Data = MapWithUiFields(eventEntity)
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
            IsAllDay = request.IsAllDay,
            EventType = request.EventType,
            Icon = request.Icon,
            DndEnabled = request.DndEnabled,
            ReminderMinutes = request.ReminderMinutes,
            AttendeesJson = ToJsonOrNull(request.Attendees),
            ProjectTagsJson = ToJsonOrNull(request.ProjectTags),
        };

        _context.CalendarEvents.Add(eventEntity);
        await _context.SaveChangesAsync();

        if (request.PushToGoogle)
        {
            var pushedId = await _googleCalendarService.PushCalendarEventToGoogleAsync(userId, eventEntity);
            if (!string.IsNullOrEmpty(pushedId) && eventEntity.GoogleEventId != pushedId)
            {
                eventEntity.GoogleEventId = pushedId;
                await _context.SaveChangesAsync();
            }
        }

        return new ApiResponse<CalendarEventDto>
        {
            Success = true,
            Message = "Event created successfully",
            Data = MapWithUiFields(eventEntity)
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
        if (request.EventType != null)
            eventEntity.EventType = request.EventType;
        if (request.Icon != null)
            eventEntity.Icon = request.Icon;
        if (request.DndEnabled.HasValue)
            eventEntity.DndEnabled = request.DndEnabled.Value;
        if (request.ReminderMinutes.HasValue)
            eventEntity.ReminderMinutes = request.ReminderMinutes.Value;
        if (request.Attendees != null)
            eventEntity.AttendeesJson = ToJsonOrNull(request.Attendees);
        if (request.ProjectTags != null)
            eventEntity.ProjectTagsJson = ToJsonOrNull(request.ProjectTags);

        eventEntity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var shouldPushToGoogle = request.PushToGoogle ?? true;
        if (shouldPushToGoogle)
        {
            var pushedId = await _googleCalendarService.PushCalendarEventToGoogleAsync(userId, eventEntity);
            if (!string.IsNullOrEmpty(pushedId) && eventEntity.GoogleEventId != pushedId)
            {
                eventEntity.GoogleEventId = pushedId;
                await _context.SaveChangesAsync();
            }
        }

        return new ApiResponse<CalendarEventDto>
        {
            Success = true,
            Message = "Event updated successfully",
            Data = MapWithUiFields(eventEntity)
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

