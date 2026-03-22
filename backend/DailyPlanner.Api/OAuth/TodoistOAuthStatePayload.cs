namespace DailyPlanner.Api.OAuth;

/// <summary>Stored in OAuth state cache so the callback can associate the user and requested scopes.</summary>
public sealed class TodoistOAuthStatePayload
{
    public string UserId { get; set; } = string.Empty;

    /// <summary>Comma-separated scopes from <see cref="DailyPlanner.Application.Options.TodoistOptions.Scopes"/> used in the authorize URL.</summary>
    public string RequestedScopes { get; set; } = string.Empty;
}
