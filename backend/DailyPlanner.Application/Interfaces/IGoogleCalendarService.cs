using DailyPlanner.Application.DTOs;
using DailyPlanner.Domain.Entities;

namespace DailyPlanner.Application.Interfaces;

public interface IGoogleCalendarService
{
    /// <summary>
    /// Fetches Google Calendar events for the user in the given range.
    /// Returns empty list if user has no integration or tokens are invalid.
    /// </summary>
    Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(string userId, DateTime start, DateTime end, CancellationToken ct = default);

    /// <summary>
    /// Creates or updates the event on the user's primary Google calendar.
    /// Returns the Google event id on success, or null if skipped or failed (local data is unchanged).
    /// </summary>
    Task<string?> PushCalendarEventToGoogleAsync(string userId, CalendarEvent evt, CancellationToken ct = default);

    /// <summary>
    /// Deletes the event from Google when <paramref name="googleEventId"/> is set. No-op if null/empty.
    /// </summary>
    Task DeleteGoogleCalendarEventAsync(string userId, string? googleEventId, CancellationToken ct = default);

    /// <summary>
    /// Google Calendar embed <c>src</c> for the user's primary calendar (their Google account email).
    /// Null when not connected or userinfo cannot be read.
    /// </summary>
    Task<string?> GetGoogleCalendarEmbedSrcAsync(string userId, CancellationToken ct = default);
}
