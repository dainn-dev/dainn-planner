using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface ICalendarEventService
{
    Task<ApiResponse<List<CalendarEventDto>>> GetEventsAsync(string userId, DateTime? startDate, DateTime? endDate);
    Task<ApiResponse<CalendarEventDto>> GetEventByIdAsync(string userId, Guid eventId);
    Task<ApiResponse<CalendarEventDto>> CreateEventAsync(string userId, CreateCalendarEventRequest request);
    Task<ApiResponse<CalendarEventDto>> UpdateEventAsync(string userId, Guid eventId, UpdateCalendarEventRequest request);
    Task<ApiResponse<object>> DeleteEventAsync(string userId, Guid eventId);
}

