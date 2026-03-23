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
    public DbSet<TaskInstance> TaskInstances { get; set; }
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
    public DbSet<UserTodoistIntegration> UserTodoistIntegrations { get; set; }
    public DbSet<CvSite> CvSites { get; set; }
    public DbSet<CvDocument> CvDocuments { get; set; }

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
            entity.Property(e => e.TodoistTaskId).HasMaxLength(64);
            entity.HasIndex(e => new { e.UserId, e.TodoistTaskId })
                .IsUnique()
                .HasFilter("\"TodoistTaskId\" IS NOT NULL");
        });

        // Configure TaskInstance (per-day execution row)
        builder.Entity<TaskInstance>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Description).HasColumnType("text");
            entity.Property(e => e.Status)
                .IsRequired()
                .HasMaxLength(20)
                .HasColumnType("character varying(20)");

            entity.HasIndex(e => new { e.TaskId, e.InstanceDate })
                .IsUnique();

            entity.HasOne(e => e.Task)
                .WithMany(t => t.TaskInstances)
                .HasForeignKey(e => e.TaskId)
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
            entity.Property(e => e.GoogleEventId).HasMaxLength(1024);
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
            entity.Property(e => e.Title).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ReferenceId);
            entity.Property(e => e.PayloadJson).HasColumnType("jsonb");
            entity.Property(e => e.IdempotencyKey).HasMaxLength(200);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
            entity.HasIndex(e => new { e.Type, e.ReferenceId });
            entity.HasIndex(e => new { e.UserId, e.ReadAt, e.CreatedAt });
            entity.HasIndex(e => e.IdempotencyKey)
                .IsUnique()
                .HasFilter("\"IdempotencyKey\" IS NOT NULL");
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

        builder.Entity<UserTodoistIntegration>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.AccessToken).IsRequired().HasMaxLength(2000);
            entity.Property(e => e.OAuthScopes).HasMaxLength(512);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.User)
                .WithOne(u => u.TodoistIntegration)
                .HasForeignKey<UserTodoistIntegration>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CvSite>(entity =>
        {
            entity.ToTable("Sites");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.OwnerUserId).IsRequired().HasMaxLength(450);
            entity.Property(e => e.Slug).IsRequired().HasMaxLength(63);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(32);
            entity.Property(e => e.RejectionReason).HasMaxLength(2000);
            entity.Property(e => e.ReviewedByUserId).HasMaxLength(450);
            entity.Property(e => e.ThemePresetKey).IsRequired().HasMaxLength(64);
            entity.Property(e => e.ThemeOverridesJson).HasColumnType("jsonb");
            entity.HasIndex(e => e.OwnerUserId).IsUnique();
            entity.HasIndex(e => e.Slug)
                .IsUnique()
                .HasFilter("\"Status\" <> 'rejected'");
            entity.HasIndex(e => e.Status);
            entity.HasOne(e => e.Owner)
                .WithOne(u => u.CvOwnedSite)
                .HasForeignKey<CvSite>(e => e.OwnerUserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.ReviewedBy)
                .WithMany()
                .HasForeignKey(e => e.ReviewedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<CvDocument>(entity =>
        {
            entity.ToTable("Documents");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.UserId).HasMaxLength(450);
            entity.Property(e => e.ProfileJson).HasColumnType("jsonb");
            entity.Property(e => e.PortfolioJson).HasColumnType("jsonb");
            entity.Property(e => e.SkillsJson).HasColumnType("jsonb");
            entity.Property(e => e.TestimonialsJson).HasColumnType("jsonb");
            entity.Property(e => e.FactsJson).HasColumnType("jsonb");
            entity.Property(e => e.ServicesJson).HasColumnType("jsonb");
            entity.Property(e => e.EducationJson).HasColumnType("jsonb");
            entity.Property(e => e.ExperienceJson).HasColumnType("jsonb");
            entity.Property(e => e.CertificatesJson).HasColumnType("jsonb");
            entity.HasOne(e => e.User)
                .WithOne(u => u.CvDocument)
                .HasForeignKey<CvDocument>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

    }
}

