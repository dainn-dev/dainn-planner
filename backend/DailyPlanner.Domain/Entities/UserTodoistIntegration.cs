namespace DailyPlanner.Domain.Entities;

public class UserTodoistIntegration
{
    public string UserId { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Comma-separated OAuth scopes: from token response if Todoist sends <c>scope</c>, else the scopes requested at authorize time.
    /// Completing tasks requires <c>data:read_write</c>.
    /// </summary>
    public string? OAuthScopes { get; set; }

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
