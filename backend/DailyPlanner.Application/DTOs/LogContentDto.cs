namespace DailyPlanner.Application.DTOs;

public class LogContentDto
{
    public string FileName { get; set; } = string.Empty;
    public IReadOnlyList<LogLineDto> Lines { get; set; } = Array.Empty<LogLineDto>();
    public int TotalLineCount { get; set; }
}

public class LogLineDto
{
    public int LineNumber { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}
