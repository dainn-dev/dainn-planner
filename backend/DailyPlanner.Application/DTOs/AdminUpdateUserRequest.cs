namespace DailyPlanner.Application.DTOs;

public class AdminUpdateUserRequest
{
    public string? FullName { get; set; }
    public string? Phone { get; set; }
    public string? Location { get; set; }
    public string? Timezone { get; set; }
    public string? Language { get; set; }
    public bool? EmailConfirmed { get; set; }
    public List<string>? Roles { get; set; }
}

