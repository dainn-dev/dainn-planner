namespace DailyPlanner.Application.Options;

public class TodoistOptions
{
    public const string SectionName = "Integrations:Todoist";

    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;

    /// <summary>
    /// Must match a redirect URI in the Todoist App Management Console.
    /// If empty, uses <c>{scheme}://{host}/api/auth/todoist/callback</c> from the request (or <see cref="PublicBaseUrl"/>).
    /// </summary>
    public string RedirectUri { get; set; } = string.Empty;

    /// <summary>Optional public origin, e.g. <c>https://api.example.com</c> when proxies omit forwarded headers.</summary>
    public string? PublicBaseUrl { get; set; }

    /// <summary>Comma-separated scopes for the authorize URL (Todoist expects comma in query).</summary>
    public string Scopes { get; set; } = "data:read_write";
}
