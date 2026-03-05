namespace DailyPlanner.Application.DTOs;

public class PagedTasksResult
{
    public List<DailyTaskDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
