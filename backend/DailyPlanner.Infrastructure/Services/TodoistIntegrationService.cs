using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class TodoistIntegrationService : ITodoistIntegrationService
{
    private readonly ApplicationDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TodoistIntegrationService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public TodoistIntegrationService(
        ApplicationDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<TodoistIntegrationService> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ApiResponse<List<TodoistTaskViewDto>>> GetActiveTasksAsync(string userId, CancellationToken cancellationToken = default)
    {
        var integration = await GetTodoistIntegrationAsync(userId, cancellationToken);
        var token = integration?.AccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            return new ApiResponse<List<TodoistTaskViewDto>>
            {
                Success = false,
                Message = "Todoist is not connected."
            };
        }

        var items = await FetchAllActiveTasksAsync(token, cancellationToken);
        if (items == null)
        {
            return new ApiResponse<List<TodoistTaskViewDto>>
            {
                Success = false,
                Message = "Could not load tasks from Todoist."
            };
        }

        var todayUtc = DateTime.UtcNow.Date;
        var list = new List<TodoistTaskViewDto>();
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Id) || string.IsNullOrWhiteSpace(item.Content))
                continue;
            if (!string.IsNullOrEmpty(item.ParentId))
                continue;

            var dueDay = ResolveTaskDate(item.Due, todayUtc);
            list.Add(new TodoistTaskViewDto
            {
                Id = item.Id!,
                Title = TruncateTitle(item.Content.Trim()),
                Description = string.IsNullOrWhiteSpace(item.Description) ? null : item.Description.Trim(),
                DueDate = DateTime.SpecifyKind(dueDay, DateTimeKind.Utc),
                Priority = MapPriority(item.Priority),
                Tags = item.Labels ?? new List<string>()
            });
        }

        return new ApiResponse<List<TodoistTaskViewDto>>
        {
            Success = true,
            Data = list
        };
    }

    public async Task<ApiResponse<object?>> CloseTaskAsync(string userId, string todoistTaskId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(todoistTaskId) || todoistTaskId.Length > 64)
        {
            return new ApiResponse<object?> { Success = false, Message = "Invalid task id." };
        }

        var integration = await GetTodoistIntegrationAsync(userId, cancellationToken);
        var token = integration?.AccessToken;
        if (string.IsNullOrWhiteSpace(token))
        {
            return new ApiResponse<object?> { Success = false, Message = "Todoist is not connected." };
        }

        if (integration != null && !string.IsNullOrEmpty(integration.OAuthScopes) && !TodoistScopesAllowWrite(integration.OAuthScopes))
        {
            return new ApiResponse<object?>
            {
                Success = false,
                Message =
                    "This Todoist connection only has read access. Disconnect Todoist under Settings, then connect again so the app can request data:read_write (needed to complete tasks)."
            };
        }

        using var http = _httpClientFactory.CreateClient();
        var url = $"https://api.todoist.com/api/v1/tasks/{Uri.EscapeDataString(todoistTaskId.Trim())}/close";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        HttpResponseMessage response;
        try
        {
            response = await http.SendAsync(req, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Todoist close task failed");
            return new ApiResponse<object?> { Success = false, Message = "Could not reach Todoist." };
        }

        if (response.IsSuccessStatusCode)
        {
            return new ApiResponse<object?> { Success = true, Data = null };
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning("Todoist close task HTTP {Status}: {Body}", (int)response.StatusCode,
            body.Length > 400 ? body[..400] + "…" : body);
        return new ApiResponse<object?>
        {
            Success = false,
            Message = MapTodoistCloseFailureMessage(response.StatusCode)
        };
    }

    private static string MapTodoistCloseFailureMessage(System.Net.HttpStatusCode status)
    {
        if (status == System.Net.HttpStatusCode.Forbidden)
            return "Todoist rejected completing this task. Disconnect Todoist under Settings and connect again with data:read_write.";
        if (status == System.Net.HttpStatusCode.Unauthorized)
            return "Todoist rejected this request (Unauthorized). Usually the stored token only allows reading tasks. Disconnect Todoist under Settings and connect again so the app can request data:read_write.";
        return "Could not complete task in Todoist.";
    }

    private static bool TodoistScopesAllowWrite(string oauthScopesCommaSeparated)
    {
        foreach (var p in oauthScopesCommaSeparated.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (p.Equals("data:read_write", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private async Task<UserTodoistIntegration?> GetTodoistIntegrationAsync(string userId, CancellationToken ct)
    {
        return await _context.UserTodoistIntegrations.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);
    }

    private async Task<List<TodoistTaskApiItem>?> FetchAllActiveTasksAsync(string accessToken, CancellationToken ct)
    {
        var list = new List<TodoistTaskApiItem>();
        string? cursor = null;
        using var http = _httpClientFactory.CreateClient();

        do
        {
            var url = "https://api.todoist.com/api/v1/tasks?limit=200";
            if (!string.IsNullOrEmpty(cursor))
                url += "&cursor=" + Uri.EscapeDataString(cursor);

            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            HttpResponseMessage response;
            try
            {
                response = await http.SendAsync(req, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Todoist API request failed");
                return null;
            }

            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Todoist list tasks failed ({Status}): {Body}", (int)response.StatusCode,
                    body.Length > 500 ? body[..500] + "…" : body);
                return null;
            }

            TodoistTasksPage? page;
            try
            {
                page = JsonSerializer.Deserialize<TodoistTasksPage>(body, JsonOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Todoist list tasks JSON parse failed");
                return null;
            }

            if (page?.Results != null)
                list.AddRange(page.Results);
            cursor = page?.NextCursor;
        } while (!string.IsNullOrEmpty(cursor));

        return list;
    }

    private static DateTime ResolveTaskDate(TodoistDueApi? due, DateTime todayUtc)
    {
        if (due == null)
            return todayUtc;

        if (!string.IsNullOrWhiteSpace(due.Datetime))
        {
            if (DateTime.TryParse(due.Datetime, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
            {
                var utc = dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
                return utc.Date;
            }
        }

        if (!string.IsNullOrWhiteSpace(due.Date))
        {
            if (DateTime.TryParse(due.Date, null, System.Globalization.DateTimeStyles.AssumeUniversal, out var d))
                return DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
        }

        return todayUtc;
    }

    private static int MapPriority(int todoistPriority)
    {
        return todoistPriority switch
        {
            >= 4 => 2,
            3 => 1,
            _ => 0
        };
    }

    private static string TruncateTitle(string title)
    {
        const int max = 200;
        return title.Length <= max ? title : title[..max];
    }

    private sealed class TodoistTasksPage
    {
        [JsonPropertyName("results")]
        public List<TodoistTaskApiItem>? Results { get; set; }

        [JsonPropertyName("next_cursor")]
        public string? NextCursor { get; set; }
    }

    private sealed class TodoistTaskApiItem
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("due")]
        public TodoistDueApi? Due { get; set; }

        [JsonPropertyName("priority")]
        public int Priority { get; set; }

        [JsonPropertyName("labels")]
        public List<string>? Labels { get; set; }

        [JsonPropertyName("parent_id")]
        public string? ParentId { get; set; }
    }

    private sealed class TodoistDueApi
    {
        [JsonPropertyName("date")]
        public string? Date { get; set; }

        [JsonPropertyName("datetime")]
        public string? Datetime { get; set; }
    }
}
