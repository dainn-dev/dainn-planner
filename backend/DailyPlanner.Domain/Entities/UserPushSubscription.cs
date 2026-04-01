namespace DailyPlanner.Domain.Entities;

public class UserPushSubscription
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;

    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
    public string? DeviceLabel { get; set; }
    public DateTime? ExpirationTime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}

