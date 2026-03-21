using System;

namespace DailyPlanner.Application.DTOs;

public class TaskInstanceDto
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public DateTime Date { get; set; }
    public string? Description { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedDate { get; set; }
}

