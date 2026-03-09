using DailyPlanner.Application.DTOs;

namespace DailyPlanner.Application.Interfaces;

public interface ILogsService
{
    Task<ApiResponse<List<LogFileEntryDto>>> GetLogFilesAsync(CancellationToken cancellationToken = default);
    Task<ApiResponse<LogContentDto>> GetLogContentAsync(string fileName, int? tail = null, int? offset = null, int? limit = null, CancellationToken cancellationToken = default);
}
