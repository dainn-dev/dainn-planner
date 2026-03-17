using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface IGoogleCalendarService
{
    /// <summary>
    /// Fetches Google Calendar events for the user in the given range.
    /// Returns empty list if user has no integration or tokens are invalid.
    /// </summary>
    Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(string userId, DateTime start, DateTime end, CancellationToken ct = default);
}
