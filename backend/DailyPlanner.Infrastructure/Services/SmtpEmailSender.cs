using System.Net;
using System.Net.Mail;
using DailyPlanner.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration configuration, ILogger<SmtpEmailSender> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        var host = _configuration["Email:SmtpHost"];
        if (string.IsNullOrEmpty(host))
        {
            _logger.LogWarning("Email:SmtpHost not configured; skipping send to {To}", to);
            return;
        }

        var port = _configuration.GetValue<int>("Email:SmtpPort", 587);
        var from = _configuration["Email:From"] ?? "noreply@dailyplanner.com";
        var user = _configuration["Email:User"];
        var password = _configuration["Email:Password"];
        var enableSsl = _configuration.GetValue<bool>("Email:EnableSsl", true);

        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };
            if (!string.IsNullOrEmpty(user) && !string.IsNullOrEmpty(password))
            {
                client.Credentials = new NetworkCredential(user, password);
            }

            var isHtml = body.TrimStart().StartsWith("<", StringComparison.Ordinal);
            var message = new MailMessage(from, to, subject, body) { IsBodyHtml = isHtml };
            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email sent to {To} subject {Subject}", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", to);
            throw;
        }
    }
}
