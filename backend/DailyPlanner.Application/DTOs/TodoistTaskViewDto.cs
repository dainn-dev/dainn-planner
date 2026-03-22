namespace DailyPlanner.Application.DTOs;

/// <summary>Active Todoist task for display; not persisted in DailyPlanner database.</summary>
public class TodoistTaskViewDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>UTC calendar date used for due (or &quot;today&quot; when Todoist has no due).</summary>
    public DateTime DueDate { get; set; }
    public int Priority { get; set; }
    public List<string> Tags { get; set; } = new();
}
