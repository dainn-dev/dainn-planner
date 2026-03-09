namespace DailyPlanner.Application.DTOs;

/// <summary>
/// Response DTO for GET /users/me/settings. Data is the full settings object (general, plans, notifications, logs).
/// </summary>
public class UserSettingsDto
{
    /// <summary>
    /// Full settings object matching frontend shape. Flexible so new keys do not require backend changes.
    /// </summary>
    public object? Data { get; set; }
}
