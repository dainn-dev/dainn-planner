using System.Text;
using AutoMapper;
using ClosedXML.Excel;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace DailyPlanner.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;
    private readonly IUserActivityService _userActivityService;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;

    public AdminService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper,
        IUserActivityService userActivityService,
        IEmailSender emailSender,
        IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _mapper = mapper;
        _userActivityService = userActivityService;
        _emailSender = emailSender;
        _configuration = configuration;
    }

    public async Task<ApiResponse<AdminDashboardStatsDto>> GetDashboardStatsAsync()
    {
        var stats = new AdminDashboardStatsDto
        {
            TotalUsers = await _context.Users.CountAsync(),
            ActiveUsers = await _context.Users
                .Where(u => u.UpdatedAt.HasValue && u.UpdatedAt.Value > DateTime.UtcNow.AddDays(-30))
                .CountAsync(),
            TotalTasks = await _context.DailyTasks.CountAsync(),
            TotalGoals = await _context.LongTermGoals.CountAsync(),
            TotalEvents = await _context.CalendarEvents.CountAsync(),
            TotalNotifications = await _context.Notifications.CountAsync()
        };

        return new ApiResponse<AdminDashboardStatsDto>
        {
            Success = true,
            Data = stats
        };
    }

    public async Task<ApiResponse<AdminUserStatsDto>> GetUserStatsAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var totalUsers = await _userManager.Users.CountAsync();
        var bannedUsers = await _userManager.Users
            .Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value > now)
            .CountAsync();
        var activeUsers = await _userManager.Users
            .Where(u => u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now))
            .CountAsync();
        var pendingUsers = await _userManager.Users
            .Where(u => !u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now))
            .CountAsync();

        var stats = new AdminUserStatsDto
        {
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers,
            PendingUsers = pendingUsers,
            BannedUsers = bannedUsers
        };

        return new ApiResponse<AdminUserStatsDto>
        {
            Success = true,
            Data = stats
        };
    }

    public async Task<ApiResponse<UserGrowthResultDto>> GetUserGrowthAsync(int days = 30)
    {
        var startDate = DateTime.UtcNow.Date.AddDays(-days);
        var endDateExclusive = startDate.AddDays(days);

        var countsByDate = await _context.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt < endDateExclusive)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var countLookup = countsByDate.ToDictionary(x => x.Date, x => x.Count);
        var dataPoints = new List<UserGrowthPointDto>();
        var totalNewUsers = 0;

        for (var d = startDate; d < endDateExclusive; d = d.AddDays(1))
        {
            var count = countLookup.GetValueOrDefault(d, 0);
            totalNewUsers += count;
            dataPoints.Add(new UserGrowthPointDto
            {
                Date = d.ToString("yyyy-MM-dd"),
                Count = count
            });
        }

        return new ApiResponse<UserGrowthResultDto>
        {
            Success = true,
            Data = new UserGrowthResultDto
            {
                DataPoints = dataPoints,
                TotalNewUsers = totalNewUsers
            }
        };
    }

    public async Task<ApiResponse<PagedUsersResultDto>> GetUsersAsync(string? search, string? status, string? role, string? dateRange, string? sort, int page = 1, int pageSize = 10)
    {
        var now = DateTimeOffset.UtcNow;
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(searchLower)) ||
                (u.FullName != null && u.FullName.ToLower().Contains(searchLower)) ||
                (u.Phone != null && u.Phone.ToLower().Contains(searchLower)));
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = status switch
            {
                "Active" => query.Where(u => u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now)),
                "Pending" => query.Where(u => !u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now)),
                "Banned" => query.Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value > now),
                "Inactive" => query.Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value <= now),
                _ => query
            };
        }

        if (!string.IsNullOrEmpty(role))
        {
            var usersInRole = from u in _context.Users
                join ur in _context.Set<IdentityUserRole<string>>() on u.Id equals ur.UserId
                join r in _context.Set<IdentityRole>() on ur.RoleId equals r.Id
                where r.Name == role
                select u.Id;
            query = query.Where(u => usersInRole.Contains(u.Id));
        }

        if (!string.IsNullOrEmpty(dateRange))
        {
            var utcNow = DateTime.UtcNow;
            var (rangeStart, _) = dateRange switch
            {
                "today" => (utcNow.Date, utcNow),
                "week" => (utcNow.AddDays(-7), utcNow),
                "month" => (utcNow.AddDays(-30), utcNow),
                "quarter" => (utcNow.AddDays(-90), utcNow),
                "year" => (utcNow.AddDays(-365), utcNow),
                _ => (DateTime.MinValue, utcNow)
            };
            if (dateRange != "today")
                query = query.Where(u => u.CreatedAt >= rangeStart);
            else
                query = query.Where(u => u.CreatedAt >= rangeStart && u.CreatedAt <= utcNow);
        }

        var totalCount = await query.CountAsync();

        query = (sort ?? "newest") switch
        {
            "oldest" => query.OrderBy(u => u.CreatedAt),
            "name-asc" => query.OrderBy(u => u.FullName ?? ""),
            "name-desc" => query.OrderByDescending(u => u.FullName ?? ""),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var users = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var userDtos = new List<AdminUserDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var userDto = new AdminUserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName ?? string.Empty,
                Phone = user.Phone,
                Location = user.Location,
                AvatarUrl = user.AvatarUrl,
                Timezone = user.Timezone ?? string.Empty,
                Language = user.Language ?? string.Empty,
                EmailConfirmed = user.EmailConfirmed,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Roles = roles.ToList()
            };
            userDtos.Add(userDto);
        }

        return new ApiResponse<PagedUsersResultDto>
        {
            Success = true,
            Data = new PagedUsersResultDto
            {
                Items = userDtos,
                TotalCount = totalCount
            }
        };
    }

    public async Task<ApiResponse<AdminUserDto>> CreateUserAsync(AdminCreateUserRequest request)
    {
        var email = (request.Email ?? string.Empty).Trim();
        var fullName = (request.FullName ?? string.Empty).Trim();
        var password = request.Password ?? string.Empty;
        var roleName = string.IsNullOrWhiteSpace(request.Role) ? "User" : request.Role.Trim();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(fullName))
        {
            return new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "Email, full name, and password are required."
            };
        }

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            return new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "Email already exists."
            };
        }

        var user = new ApplicationUser
        {
            Email = email,
            UserName = email,
            FullName = fullName,
            EmailConfirmed = request.EmailConfirmed,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            return new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = string.Join(" ", createResult.Errors.Select(e => e.Description))
            };
        }

        if (!await _roleManager.RoleExistsAsync(roleName))
            await _roleManager.CreateAsync(new IdentityRole(roleName));

        await _userManager.AddToRoleAsync(user, roleName);
        await _userActivityService.RecordAsync(user.Id, "account", "admin.activity.accountCreatedByAdmin");

        if (!request.EmailConfirmed)
            await SendConfirmationEmailAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        var userDto = new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName ?? string.Empty,
            Phone = user.Phone,
            Location = user.Location,
            AvatarUrl = user.AvatarUrl,
            Timezone = user.Timezone ?? string.Empty,
            Language = user.Language ?? string.Empty,
            EmailConfirmed = user.EmailConfirmed,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = roles.ToList()
        };

        return new ApiResponse<AdminUserDto>
        {
            Success = true,
            Message = "User created successfully",
            Data = userDto
        };
    }

    public async Task<ApiResponse<AdminUserDto>> GetUserByIdAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var roles = await _userManager.GetRolesAsync(user);
        const int recentActivityLimit = 50;
        var recentActivities = await _context.UserActivities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(recentActivityLimit)
            .Select(a => new UserActivityItemDto
            {
                Id = a.Id,
                Type = a.Type,
                Action = a.Action,
                Date = a.CreatedAt,
                EntityType = a.EntityType,
                EntityId = a.EntityId
            })
            .ToListAsync();
        await ResolveActivityEntityTitlesAsync(recentActivities);

        var totalGoals = await _context.LongTermGoals.CountAsync(g => g.UserId == userId);
        var completedGoals = await _context.LongTermGoals.CountAsync(g => g.UserId == userId && g.Status == "Completed");
        var totalTasks = await _context.DailyTasks.CountAsync(t => t.UserId == userId);
        var completedTasks = await _context.DailyTasks.CountAsync(t => t.UserId == userId && t.IsCompleted);
        var lastActivityAt = await _context.UserActivities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => (DateTime?)a.CreatedAt)
            .FirstOrDefaultAsync();
        var lastActiveAt = lastActivityAt ?? user.UpdatedAt ?? user.CreatedAt;

        var userDto = new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Phone = user.Phone,
            Location = user.Location,
            AvatarUrl = user.AvatarUrl,
            Timezone = user.Timezone,
            Language = user.Language,
            EmailConfirmed = user.EmailConfirmed,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            Roles = roles.ToList(),
            RecentActivity = recentActivities,
            TotalGoals = totalGoals,
            CompletedGoals = completedGoals,
            TotalTasks = totalTasks,
            CompletedTasks = completedTasks,
            LastActiveAt = lastActiveAt
        };

        return new ApiResponse<AdminUserDto>
        {
            Success = true,
            Data = userDto
        };
    }

    public async Task<ApiResponse<AdminUserDto>> UpdateUserAsync(string userId, AdminUpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<AdminUserDto>
            {
                Success = false,
                Message = "User not found"
            };
        }

        // Update user properties
        if (!string.IsNullOrEmpty(request.FullName))
            user.FullName = request.FullName;
        if (request.Phone != null)
            user.Phone = request.Phone;
        if (request.Location != null)
            user.Location = request.Location;
        if (!string.IsNullOrEmpty(request.Timezone))
            user.Timezone = request.Timezone;
        if (!string.IsNullOrEmpty(request.Language))
            user.Language = request.Language;
        if (request.EmailConfirmed.HasValue)
            user.EmailConfirmed = request.EmailConfirmed.Value;

        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        await _userActivityService.RecordAsync(userId, "account", request.EmailConfirmed == false ? "admin.activity.accountDeactivatedByAdmin" : "admin.activity.profileUpdatedByAdmin");

        // Update roles if provided
        if (request.Roles != null)
        {
            var currentRoles = await _userManager.GetRolesAsync(user);
            var rolesToRemove = currentRoles.Except(request.Roles);
            var rolesToAdd = request.Roles.Except(currentRoles);

            if (rolesToRemove.Any())
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);

            if (rolesToAdd.Any())
            {
                // Ensure roles exist
                foreach (var roleName in rolesToAdd)
                {
                    if (!await _roleManager.RoleExistsAsync(roleName))
                    {
                        await _roleManager.CreateAsync(new IdentityRole(roleName));
                    }
                }
                await _userManager.AddToRolesAsync(user, rolesToAdd);
            }
        }

        // Return updated user
        var updatedUser = await _userManager.FindByIdAsync(userId);
        var updatedRoles = await _userManager.GetRolesAsync(updatedUser!);
        const int recentActivityLimit = 50;
        var recentActivities = await _context.UserActivities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(recentActivityLimit)
            .Select(a => new UserActivityItemDto
            {
                Id = a.Id,
                Type = a.Type,
                Action = a.Action,
                Date = a.CreatedAt,
                EntityType = a.EntityType,
                EntityId = a.EntityId
            })
            .ToListAsync();
        await ResolveActivityEntityTitlesAsync(recentActivities);
        var userDto = new AdminUserDto
        {
            Id = updatedUser!.Id,
            Email = updatedUser.Email ?? string.Empty,
            FullName = updatedUser.FullName,
            Phone = updatedUser.Phone,
            Location = updatedUser.Location,
            AvatarUrl = updatedUser.AvatarUrl,
            Timezone = updatedUser.Timezone,
            Language = updatedUser.Language,
            EmailConfirmed = updatedUser.EmailConfirmed,
            CreatedAt = updatedUser.CreatedAt,
            UpdatedAt = updatedUser.UpdatedAt,
            Roles = updatedRoles.ToList(),
            RecentActivity = recentActivities
        };

        return new ApiResponse<AdminUserDto>
        {
            Success = true,
            Message = "User updated successfully",
            Data = userDto
        };
    }

    private async Task ResolveActivityEntityTitlesAsync(List<UserActivityItemDto> activities)
    {
        var taskIds = activities
            .Where(a => string.Equals(a.EntityType, "DailyTask", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(a.EntityId))
            .Select(a => Guid.TryParse(a.EntityId, out var id) ? id : (Guid?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        var goalIds = activities
            .Where(a => string.Equals(a.EntityType, "LongTermGoal", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(a.EntityId))
            .Select(a => Guid.TryParse(a.EntityId, out var id) ? id : (Guid?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var taskLookup = new Dictionary<string, string>();
        var goalLookup = new Dictionary<string, string>();
        if (taskIds.Count > 0)
        {
            var taskTitles = await _context.DailyTasks.Where(t => taskIds.Contains(t.Id)).Select(t => new { t.Id, t.Title }).ToListAsync();
            foreach (var x in taskTitles)
                taskLookup[x.Id.ToString()] = x.Title;
        }
        if (goalIds.Count > 0)
        {
            var goalTitles = await _context.LongTermGoals.Where(g => goalIds.Contains(g.Id)).Select(g => new { g.Id, g.Title }).ToListAsync();
            foreach (var x in goalTitles)
                goalLookup[x.Id.ToString()] = x.Title;
        }

        foreach (var a in activities)
        {
            if (string.IsNullOrEmpty(a.EntityId)) continue;
            if (string.Equals(a.EntityType, "DailyTask", StringComparison.OrdinalIgnoreCase) && taskLookup.TryGetValue(a.EntityId, out var taskTitle))
                a.EntityTitle = taskTitle;
            else if (string.Equals(a.EntityType, "LongTermGoal", StringComparison.OrdinalIgnoreCase) && goalLookup.TryGetValue(a.EntityId, out var goalTitle))
                a.EntityTitle = goalTitle;
        }
    }

    public async Task<ApiResponse<object>> ResetUserPasswordAsync(string userId, AdminResetPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.NewPassword))
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "New password is required."
            };
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description).ToList();
            return new ApiResponse<object>
            {
                Success = false,
                Message = errors.Count > 0 ? string.Join(" ", errors) : "Password reset failed."
            };
        }

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Password has been reset successfully."
        };
    }

    public async Task<ApiResponse<object>> DeleteUserAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            return new ApiResponse<object>
            {
                Success = false,
                Message = "User not found"
            };
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            var errors = result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete user",
                Errors = errors
            };
        }

        return new ApiResponse<object>
        {
            Success = true,
            Message = "User deleted successfully"
        };
    }

    private async Task SendConfirmationEmailAsync(ApplicationUser user)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var frontendUrl = _configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()?.FirstOrDefault()
                          ?? "http://localhost:3005";
        var encodedToken = Uri.EscapeDataString(token);
        var encodedEmail = Uri.EscapeDataString(user.Email!);
        var verifyLink = $"{frontendUrl}/verify-email?token={encodedToken}&email={encodedEmail}";

        var subject = "Verify your email - DailyPlanner";
        var body = $@"
