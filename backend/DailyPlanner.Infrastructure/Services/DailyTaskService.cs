using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class DailyTaskService : IDailyTaskService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    private static DateTime ToUtc(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public DailyTaskService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<ApiResponse<PagedTasksResult>> GetTasksAsync(string userId, DateTime? date, bool? completed, int? page, int? pageSize)
    {
        var query = _context.DailyTasks.Where(t => t.UserId == userId);

        if (date.HasValue)
        {
            var dateValue = ToUtc(date.Value);
            query = query.Where(t => t.Date.Date == dateValue);
        }

        if (completed.HasValue)
        {
            query = query.Where(t => t.IsCompleted == completed.Value);
        }

        int pageNum = page ?? 1;
        int size = pageSize ?? 10;

        int totalCount = await query.CountAsync();

        var ordered = query.OrderByDescending(t => t.Date).ThenBy(t => t.Priority);
        var tasks = await ordered.Skip((pageNum - 1) * size).Take(size).ToListAsync();

        return new ApiResponse<PagedTasksResult>
        {
            Success = true,
            Data = new PagedTasksResult
            {
                Items = _mapper.Map<List<DailyTaskDto>>(tasks),
                TotalCount = totalCount,
                Page = pageNum,
                PageSize = size
            }
        };
    }

    public async Task<ApiResponse<DailyTaskDto>> CreateTaskAsync(string userId, CreateDailyTaskRequest request)
    {
        var task = new DailyTask
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title,
            Description = request.Description,
            Date = ToUtcFull(request.Date),
            Priority = request.Priority,
            Recurrence = request.Recurrence,
            ReminderTime = request.ReminderTime,
            Tags = request.Tags != null ? new List<string>(request.Tags) : new List<string>(),
            IsCompleted = false
        };

        _context.DailyTasks.Add(task);
        await _context.SaveChangesAsync();

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task created successfully",
            Data = _mapper.Map<DailyTaskDto>(task)
        };
    }

    public async Task<ApiResponse<DailyTaskDto>> UpdateTaskAsync(string userId, Guid taskId, UpdateDailyTaskRequest request)
    {
        var task = await _context.DailyTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<DailyTaskDto>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        if (!string.IsNullOrEmpty(request.Title))
            task.Title = request.Title;
        if (request.Description != null)
            task.Description = request.Description;
        if (request.Date.HasValue)
            task.Date = ToUtcFull(request.Date.Value);
        if (request.Priority.HasValue)
            task.Priority = request.Priority.Value;
        if (request.Recurrence.HasValue)
            task.Recurrence = request.Recurrence.Value;
        if (request.ReminderTime != null)
            task.ReminderTime = request.ReminderTime;
        if (request.Tags != null)
            task.Tags = new List<string>(request.Tags);

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task updated successfully",
            Data = _mapper.Map<DailyTaskDto>(task)
        };
    }

    public async Task<ApiResponse<object>> DeleteTaskAsync(string userId, Guid taskId)
    {
        var task = await _context.DailyTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        _context.DailyTasks.Remove(task);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Task deleted successfully"
        };
    }

    public async Task<ApiResponse<DailyTaskDto>> ToggleTaskAsync(string userId, Guid taskId)
    {
        var task = await _context.DailyTasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<DailyTaskDto>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        task.IsCompleted = !task.IsCompleted;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task toggled successfully",
            Data = _mapper.Map<DailyTaskDto>(task)
        };
    }

    public async Task<ApiResponse<MainDailyGoalDto?>> GetMainGoalAsync(string userId, DateTime date)
    {
        var dateUtc = ToUtc(date);
        var goal = await _context.MainDailyGoals
            .FirstOrDefaultAsync(g => g.UserId == userId && g.Date.Date == dateUtc);

        return new ApiResponse<MainDailyGoalDto?>
        {
            Success = true,
            Data = goal != null ? _mapper.Map<MainDailyGoalDto>(goal) : null
        };
    }

    public async Task<ApiResponse<MainDailyGoalDto>> UpsertMainGoalAsync(string userId, DateTime date, UpdateMainDailyGoalRequest request)
    {
        var dateUtc = ToUtc(date);
        var goal = await _context.MainDailyGoals
            .FirstOrDefaultAsync(g => g.UserId == userId && g.Date.Date == dateUtc);

        if (goal == null)
        {
            goal = new MainDailyGoal
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Date = dateUtc,
                Title = request.Title ?? string.Empty,
                Description = request.Description,
                IsCompleted = request.IsCompleted ?? false
            };
            _context.MainDailyGoals.Add(goal);
        }
        else
        {
            if (!string.IsNullOrEmpty(request.Title))
                goal.Title = request.Title;
            if (request.Description != null)
                goal.Description = request.Description;
            if (request.IsCompleted.HasValue)
                goal.IsCompleted = request.IsCompleted.Value;
            goal.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return new ApiResponse<MainDailyGoalDto>
        {
            Success = true,
            Message = "Main goal saved successfully",
            Data = _mapper.Map<MainDailyGoalDto>(goal)
        };
    }
}

