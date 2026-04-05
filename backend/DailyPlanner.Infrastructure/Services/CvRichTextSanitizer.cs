using System.Text.Json;
using System.Text.Json.Nodes;
using Ganss.Xss;

namespace DailyPlanner.Infrastructure.Services;

internal static class CvRichTextSanitizer
{
    // Keep this allowlist aligned with `cv-next/lib/sanitize-html.ts`.
    // The goal is to prevent XSS when CV rich-text is rendered with `dangerouslySetInnerHTML`.
    // Lexical (DefaultTemplate) exports bold/italic as <b>/<i> and supports heading tags through <h6>.
    private static readonly HtmlSanitizer Sanitizer = CreateSanitizer();

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();

        sanitizer.AllowedTags.Clear();
        foreach (var tag in new[]
                 {
                     "p",
                     "br",
                     "strong",
                     "b",
                     "em",
                     "i",
                     "u",
                     "s",
                     "a",
                     "ul",
                     "ol",
                     "li",
                     "h1",
                     "h2",
                     "h3",
                     "h4",
                     "h5",
                     "h6",
                     "blockquote",
                     "code",
                     "pre",
                     "span",
                     "div",
                 })
            sanitizer.AllowedTags.Add(tag);

        // Attributes that are safe and useful for formatting.
        sanitizer.AllowedAttributes.Clear();
        foreach (var attr in new[] { "href", "target", "rel", "class", "title" })
            sanitizer.AllowedAttributes.Add(attr);

        // Ensure href-based attacks like `javascript:` are removed.
        sanitizer.UriAttributes.Clear();
        sanitizer.UriAttributes.Add("href");

        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.Add("http");
        sanitizer.AllowedSchemes.Add("https");

        return sanitizer;
    }

    internal static string SanitizeHtml(string? dirty)
        => string.IsNullOrWhiteSpace(dirty) ? "" : Sanitizer.Sanitize(dirty);

    internal static string SanitizeExperienceJson(string? experienceJson)
    {
        if (string.IsNullOrWhiteSpace(experienceJson))
            return "";

        try
        {
            var node = JsonNode.Parse(experienceJson);
            if (node is not JsonArray arr)
                return experienceJson;

            foreach (var item in arr)
            {
                if (item is not JsonObject o)
                    continue;

                if (!o.TryGetPropertyValue("description", out var descNode))
                    continue;

                if (descNode is not JsonValue v)
                    continue;

                if (!v.TryGetValue<string>(out var raw))
                    continue;

                o["description"] = JsonValue.Create(SanitizeHtml(raw));
            }

            return node.ToJsonString();
        }
        catch
        {
            // Best-effort: if payload isn't valid JSON, keep it (caller already expects valid JSON).
            return experienceJson;
        }
    }

    internal static string SanitizeCertificatesJson(string? certificatesJson)
    {
        if (string.IsNullOrWhiteSpace(certificatesJson))
            return "";

        try
        {
            var node = JsonNode.Parse(certificatesJson);
            if (node is not JsonArray arr)
                return certificatesJson;

            foreach (var item in arr)
            {
                if (item is not JsonObject o)
                    continue;

                if (!o.TryGetPropertyValue("description", out var descNode))
                    continue;

                if (descNode is not JsonValue v)
                    continue;

                if (!v.TryGetValue<string>(out var raw))
                    continue;

                o["description"] = JsonValue.Create(SanitizeHtml(raw));
            }

            return node.ToJsonString();
        }
        catch
        {
            return certificatesJson;
        }
    }

    internal static string SanitizePortfolioJson(string? portfolioJson)
    {
        if (string.IsNullOrWhiteSpace(portfolioJson))
            return "";

        try
        {
            var node = JsonNode.Parse(portfolioJson);
            if (node is not JsonObject o)
                return portfolioJson;

            if (!o.TryGetPropertyValue("items", out var itemsNode) || itemsNode is not JsonArray itemsArr)
                return portfolioJson;

            foreach (var item in itemsArr)
            {
                if (item is not JsonObject itemObj)
                    continue;

                if (!itemObj.TryGetPropertyValue("description", out var descNode))
                    continue;

                if (descNode is not JsonValue v)
                    continue;

                if (!v.TryGetValue<string>(out var raw))
                    continue;

                itemObj["description"] = JsonValue.Create(SanitizeHtml(raw));
            }

            return node.ToJsonString();
        }
        catch
        {
            return portfolioJson;
        }
    }
}

