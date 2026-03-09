namespace DailyPlanner.Application.DTOs;

public class PagedUsersResultDto
{
    public List<AdminUserDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
}
