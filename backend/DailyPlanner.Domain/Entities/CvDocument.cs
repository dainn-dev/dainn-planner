namespace DailyPlanner.Domain.Entities;

public class CvDocument
{
    public string UserId { get; set; } = string.Empty;
    public string? ProfileJson { get; set; }
    public string? PortfolioJson { get; set; }
    public string? SkillsJson { get; set; }
    public string? TestimonialsJson { get; set; }
    public string? FactsJson { get; set; }
    public string? ServicesJson { get; set; }
    public string? EducationJson { get; set; }
    public string? ExperienceJson { get; set; }
    public string? CertificatesJson { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
}
