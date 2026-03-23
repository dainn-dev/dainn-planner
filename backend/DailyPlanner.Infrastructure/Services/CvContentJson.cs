using System.Text.Json;

namespace DailyPlanner.Infrastructure.Services;

internal static class CvContentJson
{
    internal const string EmptyProfile = "null";
    internal const string EmptyPortfolio = """{"intro":{"title":"","description":""},"items":[]}""";
    internal const string EmptySkills = """{"intro":{"title":"","description":""},"technicalSkills":[],"softSkills":[]}""";
    internal const string EmptyTestimonials = """{"intro":{"title":"","description":""},"testimonials":[]}""";
    internal const string EmptyFacts = """{"intro":{"title":"","description":""},"facts":[]}""";
    internal const string EmptyServices = """{"intro":{"title":"","description":""},"services":[]}""";
    internal const string EmptyArray = "[]";

    internal static JsonObjectDto RowToContent(
        string? profile, string? portfolio, string? skills, string? testimonials,
        string? facts, string? services, string? education, string? experience, string? certificates)
    {
        var empty = EmptyObject();
        return new JsonObjectDto
        {
            Profile = ParseOr(profile, empty.Profile),
            Portfolio = ParseOr(portfolio, empty.Portfolio),
            Skills = ParseOr(skills, empty.Skills),
            Testimonials = ParseOr(testimonials, empty.Testimonials),
            Facts = ParseOr(facts, empty.Facts),
            Services = ParseOr(services, empty.Services),
            Education = ParseOr(education, empty.Education),
            Experience = ParseOr(experience, empty.Experience),
            Certificates = ParseOr(certificates, empty.Certificates),
        };
    }

    internal static JsonObjectDto EmptyObject() => new()
    {
        Profile = JsonDocument.Parse("null").RootElement.Clone(),
        Portfolio = Parse(EmptyPortfolio),
        Skills = Parse(EmptySkills),
        Testimonials = Parse(EmptyTestimonials),
        Facts = Parse(EmptyFacts),
        Services = Parse(EmptyServices),
        Education = Parse(EmptyArray),
        Experience = Parse(EmptyArray),
        Certificates = Parse(EmptyArray),
    };

    private static JsonElement Parse(string json) => JsonDocument.Parse(json).RootElement.Clone();

    private static JsonElement ParseOr(string? json, JsonElement fallback)
    {
        if (string.IsNullOrWhiteSpace(json))
            return fallback;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch
        {
            return fallback;
        }
    }

    internal sealed class JsonObjectDto
    {
        public JsonElement Profile { get; init; }
        public JsonElement Portfolio { get; init; }
        public JsonElement Skills { get; init; }
        public JsonElement Testimonials { get; init; }
        public JsonElement Facts { get; init; }
        public JsonElement Services { get; init; }
        public JsonElement Education { get; init; }
        public JsonElement Experience { get; init; }
        public JsonElement Certificates { get; init; }

        public object ToAnonymousForJson() => new
        {
            profile = JsonSerializer.Deserialize<object>(Profile.GetRawText()),
            portfolio = JsonSerializer.Deserialize<object>(Portfolio.GetRawText()),
            skills = JsonSerializer.Deserialize<object>(Skills.GetRawText()),
            testimonials = JsonSerializer.Deserialize<object>(Testimonials.GetRawText()),
            facts = JsonSerializer.Deserialize<object>(Facts.GetRawText()),
            services = JsonSerializer.Deserialize<object>(Services.GetRawText()),
            education = JsonSerializer.Deserialize<object>(Education.GetRawText()),
            experience = JsonSerializer.Deserialize<object>(Experience.GetRawText()),
            certificates = JsonSerializer.Deserialize<object>(Certificates.GetRawText()),
        };
    }
}
