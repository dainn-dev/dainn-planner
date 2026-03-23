using System.Text.Json;
using DailyPlanner.Application.DTOs.Cv;

namespace DailyPlanner.Application.Interfaces;

public interface ICvService
{
    Task<CvEnvelope<object?>> GetPublicSiteAsync(string? tenantSlug, CancellationToken ct = default);
    Task<CvEnvelope<object?>> GetThemesAsync(CancellationToken ct = default);
    Task<CvEnvelope<object?>> GetPortfolioItemAsync(string? tenantSlug, string itemId, CancellationToken ct = default);

    Task<CvEnvelope<object?>> GetMySiteAsync(string userId, CancellationToken ct = default);
    Task<CvEnvelope<object?>> RequestSiteAsync(string userId, string slug, CancellationToken ct = default);
    Task<CvEnvelope<object?>> PutContentAsync(string userId, JsonElement body, CancellationToken ct = default);
    Task<CvEnvelope<object?>> PatchThemeAsync(string userId, CvThemePatchRequest request, CancellationToken ct = default);

    Task<CvEnvelope<object?>> ListNotificationsAsync(string userId, bool unreadOnly, int limit, int offset, CancellationToken ct = default);
    Task<CvEnvelope<object?>> MarkNotificationReadAsync(string userId, Guid notificationId, CancellationToken ct = default);
    Task<CvEnvelope<object?>> MarkAllNotificationsReadAsync(string userId, CancellationToken ct = default);

    Task<CvEnvelope<object?>> AdminListSitesAsync(string? status, string? q, int limit, int offset, CancellationToken ct = default);
    Task<CvEnvelope<object?>> AdminApproveSiteAsync(string reviewerUserId, Guid siteId, CancellationToken ct = default);
    Task<CvEnvelope<object?>> AdminRejectSiteAsync(string reviewerUserId, Guid siteId, string reason, CancellationToken ct = default);
    Task<CvEnvelope<object?>> AdminSuspendSiteAsync(string reviewerUserId, Guid siteId, CancellationToken ct = default);

    Task<CvEnvelope<object?>> SubmitContactAsync(CvContactRequest request, CancellationToken ct = default);
}
