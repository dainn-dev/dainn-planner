namespace DailyPlanner.Application.Options;

public class CvOptions
{
    public const string SectionName = "Cv";

    public string RootDomain { get; set; } = "dainn.online";
    /// <summary>Base URL for dashboard links in emails (no trailing slash).</summary>
    public string DashboardBaseUrl { get; set; } = "http://localhost:3000";
    /// <summary>Inbox for public CV contact form. If empty, <c>Email:AdminTo</c> is used; mail is sent via configured SMTP (<c>Email:*</c>).</summary>
    public string ContactToEmail { get; set; } = "";
}
