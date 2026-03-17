using System.Net.Http.Headers;
using System.Text.Json;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DailyPlanner.Infrastructure.Services;

public class GoogleCalendarService : IGoogleCalendarService
{
    private const string CalendarEventsUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private const string TokenUrl = "https://oauth2.googleapis.com/token";
    private static readonly TimeSpan TokenExpiryMargin = TimeSpan.FromMinutes(5);

    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly GoogleCalendarOptions _options;

    public GoogleCalendarService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        IOptions<GoogleCalendarOptions> options)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
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
        var list = JsonSerializer.Deserialize<GoogleEventsResponse>(json);
        if (list?.Items == null || list.Items.Count == 0)
            return Array.Empty<CalendarEventDto>();

        var dtos = new List<CalendarEventDto>(list.Items.Count);
        foreach (var item in list.Items)
        {
            if (string.IsNullOrEmpty(item.Id))
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

    private async Task<string?> EnsureValidAccessTokenAsync(string userId, Domain.Entities.UserGoogleIntegration integration, CancellationToken ct)
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

        var tokenResponse = JsonSerializer.Deserialize<GoogleTokenResponse>(json);
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
        if (item.Start?.DateTime != null && item.End?.DateTime != null)
        {
            var start = ParseRfc3339(item.Start.DateTime);
            var end = ParseRfc3339(item.End.DateTime);
            return (start, end, false);
        }
        var fallback = DateTime.UtcNow.Date;
        return (fallback, fallback.AddHours(1), true);
    }

    private static DateTime ParseRfc3339(string value)
    {
        if (DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
            return dt.Kind == DateTimeKind.Utc ? dt : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
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
    }

    private sealed class GoogleEventDateTime
    {
        public string? Date { get; set; }
        public string? DateTime { get; set; }
    }

    private sealed class GoogleTokenResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("access_token")]
        public string? AccessToken { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set; }
    }
}
