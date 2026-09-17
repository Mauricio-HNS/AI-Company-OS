using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CompanyBrain.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<CloudStore>();

var app = builder.Build();

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

    var result = await store.EnrollAsync(
        input.CompanyId,
        input.DeviceId,
        input.EnrollmentToken,
        configuredToken,
        cancellationToken);

    if (result is null)
        return Results.Unauthorized();

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
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { accepted = false, reason = "Envelope contains invalid JSON" });
    }

    var eventId = Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(input.CompanyId + "\n" + input.DeviceId + "\n" + input.Envelope)));

    var accepted = await store.AppendEventIfNewAsync(
        new StoredEvent(eventId, input.CompanyId, input.DeviceId, input.Envelope, DateTimeOffset.UtcNow),
        cancellationToken);

    return Results.Ok(new
    {
        accepted = true,
        duplicate = !accepted,
        eventId,
        receivedAt = DateTimeOffset.UtcNow
    });
});

app.MapGet("/api/brain/v1/companies/{companyId}/status", async (string companyId, CloudStore store, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var eventCount = await store.GetEventCountAsync(companyId, cancellationToken);
    return Results.Ok(new
    {
        companyId,
        eventCount,
        brainIngress = "active",
        persistence = "durable"
    });
});

app.Run();

static bool IsSafeIdentifier(string? value)
    => !string.IsNullOrWhiteSpace(value)
       && value.Length <= 100
       && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');

public sealed record EnrollmentRequest(string CompanyId, string DeviceId, string EnrollmentToken);
public sealed record SyncRequest(string CompanyId, string DeviceId, string Envelope);
