using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DailyPlanner.Infrastructure.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    private const string CalendarEventsUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private const string TokenUrl = "https://oauth2.googleapis.com/token";
    private const string UserInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
    private const string PlanDailyPrivatePropertyKey = "planDailyEventId";
    private static readonly TimeSpan TokenExpiryMargin = TimeSpan.FromMinutes(5);

    /// <summary>Google's JSON uses camelCase; default System.Text.Json matching is case-sensitive.</summary>
    private static readonly JsonSerializerOptions GoogleApiJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly JsonSerializerOptions GoogleWriteJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GoogleCalendarOptions _options;
    private readonly ILogger<GoogleCalendarService> _logger;

    public GoogleCalendarService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        IOptions<GoogleCalendarOptions> options,
        ILogger<GoogleCalendarService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<CalendarEventDto>> GetEventsAsync(string userId, DateTime start, DateTime end, CancellationToken ct = default)
    {
        var integration = await _context.UserGoogleIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.UserId == userId, ct);
        if (integration == null)
            return Array.Empty<CalendarEventDto>();

        var accessToken = await EnsureValidAccessTokenAsync(userId, integration, ct);
        if (string.IsNullOrEmpty(accessToken))
            return Array.Empty<CalendarEventDto>();

        var timeMin = start.Kind == DateTimeKind.Utc ? start : DateTime.SpecifyKind(start, DateTimeKind.Utc);
        var timeMax = end.Kind == DateTimeKind.Utc ? end : DateTime.SpecifyKind(end, DateTimeKind.Utc);
        var timeMinStr = timeMin.ToString("yyyy-MM-ddTHH:mm:ssZ");
        var timeMaxStr = timeMax.ToString("yyyy-MM-ddTHH:mm:ssZ");
        var url = $"{CalendarEventsUrl}?timeMin={Uri.EscapeDataString(timeMinStr)}&timeMax={Uri.EscapeDataString(timeMaxStr)}&singleEvents=true&orderBy=startTime";

        using var http = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        var response = await http.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            return Array.Empty<CalendarEventDto>();

        var json = await response.Content.ReadAsStringAsync(ct);
        var list = JsonSerializer.Deserialize<GoogleEventsResponse>(json, GoogleApiJsonOptions);
        if (list?.Items == null || list.Items.Count == 0)
            return Array.Empty<CalendarEventDto>();

        var dtos = new List<CalendarEventDto>(list.Items.Count);
        foreach (var item in list.Items)
        {
            if (string.IsNullOrEmpty(item.Id))
                continue;
            if (IsPlanDailyMirror(item))
                continue;
            var (startDate, endDate, isAllDay) = ParseEventDates(item);
            dtos.Add(new CalendarEventDto
            {
                Id = Guid.Empty,
                Title = item.Summary ?? "(No title)",
                Description = item.Description,
                StartDate = startDate,
                EndDate = endDate,
                Location = item.Location,
                IsAllDay = isAllDay,
                CreatedAt = DateTime.UtcNow,
                Source = "Google",
                ExternalId = item.Id
            });
        }

        return dtos;
    }

    public async Task<string?> PushCalendarEventToGoogleAsync(string userId, CalendarEvent evt, CancellationToken ct = default)
    {
        var integration = await _context.UserGoogleIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.UserId == userId, ct);
        if (integration == null)
            return null;

        var accessToken = await EnsureValidAccessTokenAsync(userId, integration, ct);
        if (string.IsNullOrEmpty(accessToken))
            return null;

        var body = BuildGoogleEventBody(evt);
        using var http = _httpClientFactory.CreateClient();

        if (!string.IsNullOrEmpty(evt.GoogleEventId))
        {
            var patchUrl = $"{CalendarEventsUrl}/{Uri.EscapeDataString(evt.GoogleEventId)}";
            using var patch = new HttpRequestMessage(HttpMethod.Patch, patchUrl);
            patch.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            patch.Content = new StringContent(JsonSerializer.Serialize(body, GoogleWriteJsonOptions), Encoding.UTF8, "application/json");
            var patchResp = await http.SendAsync(patch, ct);
            if (patchResp.IsSuccessStatusCode)
                return evt.GoogleEventId;
            var patchErr = await patchResp.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Google Calendar PATCH failed for user {UserId}: {Status} {Body}", userId, (int)patchResp.StatusCode, patchErr);
            return null;
        }

        using var post = new HttpRequestMessage(HttpMethod.Post, CalendarEventsUrl);
        post.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        post.Content = new StringContent(JsonSerializer.Serialize(body, GoogleWriteJsonOptions), Encoding.UTF8, "application/json");
        var postResp = await http.SendAsync(post, ct);
        if (!postResp.IsSuccessStatusCode)
        {
            var postErr = await postResp.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Google Calendar POST failed for user {UserId}: {Status} {Body}", userId, (int)postResp.StatusCode, postErr);
            return null;
        }

        var responseJson = await postResp.Content.ReadAsStringAsync(ct);
        var created = JsonSerializer.Deserialize<GoogleEventInsertResponse>(responseJson, GoogleApiJsonOptions);
        return string.IsNullOrEmpty(created?.Id) ? null : created.Id;
    }

    public async Task DeleteGoogleCalendarEventAsync(string userId, string? googleEventId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(googleEventId))
            return;

        var integration = await _context.UserGoogleIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.UserId == userId, ct);
        if (integration == null)
            return;

        var accessToken = await EnsureValidAccessTokenAsync(userId, integration, ct);
        if (string.IsNullOrEmpty(accessToken))
            return;

        var deleteUrl = $"{CalendarEventsUrl}/{Uri.EscapeDataString(googleEventId)}";
        using var http = _httpClientFactory.CreateClient();
        using var delete = new HttpRequestMessage(HttpMethod.Delete, deleteUrl);
        delete.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        await http.SendAsync(delete, ct);
    }

    public async Task<string?> GetGoogleCalendarEmbedSrcAsync(string userId, CancellationToken ct = default)
    {
        var integration = await _context.UserGoogleIntegrations
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.UserId == userId, ct);
        if (integration == null)
            return null;

        var accessToken = await EnsureValidAccessTokenAsync(userId, integration, ct);
        if (string.IsNullOrEmpty(accessToken))
            return null;

        using var http = _httpClientFactory.CreateClient();
        using var req = new HttpRequestMessage(HttpMethod.Get, UserInfoUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var resp = await http.SendAsync(req, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
        {
            _logger.LogWarning("Google userinfo failed for user {UserId}: {Status} {Body}", userId, (int)resp.StatusCode, json);
            return null;
        }

        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("email", out var emailEl))
            return null;
        var email = emailEl.GetString();
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim();
    }

    private static bool IsPlanDailyMirror(GoogleEventItem item)
    {
        if (item.ExtendedProperties?.Private == null)
            return false;
        return item.ExtendedProperties.Private.ContainsKey(PlanDailyPrivatePropertyKey);
    }

    private static GoogleEventWriteBody BuildGoogleEventBody(CalendarEvent evt)
    {
        var (start, end) = BuildWhen(evt);
        return new GoogleEventWriteBody
        {
            Summary = evt.Title,
            Description = evt.Description,
            Location = evt.Location,
            Start = start,
            End = end,
            ExtendedProperties = new GoogleExtendedPropertiesWrite
            {
                Private = new Dictionary<string, string> { [PlanDailyPrivatePropertyKey] = evt.Id.ToString() }
            }
        };
    }

    private static (GoogleEventDateTimeWrite Start, GoogleEventDateTimeWrite End) BuildWhen(CalendarEvent evt)
    {
        if (evt.IsAllDay)
        {
            var startDay = DateTime.SpecifyKind(evt.StartDate.ToUniversalTime().Date, DateTimeKind.Utc);
            var lastDayInclusive = DateTime.SpecifyKind(evt.EndDate.ToUniversalTime().Date, DateTimeKind.Utc);
            if (lastDayInclusive < startDay)
                lastDayInclusive = startDay;
            // Google all-day uses an exclusive end date (day after the last included day).
            var endExclusive = lastDayInclusive.AddDays(1);
            return (
                new GoogleEventDateTimeWrite { Date = startDay.ToString("yyyy-MM-dd") },
                new GoogleEventDateTimeWrite { Date = endExclusive.ToString("yyyy-MM-dd") });
        }

        var s = evt.StartDate.Kind == DateTimeKind.Utc ? evt.StartDate : evt.StartDate.ToUniversalTime();
        var e = evt.EndDate.Kind == DateTimeKind.Utc ? evt.EndDate : evt.EndDate.ToUniversalTime();
        return (
            new GoogleEventDateTimeWrite { DateTime = ToRfc3339Utc(s) },
            new GoogleEventDateTimeWrite { DateTime = ToRfc3339Utc(e) });
    }

    private static string ToRfc3339Utc(DateTime utc)
    {
        var u = utc.Kind == DateTimeKind.Utc ? utc : DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        return u.ToString("yyyy-MM-dd'T'HH:mm:ss.fff'Z'");
    }

    private async Task<string?> EnsureValidAccessTokenAsync(string userId, UserGoogleIntegration integration, CancellationToken ct)
    {
        if (integration.ExpiresAtUtc > DateTime.UtcNow + TokenExpiryMargin)
            return integration.AccessToken;

        using var http = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, TokenUrl);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["refresh_token"] = integration.RefreshToken,
            ["grant_type"] = "refresh_token"
        });

        var response = await http.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return null;

        var tokenResponse = JsonSerializer.Deserialize<GoogleTokenResponse>(json, GoogleApiJsonOptions);
        if (tokenResponse?.AccessToken == null)
            return null;

        var entity = await _context.UserGoogleIntegrations.FirstOrDefaultAsync(i => i.UserId == userId, ct);
        if (entity != null)
        {
            entity.AccessToken = tokenResponse.AccessToken;
            entity.ExpiresAtUtc = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
            entity.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }

        return tokenResponse.AccessToken;
    }

    private static (DateTime Start, DateTime End, bool IsAllDay) ParseEventDates(GoogleEventItem item)
    {
        if (item.Start?.Date != null)
        {
            var d = DateTime.Parse(item.Start.Date);
            var start = DateTime.SpecifyKind(d, DateTimeKind.Utc);
            var end = item.End?.Date != null
                ? DateTime.SpecifyKind(DateTime.Parse(item.End.Date), DateTimeKind.Utc)
                : start.AddDays(1);
            return (start, end, true);
        }
        if (item.Start?.DateTime != null)
        {
            var start = ParseRfc3339(item.Start.DateTime);
            var end = item.End?.DateTime != null
                ? ParseRfc3339(item.End.DateTime)
                : start.AddHours(1);
            return (start, end, false);
        }
        var fallback = DateTime.UtcNow.Date;
        return (fallback, fallback.AddHours(1), true);
    }

    private static DateTime ParseRfc3339(string value)
    {
        if (DateTimeOffset.TryParse(value, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dto))
            return dto.UtcDateTime;
        return DateTime.UtcNow;
    }

    private sealed class GoogleEventsResponse
    {
        public List<GoogleEventItem>? Items { get; set; }
    }

    private sealed class GoogleEventItem
    {
        public string? Id { get; set; }
        public string? Summary { get; set; }
        public string? Description { get; set; }
        public string? Location { get; set; }
        public GoogleEventDateTime? Start { get; set; }
        public GoogleEventDateTime? End { get; set; }
        public GoogleExtendedPropertiesRead? ExtendedProperties { get; set; }
    }

    private sealed class GoogleExtendedPropertiesRead
    {
        public Dictionary<string, string>? Private { get; set; }
    }

    private sealed class GoogleEventDateTime
    {
        public string? Date { get; set; }
        public string? DateTime { get; set; }
    }

    private sealed class GoogleEventWriteBody
    {
        public string Summary { get; set; } = "";
        public string? Description { get; set; }
        public string? Location { get; set; }
        public GoogleEventDateTimeWrite? Start { get; set; }
        public GoogleEventDateTimeWrite? End { get; set; }
        public GoogleExtendedPropertiesWrite? ExtendedProperties { get; set; }
    }

    private sealed class GoogleEventDateTimeWrite
    {
        public string? Date { get; set; }
        public string? DateTime { get; set; }
        public string? TimeZone { get; set; }
    }

    private sealed class GoogleExtendedPropertiesWrite
    {
        public Dictionary<string, string>? Private { get; set; }
    }

    private sealed class GoogleEventInsertResponse
    {
        public string? Id { get; set; }
    }

    private sealed class GoogleTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }
}
