using System.Net.Http.Json;
using System.Text.Json;
using DailyPlanner.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class GoogleRecaptchaService : IGoogleRecaptchaService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleRecaptchaService> _logger;

    public GoogleRecaptchaService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GoogleRecaptchaService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> VerifyAsync(string token, string? remoteIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("reCAPTCHA verification skipped: token is empty");
            return false;
        }

        var secret = _configuration["Recaptcha:SecretKey"];
        if (string.IsNullOrEmpty(secret))
        {
            _logger.LogWarning("Recaptcha:SecretKey not configured; rejecting verification");
            return false;
        }

        var form = new Dictionary<string, string>
        {
            ["secret"] = secret,
            ["response"] = token
        };
        if (!string.IsNullOrWhiteSpace(remoteIp))
            form["remoteip"] = remoteIp;

        try
        {
            var client = _httpClientFactory.CreateClient();
            using var content = new FormUrlEncodedContent(form);
            var response = await client.PostAsync("https://www.google.com/recaptcha/api/siteverify", content, cancellationToken);
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
            var success = json.TryGetProperty("success", out var successProp) && successProp.GetBoolean();

            if (!success && json.TryGetProperty("error-codes", out var errors))
            {
                var codes = string.Join(", ", errors.EnumerateArray().Select(e => e.GetString()));
                _logger.LogInformation("reCAPTCHA verification failed: {ErrorCodes}", codes);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "reCAPTCHA verification request failed");
            return false;
        }
    }
}
