using DailyPlanner.Application.DTOs;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Domain.Entities;
using DailyPlanner.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace DailyPlanner.Infrastructure.Services;

public class ContactService : IContactService
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ContactService> _logger;

    public ContactService(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender,
        IConfiguration configuration,
        ILogger<ContactService> logger)
    {
        _context = context;
        _userManager = userManager;
        _emailSender = emailSender;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ApiResponse<object>> SubmitAsync(ContactRequestDto request, string? userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new ApiResponse<object> { Success = false, Message = "Name is required", Errors = new Dictionary<string, string[]> { { "name", new[] { "Name is required" } } } };
        }
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new ApiResponse<object> { Success = false, Message = "Email is required", Errors = new Dictionary<string, string[]> { { "email", new[] { "Email is required" } } } };
        }
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return new ApiResponse<object> { Success = false, Message = "Message is required", Errors = new Dictionary<string, string[]> { { "message", new[] { "Message is required" } } } };
        }

        var source = string.IsNullOrWhiteSpace(request.Source) ? "contact" : request.Source.Trim();
        var entity = new ContactMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Message = request.Message.Trim(),
            Source = source.Length > 50 ? source[..50] : source,
            CreatedAt = DateTime.UtcNow
        };

        _context.ContactMessages.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Contact message saved: Id={Id}, Email={Email}, Source={Source}", entity.Id, entity.Email, entity.Source);

        await NotifyAdminsAsync(entity, cancellationToken);
        await SendAdminEmailAsync(entity, cancellationToken);

        return new ApiResponse<object>
        {
            Success = true,
            Message = "Thank you for your message. We will respond as soon as possible."
        };
    }

    private async Task NotifyAdminsAsync(ContactMessage message, CancellationToken cancellationToken)
    {
        try
        {
            var admins = await _userManager.GetUsersInRoleAsync("Admin");
            if (admins == null || admins.Count == 0)
                return;

            var preview = message.Message.Length > 100 ? message.Message[..100] + "..." : message.Message;
            var title = "New support message";
            var notificationMessage = $"{message.Name} ({message.Email}): {preview}";

            foreach (var admin in admins)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = admin.Id,
                    Type = "ContactMessage",
                    Title = title,
                    Message = notificationMessage,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Notifications.Add(notification);
            }

            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to create admin notifications for contact message {Id}", message.Id);
        }
    }

    private async Task SendAdminEmailAsync(ContactMessage message, CancellationToken cancellationToken)
    {
        var adminTo = _configuration["Email:AdminTo"];
        if (string.IsNullOrEmpty(adminTo))
        {
            _logger.LogDebug("Email:AdminTo not set; skipping admin notification email");
            return;
        }

        var subject = $"[Contact] {message.Source} - {message.Name}";
        var body = $"From: {message.Name} <{message.Email}>\r\nSource: {message.Source}\r\nDate: {message.CreatedAt:yyyy-MM-dd HH:mm} UTC\r\n\r\n{message.Message}";

        try
        {
            await _emailSender.SendAsync(adminTo, subject, body, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send admin email for contact message {Id}", message.Id);
        }
    }
}
