namespace DailyPlanner.Application.Options;

public class GoogleCalendarOptions
{
    /// <summary>Configuration section used for both Google Calendar sync and (when implemented) Google Sign-In.</summary>
    public const string SectionName = "Authentication:Google";
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Must match an authorized redirect URI in Google Cloud Console exactly.
    /// If empty, the API builds <c>{scheme}://{host}/api/auth/google/callback</c> from each request (works with ngrok without editing config).
    /// </summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>
    /// Optional public origin with no path, e.g. <c>https://abc.ngrok-free.dev</c>.
    /// Use when ngrok/your proxy does not set forwarded headers correctly and inferred <see cref="RedirectUri"/> would be wrong.
    /// Callback becomes <c>{PublicBaseUrl}/api/auth/google/callback</c>.
    /// </summary>
    public string? PublicBaseUrl { get; set; }
}
