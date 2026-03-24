using System.Text.Json;
using DailyPlanner.Application.DTOs.Cv;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Application.Options;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DailyPlanner.Infrastructure.Services;

public class CvService : ICvService
{
    private static readonly HashSet<string> CvSiteNotificationTypes = new(StringComparer.Ordinal)
    {
        "site_approved",
        "site_rejected",
        "site_suspended",
    };

    private readonly ApplicationDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly CvOptions _cv;
    private readonly CvTenantResolver _tenantResolver;
    private readonly IConfiguration _configuration;
    private readonly ILogger<CvService> _logger;
    private readonly IWebHostEnvironment _environment;

    public CvService(
        ApplicationDbContext db,
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender,
        IOptions<CvOptions> cvOptions,
        CvTenantResolver tenantResolver,
        IConfiguration configuration,
        ILogger<CvService> logger,
        IWebHostEnvironment environment)
    {
        _db = db;
        _userManager = userManager;
        _emailSender = emailSender;
        _cv = cvOptions.Value;
        _tenantResolver = tenantResolver;
        _configuration = configuration;
        _logger = logger;
        _environment = environment;
    }

    public async Task<CvEnvelope<object?>> GetPublicSiteAsync(string? tenantSlug, CancellationToken ct = default)
    {
        _logger.LogInformation("Getting public site for slug: {Slug}", tenantSlug);
        if (string.IsNullOrEmpty(tenantSlug))
        {
            _logger.LogInformation("No slug found in request");
            return NotFound();
        }

        var site = await _db.CvSites.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Slug == tenantSlug && s.Status == "approved", ct);

        if (site == null)
            return NotFound();

