using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CompanyBrain.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<CloudStore>();
builder.Services.AddSingleton<CompanyDataStore>();
builder.Services.AddSingleton<CompanyOutputStore>();
builder.Services.AddSingleton<AutonomyStore>();
builder.Services.AddSingleton<FiscalBrainStore>();
builder.Services.AddSingleton<CompanyDocumentEngineStore>();
builder.Services.AddSingleton<CompanyMasterDataStore>();
builder.Services.AddSingleton<CompanySalesOrderStore>();
builder.Services.AddSingleton<CompanyInventoryStore>();
builder.Services.AddSingleton<CompanyAgendaStore>();
builder.Services.AddSingleton<CompanyAgendaAdvancedStore>();
builder.Services.AddSingleton<CompanyCommissionStore>();
builder.Services.AddSingleton<BrainProcessor>();
builder.Services.AddSingleton<BrainDecisionEngine>();
builder.Services.AddSingleton<AgentRegistry>();
builder.Services.AddSingleton<AgentExecutionService>();
builder.Services.AddSingleton<EvaluationReplanningService>();
builder.Services.AddSingleton<AutonomousCycleService>();
builder.Services.AddHttpClient<BrainLlmGateway>();
builder.Services.AddHostedService<BrainProcessorWorker>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-Id"].ToString();
    if (string.IsNullOrWhiteSpace(correlationId) || correlationId.Length > 100)
        correlationId = Guid.NewGuid().ToString("N");

    context.Response.Headers["X-Correlation-Id"] = correlationId;
    await next();
});

app.UseRateLimiter();
app.MapCompanyDataApi();
app.MapCompanyOutputApi();
app.MapCompanyAutonomyApi();
app.MapCompanyFiscalBrainApi();
app.MapCompanyDocumentEngineApi();
app.MapCompanyMasterDataApi();
app.MapCompanySalesOrdersApi();
app.MapCompanyInventoryApi();
app.MapCompanyAgendaApi();
app.MapCompanyAgendaAdvancedApi();
app.MapCompanyCommissionApi();

static bool HasBrainAdminKey(HttpRequest request, IConfiguration configuration)
{
    var configured = configuration["BrainAdmin:ApiKey"];
    var provided = request.Headers["X-Brain-Admin-Key"].ToString();
    return !string.IsNullOrWhiteSpace(configured)
        && !string.IsNullOrWhiteSpace(provided)
        && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(configured),
            Encoding.UTF8.GetBytes(provided));
}

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    component = "company-brain-ingress",
    persistence = "sqlite",
    utc = DateTimeOffset.UtcNow
}));

app.MapPost("/api/bridge/v1/enroll", async (EnrollmentRequest input, CloudStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(input.CompanyId) || !IsSafeIdentifier(input.DeviceId))
        return Results.BadRequest(new { enrolled = false, reason = "Invalid company or device identifier" });

    var configuredToken = configuration["BridgeEnrollment:Token"];
    if (string.IsNullOrWhiteSpace(configuredToken))
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

    var result = await store.EnrollAsync(input.CompanyId, input.DeviceId, input.EnrollmentToken, configuredToken, cancellationToken);
    if (result is null) return Results.Unauthorized();

    return Results.Ok(new
    {
        enrolled = true,
        companyId = result.CompanyId,
        deviceId = result.DeviceId,
        apiKey = result.ApiKey,
        issuedAt = DateTimeOffset.UtcNow,
        note = "Store this API key securely. It is returned only during enrollment."
    });
});

app.MapPost("/api/bridge/v1/sync", async (HttpRequest request, SyncRequest input, CloudStore store, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(input.CompanyId) || !IsSafeIdentifier(input.DeviceId) || string.IsNullOrWhiteSpace(input.Envelope))
        return Results.BadRequest(new { accepted = false, reason = "Invalid bridge envelope" });

    var apiKey = request.Headers["X-Bridge-Api-Key"].ToString();
    if (string.IsNullOrWhiteSpace(apiKey) || !await store.IsDeviceAuthorizedAsync(input.CompanyId, input.DeviceId, apiKey, cancellationToken))
        return Results.Unauthorized();

    try
    {
        using var document = JsonDocument.Parse(input.Envelope);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
            return Results.BadRequest(new { accepted = false, reason = "Envelope must be a JSON object" });
        if (!document.RootElement.TryGetProperty("CompanyId", out var envelopeCompany)
            || !string.Equals(envelopeCompany.GetString(), input.CompanyId, StringComparison.Ordinal))
            return Results.BadRequest(new { accepted = false, reason = "Envelope CompanyId does not match the authenticated bridge tenant" });
        if (document.RootElement.TryGetProperty("Payload", out var payload)
            && payload.ValueKind == JsonValueKind.Object
            && payload.TryGetProperty("companyId", out var payloadCompany)
            && !string.Equals(payloadCompany.GetString(), input.CompanyId, StringComparison.Ordinal))
            return Results.BadRequest(new { accepted = false, reason = "Source payload belongs to a different company" });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { accepted = false, reason = "Envelope contains invalid JSON" });
    }

    var eventId = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input.CompanyId + "\n" + input.DeviceId + "\n" + input.Envelope)));
    var accepted = await store.AppendEventIfNewAsync(new StoredEvent(eventId, input.CompanyId, input.DeviceId, input.Envelope, DateTimeOffset.UtcNow), cancellationToken);
    return Results.Ok(new { accepted, duplicate = !accepted, eventId, receivedAt = DateTimeOffset.UtcNow });
});

app.Run();

static bool IsSafeIdentifier(string? value)
    => !string.IsNullOrWhiteSpace(value)
       && value.Length <= 100
       && value.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.');
