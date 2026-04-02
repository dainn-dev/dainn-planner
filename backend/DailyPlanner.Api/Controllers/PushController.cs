using DailyPlanner.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DailyPlanner.Api.Controllers;

[ApiController]
[Route("api/push")]
public class PushController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IWebPushService _webPushService;

    public PushController(IConfiguration configuration, IWebPushService webPushService)
    {
        _configuration = configuration;
        _webPushService = webPushService;
    }

    [HttpGet("vapid-public-key")]
    public ActionResult<object> GetVapidPublicKey()
    {
        var publicKey = _configuration["Vapid:PublicKey"];
        if (string.IsNullOrWhiteSpace(publicKey))
            return Ok(new { publicKey = (string?)null, configured = false });
        return Ok(new { publicKey, configured = _webPushService.IsConfigured });
    }
}