        var doc = await _db.CvDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == site.OwnerUserId, ct);

        var theme = CvThemeRegistry.ResolveThemeTokens(site.ThemePresetKey, site.ThemeOverridesJson);
        var content = doc == null
            ? CvContentJson.EmptyObject().ToAnonymousForJson()
            : CvContentJson.RowToContent(doc.ProfileJson, doc.PortfolioJson, doc.SkillsJson, doc.TestimonialsJson,
                doc.FactsJson, doc.ServicesJson, doc.EducationJson, doc.ExperienceJson, doc.CertificatesJson)
                .ToAnonymousForJson();

        return Ok(new
        {
            slug = site.Slug,
            theme = JsonSerializer.Deserialize<object>(theme.ToJsonString()),
            content,
            updatedAt = site.UpdatedAt.ToUniversalTime().ToString("o"),
        });
    }

    public Task<CvEnvelope<object?>> GetThemesAsync(CancellationToken ct = default)
    {
        var themes = CvThemeRegistry.ListPresets().Select(p => new
        {
            key = p.Key,
            label = p.Label,
            sortOrder = p.SortOrder,
            previewTokens = new { colorBg = p.PreviewBg, colorAccent = p.PreviewAccent },
        });
        return Task.FromResult(Ok(new { themes }));
    }

    public async Task<CvEnvelope<object?>> GetPortfolioItemAsync(string? tenantSlug, string itemId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(tenantSlug))
            return new CvEnvelope<object?> { StatusCode = 404, Body = "Not found" };

        var site = await _db.CvSites.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Slug == tenantSlug && s.Status == "approved", ct);
        if (site == null)
            return new CvEnvelope<object?> { StatusCode = 404, Body = "Not found" };

        var doc = await _db.CvDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == site.OwnerUserId, ct);
        var itemJson = FindPortfolioItemJson(doc?.PortfolioJson, itemId);
        if (itemJson == null)
            return new CvEnvelope<object?> { StatusCode = 404, Body = "Portfolio item not found" };

        var deserialized = JsonSerializer.Deserialize<object>(itemJson);
        return Ok(deserialized ?? new object());
    }

    public async Task<CvEnvelope<object?>> GetMySiteAsync(string userId, CancellationToken ct = default)
    {
        var site = await _db.CvSites.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerUserId == userId, ct);

        if (site == null)
        {
            return Ok(new
            {
                site = (object?)null,
                content = CvContentJson.EmptyObject().ToAnonymousForJson(),
                theme = (object?)null,
            });
        }

        var doc = await _db.CvDocuments.AsNoTracking()
            .FirstOrDefaultAsync(d => d.UserId == userId, ct);

        var theme = CvThemeRegistry.ResolveThemeTokens(site.ThemePresetKey, site.ThemeOverridesJson);
        var content = doc == null
            ? CvContentJson.EmptyObject().ToAnonymousForJson()
            : CvContentJson.RowToContent(doc.ProfileJson, doc.PortfolioJson, doc.SkillsJson, doc.TestimonialsJson,
                doc.FactsJson, doc.ServicesJson, doc.EducationJson, doc.ExperienceJson, doc.CertificatesJson)
                .ToAnonymousForJson();

        return Ok(new
        {
            site = new
            {
                id = site.Id,
                slug = site.Slug,
                status = site.Status,
                rejectionReason = site.RejectionReason,
                requestedAt = site.RequestedAt.ToUniversalTime().ToString("o"),
                reviewedAt = site.ReviewedAt?.ToUniversalTime().ToString("o"),
                themePresetKey = site.ThemePresetKey,
            },
            theme = JsonSerializer.Deserialize<object>(theme.ToJsonString()),
            content,
        });
    }

    public async Task<CvEnvelope<object?>> RequestSiteAsync(string userId, string slug, CancellationToken ct = default)
    {
        var s = slug.Trim().ToLowerInvariant();
        if (!CvTenantResolver.IsValidSlugFormat(s) || CvTenantResolver.IsReservedSlug(s))
            return BadRequest(new { error = "Invalid or reserved slug" });

        var existing = await _db.CvSites.FirstOrDefaultAsync(x => x.OwnerUserId == userId, ct);

        var takenQuery = _db.CvSites.Where(x => x.Slug == s && x.Status != "rejected");
        if (existing != null)
            takenQuery = takenQuery.Where(x => x.Id != existing.Id);

        if (await takenQuery.AnyAsync(ct))
            return Conflict(new { error = "Slug is already taken" });

        if (existing == null)
        {
            try
            {
                _db.CvSites.Add(new CvSite
                {
                    Id = Guid.NewGuid(),
                    OwnerUserId = userId,
                    Slug = s,
                    Status = "pending",
                    RequestedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                return Conflict(new { error = "Conflict" });
            }

            return Ok(new { ok = true, created = true });
        }

        if (existing.Status is "approved" or "suspended")
            return Conflict(new { error = "Site already exists for this account" });

        existing.Slug = s;
        existing.Status = "pending";
        existing.RejectionReason = null;
        existing.ReviewedAt = null;
        existing.ReviewedByUserId = null;
        existing.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true, created = false });
    }

    public async Task<CvEnvelope<object?>> PutContentAsync(string userId, JsonElement body, CancellationToken ct = default)
    {
        var doc = await _db.CvDocuments.FirstOrDefaultAsync(d => d.UserId == userId, ct);
        var baseRow = doc == null
            ? CvContentJson.EmptyObject()
            : CvContentJson.RowToContent(doc.ProfileJson, doc.PortfolioJson, doc.SkillsJson, doc.TestimonialsJson,
                doc.FactsJson, doc.ServicesJson, doc.EducationJson, doc.ExperienceJson, doc.CertificatesJson);

        string? pick(string name)
        {
            if (!body.TryGetProperty(name, out var el))
                return null;
            return el.GetRawText();
        }

        var merged = new CvDocument
        {
            UserId = userId,
            ProfileJson = pick("profile") ?? baseRow.Profile.GetRawText(),
            PortfolioJson = pick("portfolio") ?? baseRow.Portfolio.GetRawText(),
            SkillsJson = pick("skills") ?? baseRow.Skills.GetRawText(),
            TestimonialsJson = pick("testimonials") ?? baseRow.Testimonials.GetRawText(),
            FactsJson = pick("facts") ?? baseRow.Facts.GetRawText(),
            ServicesJson = pick("services") ?? baseRow.Services.GetRawText(),
            EducationJson = pick("education") ?? baseRow.Education.GetRawText(),
            ExperienceJson = pick("experience") ?? baseRow.Experience.GetRawText(),
            CertificatesJson = pick("certificates") ?? baseRow.Certificates.GetRawText(),
            UpdatedAt = DateTime.UtcNow,
        };

        if (doc == null)
            _db.CvDocuments.Add(merged);
        else
        {
            doc.ProfileJson = merged.ProfileJson;
            doc.PortfolioJson = merged.PortfolioJson;
            doc.SkillsJson = merged.SkillsJson;
            doc.TestimonialsJson = merged.TestimonialsJson;
            doc.FactsJson = merged.FactsJson;
            doc.ServicesJson = merged.ServicesJson;
            doc.EducationJson = merged.EducationJson;
            doc.ExperienceJson = merged.ExperienceJson;
            doc.CertificatesJson = merged.CertificatesJson;
            doc.UpdatedAt = merged.UpdatedAt;
        }

        var site = await _db.CvSites.FirstOrDefaultAsync(s => s.OwnerUserId == userId, ct);
        if (site != null)
            site.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        var saved = await _db.CvDocuments.AsNoTracking().FirstAsync(d => d.UserId == userId, ct);
        var content = CvContentJson.RowToContent(saved.ProfileJson, saved.PortfolioJson, saved.SkillsJson,
            saved.TestimonialsJson, saved.FactsJson, saved.ServicesJson, saved.EducationJson, saved.ExperienceJson,
            saved.CertificatesJson).ToAnonymousForJson();

        return Ok(new { content });
    }

    public async Task<CvEnvelope<object?>> PatchThemeAsync(string userId, CvThemePatchRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.PresetKey) || !CvThemeRegistry.IsAllowedPresetKey(request.PresetKey))
            return BadRequest(new { error = "Unknown preset" });

        string? overridesJson = null;
        if (request.Overrides != null)
        {
            if (!CvThemeRegistry.TryNormalizeOverrides(request.Overrides, out overridesJson, out _))
                return BadRequest(new { error = "Invalid overrides" });
        }

        var site = await _db.CvSites.FirstOrDefaultAsync(s => s.OwnerUserId == userId, ct);
        if (site == null)
            return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "No site for user" } };

        site.ThemePresetKey = request.PresetKey;
        site.UpdatedAt = DateTime.UtcNow;
        if (overridesJson != null)
            site.ThemeOverridesJson = overridesJson;

        await _db.SaveChangesAsync(ct);

        var mergedOverrides = overridesJson ?? site.ThemeOverridesJson;
        var theme = CvThemeRegistry.ResolveThemeTokens(request.PresetKey, mergedOverrides);
        return Ok(new { theme = JsonSerializer.Deserialize<object>(theme.ToJsonString()) });
    }

    public async Task<CvEnvelope<object?>> ListNotificationsAsync(string userId, bool unreadOnly, int limit, int offset, CancellationToken ct = default)
    {
        var q = _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId && CvSiteNotificationTypes.Contains(n.Type));
        if (unreadOnly)
            q = q.Where(n => !n.IsRead);

        var raw = await q
            .OrderByDescending(n => n.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(ct);

        var rows = raw.Select(n => new
        {
            n.Id,
            n.Type,
            n.Title,
            body = n.Message,
            payload = string.IsNullOrEmpty(n.PayloadJson)
                ? null
                : JsonSerializer.Deserialize<object>(n.PayloadJson),
            readAt = n.ReadAt.HasValue ? n.ReadAt.Value.ToUniversalTime().ToString("o") : null,
            createdAt = n.CreatedAt.ToUniversalTime().ToString("o"),
        }).ToList();

        return Ok(new { notifications = rows });
    }

    public async Task<CvEnvelope<object?>> MarkNotificationReadAsync(string userId, Guid notificationId, CancellationToken ct = default)
    {
        var n = await _db.Notifications.FirstOrDefaultAsync(
            x => x.Id == notificationId && x.UserId == userId && CvSiteNotificationTypes.Contains(x.Type), ct);
        if (n == null)
            return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };

        var now = DateTime.UtcNow;
        n.IsRead = true;
        n.ReadAt = now;
        await _db.SaveChangesAsync(ct);
        return Ok(new { ok = true });
    }

    public async Task<CvEnvelope<object?>> MarkAllNotificationsReadAsync(string userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        await _db.Notifications
            .Where(n => n.UserId == userId && CvSiteNotificationTypes.Contains(n.Type) && !n.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(n => n.IsRead, true)
                .SetProperty(n => n.ReadAt, now), ct);
        return Ok(new { ok = true });
    }

    public async Task<CvEnvelope<object?>> AdminListSitesAsync(string? status, string? q, int limit, int offset, CancellationToken ct = default)
    {
        var query = from s in _db.CvSites.AsNoTracking()
            join u in _db.Users.AsNoTracking() on s.OwnerUserId equals u.Id
            select new { s, u.Email };

        if (!string.IsNullOrEmpty(status) &&
            status is "pending" or "approved" or "rejected" or "suspended")
            query = query.Where(x => x.s.Status == status);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var pattern = q.Trim();
            query = query.Where(x => EF.Functions.ILike(x.s.Slug, $"%{pattern}%") ||
                                     (x.Email != null && EF.Functions.ILike(x.Email, $"%{pattern}%")));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(x => x.s.RequestedAt)
            .Skip(offset)
            .Take(limit)
            .Select(x => new
            {
                id = x.s.Id,
                slug = x.s.Slug,
                status = x.s.Status,
                ownerUserId = x.s.OwnerUserId,
                ownerEmail = x.Email,
                requestedAt = x.s.RequestedAt.ToUniversalTime().ToString("o"),
                reviewedAt = x.s.ReviewedAt.HasValue ? x.s.ReviewedAt.Value.ToUniversalTime().ToString("o") : null,
                rejectionReason = x.s.RejectionReason,
                updatedAt = x.s.UpdatedAt.ToUniversalTime().ToString("o"),
            })
            .ToListAsync(ct);

        return Ok(new { sites = rows, total });
    }

    public async Task<CvEnvelope<object?>> AdminApproveSiteAsync(string reviewerUserId, Guid siteId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var site = await _db.CvSites.FirstOrDefaultAsync(s => s.Id == siteId, ct);
            if (site == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            var conflict = await _db.CvSites.AnyAsync(
                s => s.Slug == site.Slug && s.Status == "approved" && s.Id != site.Id, ct);
            if (conflict)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?>
                {
                    StatusCode = 409,
                    Body = new { error = "Another approved site already uses this slug" },
                };
            }

            var owner = await _userManager.FindByIdAsync(site.OwnerUserId);
            if (owner?.Email == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            site.Status = "approved";
            site.ReviewedAt = DateTime.UtcNow;
            site.ReviewedByUserId = reviewerUserId;
            site.RejectionReason = null;
            site.UpdatedAt = DateTime.UtcNow;

            var idempotencyKey = $"{site.Id}:approved";
            var exists = await _db.Notifications.AnyAsync(
                n => n.IdempotencyKey == idempotencyKey, ct);
            if (!exists)
            {
                _db.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = site.OwnerUserId,
                    Type = "site_approved",
                    Title = "Site approved",
                    Message = $"Your CV site \"{site.Slug}\" is live.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    PayloadJson = JsonSerializer.Serialize(new { siteId = site.Id, slug = site.Slug }),
                    IdempotencyKey = idempotencyKey,
                });
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            await SendApprovedEmailBestEffortAsync(owner.Email, site.Slug, ct);
            return Ok(new { ok = true });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<CvEnvelope<object?>> AdminRejectSiteAsync(string reviewerUserId, Guid siteId, string reason, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Length > 2000)
            return BadRequest(new { error = "Invalid body" });

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var site = await _db.CvSites.FirstOrDefaultAsync(s => s.Id == siteId, ct);
            if (site == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            var owner = await _userManager.FindByIdAsync(site.OwnerUserId);
            if (owner?.Email == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            site.Status = "rejected";
            site.ReviewedAt = DateTime.UtcNow;
            site.ReviewedByUserId = reviewerUserId;
            site.RejectionReason = reason.Trim();
            site.UpdatedAt = DateTime.UtcNow;

            _db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                UserId = site.OwnerUserId,
                Type = "site_rejected",
                Title = "Site request not approved",
                Message = reason.Trim(),
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    siteId = site.Id,
                    slug = site.Slug,
                    rejection_reason = reason.Trim(),
                }),
            });

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            await SendRejectedEmailBestEffortAsync(owner.Email, site.Slug, reason.Trim(), ct);
            return Ok(new { ok = true });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<CvEnvelope<object?>> AdminSuspendSiteAsync(string reviewerUserId, Guid siteId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var site = await _db.CvSites.FirstOrDefaultAsync(s => s.Id == siteId, ct);
            if (site == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            var owner = await _userManager.FindByIdAsync(site.OwnerUserId);
            if (owner?.Email == null)
            {
                await tx.RollbackAsync(ct);
                return new CvEnvelope<object?> { StatusCode = 404, Body = new { error = "Not found" } };
            }

            site.Status = "suspended";
            site.ReviewedAt = DateTime.UtcNow;
            site.ReviewedByUserId = reviewerUserId;
            site.UpdatedAt = DateTime.UtcNow;

            var idempotencyKey = $"{site.Id}:suspended";
            var exists = await _db.Notifications.AnyAsync(n => n.IdempotencyKey == idempotencyKey, ct);
            if (!exists)
            {
                _db.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = site.OwnerUserId,
                    Type = "site_suspended",
                    Title = "Site suspended",
                    Message = $"Your CV site \"{site.Slug}\" has been suspended.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    PayloadJson = JsonSerializer.Serialize(new { siteId = site.Id, slug = site.Slug }),
                    IdempotencyKey = idempotencyKey,
                });
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            await SendSuspendedEmailBestEffortAsync(owner.Email, site.Slug, ct);
            return Ok(new { ok = true });
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<CvEnvelope<object?>> SubmitContactAsync(CvContactRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { success = false, error = "Missing fields" });

        var to = _cv.ContactToEmail?.Trim();
        if (string.IsNullOrEmpty(to))
            to = _configuration["Email:AdminTo"]?.Trim();
        if (string.IsNullOrEmpty(to))
        {
            _logger.LogWarning(
                "Cv:ContactToEmail and Email:AdminTo not configured; skipping CV contact send (configure SMTP under Email:* in appsettings)");
            return new CvEnvelope<object?> { StatusCode = 500, Body = new { success = false, error = "Contact not configured" } };
        }

        try
        {
            var body =
                $"<p>From: {System.Net.WebUtility.HtmlEncode(request.Name)} &lt;{System.Net.WebUtility.HtmlEncode(request.Email)}&gt;</p>" +
                $"<p>{System.Net.WebUtility.HtmlEncode(request.Message)}</p>";
            await _emailSender.SendAsync(to, request.Subject.Trim(), body, ct);
            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CV contact send failed");
            return new CvEnvelope<object?> { StatusCode = 500, Body = new { success = false, error = ex.Message } };
        }
    }

    private async Task SendApprovedEmailBestEffortAsync(string email, string slug, CancellationToken ct)
    {
        try
        {
            var url = PublicSiteUrl(slug);
            var body =
                $"<p>Your CV site has been approved.</p><p><a href=\"{System.Net.WebUtility.HtmlEncode(url)}\">{System.Net.WebUtility.HtmlEncode(url)}</a></p><p>You can finish editing your CV in your dashboard.</p>";
            await _emailSender.SendAsync(email, "Your CV site is live", body, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Best-effort approved email failed for {Email}", email);
        }
    }

    private async Task SendRejectedEmailBestEffortAsync(string email, string slug, string reason, CancellationToken ct)
    {
        try
        {
            var dash = _cv.DashboardBaseUrl.TrimEnd('/') + "/dashboard";
            var body =
                $"<p>Your request for <strong>{System.Net.WebUtility.HtmlEncode(slug)}</strong> was not approved.</p>" +
                $"<p><strong>Reason:</strong> {System.Net.WebUtility.HtmlEncode(reason)}</p>" +
                $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(dash)}\">Open dashboard</a></p>";
            await _emailSender.SendAsync(email, "CV site request update", body, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Best-effort rejected email failed for {Email}", email);
        }
    }

    private async Task SendSuspendedEmailBestEffortAsync(string email, string slug, CancellationToken ct)
    {
        try
        {
            var dash = _cv.DashboardBaseUrl.TrimEnd('/') + "/dashboard";
            var body =
                $"<p>Your site <strong>{System.Net.WebUtility.HtmlEncode(slug)}</strong> has been suspended.</p>" +
                $"<p><a href=\"{System.Net.WebUtility.HtmlEncode(dash)}\">Dashboard</a></p>";
            await _emailSender.SendAsync(email, "Your CV site has been suspended", body, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Best-effort suspended email failed for {Email}", email);
        }
    }

    private string PublicSiteUrl(string slug)
    {
        var root = _cv.RootDomain.Trim().TrimStart('.');
        return $"https://{slug}.{root}";
    }

    private static string? FindPortfolioItemJson(string? portfolioJson, string itemId)
    {
        if (string.IsNullOrEmpty(portfolioJson))
            return null;
        try
        {
            using var doc = JsonDocument.Parse(portfolioJson);
            if (!doc.RootElement.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array)
                return null;
            foreach (var el in items.EnumerateArray())
            {
                if (el.TryGetProperty("id", out var idProp))
                {
                    var id = idProp.ToString();
                    if (string.Equals(id, itemId, StringComparison.Ordinal))
                        return el.GetRawText();
                }
            }
        }
        catch
        {
            return null;
        }

        return null;
    }

    public async Task<CvEnvelope<object?>> UploadCvImageAsync(string userId, Stream fileStream, string fileName, CancellationToken ct = default)
    {
        var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var ext = Path.GetExtension(fileName);
        if (!allowedExtensions.Contains(ext))
            return BadRequest(new { error = "Invalid file type. Allowed: jpg, png, gif, webp" });

        var folder = Path.Combine(_environment.WebRootPath ?? _environment.ContentRootPath, "uploads", "cv-images");
        Directory.CreateDirectory(folder);

        var newFileName = $"{userId}_{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(folder, newFileName);

        await using var outStream = new FileStream(filePath, FileMode.Create);
        await fileStream.CopyToAsync(outStream, ct);

        return Ok(new { url = $"/uploads/cv-images/{newFileName}" });
    }

    private static CvEnvelope<object?> Ok(object body) => new() { StatusCode = 200, Body = body };

    private static CvEnvelope<object?> NotFound() =>
        new() { StatusCode = 404, Body = new { error = "Not found" } };

    private static CvEnvelope<object?> BadRequest(object body) =>
        new() { StatusCode = 400, Body = body };

    private static CvEnvelope<object?> Conflict(object body) =>
        new() { StatusCode = 409, Body = body };
}
