using DailyPlanner.Application;
using DailyPlanner.Application.Interfaces;
using DailyPlanner.Infrastructure;
using DailyPlanner.Infrastructure.Data;
using Hangfire;
using Hangfire.PostgreSql;
using DailyPlanner.Api.Jobs;
using DailyPlanner.Api.Swagger;
using DailyPlanner.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using Hangfire.Dashboard;
using Serilog;
using Serilog.Events;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog from appsettings and DI; add two file sinks: errors only, and info+warning only
var logTemplate = "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] [{SourceContext}] {Message:lj}{NewLine}{Exception}";
builder.Host.UseSerilog((ctx, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .WriteTo.File(
            path: "wwwroot/logs/dailyplanner-errors-.log",
            restrictedToMinimumLevel: LogEventLevel.Error,
            rollingInterval: Serilog.RollingInterval.Day,
            retainedFileCountLimit: 30,
            outputTemplate: logTemplate,
            shared: true)
        .WriteTo.Conditional(
            evt => evt.Level < LogEventLevel.Error,
            wt => wt.File(
                path: "wwwroot/logs/dailyplanner-.log",
                rollingInterval: Serilog.RollingInterval.Day,
                retainedFileCountLimit: 30,
                outputTemplate: logTemplate,
                shared: true));
});

// Request logging configuration (paths to exclude from Serilog request logs)
var requestLoggingExcludedPaths = builder.Configuration
    .GetSection("RequestLogging:ExcludedPaths")
    .Get<string[]>() ?? Array.Empty<string>();

// When behind a reverse proxy (nginx, Cloudflare, etc.), trust forwarded headers
// so HTTPS redirection doesn't loop (proxy terminates SSL and forwards HTTP)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Daily Planner API", 
        Version = "v1",
        Description = "Daily Planner and CV hosting API. CV surface: `api/v1/cv/*` (public site/themes/portfolio/contact; owner `me/*` with JWT; admin `admin/*` with roles `Admin` or `platform_admin`). Tenant resolution: `Host` (`{slug}.ROOT_DOMAIN`) or `X-Tenant-Slug` (trusted from your reverse proxy / Next.js server)."
    });
    
    // Include XML comments if available
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
    
    // Ensure all controllers are discovered
    c.CustomSchemaIds(type => type.FullName);
    c.OperationFilter<CvTenantHeaderOperationFilter>();
});

// Add CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:3003", "http://localhost:5173", "http://localhost:5174" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Add Application and Infrastructure layers
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// Google Calendar OAuth
builder.Services.AddMemoryCache();
builder.Services.Configure<DailyPlanner.Application.Options.GoogleCalendarOptions>(
    builder.Configuration.GetSection(DailyPlanner.Application.Options.GoogleCalendarOptions.SectionName));
builder.Services.Configure<DailyPlanner.Application.Options.TodoistOptions>(
    builder.Configuration.GetSection(DailyPlanner.Application.Options.TodoistOptions.SectionName));

// Admin logs (file-based, uses ContentRootPath)
builder.Services.AddScoped<DailyPlanner.Application.Interfaces.ILogsService, DailyPlanner.Infrastructure.Services.LogsService>();
builder.Services.AddScoped<DailyPlanner.Infrastructure.Services.LogStreamService>();

// Hangfire
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(
    options => options.UseNpgsqlConnection(connectionString),
    new PostgreSqlStorageOptions { DistributedLockTimeout = TimeSpan.FromMinutes(2) }));
builder.Services.AddHangfireServer();
builder.Services.AddScoped<RecurringTaskRenewalJob>();
builder.Services.AddScoped<OldDailyTaskCleanupJob>();
builder.Services.AddScoped<WeeklySummaryEmailJob>();
builder.Services.AddScoped<EmailTaskReminderJob>();
builder.Services.AddScoped<IWebPushService, WebPushService>();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "DailyPlanner";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "DailyPlanner";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>();

// Enable static files for avatar uploads
builder.Services.AddDirectoryBrowser();

var app = builder.Build();

// Ensure wwwroot directories exist (uploads/avatars for serving, logs for file sink)
var env = app.Services.GetRequiredService<IWebHostEnvironment>();
if (string.IsNullOrEmpty(env.WebRootPath))
{
    env.WebRootPath = Path.Combine(env.ContentRootPath, "wwwroot");
}
Directory.CreateDirectory(Path.Combine(env.WebRootPath, "uploads", "avatars"));
Directory.CreateDirectory(Path.Combine(env.WebRootPath, "uploads", "cv-images"));
Directory.CreateDirectory(Path.Combine(env.WebRootPath, "logs"));

// Configure the HTTP request pipeline
app.UseForwardedHeaders();

