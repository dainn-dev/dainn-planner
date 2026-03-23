using System.Text.Json;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

/// <summary>
/// Imports a JSON export shaped as:
/// <c>{ "sites": [ { "ownerEmail", "slug", "status", "themePresetKey?", "themeOverrides?" } ], "documents": [ { "ownerEmail", "profile", "portfolio", ... } ] }</c>
/// Owner is resolved via <see cref="UserManager{ApplicationUser}.FindByEmailAsync"/>.
/// </summary>
public class FirestoreCvImportService : IFirestoreCvImportService
{
    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<FirestoreCvImportService> _logger;

    public FirestoreCvImportService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        ILogger<FirestoreCvImportService> logger)
    {
        _db = db;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<FirestoreCvImportResult> ImportAsync(JsonElement payload, CancellationToken ct = default)
    {
        var warnings = new List<string>();
        var sitesUpserted = 0;
        var documentsUpserted = 0;

        if (payload.ValueKind != JsonValueKind.Object)
        {
            warnings.Add("Payload must be a JSON object with optional 'sites' and 'documents' arrays.");
            return new FirestoreCvImportResult { Warnings = warnings };
        }

        if (payload.TryGetProperty("sites", out var sitesEl) && sitesEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in sitesEl.EnumerateArray())
            {
                var email = row.TryGetProperty("ownerEmail", out var e) ? e.GetString() : null;
                var slug = row.TryGetProperty("slug", out var s) ? s.GetString() : null;
                if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(slug))
                {
                    warnings.Add("Skipped site row missing ownerEmail or slug.");
                    continue;
                }

                var user = await _userManager.FindByEmailAsync(email.Trim());
                if (user == null)
                {
                    warnings.Add($"No Identity user for email {email}; skipped site {slug}.");
                    continue;
                }

                var status = row.TryGetProperty("status", out var st) ? st.GetString() : "pending";
                status = NormalizeStatus(status);
                var themeKey = row.TryGetProperty("themePresetKey", out var tk) ? tk.GetString() : "default";
                string? overrides = null;
                if (row.TryGetProperty("themeOverrides", out var ov) && ov.ValueKind != JsonValueKind.Null)
                    overrides = ov.GetRawText();

                var existing = await _db.CvSites.FirstOrDefaultAsync(x => x.OwnerUserId == user.Id, ct);
                if (existing == null)
                {
                    _db.CvSites.Add(new CvSite
                    {
                        Id = Guid.NewGuid(),
                        OwnerUserId = user.Id,
                        Slug = slug.Trim().ToLowerInvariant(),
                        Status = status,
                        ThemePresetKey = string.IsNullOrWhiteSpace(themeKey) ? "default" : themeKey!,
                        ThemeOverridesJson = overrides,
                        RequestedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    existing.Slug = slug.Trim().ToLowerInvariant();
                    existing.Status = status;
                    if (!string.IsNullOrWhiteSpace(themeKey))
                        existing.ThemePresetKey = themeKey!;
                    if (overrides != null)
                        existing.ThemeOverridesJson = overrides;
                    existing.UpdatedAt = DateTime.UtcNow;
                }

                sitesUpserted++;
            }
        }

        if (payload.TryGetProperty("documents", out var docsEl) && docsEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var row in docsEl.EnumerateArray())
            {
                var email = row.TryGetProperty("ownerEmail", out var e) ? e.GetString() : null;
                if (string.IsNullOrWhiteSpace(email))
                {
                    warnings.Add("Skipped document row missing ownerEmail.");
                    continue;
                }

                var user = await _userManager.FindByEmailAsync(email.Trim());
                if (user == null)
                {
                    warnings.Add($"No Identity user for email {email}; skipped document.");
                    continue;
                }

                static string? Col(JsonElement r, string name) =>
                    r.TryGetProperty(name, out var x) && x.ValueKind != JsonValueKind.Null ? x.GetRawText() : null;

                var doc = await _db.CvDocuments.FirstOrDefaultAsync(d => d.UserId == user.Id, ct);
                if (doc == null)
                {
                    _db.CvDocuments.Add(new CvDocument
                    {
                        UserId = user.Id,
                        ProfileJson = Col(row, "profile"),
                        PortfolioJson = Col(row, "portfolio"),
                        SkillsJson = Col(row, "skills"),
                        TestimonialsJson = Col(row, "testimonials"),
                        FactsJson = Col(row, "facts"),
                        ServicesJson = Col(row, "services"),
                        EducationJson = Col(row, "education"),
                        ExperienceJson = Col(row, "experience"),
                        CertificatesJson = Col(row, "certificates"),
                        UpdatedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    if (row.TryGetProperty("profile", out _))
                        doc.ProfileJson = Col(row, "profile");
                    if (row.TryGetProperty("portfolio", out _))
                        doc.PortfolioJson = Col(row, "portfolio");
                    if (row.TryGetProperty("skills", out _))
                        doc.SkillsJson = Col(row, "skills");
                    if (row.TryGetProperty("testimonials", out _))
                        doc.TestimonialsJson = Col(row, "testimonials");
                    if (row.TryGetProperty("facts", out _))
                        doc.FactsJson = Col(row, "facts");
                    if (row.TryGetProperty("services", out _))
                        doc.ServicesJson = Col(row, "services");
                    if (row.TryGetProperty("education", out _))
                        doc.EducationJson = Col(row, "education");
                    if (row.TryGetProperty("experience", out _))
                        doc.ExperienceJson = Col(row, "experience");
                    if (row.TryGetProperty("certificates", out _))
                        doc.CertificatesJson = Col(row, "certificates");
                    doc.UpdatedAt = DateTime.UtcNow;
                }

                documentsUpserted++;
            }
        }

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Firestore CV import SaveChanges failed");
            warnings.Add($"Save failed: {ex.Message}");
        }

        return new FirestoreCvImportResult
        {
            SitesUpserted = sitesUpserted,
            DocumentsUpserted = documentsUpserted,
            Warnings = warnings,
        };
    }

    private static string NormalizeStatus(string? s) => s?.ToLowerInvariant() switch
    {
        "approved" => "approved",
        "rejected" => "rejected",
        "suspended" => "suspended",
        _ => "pending",
    };
}
