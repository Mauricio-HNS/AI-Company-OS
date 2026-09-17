using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<IngressStore>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    component = "company-brain-ingress",
    utc = DateTimeOffset.UtcNow
}));

app.MapPost("/api/bridge/v1/sync", async (HttpRequest request, SyncRequest input, IngressStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    var configuredKey = configuration["BridgeIngress:ApiKey"];
    if (string.IsNullOrWhiteSpace(configuredKey))
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

    if (!CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(configuredKey),
            Encoding.UTF8.GetBytes(request.Headers["X-Bridge-Api-Key"].ToString())))
        return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(input.CompanyId) || input.CompanyId == "un-enrolled" || string.IsNullOrWhiteSpace(input.Envelope))
        return Results.BadRequest(new { accepted = false, reason = "Invalid bridge envelope" });

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

    var eventId = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input.CompanyId + "\n" + input.Envelope)));
    var accepted = await store.AppendIfNewAsync(input.CompanyId, eventId, input.Envelope, cancellationToken);

    return Results.Ok(new
    {
        accepted = true,
        duplicate = !accepted,
        eventId,
        receivedAt = DateTimeOffset.UtcNow
    });
});

app.Run();

public sealed record SyncRequest(string CompanyId, string Envelope);

public sealed class IngressStore
{
    private readonly string _root;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public IngressStore(IConfiguration configuration)
    {
        _root = configuration["BridgeIngress:DataDirectory"]
            ?? Path.Combine(AppContext.BaseDirectory, "data", "bridge-ingress");
        Directory.CreateDirectory(_root);
    }

    public async Task<bool> AppendIfNewAsync(string companyId, string eventId, string envelope, CancellationToken cancellationToken)
    {
        var safeCompanyId = string.Concat(companyId.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_'));
        if (string.IsNullOrWhiteSpace(safeCompanyId))
            throw new InvalidOperationException("Invalid company id");

        var directory = Path.Combine(_root, safeCompanyId);
        var path = Path.Combine(directory, "events.ndjson");
        Directory.CreateDirectory(directory);

        await _gate.WaitAsync(cancellationToken);
        try
        {
            if (File.Exists(path))
            {
                await foreach (var line in File.ReadLinesAsync(path, cancellationToken))
                {
                    if (line.StartsWith(eventId + "\t", StringComparison.Ordinal))
                        return false;
                }
            }

            var record = eventId + "\t" + DateTimeOffset.UtcNow.ToString("O") + "\t" + envelope + Environment.NewLine;
            await File.AppendAllTextAsync(path, record, Encoding.UTF8, cancellationToken);
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }
}
