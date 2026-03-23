using DailyPlanner.Application.Options;
using DailyPlanner.Infrastructure.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Xunit;

namespace DailyPlanner.Infrastructure.Tests.Services;

public class CvTenantResolverTests
{
    [Theory]
    [InlineData("foo.dainn.online", "dainn.online", "foo")]
    [InlineData("www.dainn.online", "dainn.online", null)]
    [InlineData("dainn.online", "dainn.online", null)]
    [InlineData("api.dainn.online", "dainn.online", null)]
    [InlineData("foo.localhost", "dainn.online", "foo")]
    public void ParseTenantSlugFromHost_ReturnsExpected(string host, string root, string? expected)
    {
        CvTenantResolver.ParseTenantSlugFromHost(host, root).Should().Be(expected);
    }

    [Fact]
    public void ResolveSlug_PrefersHeaderOverHost()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers["X-Tenant-Slug"] = "from-header";
        ctx.Request.Headers.Host = "wrong.dainn.online";

        var opts = Options.Create(new CvOptions { RootDomain = "dainn.online" });
        var resolver = new CvTenantResolver(opts);
        resolver.ResolveSlug(ctx.Request).Should().Be("from-header");
    }
}
