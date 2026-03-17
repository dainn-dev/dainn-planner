namespace DailyPlanner.Application.Options;

public class GoogleCalendarOptions
{
    /// <summary>Configuration section used for both Google Calendar sync and (when implemented) Google Sign-In.</summary>
    public const string SectionName = "Authentication:Google";
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}
