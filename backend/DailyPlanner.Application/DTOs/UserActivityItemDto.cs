namespace DailyPlanner.Application.DTOs;

public class UserActivityItemDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public string? EntityTitle { get; set; }
}
