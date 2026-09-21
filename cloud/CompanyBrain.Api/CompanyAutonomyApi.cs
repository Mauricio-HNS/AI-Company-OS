namespace CompanyBrain.Api;

public static class CompanyAutonomyApi
{
    public static void MapCompanyAutonomyApi(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/company/v1/companies/{companyId}/autonomy", async (
            HttpRequest request,
            string companyId,
            AutonomyStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasBrainAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId))
                return Results.BadRequest();

            var policy = await store.GetOrCreateAsync(companyId, cancellationToken);
            var assessment = await store.AssessAsync(companyId, cancellationToken);
            return Results.Ok(new { policy, assessment });
        });

        app.MapPut("/api/company/v1/companies/{companyId}/autonomy", async (
            HttpRequest request,
            string companyId,
            CompanyAutonomyUpdateRequest input,
            AutonomyStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasBrainAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId) || string.IsNullOrWhiteSpace(input.Reason))
                return Results.BadRequest();

            if (!Enum.IsDefined(input.Level))
                return Results.BadRequest(new { reason = "Invalid autonomy level." });

            var current = await store.GetOrCreateAsync(companyId, cancellationToken);

            // Owner/admin explicitly controls the level. The assessment can suggest a change,
            // but it never raises autonomy by itself.
            var updated = current with
            {
                Level = input.Level,
                UpdatedAt = DateTimeOffset.UtcNow,
                UpdatedBy = "owner",
            };

            await store.SaveAsync(updated, cancellationToken);

            return Results.Ok(new
            {
                policy = updated,
                change = new
                {
                    from = current.Level,
                    to = updated.Level,
                    reason = input.Reason.Trim(),
                    ownerAccepted = true
                }
            });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/autonomy/recommendation-outcome", async (
            HttpRequest request,
            string companyId,
            bool accepted,
            AutonomyStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasBrainAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId))
                return Results.BadRequest();

            await store.RecordRecommendationAsync(companyId, accepted, cancellationToken);
            return Results.Ok(await store.AssessAsync(companyId, cancellationToken));
        });

        app.MapPost("/api/company/v1/companies/{companyId}/autonomy/execution-outcome", async (
            HttpRequest request,
            string companyId,
            bool successful,
            AutonomyStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasBrainAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId))
                return Results.BadRequest();

            await store.RecordExecutionAsync(companyId, successful, cancellationToken);
            return Results.Ok(await store.AssessAsync(companyId, cancellationToken));
        });
    }

    private static bool HasBrainAdminKey(HttpRequest request, IConfiguration configuration)
    {
        var configured = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(configured)
            && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(configured),
                System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool IsSafeIdentifier(string value)
        => !string.IsNullOrWhiteSpace(value)
            && value.Length <= 100
            && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');
}
