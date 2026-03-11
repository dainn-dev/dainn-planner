using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class LongTermGoalService : ILongTermGoalService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IUserActivityService _userActivityService;

    private static DateTime ToUtc(DateTime d) => d.Kind == DateTimeKind.Utc ? d : DateTime.SpecifyKind(d, DateTimeKind.Utc);

    public LongTermGoalService(ApplicationDbContext context, IMapper mapper, IUserActivityService userActivityService)
    {
        _context = context;
        _mapper = mapper;
        _userActivityService = userActivityService;
    }

    public async Task<ApiResponse<List<LongTermGoalDto>>> GetGoalsAsync(string userId, string? status, string? category, int page = 1, int pageSize = 10)
    {
        var query = _context.LongTermGoals
            .Include(g => g.Milestones.OrderBy(m => m.CreatedAt))
            .Include(g => g.Tasks)
            .Where(g => g.UserId == userId);

        if (!string.IsNullOrEmpty(status))
            query = query.Where(g => g.Status == status);
        if (!string.IsNullOrEmpty(category))
            query = query.Where(g => g.Category == category);

        var goals = await query
            .AsSplitQuery()
            .OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new ApiResponse<List<LongTermGoalDto>>
        {
            Success = true,
            Data = _mapper.Map<List<LongTermGoalDto>>(goals)
        };
    }

    public async Task<ApiResponse<LongTermGoalDto>> GetGoalByIdAsync(string userId, Guid goalId)
    {
        var goal = await _context.LongTermGoals
            .Include(g => g.Milestones.OrderBy(m => m.CreatedAt))
            .Include(g => g.Tasks)
            .AsSplitQuery()
            .FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);

        if (goal == null)
        {
            return new ApiResponse<LongTermGoalDto>
            {
                Success = false,
                Message = "Goal not found"
            };
        }

        return new ApiResponse<LongTermGoalDto>
        {
            Success = true,
            Data = _mapper.Map<LongTermGoalDto>(goal)
        };
    }

    public async Task<ApiResponse<LongTermGoalDto>> CreateGoalAsync(string userId, CreateLongTermGoalRequest request)
    {
        var goal = new LongTermGoal
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            Status = "Active",
            StartDate = request.StartDate.HasValue ? ToUtc(request.StartDate.Value) : (DateTime?)null,
            TargetDate = request.TargetDate.HasValue ? ToUtc(request.TargetDate.Value) : (DateTime?)null,
            Progress = 0
        };

        _context.LongTermGoals.Add(goal);
        await _context.SaveChangesAsync();
        await _userActivityService.RecordAsync(userId, "goal", "admin.activity.goalCreated", "LongTermGoal", goal.Id.ToString());

        return new ApiResponse<LongTermGoalDto>
        {
            Success = true,
            Message = "Goal created successfully",
            Data = _mapper.Map<LongTermGoalDto>(goal)
        };
    }

    public async Task<ApiResponse<LongTermGoalDto>> UpdateGoalAsync(string userId, Guid goalId, UpdateLongTermGoalRequest request)
    {
        var goal = await _context.LongTermGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal == null)
        {
            return new ApiResponse<LongTermGoalDto>
            {
                Success = false,
                Message = "Goal not found"
            };
        }

        if (!string.IsNullOrEmpty(request.Title))
            goal.Title = request.Title;
        if (request.Description != null)
            goal.Description = request.Description;
        if (!string.IsNullOrEmpty(request.Category))
            goal.Category = request.Category;
        if (!string.IsNullOrEmpty(request.Status))
            goal.Status = request.Status;
        if (request.StartDate.HasValue)
            goal.StartDate = ToUtc(request.StartDate.Value);
        if (request.TargetDate.HasValue)
            goal.TargetDate = ToUtc(request.TargetDate.Value);

        if (request.Milestones != null)
        {
            var existingMilestones = await _context.GoalMilestones.Where(m => m.GoalId == goalId).ToListAsync();
            var idsInRequest = request.Milestones.Where(m => m.Id.HasValue && m.Id.Value != Guid.Empty).Select(m => m.Id!.Value).ToHashSet();

            foreach (var item in request.Milestones)
            {
                if (!item.Id.HasValue || item.Id.Value == Guid.Empty)
                {
                    var isCompleted = item.IsCompleted ?? false;
                    var newMilestone = new GoalMilestone
                    {
                        Id = Guid.NewGuid(),
                        GoalId = goalId,
                        Title = item.Title ?? string.Empty,
                        Description = item.Description,
                        TargetDate = item.TargetDate.HasValue ? ToUtc(item.TargetDate.Value) : (DateTime?)null,
                        IsCompleted = isCompleted,
                        CompletedDate = isCompleted ? DateTime.UtcNow : null
                    };
                    _context.GoalMilestones.Add(newMilestone);
                }
                else
                {
                    var milestone = existingMilestones.FirstOrDefault(m => m.Id == item.Id.Value);
                    if (milestone != null)
                    {
                        if (item.Title != null)
                            milestone.Title = item.Title;
                        if (item.Description != null)
                            milestone.Description = item.Description;
                        if (item.TargetDate.HasValue)
                            milestone.TargetDate = ToUtc(item.TargetDate.Value);
                        if (item.IsCompleted.HasValue)
                        {
                            milestone.IsCompleted = item.IsCompleted.Value;
                            milestone.CompletedDate = item.IsCompleted.Value ? DateTime.UtcNow : null;
                        }
                        milestone.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            foreach (var existing in existingMilestones.Where(m => !idsInRequest.Contains(m.Id)))
            {
                _context.GoalMilestones.Remove(existing);
            }
        }

        goal.UpdatedAt = DateTime.UtcNow;
        await RecalculateProgressAsync(goalId);
        await _context.SaveChangesAsync();

        var updatedGoal = await _context.LongTermGoals
            .Include(g => g.Milestones.OrderBy(m => m.CreatedAt))
            .Include(g => g.Tasks)
            .AsSplitQuery()
            .FirstOrDefaultAsync(g => g.Id == goalId);

        return new ApiResponse<LongTermGoalDto>
        {
            Success = true,
            Message = "Goal updated successfully",
            Data = _mapper.Map<LongTermGoalDto>(updatedGoal!)
        };
    }

    public async Task<ApiResponse<object>> DeleteGoalAsync(string userId, Guid goalId)
    {
        var goal = await _context.LongTermGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Goal not found"
            };
        }

        _context.LongTermGoals.Remove(goal);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Goal deleted successfully"
        };
    }

    public async Task<ApiResponse<GoalMilestoneDto>> CreateMilestoneAsync(string userId, Guid goalId, CreateGoalMilestoneRequest request)
    {
        var goal = await _context.LongTermGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal == null)
        {
            return new ApiResponse<GoalMilestoneDto>
            {
                Success = false,
                Message = "Goal not found"
            };
        }

        var milestone = new GoalMilestone
        {
            Id = Guid.NewGuid(),
            GoalId = goalId,
            Title = request.Title,
            Description = request.Description,
            TargetDate = request.TargetDate.HasValue ? ToUtc(request.TargetDate.Value) : (DateTime?)null,
            IsCompleted = false
        };

        _context.GoalMilestones.Add(milestone);
        await RecalculateProgressAsync(goalId);
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalMilestoneDto>
        {
            Success = true,
            Message = "Milestone created successfully",
            Data = _mapper.Map<GoalMilestoneDto>(milestone)
        };
    }

    public async Task<ApiResponse<GoalMilestoneDto>> UpdateMilestoneAsync(string userId, Guid goalId, Guid milestoneId, UpdateGoalMilestoneRequest request)
    {
        var milestone = await _context.GoalMilestones
            .Include(m => m.Goal)
            .FirstOrDefaultAsync(m => m.Id == milestoneId && m.GoalId == goalId && m.Goal.UserId == userId);
        if (milestone == null)
        {
            return new ApiResponse<GoalMilestoneDto>
            {
                Success = false,
                Message = "Milestone not found"
            };
        }

        if (!string.IsNullOrEmpty(request.Title))
            milestone.Title = request.Title;
        if (request.Description != null)
            milestone.Description = request.Description;
        if (request.TargetDate.HasValue)
            milestone.TargetDate = ToUtc(request.TargetDate.Value);
        if (request.IsCompleted.HasValue)
            milestone.IsCompleted = request.IsCompleted.Value;

        milestone.UpdatedAt = DateTime.UtcNow;
        await RecalculateProgressAsync(goalId);
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalMilestoneDto>
        {
            Success = true,
            Message = "Milestone updated successfully",
            Data = _mapper.Map<GoalMilestoneDto>(milestone)
        };
    }

    public async Task<ApiResponse<object>> DeleteMilestoneAsync(string userId, Guid goalId, Guid milestoneId)
    {
        var milestone = await _context.GoalMilestones
            .Include(m => m.Goal)
            .FirstOrDefaultAsync(m => m.Id == milestoneId && m.GoalId == goalId && m.Goal.UserId == userId);
        if (milestone == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Milestone not found"
            };
        }

        _context.GoalMilestones.Remove(milestone);
        await RecalculateProgressAsync(goalId);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Milestone deleted successfully"
        };
    }

    public async Task<ApiResponse<GoalMilestoneDto>> ToggleMilestoneAsync(string userId, Guid goalId, Guid milestoneId)
    {
        var milestone = await _context.GoalMilestones
            .Include(m => m.Goal)
            .FirstOrDefaultAsync(m => m.Id == milestoneId && m.GoalId == goalId && m.Goal.UserId == userId);
        if (milestone == null)
        {
            return new ApiResponse<GoalMilestoneDto>
            {
                Success = false,
                Message = "Milestone not found"
            };
        }

        milestone.IsCompleted = !milestone.IsCompleted;
        milestone.CompletedDate = milestone.IsCompleted ? DateTime.UtcNow : null;
        milestone.UpdatedAt = DateTime.UtcNow;
        await RecalculateProgressAsync(goalId);
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalMilestoneDto>
        {
            Success = true,
            Message = "Milestone toggled successfully",
            Data = _mapper.Map<GoalMilestoneDto>(milestone)
        };
    }

    public async Task<ApiResponse<GoalTaskDto>> CreateGoalTaskAsync(string userId, Guid goalId, CreateGoalTaskRequest request)
    {
        var goal = await _context.LongTermGoals.FirstOrDefaultAsync(g => g.Id == goalId && g.UserId == userId);
        if (goal == null)
        {
            return new ApiResponse<GoalTaskDto>
            {
                Success = false,
                Message = "Goal not found"
            };
        }

        var task = new GoalTask
        {
            Id = Guid.NewGuid(),
            GoalId = goalId,
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            Priority = request.Priority,
            IsCompleted = false
        };

        _context.GoalTasks.Add(task);
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalTaskDto>
        {
            Success = true,
            Message = "Task created successfully",
            Data = _mapper.Map<GoalTaskDto>(task)
        };
    }

    public async Task<ApiResponse<GoalTaskDto>> UpdateGoalTaskAsync(string userId, Guid goalId, Guid taskId, UpdateGoalTaskRequest request)
    {
        var task = await _context.GoalTasks
            .Include(t => t.Goal)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.GoalId == goalId && t.Goal.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<GoalTaskDto>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        if (!string.IsNullOrEmpty(request.Title))
            task.Title = request.Title;
        if (request.Description != null)
            task.Description = request.Description;
        if (request.DueDate.HasValue)
            task.DueDate = request.DueDate;
        if (request.Priority.HasValue)
            task.Priority = request.Priority.Value;
        if (request.IsCompleted.HasValue)
            task.IsCompleted = request.IsCompleted.Value;

        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalTaskDto>
        {
            Success = true,
            Message = "Task updated successfully",
            Data = _mapper.Map<GoalTaskDto>(task)
        };
    }

    public async Task<ApiResponse<object>> DeleteGoalTaskAsync(string userId, Guid goalId, Guid taskId)
    {
        var task = await _context.GoalTasks
            .Include(t => t.Goal)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.GoalId == goalId && t.Goal.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        _context.GoalTasks.Remove(task);
        await _context.SaveChangesAsync();

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Task deleted successfully"
        };
    }

    public async Task<ApiResponse<GoalTaskDto>> ToggleGoalTaskAsync(string userId, Guid goalId, Guid taskId)
    {
        var task = await _context.GoalTasks
            .Include(t => t.Goal)
            .FirstOrDefaultAsync(t => t.Id == taskId && t.GoalId == goalId && t.Goal.UserId == userId);
        if (task == null)
        {
            return new ApiResponse<GoalTaskDto>
            {
                Success = false,
                Message = "Task not found"
            };
        }

        task.IsCompleted = !task.IsCompleted;
        task.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ApiResponse<GoalTaskDto>
        {
            Success = true,
            Message = "Task toggled successfully",
            Data = _mapper.Map<GoalTaskDto>(task)
        };
    }

    private async Task RecalculateProgressAsync(Guid goalId)
    {
        var goal = await _context.LongTermGoals
            .Include(g => g.Milestones.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(g => g.Id == goalId);

        if (goal == null || !goal.Milestones.Any())
        {
            if (goal != null)
                goal.Progress = 0;
            return;
        }

        var completedCount = goal.Milestones.Count(m => m.IsCompleted);
        goal.Progress = (decimal)completedCount / goal.Milestones.Count * 100;
    }
}

