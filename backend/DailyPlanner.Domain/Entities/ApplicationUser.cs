using Microsoft.AspNetCore.Identity;

namespace DailyPlanner.Domain.Entities;

public class ApplicationUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? AvatarUrl { get; set; }
    public string Timezone { get; set; } = "Asia/Ho_Chi_Minh";
    public string Language { get; set; } = "vi";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<DailyTask> DailyTasks { get; set; } = new List<DailyTask>();
    public ICollection<MainDailyGoal> MainDailyGoals { get; set; } = new List<MainDailyGoal>();
    public ICollection<LongTermGoal> LongTermGoals { get; set; } = new List<LongTermGoal>();
    public ICollection<CalendarEvent> CalendarEvents { get; set; } = new List<CalendarEvent>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<UserDevice> UserDevices { get; set; } = new List<UserDevice>();
}

