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
        var baseQuery =
            from inst in _context.TaskInstances.AsNoTracking()
            join task in _context.DailyTasks.AsNoTracking() on inst.TaskId equals task.Id
            join goal in _context.LongTermGoals.AsNoTracking() on task.GoalId equals goal.Id into goalJoin
            from goal in goalJoin.DefaultIfEmpty()
            where task.UserId == userId
            select new { task, inst, goalName = goal != null ? goal.Title : null };

        if (date.HasValue)
        {
            var dateValue = ToUtc(date.Value);
            baseQuery = baseQuery.Where(x => x.inst.InstanceDate.Date == dateValue.Date);
        }

        if (completed.HasValue)
        {
            baseQuery = completed.Value
                ? baseQuery.Where(x => x.inst.Status == TaskInstance.StatusCompleted)
                : baseQuery.Where(x => x.inst.Status != TaskInstance.StatusCompleted);
        }

        if (goalId.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.task.GoalId == goalId.Value);
        }

        if (priority.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.task.Priority == priority.Value);
        }

        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagValue = tag.Trim();
            baseQuery = baseQuery.Where(x => x.task.Tags != null && x.task.Tags.Contains(tagValue));
        }

        int pageNum = page ?? 1;
        int size = pageSize ?? 10;

        int totalCount = await baseQuery.CountAsync();

        var isAsc = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
        var ordered = isAsc
            ? baseQuery.OrderBy(x => x.inst.InstanceDate).ThenBy(x => x.task.Priority)
            : baseQuery.OrderByDescending(x => x.inst.InstanceDate).ThenBy(x => x.task.Priority);

        var rows = await ordered
            .Skip((pageNum - 1) * size)
            .Take(size)
            .ToListAsync();

        var dtos = rows.Select(x => new DailyTaskDto
        {
            Id = x.task.Id,
            Title = x.task.Title,
            Description = x.inst.Description,
            Date = ToUtc(x.inst.InstanceDate),
            IsCompleted = string.Equals(x.inst.Status, TaskInstance.StatusCompleted, StringComparison.OrdinalIgnoreCase),
            CompletedDate = x.inst.CompletedDate.HasValue ? ToUtcFull(x.inst.CompletedDate.Value) : null,
            Priority = x.task.Priority,
            Recurrence = x.task.Recurrence,
            ReminderTime = x.task.ReminderTime,
            StartTime = x.task.StartTime,
            EndTime = x.task.EndTime,
            Tags = x.task.Tags != null ? x.task.Tags.ToList() : new List<string>(),
            CreatedAt = x.task.CreatedAt,
            GoalMilestoneId = x.task.GoalMilestoneId,
            GoalId = x.task.GoalId,
            GoalName = x.goalName
        }).ToList();

        return new ApiResponse<PagedTasksResult>
        {
            Success = true,
            Data = new PagedTasksResult
            {
                Items = dtos,
                TotalCount = totalCount,
                Page = pageNum,
                PageSize = size
            }
        };
    }

    public async Task<ApiResponse<TaskInstanceDto>> UpsertTaskInstanceAsync(string userId, UpsertTaskInstanceRequest request)
    {
        var task = await _context.DailyTasks
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TaskId && t.UserId == userId);

        if (task == null)
        {
            return new ApiResponse<TaskInstanceDto>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        var instanceDateUtc = ToUtc(request.Date);

        var instance = await _context.TaskInstances
            .FirstOrDefaultAsync(i => i.TaskId == request.TaskId && i.InstanceDate.Date == instanceDateUtc.Date);

        var completedAtUtc = DateTime.UtcNow;

        if (instance == null)
        {
            instance = new TaskInstance
            {
                Id = Guid.NewGuid(),
                TaskId = request.TaskId,
                InstanceDate = instanceDateUtc,
                Description = DailyTaskRichTextSanitizer.SanitizeHtml(request.Description),
                Status = request.IsCompleted ? TaskInstance.StatusCompleted : TaskInstance.StatusIncomplete,
                CompletedDate = request.IsCompleted ? completedAtUtc : null,
                IsOverride = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = completedAtUtc
            };
            _context.TaskInstances.Add(instance);
        }
        else
        {
            instance.Description = DailyTaskRichTextSanitizer.SanitizeHtml(request.Description);
            if (request.IsCompleted)
                instance.MarkCompleted(completedAtUtc);
            else
                instance.MarkIncomplete();
        }

        await _context.SaveChangesAsync();

        return new ApiResponse<TaskInstanceDto>
        {
            Success = true,
            Data = new TaskInstanceDto
            {
                Id = instance.Id,
                TaskId = instance.TaskId,
                Date = ToUtc(instance.InstanceDate),
                Description = instance.Description,
                IsCompleted = instance.IsCompleted,
                CompletedDate = instance.CompletedDate.HasValue ? ToUtcFull(instance.CompletedDate.Value) : null
            }
        };
    }

    public async Task<ApiResponse<object>> DeleteTaskInstanceAsync(string userId, Guid instanceId)
    {
        var instance = await _context.TaskInstances
            .Include(i => i.Task)
            .FirstOrDefaultAsync(i => i.Id == instanceId && i.Task.UserId == userId);

        if (instance == null)
            return new ApiResponse<object> { Success = false, Message = "Task instance not found" };

        _context.TaskInstances.Remove(instance);
        await _context.SaveChangesAsync();

        return new ApiResponse<object> { Success = true, Message = "Task instance deleted successfully" };
    }

    public async Task<ApiResponse<TaskHistoryResult>> GetTaskHistoryAsync(string userId, Guid taskId)
    {
        var exists = await _context.DailyTasks
            .AsNoTracking()
            .AnyAsync(t => t.Id == taskId && t.UserId == userId);

        if (!exists)
        {
            return new ApiResponse<TaskHistoryResult>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        var items = await _context.TaskInstances
            .AsNoTracking()
            .Where(i => i.TaskId == taskId)
            .OrderByDescending(i => i.InstanceDate)
            .Select(i => new TaskInstanceDto
            {
                Id = i.Id,
                TaskId = i.TaskId,
                Date = ToUtc(i.InstanceDate),
                Description = i.Description,
                IsCompleted = i.Status == TaskInstance.StatusCompleted,
                CompletedDate = i.CompletedDate
                    .HasValue ? ToUtcFull(i.CompletedDate.Value) : null
            })
            .ToListAsync();

        return new ApiResponse<TaskHistoryResult>
        {
            Success = true,
            Data = new TaskHistoryResult
            {
                Items = items
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
            // Daily/per-date data is stored in TaskInstance, not in the template.
            Description = null,
            Date = ToUtcFull(request.Date),
            Priority = request.Priority,
            Recurrence = request.Recurrence,
            ReminderTime = request.ReminderTime,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            Tags = request.Tags != null ? request.Tags.ToArray() : null,
            IsCompleted = false,
            GoalMilestoneId = request.GoalMilestoneId,
            GoalId = goalId
        };

        var instanceDateUtc = ToUtc(request.Date);
        var instance = new TaskInstance
        {
            Id = Guid.NewGuid(),
            TaskId = task.Id,
            InstanceDate = instanceDateUtc,
            Description = DailyTaskRichTextSanitizer.SanitizeHtml(request.Description),
            Status = TaskInstance.StatusIncomplete,
            IsOverride = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.DailyTasks.Add(task);
        _context.TaskInstances.Add(instance);
        await _context.SaveChangesAsync();
        await _userActivityService.RecordAsync(userId, "task", "admin.activity.taskCreated", "DailyTask", task.Id.ToString());

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task created successfully",
            Data = new DailyTaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = instance.Description,
                Date = instance.InstanceDate,
                IsCompleted = false,
                CompletedDate = null,
                Priority = task.Priority,
                Recurrence = task.Recurrence,
                ReminderTime = task.ReminderTime,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                Tags = task.Tags != null ? task.Tags.ToList() : new List<string>(),
                CreatedAt = task.CreatedAt,
                GoalMilestoneId = task.GoalMilestoneId,
                GoalId = task.GoalId
            }
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
        if (request.Priority.HasValue)
            task.Priority = request.Priority.Value;
        if (request.Recurrence.HasValue)
            task.Recurrence = request.Recurrence.Value;
        if (request.Date.HasValue)
            task.Date = ToUtcFull(request.Date.Value);
        if (request.ReminderTime != null)
            task.ReminderTime = request.ReminderTime;
        if (request.StartTime != null)
            task.StartTime = request.StartTime;
        if (request.EndTime != null)
            task.EndTime = request.EndTime;
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
        // If neither GoalMilestoneId nor GoalId is provided, keep existing goal linkage.
        // This supports partial updates (e.g., drag/drop rescheduling) without unintentionally
        // removing goal/milestone associations.

        // Optional: description/date are per-day data; only upsert an instance when description is provided.
        // This supports the FE split workflow (template update vs per-day instance upsert).
        TaskInstance? instanceForResponse = null;
        var responseDateUtc = request.Date.HasValue ? ToUtc(request.Date.Value) : ToUtc(task.Date);

        if (request.Description != null)
        {
            var instanceDateUtc = responseDateUtc;
            var instance = await _context.TaskInstances
                .FirstOrDefaultAsync(i => i.TaskId == task.Id && i.InstanceDate.Date == instanceDateUtc.Date);

            if (instance == null)
            {
                instance = new TaskInstance
                {
                    Id = Guid.NewGuid(),
                    TaskId = task.Id,
                    InstanceDate = instanceDateUtc,
                    Description = DailyTaskRichTextSanitizer.SanitizeHtml(request.Description),
                    Status = TaskInstance.StatusIncomplete,
                    IsOverride = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.TaskInstances.Add(instance);
            }
            else
            {
                instance.Description = DailyTaskRichTextSanitizer.SanitizeHtml(request.Description);
                instance.UpdatedAt = DateTime.UtcNow;
            }

            instanceForResponse = instance;
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task updated successfully",
            Data = new DailyTaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = instanceForResponse?.Description,
                Date = instanceForResponse != null ? ToUtc(instanceForResponse.InstanceDate) : responseDateUtc,
                IsCompleted = instanceForResponse != null && instanceForResponse.IsCompleted,
                CompletedDate = instanceForResponse?.CompletedDate.HasValue == true ? ToUtcFull(instanceForResponse.CompletedDate!.Value) : null,
                Priority = task.Priority,
                Recurrence = task.Recurrence,
                ReminderTime = task.ReminderTime,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                Tags = task.Tags != null ? task.Tags.ToList() : new List<string>(),
                CreatedAt = task.CreatedAt,
                GoalMilestoneId = task.GoalMilestoneId,
                GoalId = task.GoalId
            }
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

        // Toggle the appropriate instance: for tasks tied to a goal, use the task's scheduled date
        // (same row the goal UI shows). Using "today" would create a second instance on another day
        // and leave the original instance incomplete — duplicate titles in the goal task list.
        var instanceDateUtc = task.GoalId.HasValue || task.GoalMilestoneId.HasValue
            ? ToUtc(task.Date)
            : DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        var instance = await _context.TaskInstances
            .FirstOrDefaultAsync(i => i.TaskId == task.Id && i.InstanceDate.Date == instanceDateUtc.Date);

        if (instance == null)
        {
            instance = new TaskInstance
            {
                Id = Guid.NewGuid(),
                TaskId = task.Id,
                InstanceDate = instanceDateUtc,
                Description = null,
                Status = TaskInstance.StatusIncomplete,
                IsOverride = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.TaskInstances.Add(instance);
        }

        var willBeCompleted = !instance.IsCompleted;
        if (willBeCompleted)
            instance.MarkCompleted(DateTime.UtcNow);
        else
            instance.MarkIncomplete();

        await _context.SaveChangesAsync();
        await _userActivityService.RecordAsync(
            userId,
            "task",
            willBeCompleted ? "admin.activity.taskCompleted" : "admin.activity.taskUncompleted",
            "DailyTask",
            task.Id.ToString());

        return new ApiResponse<DailyTaskDto>
        {
            Success = true,
            Message = "Task toggled successfully",
            Data = new DailyTaskDto
            {
                Id = task.Id,
                Title = task.Title,
                Description = instance.Description,
                Date = ToUtc(instance.InstanceDate),
                IsCompleted = willBeCompleted,
                CompletedDate = instance.CompletedDate.HasValue ? ToUtcFull(instance.CompletedDate.Value) : null,
                Priority = task.Priority,
                Recurrence = task.Recurrence,
                ReminderTime = task.ReminderTime,
                StartTime = task.StartTime,
                EndTime = task.EndTime,
                Tags = task.Tags != null ? task.Tags.ToList() : new List<string>(),
                CreatedAt = task.CreatedAt,
                GoalMilestoneId = task.GoalMilestoneId,
                GoalId = task.GoalId
            }
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

