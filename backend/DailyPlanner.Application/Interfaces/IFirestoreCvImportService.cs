using System.Text.Json;

namespace DailyPlanner.Application.Interfaces;

/// <summary>
/// One-time Firestore → Postgres CV import. POST a JSON payload exported from Firestore;
/// implementation upserts into cv_* tables using Identity user ids when emails match.
/// </summary>
public interface IFirestoreCvImportService
{
    Task<FirestoreCvImportResult> ImportAsync(JsonElement payload, CancellationToken ct = default);
}

public sealed class FirestoreCvImportResult
{
    public int SitesUpserted { get; init; }
    public int DocumentsUpserted { get; init; }
    public IReadOnlyList<string> Warnings { get; init; } = Array.Empty<string>();
}
