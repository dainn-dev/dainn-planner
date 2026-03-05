using AutoMapper;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole> _roleManager;
    private readonly IMapper _mapper;

    public AdminService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IMapper mapper)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _mapper = mapper;
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

    public async Task<ApiResponse<List<AdminUserDto>>> GetUsersAsync(string? search, int page = 1, int pageSize = 10)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            search = search.ToLower();
            query = query.Where(u =>
                u.Email!.ToLower().Contains(search) ||
                u.FullName.ToLower().Contains(search) ||
                (u.Phone != null && u.Phone.ToLower().Contains(search)));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
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
                FullName = user.FullName,
                Phone = user.Phone,
                Location = user.Location,
                AvatarUrl = user.AvatarUrl,
                Timezone = user.Timezone,
                Language = user.Language,
                EmailConfirmed = user.EmailConfirmed,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                Roles = roles.ToList()
            };
            userDtos.Add(userDto);
        }

        return new ApiResponse<List<AdminUserDto>>
        {
            Success = true,
            Data = userDtos
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
            Roles = roles.ToList()
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
            Roles = updatedRoles.ToList()
        };

        return new ApiResponse<AdminUserDto>
        {
            Success = true,
            Message = "User updated successfully",
            Data = userDto
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
}

