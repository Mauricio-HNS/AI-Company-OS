using System.Text.Json;
using Microsoft.Extensions.Options;

namespace CompanyBridge.Sync;

public sealed record SyncEnvelope(string CompanyId, DateTimeOffset CreatedAt, string Kind, object Payload);

public sealed class OutboxStore
{
    private readonly string _path;
    private readonly object _gate = new();

    public OutboxStore(IOptions<BridgeOptions> options)
    {
        Directory.CreateDirectory(options.Value.DataDirectory);
        _path = Path.Combine(options.Value.DataDirectory, "outbox.ndjson");
    }

    public void Enqueue(SyncEnvelope envelope)
    {
        lock (_gate)
        {
            File.AppendAllText(_path, JsonSerializer.Serialize(envelope) + Environment.NewLine);
        }
    }

    public IReadOnlyList<string> ReadPending()
    {
        lock (_gate)
        {
            return File.Exists(_path)
                ? File.ReadAllLines(_path).Where(x => !string.IsNullOrWhiteSpace(x)).ToArray()
                : Array.Empty<string>();
        }
    }

    public void ReplacePending(IEnumerable<string> pending)
    {
        lock (_gate)
        {
            File.WriteAllLines(_path, pending);
        }
    }
}
