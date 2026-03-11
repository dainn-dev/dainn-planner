using System.IO;
using System.Text.RegularExpressions;
using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;

namespace DailyPlanner.Infrastructure.Services;

public class LogsService : ILogsService
{
    private readonly IWebHostEnvironment _env;
    private static readonly Regex SafeFileNameRegex = new(@"^dailyplanner(-errors)?-\d{8}\.log$", RegexOptions.Compiled);

    public LogsService(IWebHostEnvironment env)
    {
        _env = env;
    }

    private string LogsDirectory => Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "logs");

    public Task<ApiResponse<List<LogFileEntryDto>>> GetLogFilesAsync(CancellationToken cancellationToken = default)
    {
        var result = new ApiResponse<List<LogFileEntryDto>>();
        try
        {
            var dir = LogsDirectory;
            if (!Directory.Exists(dir))
            {
                result.Success = true;
                result.Data = new List<LogFileEntryDto>();
                return Task.FromResult(result);
            }

            var list = new List<LogFileEntryDto>();
            foreach (var path in Directory.EnumerateFiles(dir, "dailyplanner-*.log"))
            {
                var name = Path.GetFileName(path);
                if (!SafeFileNameRegex.IsMatch(name))
                    continue;
                try
                {
                    var fi = new FileInfo(path);
                    list.Add(new LogFileEntryDto
                    {
                        Name = name,
                        SizeBytes = fi.Length,
                        LastWriteUtc = fi.LastWriteTimeUtc
                    });
                }
                catch
                {
                    // Skip files we can't stat
                }
            }

            result.Success = true;
            result.Data = list.OrderByDescending(x => x.LastWriteUtc).ToList();
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = ex.Message;
            result.Data = new List<LogFileEntryDto>();
        }

        return Task.FromResult(result);
    }

    public Task<ApiResponse<LogContentDto>> GetLogContentAsync(string fileName, int? tail = null, int? offset = null, int? limit = null, CancellationToken cancellationToken = default)
    {
        var result = new ApiResponse<LogContentDto>();
        if (string.IsNullOrWhiteSpace(fileName) || !SafeFileNameRegex.IsMatch(fileName))
        {
            result.Success = false;
            result.Message = "Invalid file name.";
            return Task.FromResult(result);
        }

        try
        {
            var fullPath = Path.Combine(LogsDirectory, fileName);
            if (!System.IO.File.Exists(fullPath))
            {
                result.Success = false;
                result.Message = "Log file not found.";
                return Task.FromResult(result);
            }

            // Read with FileShare.ReadWrite so we can read while Serilog has the file open for appending
            List<string> allLines;
            using (var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var reader = new StreamReader(fs))
            {
                allLines = new List<string>();
                string? line;
                while ((line = reader.ReadLine()) != null)
                    allLines.Add(line);
            }

            var totalCount = allLines.Count;

            IReadOnlyList<string> slice;
            int startLine;
            if (tail.HasValue && tail.Value > 0)
            {
                var take = Math.Min(tail.Value, totalCount);
                slice = allLines.Skip(totalCount - take).ToList();
                startLine = totalCount - take + 1;
            }
            else if (offset.HasValue || limit.HasValue)
            {
                var o = Math.Max(0, offset ?? 0);
                var l = limit ?? 500;
                slice = allLines.Skip(o).Take(l).ToList();
                startLine = o + 1;
            }
            else
            {
                var take = Math.Min(500, totalCount);
                slice = allLines.Skip(totalCount - take).ToList();
                startLine = totalCount - take + 1;
            }

            var lines = ParseLines(slice, startLine);

            result.Success = true;
            result.Data = new LogContentDto
            {
                FileName = fileName,
                Lines = lines,
                TotalLineCount = totalCount
            };
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = ex.Message;
        }

        return Task.FromResult(result);
    }

    private static IReadOnlyList<LogLineDto> ParseLines(IReadOnlyList<string> rawLines, int startLineNumber)
    {
        var list = new List<LogLineDto>();
        for (var i = 0; i < rawLines.Count; i++)
        {
            var line = rawLines[i];
            var level = "INF";
            var text = line;
            // Serilog format: 2025-03-09 12:00:00.000 +00:00 [INF] [SourceContext] Message
            var bracket = line.IndexOf('[');
            if (bracket >= 0)
            {
                var endBracket = line.IndexOf(']', bracket);
                if (endBracket > bracket + 1)
                {
                    level = line.Substring(bracket + 1, endBracket - bracket - 1).Trim();
                    text = line;
                }
            }

            list.Add(new LogLineDto
            {
                LineNumber = startLineNumber + i,
                Level = level,
                Text = text
            });
        }

        return list;
    }
}
