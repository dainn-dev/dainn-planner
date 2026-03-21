using DailyPlanner.Application.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

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

        if (!string.IsNullOrWhiteSpace(options.PublicBaseUrl))
        {
            var baseUrl = options.PublicBaseUrl.Trim().TrimEnd('/');
            return $"{baseUrl}{CallbackPath}";
        }

        var authority = GetPublicAuthority(request);
        var pathBase = request.PathBase.HasValue ? request.PathBase.Value!.TrimEnd('/') : string.Empty;
        var prefix = string.IsNullOrEmpty(pathBase) ? string.Empty : pathBase;
        return $"{authority}{prefix}{CallbackPath}";
    }

    /// <summary>
    /// Public browser-facing origin. Prefers X-Forwarded-* because ngrok often forwards to Kestrel as http://localhost
    /// while the client used https://&lt;ngrok&gt;; without this, OAuth redirect_uri would not match Google's callback URL.
    /// </summary>
    public static string GetPublicAuthority(HttpRequest request)
    {
        var forwardedHost = FirstForwardedValue(request.Headers["X-Forwarded-Host"]);
        var forwardedProto = FirstForwardedValue(request.Headers["X-Forwarded-Proto"]);

        if (!string.IsNullOrEmpty(forwardedHost))
        {
            var scheme = !string.IsNullOrEmpty(forwardedProto) ? forwardedProto : request.Scheme;
            return $"{scheme}://{forwardedHost}";
        }

        return $"{request.Scheme}://{request.Host.Value}";
    }

    private static string? FirstForwardedValue(StringValues header)
    {
        if (StringValues.IsNullOrEmpty(header))
            return null;
        // "host1, host2" — use outermost (client-facing) value
        var raw = header.ToString();
        var comma = raw.IndexOf(',');
        var first = comma >= 0 ? raw[..comma] : raw;
        return string.IsNullOrWhiteSpace(first) ? null : first.Trim();
    }
}
