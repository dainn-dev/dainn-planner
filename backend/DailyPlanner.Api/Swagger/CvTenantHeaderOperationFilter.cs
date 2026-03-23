using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DailyPlanner.Api.Swagger;

/// <summary>
/// Documents optional <c>X-Tenant-Slug</c> for tenant resolution when <c>Host</c> is not a tenant subdomain (e.g. server-side fetch from Next).</summary>
public sealed class CvTenantHeaderOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var path = context.ApiDescription.RelativePath ?? "";
        if (!path.Contains("v1/cv/", StringComparison.OrdinalIgnoreCase))
            return;

        if (!path.EndsWith("v1/cv/site", StringComparison.OrdinalIgnoreCase) &&
            !path.Contains("v1/cv/portfolio/", StringComparison.OrdinalIgnoreCase))
            return;

        operation.Parameters ??= new List<OpenApiParameter>();
        if (operation.Parameters.Any(p => p.Name == "X-Tenant-Slug"))
            return;

        operation.Parameters.Add(new OpenApiParameter
        {
            Name = "X-Tenant-Slug",
            In = ParameterLocation.Header,
            Required = false,
            Description = "Tenant slug when the Host header is not `{slug}.ROOT_DOMAIN` (forward from edge/Next).",
            Schema = new OpenApiSchema { Type = "string" },
        });
    }
}
