using System.Collections.Generic;

namespace DailyPlanner.Application.DTOs;

public class TaskHistoryResult
{
    public List<TaskInstanceDto> Items { get; set; } = new();
}

