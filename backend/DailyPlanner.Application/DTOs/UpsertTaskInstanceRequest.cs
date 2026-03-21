using System;

namespace DailyPlanner.Application.DTOs;

public class UpsertTaskInstanceRequest
{
    public Guid TaskId { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
    public bool IsCompleted { get; set; }
}

