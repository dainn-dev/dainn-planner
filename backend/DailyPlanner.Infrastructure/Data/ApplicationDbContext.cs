using DailyPlanner.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DailyPlanner.Infrastructure.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<DailyTask> DailyTasks { get; set; }
    public DbSet<MainDailyGoal> MainDailyGoals { get; set; }
    public DbSet<LongTermGoal> LongTermGoals { get; set; }
    public DbSet<GoalMilestone> GoalMilestones { get; set; }
    public DbSet<GoalTask> GoalTasks { get; set; }
    public DbSet<CalendarEvent> CalendarEvents { get; set; }
    public DbSet<Notification> Notifications { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<UserDevice> UserDevices { get; set; }
    public DbSet<UserSettings> UserSettings { get; set; }
    public DbSet<UserActivity> UserActivities { get; set; }
    public DbSet<ContactMessage> ContactMessages { get; set; }
    public DbSet<UserStatistics> UserStatistics { get; set; }
    public DbSet<UserGoogleIntegration> UserGoogleIntegrations { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Configure ApplicationUser
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(e => e.FullName).HasMaxLength(100);
            entity.Property(e => e.Phone).HasMaxLength(20);
            entity.Property(e => e.Location).HasMaxLength(200);
            entity.Property(e => e.Timezone).HasMaxLength(50).HasDefaultValue("Asia/Ho_Chi_Minh");
            entity.Property(e => e.Language).HasMaxLength(10).HasDefaultValue("vi");
        });

        // Configure DailyTask
        builder.Entity<DailyTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ReminderTime).HasMaxLength(10);
            entity.Property(e => e.Tags)
                .HasColumnType("text[]");
            entity.HasIndex(e => new { e.UserId, e.Date });
            entity.HasOne(e => e.User)
                .WithMany(u => u.DailyTasks)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Milestone)
                .WithMany(m => m.DailyTasks)
                .HasForeignKey(e => e.GoalMilestoneId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Goal)
                .WithMany()
                .HasForeignKey(e => e.GoalId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure MainDailyGoal
        builder.Entity<MainDailyGoal>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => new { e.UserId, e.Date }).IsUnique();
            entity.HasOne(e => e.User)
                .WithMany(u => u.MainDailyGoals)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure LongTermGoal
        builder.Entity<LongTermGoal>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Active");
            entity.Property(e => e.Progress).HasPrecision(5, 2);
            entity.HasOne(e => e.User)
                .WithMany(u => u.LongTermGoals)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure GoalMilestone
        builder.Entity<GoalMilestone>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Goal)
                .WithMany(g => g.Milestones)
                .HasForeignKey(e => e.GoalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure GoalTask
        builder.Entity<GoalTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasOne(e => e.Goal)
                .WithMany(g => g.Tasks)
                .HasForeignKey(e => e.GoalId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure CalendarEvent
        builder.Entity<CalendarEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => new { e.UserId, e.StartDate, e.EndDate });
            entity.HasOne(e => e.User)
                .WithMany(u => u.CalendarEvents)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure Notification
        builder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ReferenceId);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
            entity.HasIndex(e => new { e.Type, e.ReferenceId });
            entity.HasOne(e => e.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure RefreshToken
        builder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
            entity.HasIndex(e => e.Token);
            entity.HasIndex(e => e.UserId);
            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure UserDevice
        builder.Entity<UserDevice>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.DeviceId).IsRequired().HasMaxLength(200);
            entity.HasIndex(e => new { e.UserId, e.DeviceId });
            entity.HasOne(e => e.User)
                .WithMany(u => u.UserDevices)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure UserSettings (one-to-one per user)
        builder.Entity<UserSettings>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.Data).HasColumnType("text");
            entity.HasOne(e => e.User)
                .WithOne(u => u.UserSettings)
                .HasForeignKey<UserSettings>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure UserActivity
        builder.Entity<UserActivity>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(500);
            entity.Property(e => e.EntityType).HasMaxLength(50);
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.HasIndex(e => new { e.UserId, e.CreatedAt });
            entity.HasOne(e => e.User)
                .WithMany(u => u.UserActivities)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ContactMessage
        builder.Entity<ContactMessage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Message).IsRequired().HasColumnType("text");
            entity.Property(e => e.Source).HasMaxLength(50);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Configure UserStatistics
        builder.Entity<UserStatistics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.PeriodStart }).IsUnique();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure UserGoogleIntegration (one-to-one per user for Google Calendar)
        builder.Entity<UserGoogleIntegration>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.AccessToken).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.RefreshToken).IsRequired().HasMaxLength(2000);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.User)
                .WithOne(u => u.GoogleIntegration)
                .HasForeignKey<UserGoogleIntegration>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

