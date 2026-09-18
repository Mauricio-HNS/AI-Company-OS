using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record BrainMemory(
    string MemoryId,
    string CompanyId,
    string Statement,
    string Context,
    string Source,
    DateTimeOffset ObservedAt,
    double Confidence);

public sealed class BrainProcessor
{
    private readonly CloudStore _store;
    private readonly ILogger<BrainProcessor> _logger;

    public BrainProcessor(CloudStore store, ILogger<BrainProcessor> logger)
    {
        _store = store;
        _logger = logger;
    }

    public async Task<int> ProcessPendingAsync(CancellationToken cancellationToken)
    {
        var events = await _store.GetUnprocessedEventsAsync(50, cancellationToken);
        var processed = 0;

        foreach (var item in events)
        {
            try
            {
                using var document = JsonDocument.Parse(item.Envelope);
                var root = document.RootElement;
                var payload = root.TryGetProperty("payload", out var p) ? p : root;
                var facts = payload.TryGetProperty("facts", out var f) && f.ValueKind == JsonValueKind.Array
                    ? f.EnumerateArray()
                    : Enumerable.Empty<JsonElement>();

                foreach (var fact in facts)
                {
                    if (!fact.TryGetProperty("key", out var keyElement))
                        continue;

                    var key = keyElement.GetString();
                    if (string.IsNullOrWhiteSpace(key))
                        continue;

                    var value = fact.TryGetProperty("value", out var valueElement)
                        ? valueElement.ToString()
                        : null;

                    if (string.IsNullOrWhiteSpace(value))
                        continue;

                    var confidence = fact.TryGetProperty("confidence", out var confidenceElement)
                        && confidenceElement.TryGetDouble(out var parsed)
                        ? Math.Clamp(parsed, 0d, 1d)
                        : 0.8d;

                    var observedAt = DateTimeOffset.UtcNow;
                    if (fact.TryGetProperty("observedAt", out var observedElement)
                        && DateTimeOffset.TryParse(observedElement.GetString(), out var parsedObserved))
                        observedAt = parsedObserved;

                    await _store.SaveMemoryAsync(new BrainMemory(
                        $"MEM-{item.EventId[..Math.Min(16, item.EventId.Length)]}-{Sanitize(key)}",
                        item.CompanyId,
                        $"{key} = {value}",
                        $"Ingested from bridge event {item.EventId}.",
                        item.DeviceId,
                        observedAt,
                        confidence), cancellationToken);
                }

                await _store.MarkEventProcessedAsync(item.EventId, cancellationToken);
                processed++;
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid event {EventId} left unprocessed", item.EventId);
            }
        }

        return processed;
    }

    private static string Sanitize(string value)
    {
        var chars = value.Where(char.IsLetterOrDigit).Take(32).ToArray();
        return chars.Length == 0 ? "FACT" : new string(chars);
    }
}

public sealed class BrainProcessorWorker : BackgroundService
{
    private readonly BrainProcessor _processor;
    private readonly ILogger<BrainProcessorWorker> _logger;
    private readonly AutonomousCycleService _cycle;

    public BrainProcessorWorker(BrainProcessor processor, ILogger<BrainProcessorWorker> logger, AutonomousCycleService cycle)
    {
        _processor = processor;
        _logger = logger;
        _cycle = cycle;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _processor.ProcessPendingAsync(stoppingToken);
                await _cycle.RunAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Company Brain processing cycle failed");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
