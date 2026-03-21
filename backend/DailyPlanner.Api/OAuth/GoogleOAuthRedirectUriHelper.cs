using DailyPlanner.Application.Options;
using Microsoft.AspNetCore.Http;

namespace DailyPlanner.Api.OAuth;

/// <summary>
/// Google requires <c>redirect_uri</c> in the token request to exactly match the one used in the authorize request.
/// When using ngrok (or any public URL) while <see cref="GoogleCalendarOptions.RedirectUri"/> still points at localhost,
/// set <c>RedirectUri</c> to empty to derive the callback URL from the current request.
/// </summary>
public static class GoogleOAuthRedirectUriHelper
{
    public const string CallbackPath = "/api/auth/google/callback";

    public static string Resolve(HttpRequest request, GoogleCalendarOptions options)
    {
        if (!string.IsNullOrWhiteSpace(options.RedirectUri))
            return options.RedirectUri.Trim();

        var pathBase = request.PathBase.HasValue ? request.PathBase.Value!.TrimEnd('/') : string.Empty;
        var prefix = string.IsNullOrEmpty(pathBase) ? string.Empty : pathBase;
        return $"{request.Scheme}://{request.Host}{prefix}{CallbackPath}";
    }
}
