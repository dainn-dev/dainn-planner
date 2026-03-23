namespace DailyPlanner.Domain.Entities;

public class CvSite
{
    public Guid Id { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    /// <summary>pending, approved, rejected, suspended</summary>
    public string Status { get; set; } = "pending";
    public string? RejectionReason { get; set; }
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByUserId { get; set; }
    public string ThemePresetKey { get; set; } = "default";
    public string? ThemeOverridesJson { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser Owner { get; set; } = null!;
    public ApplicationUser? ReviewedBy { get; set; }
}