// Structured HTTP request logging via Serilog
app.UseSerilogRequestLogging(options =>
{
    // Include query string in the logged request path
    options.IncludeQueryInRequestPath = true;

    // Map status codes/exceptions to log levels
    options.GetLevel = (httpContext, elapsedMs, exception) =>
    {
        if (exception != null || httpContext.Response.StatusCode >= 500)
        {
            return LogEventLevel.Error;
        }

        if (httpContext.Response.StatusCode >= 400)
        {
            return LogEventLevel.Warning;
        }

        return LogEventLevel.Information;
    };

    // Enrich diagnostic context with additional request information
    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        var request = httpContext.Request;
        var user = httpContext.User;

        diagnosticContext.Set("ClientIp", httpContext.Connection.RemoteIpAddress?.ToString());
        diagnosticContext.Set("UserAgent", request.Headers["User-Agent"].ToString());
        diagnosticContext.Set("TraceIdentifier", httpContext.TraceIdentifier);
        diagnosticContext.Set("RequestHost", request.Host.Value);
        diagnosticContext.Set("RequestProtocol", request.Protocol);

        if (user?.Identity?.IsAuthenticated == true)
        {
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? user.FindFirst("sub")?.Value;
            if (!string.IsNullOrWhiteSpace(userId))
            {
                diagnosticContext.Set("UserId", userId);
            }
        }
    };
});

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Daily Planner API v1");
    c.RoutePrefix = "swagger";
    c.DisplayRequestDuration();
    c.EnableDeepLinking();
    c.EnableFilter();
    c.ShowExtensions();
});

app.UseHttpsRedirection();

// Enable CORS
app.UseCors("AllowFrontend");

// Enable static files
app.UseStaticFiles();

// Enable directory browsing for uploads (only in development)
if (app.Environment.IsDevelopment())
{
    app.UseDirectoryBrowser();
}

// Add global exception handler
app.UseMiddleware<DailyPlanner.Api.Middleware.GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

// Hangfire dashboard and recurring job
var hangfireUser = builder.Configuration["Hangfire:Username"] ?? "admin";
var hangfirePass = builder.Configuration["Hangfire:Password"] ?? "Admin@123";
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireBasicAuthFilter(hangfireUser, hangfirePass) }
});
RecurringJob.AddOrUpdate<RecurringTaskRenewalJob>(
    "renew-recurring-tasks",
    j => j.ExecuteAsync(CancellationToken.None),
    "0 0 * * *"); // daily at midnight UTC
RecurringJob.AddOrUpdate<OldDailyTaskCleanupJob>(
    "cleanup-old-daily-tasks",
    j => j.ExecuteAsync(CancellationToken.None),
    "0 1 * * *"); // daily at 01:00 UTC (tasks older than 7 days)
RecurringJob.AddOrUpdate<OldUserActivityCleanupJob>(
    "cleanup-old-user-activities",
    j => j.ExecuteAsync(CancellationToken.None),
    "0 2 * * *"); // daily at 02:00 UTC (activities older than 7 days)
RecurringJob.AddOrUpdate<TaskReminderJob>(
    "task-reminders",
    j => j.ExecuteAsync(CancellationToken.None),
    "* * * * *"); // every minute: send in-app notification at exact reminder time (hours and minutes)
RecurringJob.AddOrUpdate<WeeklySummaryEmailJob>(
    "email-weekly-summary",
    j => j.ExecuteAsync(CancellationToken.None),
    "0 9 * * 1"); // Monday 09:00 UTC: record stats and send weekly performance summary to users with emailWeeklySummary enabled
RecurringJob.AddOrUpdate<EmailTaskReminderJob>(
    "email-task-reminders",
    j => j.ExecuteAsync(CancellationToken.None),
    "* * * * *"); // every minute: send email when task ReminderTime is reached for users with emailTaskReminders enabled

// Ensure database is created, roles exist, and seed data
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<DailyPlanner.Domain.Entities.ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        context.Database.Migrate();

        // Seed database with roles and sample accounts
        await DailyPlanner.Infrastructure.Data.DatabaseSeeder.SeedAsync(context, userManager, roleManager);

        // Ensure existing legacy DailyTask per-date data is available as TaskInstances
        // so the instance-based /api/tasks endpoints work immediately after startup.
        var legacyMigration = services.GetRequiredService<DailyPlanner.Infrastructure.Services.LegacyDailyTaskToTaskInstancesMigrationService>();
        await legacyMigration.RunAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogCritical(ex, "Database migration or seeding failed. Application cannot start.");
        throw; // fail fast — do not start with broken schema
    }
}

app.Run();

public class HangfireBasicAuthFilter : IDashboardAuthorizationFilter
{
    private readonly string _username;
    private readonly string _password;

    public HangfireBasicAuthFilter(string username, string password)
    {
        _username = username;
        _password = password;
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        var header = httpContext.Request.Headers["Authorization"].FirstOrDefault();

        if (header != null && header.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            var encoded = header["Basic ".Length..].Trim();
            var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
            var parts = decoded.Split(':', 2);
            if (parts.Length == 2 && parts[0] == _username && parts[1] == _password)
                return true;
        }

        httpContext.Response.StatusCode = 401;
        httpContext.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Hangfire Dashboard\"";
        return false;
    }
}
