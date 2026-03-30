using Ganss.Xss;

namespace DailyPlanner.Infrastructure.Services;

internal static class DailyTaskRichTextSanitizer
{
    // Allows task description rich-text edited via the FE editor.
    // Goal: strip scripts/event handlers and block dangerous URL schemes.
    private static readonly HtmlSanitizer Sanitizer = CreateSanitizer();

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();

        // Keep in sync with the FE allowlist (best-effort; DO NOT rely on FE alone).
        sanitizer.AllowedTags.Clear();
        foreach (var tag in new[]
                 {
                     "p",
                     "br",
                     "strong",
                     "em",
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
                     "blockquote",
                     "code",
                     "pre",
                     "span",
                     "div",
                     // Table support (Task editor includes TableExtension)
                     "table",
                     "thead",
                     "tbody",
                     "tr",
                     "th",
                     "td",
                 })
            sanitizer.AllowedTags.Add(tag);

        sanitizer.AllowedAttributes.Clear();
        foreach (var attr in new[] { "href", "target", "rel", "class", "title", "colspan", "rowspan" })
            sanitizer.AllowedAttributes.Add(attr);

        sanitizer.UriAttributes.Clear();
        sanitizer.UriAttributes.Add("href");

        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.Add("http");
        sanitizer.AllowedSchemes.Add("https");

        return sanitizer;
    }

    internal static string? SanitizeHtml(string? dirty)
    {
        if (dirty == null)
            return null;
        if (string.IsNullOrWhiteSpace(dirty))
            return "";

        return Sanitizer.Sanitize(dirty);
    }
}

