namespace DailyPlanner.Infrastructure.Constants;

/// <summary>
/// Server-side default user settings JSON matching frontend INITIAL_* constants (general, plans, notifications).
/// </summary>
public static class DefaultUserSettings
{
    /// <summary>
    /// Default settings as JSON string. One row per user; create with this when missing.
    /// </summary>
    public const string Json = """
        {
          "general": {
            "language": "vi",
            "timezone": "(GMT+07:00) Bangkok, Hanoi, Jakarta",
            "dateFormat": "31/12/2024 (DD/MM/YYYY)",
            "timeFormat": "24",
            "weekStartDay": "monday"
          },
          "plans": {
            "defaultDuration": "30 phút",
            "autoMoveIncomplete": true,
            "trackingMethod": "tasks",
            "goalVision": "Trở thành một chuyên gia thiết kế sản phẩm và đạt được sự cân bằng giữa công việc và cuộc sống.",
            "googleCalendarConnected": false,
            "todoistConnected": false
          },
          "notifications": {
            "emailWeeklySummary": true,
            "emailTaskReminders": true,
            "emailGoalAchievements": true,
            "emailPromotions": false,
            "inAppNewActivities": true,
            "inAppGoalAchievements": true,
            "emailFrequency": "Tổng hợp hàng ngày",
            "notificationSound": "Mặc định (Ping)"
          }
        }
        """;
}
