using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;

namespace DailyPlanner.Infrastructure.Services;

public class LogStreamService
{
    private readonly IWebHostEnvironment _env;
    private static readonly Regex SafeFileNameRegex = new(@"^dailyplanner(-errors)?-\d{8}\.log$", RegexOptions.Compiled);

    public LogStreamService(IWebHostEnvironment env)
    {
        _env = env;
    }

    private string LogsDirectory => Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "logs");

    public static bool IsValidFileName(string? fileName) =>
        !string.IsNullOrWhiteSpace(fileName) && SafeFileNameRegex.IsMatch(fileName);

    public async Task StreamLogFileAsync(string fileName, Stream output, CancellationToken cancellationToken = default)
    {
        if (!IsValidFileName(fileName))
            return;

        var fullPath = Path.Combine(LogsDirectory, fileName);
        if (!File.Exists(fullPath))
            return;

        const int pollMs = 1000;
        var buffer = new byte[8192];
        var leftover = "";

        try
        {
            using var fs = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var lastPosition = fs.Length;
            fs.Seek(lastPosition, SeekOrigin.Begin);

            while (!cancellationToken.IsCancellationRequested)
            {
                await Task.Delay(pollMs, cancellationToken);

                var currentLength = fs.Length;
                if (currentLength <= lastPosition)
                    continue;

                fs.Seek(lastPosition, SeekOrigin.Begin);
                var toRead = (int)Math.Min(buffer.Length, currentLength - lastPosition);
                var read = await fs.ReadAsync(buffer.AsMemory(0, toRead), cancellationToken);
                lastPosition += read;

                var text = leftover + Encoding.UTF8.GetString(buffer.AsSpan(0, read));
                leftover = "";
                var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
                for (var i = 0; i < lines.Length; i++)
                {
                    if (i == lines.Length - 1 && !text.EndsWith('\n') && !text.EndsWith('\r'))
                    {
                        leftover = lines[i];
                        break;
                    }
                    var line = lines[i];
                    if (string.IsNullOrEmpty(line))
                        continue;
                    var escaped = System.Text.Json.JsonSerializer.Serialize(new { line });
                    var sse = $"data: {escaped}\n\n";
                    var outBytes = Encoding.UTF8.GetBytes(sse);
                    await output.WriteAsync(outBytes, cancellationToken);
                    await output.FlushAsync(cancellationToken);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected
        }
    }
}