<html>
<body style=""font-family: Arial, sans-serif; line-height: 1.6; color: #333;"">
  <div style=""max-width: 480px; margin: 0 auto; padding: 32px 24px;"">
    <h2 style=""margin: 0 0 16px;"">Welcome to DailyPlanner!</h2>
    <p>An account has been created for you. Please verify your email address to activate your account.</p>
    <p style=""text-align: center; margin: 28px 0;"">
      <a href=""{verifyLink}""
         style=""display: inline-block; padding: 12px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;"">
        Verify Email
      </a>
    </p>
    <p style=""font-size: 13px; color: #888;"">If you did not expect this email, you can safely ignore it.</p>
  </div>
</body>
</html>";

        await _emailSender.SendAsync(user.Email!, subject, body);
    }

    private const int MaxExportCount = 50_000;

    public async Task<byte[]> GetUsersExportAsync(string format, string? search, string? status, string? role, string? dateRange, string? sort, IReadOnlyList<string>? ids = null)
    {
        var now = DateTimeOffset.UtcNow;
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(searchLower)) ||
                (u.FullName != null && u.FullName.ToLower().Contains(searchLower)) ||
                (u.Phone != null && u.Phone.ToLower().Contains(searchLower)));
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = status switch
            {
                "Active" => query.Where(u => u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now)),
                "Pending" => query.Where(u => !u.EmailConfirmed && (!u.LockoutEnd.HasValue || u.LockoutEnd.Value <= now)),
                "Banned" => query.Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value > now),
                "Inactive" => query.Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value <= now),
                _ => query
            };
        }

        if (!string.IsNullOrEmpty(role))
        {
            var usersInRole = from u in _context.Users
                join ur in _context.Set<IdentityUserRole<string>>() on u.Id equals ur.UserId
                join r in _context.Set<IdentityRole>() on ur.RoleId equals r.Id
                where r.Name == role
                select u.Id;
            query = query.Where(u => usersInRole.Contains(u.Id));
        }

        if (!string.IsNullOrEmpty(dateRange))
        {
            var utcNow = DateTime.UtcNow;
            var (rangeStart, _) = dateRange switch
            {
                "today" => (utcNow.Date, utcNow),
                "week" => (utcNow.AddDays(-7), utcNow),
                "month" => (utcNow.AddDays(-30), utcNow),
                "quarter" => (utcNow.AddDays(-90), utcNow),
                "year" => (utcNow.AddDays(-365), utcNow),
                _ => (DateTime.MinValue, utcNow)
            };
            if (dateRange != "today")
                query = query.Where(u => u.CreatedAt >= rangeStart);
            else
                query = query.Where(u => u.CreatedAt >= rangeStart && u.CreatedAt <= utcNow);
        }

        if (ids != null && ids.Count > 0)
            query = query.Where(u => ids.Contains(u.Id));

        query = (sort ?? "newest") switch
        {
            "oldest" => query.OrderBy(u => u.CreatedAt),
            "name-asc" => query.OrderBy(u => u.FullName ?? ""),
            "name-desc" => query.OrderByDescending(u => u.FullName ?? ""),
            _ => query.OrderByDescending(u => u.CreatedAt)
        };

        var users = await query.Take(MaxExportCount).ToListAsync();

        var userDtos = new List<AdminUserDto>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            userDtos.Add(new AdminUserDto
            {
                Id = user.Id,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName ?? string.Empty,
                Phone = user.Phone,
                Location = user.Location,
                AvatarUrl = user.AvatarUrl,
                Timezone = user.Timezone ?? string.Empty,
                Language = user.Language ?? string.Empty,
                EmailConfirmed = user.EmailConfirmed,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Roles = roles.ToList()
            });
        }

        return format.ToLowerInvariant() switch
        {
            "csv" => BuildCsv(userDtos),
            "excel" => BuildExcel(userDtos),
            "pdf" => BuildPdf(userDtos),
            _ => throw new ArgumentException("Invalid format. Use csv, excel, or pdf.", nameof(format))
        };
    }

    private static byte[] BuildCsv(List<AdminUserDto> users)
    {
        var sb = new StringBuilder();
        string Escape(string? value)
        {
            if (value == null) return "";
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
                return "\"" + value.Replace("\"", "\"\"") + "\"";
            return value;
        }
        var headers = "Id,Email,FullName,Phone,Location,Timezone,Language,EmailConfirmed,CreatedAt,UpdatedAt,Roles";
        sb.AppendLine(headers);
        foreach (var u in users)
        {
            sb.AppendLine(string.Join(",",
                Escape(u.Id),
                Escape(u.Email),
                Escape(u.FullName),
                Escape(u.Phone ?? ""),
                Escape(u.Location ?? ""),
                Escape(u.Timezone),
                Escape(u.Language),
                u.EmailConfirmed ? "true" : "false",
                u.CreatedAt.ToString("O"),
                u.UpdatedAt?.ToString("O") ?? "",
                Escape(string.Join(";", u.Roles ?? new List<string>()))));
        }
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    private static byte[] BuildExcel(List<AdminUserDto> users)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Users");
        var row = 1;
        ws.Cell(row, 1).Value = "Id"; ws.Cell(row, 2).Value = "Email"; ws.Cell(row, 3).Value = "FullName"; ws.Cell(row, 4).Value = "Phone";
        ws.Cell(row, 5).Value = "Location"; ws.Cell(row, 6).Value = "Timezone"; ws.Cell(row, 7).Value = "Language"; ws.Cell(row, 8).Value = "EmailConfirmed";
        ws.Cell(row, 9).Value = "CreatedAt"; ws.Cell(row, 10).Value = "UpdatedAt"; ws.Cell(row, 11).Value = "Roles";
        row++;
        foreach (var u in users)
        {
            ws.Cell(row, 1).Value = u.Id; ws.Cell(row, 2).Value = u.Email; ws.Cell(row, 3).Value = u.FullName; ws.Cell(row, 4).Value = u.Phone ?? "";
            ws.Cell(row, 5).Value = u.Location ?? ""; ws.Cell(row, 6).Value = u.Timezone; ws.Cell(row, 7).Value = u.Language;
            ws.Cell(row, 8).Value = u.EmailConfirmed; ws.Cell(row, 9).Value = u.CreatedAt; ws.Cell(row, 10).Value = u.UpdatedAt?.ToString() ?? "";
            ws.Cell(row, 11).Value = string.Join(";", u.Roles ?? new List<string>());
            row++;
        }
        using var stream = new MemoryStream();
        workbook.SaveAs(stream, false);
        return stream.ToArray();
    }

    private static byte[] BuildPdf(List<AdminUserDto> users)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var columns = new[] { "Id", "Email", "FullName", "Phone", "Location", "Roles", "CreatedAt" };
        var doc = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(20);
                page.Header().Text("User Export").Bold().FontSize(14);
                page.Content().Table(table =>
                {
                    table.ColumnsDefinition(def =>
                    {
                        def.ConstantColumn(30);
                        def.RelativeColumn(2);
                        def.RelativeColumn(2);
                        def.RelativeColumn(1);
                        def.RelativeColumn(1);
                        def.RelativeColumn(1);
                        def.RelativeColumn(1);
                    });
                    table.Header(header =>
                    {
                        foreach (var col in columns)
                            header.Cell().BorderBottom(1).Padding(4).Text(col).Bold();
                    });
                    foreach (var u in users)
                    {
                        table.Cell().Padding(4).Text(u.Id.Length > 8 ? u.Id[..8] + "…" : u.Id);
                        table.Cell().Padding(4).Text(u.Email);
                        table.Cell().Padding(4).Text(u.FullName);
                        table.Cell().Padding(4).Text(u.Phone ?? "");
                        table.Cell().Padding(4).Text(u.Location ?? "");
                        table.Cell().Padding(4).Text(string.Join(";", u.Roles ?? new List<string>()));
                        table.Cell().Padding(4).Text(u.CreatedAt.ToString("yyyy-MM-dd"));
                    }
                });
            });
        });
        using var stream = new MemoryStream();
        doc.GeneratePdf(stream);
        return stream.ToArray();
    }
}

