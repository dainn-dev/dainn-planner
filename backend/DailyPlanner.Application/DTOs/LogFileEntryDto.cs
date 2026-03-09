namespace DailyPlanner.Application.DTOs;

public class LogFileEntryDto
{
    public string Name { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime LastWriteUtc { get; set; }
}
