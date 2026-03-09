namespace DailyPlanner.Application.DTOs;

public class UserGrowthPointDto
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class UserGrowthResultDto
{
    public List<UserGrowthPointDto> DataPoints { get; set; } = new();
    public int TotalNewUsers { get; set; }
}
