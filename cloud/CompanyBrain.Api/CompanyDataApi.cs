using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace CompanyBrain.Api;

public static class CompanyDataApi
{
    public static void MapCompanyDataApi(this WebApplication app)
    {
        app.MapGet("/api/company/v1/companies/{companyId}/profile", async (
            HttpRequest request, string companyId, CompanyDataStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration) || !IsSafeIdentifier(companyId))
                return Results.Unauthorized();

            var profile = await store.GetProfileAsync(companyId, cancellationToken);
            return profile is null ? Results.NotFound(new { companyId, reason = "Company profile not registered." }) : Results.Ok(profile);
        });

        app.MapPut("/api/company/v1/companies/{companyId}/profile", async (
            HttpRequest request, string companyId, CompanyProfileInput input, CompanyDataStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration) || !IsSafeIdentifier(companyId))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(input.LegalName) ||
                string.IsNullOrWhiteSpace(input.TaxId) ||
                string.IsNullOrWhiteSpace(input.BusinessType) ||
                string.IsNullOrWhiteSpace(input.Email))
                return Results.BadRequest(new { saved = false, reason = "Legal name, tax ID, business type and email are required." });

            var profile = await store.UpsertProfileAsync(companyId, input, cancellationToken);
            return Results.Ok(new { saved = true, profile });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/facts", async (
            HttpRequest request, string companyId, BusinessFactInput input, CompanyDataStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration) || !IsSafeIdentifier(companyId))
                return Results.Unauthorized();

            if (string.IsNullOrWhiteSpace(input.Source) ||
                string.IsNullOrWhiteSpace(input.SourceType) ||
                string.IsNullOrWhiteSpace(input.Statement))
                return Results.BadRequest(new { saved = false, reason = "Source, source type and statement are required." });

            var fact = await store.AddFactAsync(companyId, input, cancellationToken);
            return Results.Ok(new { saved = true, fact });
        });

        app.MapGet("/api/company/v1/companies/{companyId}/facts", async (
            HttpRequest request, string companyId, CompanyDataStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration) || !IsSafeIdentifier(companyId))
                return Results.Unauthorized();

            var facts = await store.GetFactsAsync(companyId, 200, cancellationToken);
            return Results.Ok(new { companyId, count = facts.Count, facts });
        });
    }

    private static bool HasAdminKey(HttpRequest request, IConfiguration configuration)
    {
        var configured = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(configured) &&
               !string.IsNullOrWhiteSpace(provided) &&
               System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                   System.Text.Encoding.UTF8.GetBytes(configured),
                   System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool IsSafeIdentifier(string? value) =>
        !string.IsNullOrWhiteSpace(value) &&
        value.Length <= 100 &&
        value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');
}
