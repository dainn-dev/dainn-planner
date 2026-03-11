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
    private readonly IUserActivityService _userActivityService;

    private static DateTime ToUtc(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);
    private static DateTime ToUtcFull(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public DailyTaskService(ApplicationDbContext context, IMapper mapper, IUserActivityService userActivityService)
    {
        _context = context;
        _mapper = mapper;
        _userActivityService = userActivityService;
    }

    public async Task<ApiResponse<PagedTasksResult>> GetTasksAsync(string userId, DateTime? date, bool? completed, int? page, int? pageSize, int? priority = null, string? tag = null, string? sortOrder = null, Guid? goalId = null)
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

        if (goalId.HasValue)
        {
            query = query.Where(t => t.GoalId == goalId.Value);
        }

        if (priority.HasValue)
        {
            query = query.Where(t => t.Priority == priority.Value);
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagValue = tag.Trim();
            query = query.Where(t => t.Tags != null && t.Tags.Contains(tagValue));
        }

        int pageNum = page ?? 1;
        int size = pageSize ?? 10;

        int totalCount = await query.CountAsync();

        var isAsc = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        var ordered = isAsc
            ? query.OrderBy(t => t.Date).ThenBy(t => t.Priority)
            : query.OrderByDescending(t => t.Date).ThenBy(t => t.Priority);
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
        Guid? goalId = null;
        if (request.GoalMilestoneId.HasValue)
        {
            var milestone = await _context.GoalMilestones
                .Include(m => m.Goal)
                .FirstOrDefaultAsync(m => m.Id == request.GoalMilestoneId.Value);
            if (milestone == null || milestone.Goal.UserId != userId)
            {
                return new ApiResponse<DailyTaskDto>
                {
                    Success = false,
                    Message = "Milestone not found or access denied"
                };
            }
            goalId = milestone.GoalId;
        }

        if (!goalId.HasValue && request.GoalId.HasValue)
        {
            var goal = await _context.LongTermGoals
                .FirstOrDefaultAsync(g => g.Id == request.GoalId.Value && g.UserId == userId);
            if (goal == null)
            {
                return new ApiResponse<DailyTaskDto>
                {
                    Success = false,
                    Message = "Goal not found or access denied"
                };
            }
            goalId = goal.Id;
        }

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
            Tags = request.Tags != null ? request.Tags.ToArray() : null,
            IsCompleted = false,
            GoalMilestoneId = request.GoalMilestoneId,
            GoalId = goalId
        };

        _context.DailyTasks.Add(task);
        await _context.SaveChangesAsync();
        await _userActivityService.RecordAsync(userId, "task", "admin.activity.taskCreated", "DailyTask", task.Id.ToString());

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
            task.Tags = request.Tags.ToArray();

        if (request.GoalMilestoneId.HasValue)
        {
            var milestone = await _context.GoalMilestones
                .Include(m => m.Goal)
                .FirstOrDefaultAsync(m => m.Id == request.GoalMilestoneId.Value);
            if (milestone == null || milestone.Goal.UserId != userId)
            {
                return new ApiResponse<DailyTaskDto>
                {
                    Success = false,
                    Message = "Milestone not found or access denied"
                };
            }
            task.GoalMilestoneId = milestone.Id;
            task.GoalId = milestone.GoalId;
        }
        else if (request.GoalId.HasValue)
        {
            var goal = await _context.LongTermGoals
                .FirstOrDefaultAsync(g => g.Id == request.GoalId.Value && g.UserId == userId);
            if (goal == null)
            {
                return new ApiResponse<DailyTaskDto>
                {
                    Success = false,
                    Message = "Goal not found or access denied"
                };
            }
            task.GoalMilestoneId = null;
            task.GoalId = goal.Id;
        }
        else
        {
            task.GoalMilestoneId = null;
            task.GoalId = null;
        }

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
        task.CompletedDate = task.IsCompleted ? DateTime.UtcNow : null;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await _userActivityService.RecordAsync(userId, "task", task.IsCompleted ? "admin.activity.taskCompleted" : "admin.activity.taskUncompleted", "DailyTask", task.Id.ToString());

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

    public async Task<ApiResponse<TagsWithUsageResult>> GetTagsWithUsageAsync(string userId, DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        var query = _context.DailyTasks.Where(t => t.UserId == userId);

        if (dateFrom.HasValue)
        {
            var fromUtc = ToUtc(dateFrom.Value);
            query = query.Where(t => t.Date.Date >= fromUtc);
        }

        if (dateTo.HasValue)
        {
            var toUtc = ToUtc(dateTo.Value);
            query = query.Where(t => t.Date.Date <= toUtc);
        }

        var tasks = await query.Select(t => t.Tags).ToListAsync();
        var totalTasks = tasks.Count;

        var tagCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var tags in tasks)
        {
            if (tags == null) continue;
            foreach (var key in tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).Distinct(StringComparer.OrdinalIgnoreCase))
            {
                tagCounts[key] = tagCounts.GetValueOrDefault(key, 0) + 1;
            }
        }

        var tagDtos = tagCounts
            .Select(kv => new TagUsageDto
            {
                Tag = kv.Key,
                TaskCount = kv.Value,
                PercentUsage = totalTasks > 0 ? Math.Round((double)kv.Value / totalTasks * 100, 2) : 0
            })
            .OrderByDescending(t => t.TaskCount)
            .ToList();

        return new ApiResponse<TagsWithUsageResult>
        {
            Success = true,
            Data = new TagsWithUsageResult
            {
                Tags = tagDtos,
                TotalTasks = totalTasks
            }
        };
    }
}

