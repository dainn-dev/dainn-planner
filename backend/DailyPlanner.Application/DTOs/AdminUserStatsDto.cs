namespace DailyPlanner.Application.DTOs;

public class AdminUserStatsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int PendingUsers { get; set; }
    public int BannedUsers { get; set; }
    public int? PercentChangeTotal { get; set; }
    public int? PercentChangeActive { get; set; }
    public int? PercentChangePending { get; set; }
    public int? PercentChangeBanned { get; set; }
}
