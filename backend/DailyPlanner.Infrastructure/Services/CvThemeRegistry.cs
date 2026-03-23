using System.Text.Json;
using System.Text.Json.Nodes;

namespace DailyPlanner.Infrastructure.Services;

public static class CvThemeRegistry
{
    public const int SchemaVersion = 1;

    private static readonly IReadOnlyList<CvThemePreset> Presets =
    [
        new("default", "Light", 0, CreateDefaultTokens(), CreateDefaultTokens().ColorBg, CreateDefaultTokens().ColorAccent),
        new("midnight", "Midnight", 1, CreateMidnightTokens(), CreateMidnightTokens().ColorBg, CreateMidnightTokens().ColorAccent),
    ];

    private static readonly Dictionary<string, CvThemePreset> ByKey =
        Presets.ToDictionary(p => p.Key, StringComparer.OrdinalIgnoreCase);

    public static CvThemePreset? GetPreset(string key) => ByKey.GetValueOrDefault(key);

    public static bool IsAllowedPresetKey(string key) => ByKey.ContainsKey(key);

    public static IReadOnlyList<CvThemePreset> ListPresets() => Presets.OrderBy(p => p.SortOrder).ToList();

    public static JsonObject ResolveThemeTokens(string presetKey, string? overridesJson)
    {
        var preset = GetPreset(presetKey) ?? GetPreset("default")!;
        var baseTokens = TokensToJson(preset.Tokens);
        if (string.IsNullOrWhiteSpace(overridesJson))
        {
            return Wrap(preset.Key, baseTokens);
        }

        JsonNode? overridesNode;
        try
        {
            overridesNode = JsonNode.Parse(overridesJson);
        }
        catch
        {
            return Wrap(preset.Key, baseTokens);
        }

        if (overridesNode is not JsonObject o)
            return Wrap(preset.Key, baseTokens);

        foreach (var prop in o)
        {
            if (prop.Value is JsonValue v && v.TryGetValue<string>(out var s) && !string.IsNullOrEmpty(s))
                baseTokens[prop.Key] = s;
        }

        return Wrap(preset.Key, baseTokens);
    }

    public static bool TryNormalizeOverrides(object? overrides, out string? json, out string? error)
    {
        json = null;
        error = null;
        if (overrides == null)
            return true;

        var node = JsonSerializer.SerializeToNode(overrides);
        if (node is not JsonObject o)
        {
            error = "Invalid overrides";
            return false;
        }

        var allowed = ThemeTokenKeys.All.ToHashSet(StringComparer.Ordinal);
        foreach (var prop in o)
        {
            if (!allowed.Contains(prop.Key))
            {
                error = "Invalid overrides";
                return false;
            }

            if (prop.Value is not JsonValue v || !v.TryGetValue<string>(out var s) || string.IsNullOrEmpty(s))
            {
                error = "Invalid overrides";
                return false;
            }
        }

        json = o.ToJsonString();
        return true;
    }

    private static JsonObject Wrap(string presetKey, JsonObject tokens)
    {
        return new JsonObject
        {
            ["presetKey"] = presetKey,
            ["schemaVersion"] = SchemaVersion,
            ["tokens"] = tokens
        };
    }

    private static JsonObject TokensToJson(ThemeTokensDto t) => new()
    {
        ["colorBg"] = t.ColorBg,
        ["colorSurface"] = t.ColorSurface,
        ["colorAccent"] = t.ColorAccent,
        ["colorText"] = t.ColorText,
        ["colorTextMuted"] = t.ColorTextMuted,
        ["fontHeading"] = t.FontHeading,
        ["fontBody"] = t.FontBody,
        ["radiusMd"] = t.RadiusMd,
        ["shadowCard"] = t.ShadowCard,
    };

    private static ThemeTokensDto CreateDefaultTokens() => new()
    {
        ColorBg = "#f8fafc",
        ColorSurface = "#ffffff",
        ColorAccent = "#0ea5e9",
        ColorText = "#0f172a",
        ColorTextMuted = "#64748b",
        FontHeading = "var(--font-raleway), system-ui, sans-serif",
        FontBody = "var(--font-open-sans), system-ui, sans-serif",
        RadiusMd = "0.5rem",
        ShadowCard = "0 4px 6px -1px rgb(0 0 0 / 0.08)",
    };

    private static ThemeTokensDto CreateMidnightTokens() => new()
    {
        ColorBg = "#0f172a",
        ColorSurface = "#1e293b",
        ColorAccent = "#38bdf8",
        ColorText = "#f1f5f9",
        ColorTextMuted = "#94a3b8",
        FontHeading = "var(--font-raleway), system-ui, sans-serif",
        FontBody = "var(--font-open-sans), system-ui, sans-serif",
        RadiusMd = "0.5rem",
        ShadowCard = "0 4px 6px -1px rgb(0 0 0 / 0.4)",
    };

    private static class ThemeTokenKeys
    {
        public static readonly string[] All =
        [
            "colorBg", "colorSurface", "colorAccent", "colorText", "colorTextMuted",
            "fontHeading", "fontBody", "radiusMd", "shadowCard"
        ];
    }
}

public sealed record CvThemePreset(string Key, string Label, int SortOrder, ThemeTokensDto Tokens, string PreviewBg, string PreviewAccent);

public sealed class ThemeTokensDto
{
    public string ColorBg { get; set; } = "";
    public string ColorSurface { get; set; } = "";
    public string ColorAccent { get; set; } = "";
    public string ColorText { get; set; } = "";
    public string ColorTextMuted { get; set; } = "";
    public string FontHeading { get; set; } = "";
    public string FontBody { get; set; } = "";
    public string RadiusMd { get; set; } = "";
    public string ShadowCard { get; set; } = "";
}
