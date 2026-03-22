using System.Linq;
using DailyPlanner.Application.Options;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace DailyPlanner.Api.OAuth;

public static class TodoistOAuthRedirectUriHelper
{
    public const string CallbackPath = "/api/auth/todoist/callback";

    public static string Resolve(HttpRequest request, TodoistOptions options)
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
        var raw = header.ToString();
        var comma = raw.IndexOf(',');
        var first = comma >= 0 ? raw[..comma] : raw;
        return string.IsNullOrWhiteSpace(first) ? null : first.Trim();
    }

    public static string BuildAuthorizeUrl(string clientId, string redirectUri, string scope, string state)
    {
        var q = new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["scope"] = scope,
            ["state"] = state,
            ["redirect_uri"] = redirectUri
        };
        var query = string.Join("&", q.Select(kv =>
            $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value)}"));
        return $"https://app.todoist.com/oauth/authorize?{query}";
    }
}
