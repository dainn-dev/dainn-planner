namespace DailyPlanner.Application.DTOs.Cv;

/// <summary>Maps to HTTP responses for CV JSON API (parity with cv-next routes).</summary>
public class CvEnvelope<T>
{
    public int StatusCode { get; init; } = 200;
    public T? Body { get; init; }
}
