namespace DailyPlanner.Application.DTOs;

public class TagUsageDto
{
    public string Tag { get; set; } = string.Empty;
    public int TaskCount { get; set; }
    public double PercentUsage { get; set; }
}

public class TagsWithUsageResult
{
    public List<TagUsageDto> Tags { get; set; } = new();
    public int TotalTasks { get; set; }
}
