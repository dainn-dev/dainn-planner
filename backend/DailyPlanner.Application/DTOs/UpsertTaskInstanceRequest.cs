using System;

namespace DailyPlanner.Application.DTOs;

public class UpsertTaskInstanceRequest
{
    public Guid TaskId { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
    public bool? IsCompleted { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    /// <summary>When true, StartTime/EndTime are written even if null (clears existing values).</summary>
    public bool UpdateTimes { get; set; } = false;
}

