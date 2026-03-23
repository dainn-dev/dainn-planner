namespace DailyPlanner.Application.DTOs.Cv;

public class CvThemePatchRequest
{
    public string PresetKey { get; set; } = "";
    public object? Overrides { get; set; }
}
