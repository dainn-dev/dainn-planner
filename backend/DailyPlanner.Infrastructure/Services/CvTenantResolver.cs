using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using DailyPlanner.Application.Options;

namespace DailyPlanner.Infrastructure.Services;

public class CvTenantResolver
{
    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "www", "admin", "api", "app", "dashboard", "mail", "smtp", "ftp", "cdn", "static", "assets",
    };

    private static readonly Regex SlugFormat = new(
        "^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private readonly CvOptions _options;

    public CvTenantResolver(IOptions<CvOptions> options)
    {
        _options = options.Value;
    }

    public string? ResolveSlug(HttpRequest request)
    {
        var header = request.Headers["X-Tenant-Slug"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(header))
            return header.Trim().ToLowerInvariant();

        var host = request.Headers.Host.ToString();
        return ParseTenantSlugFromHost(host, _options.RootDomain);
    }

    public static string? ParseTenantSlugFromHost(string? hostHeader, string rootDomain)
    {
        if (string.IsNullOrWhiteSpace(hostHeader))
            return null;

        var host = hostHeader.Split(':')[0].Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(host))
            return null;

        var root = (rootDomain ?? "dainn.online").Trim().ToLowerInvariant().TrimStart('.');

        if (host == root || host == $"www.{root}")
            return null;

        if (host.EndsWith($".{root}", StringComparison.Ordinal))
        {
            var sub = host[..^($".{root}".Length)];
            if (string.IsNullOrEmpty(sub) || sub.Contains('.'))
                return null;
            if (Reserved.Contains(sub))
                return null;
            return sub;
        }

        if (host.EndsWith(".localhost", StringComparison.Ordinal))
        {
            var sub = host[..^".localhost".Length];
            if (string.IsNullOrEmpty(sub) || sub.Contains('.'))
                return null;
            if (Reserved.Contains(sub))
                return null;
            return sub;
        }

        if (host == "localhost" || host.StartsWith("127.0.0.1", StringComparison.Ordinal))
            return null;

        return null;
    }

    public static bool IsValidSlugFormat(string slug)
    {
        if (slug.Length < 2 || slug.Length > 63)
            return false;
        return SlugFormat.IsMatch(slug);
    }

    public static bool IsReservedSlug(string slug) => Reserved.Contains(slug);
}
