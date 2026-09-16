using CompanyBridge.Security;
using CompanyBridge.Sync;
using Microsoft.Extensions.Options;

namespace CompanyBridge.Connectors;

public sealed record ConnectorDescriptor(string Id, string Name, string Capability, bool ReadOnly, bool Enabled);

public interface ICompanyConnector
{
    string Id { get; }
    Task<ConnectorDescriptor> DescribeAsync(CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BusinessFact>> DiscoverAsync(CancellationToken cancellationToken);
}

public sealed record BusinessFact(
    string Type,
    string Entity,
    DateTimeOffset OccurredAt,
    string Source,
    double Confidence,
    IReadOnlyDictionary<string, object?> Payload,
    IReadOnlyCollection<string> Evidence);

public sealed class ConnectorRegistry
{
    private readonly IEnumerable<ICompanyConnector> _connectors;
    private readonly LocalPolicy _policy;
    private readonly OutboxStore _outbox;
    private readonly BridgeOptions _options;
    private readonly ILogger<ConnectorRegistry> _logger;

    public ConnectorRegistry(IEnumerable<ICompanyConnector> connectors, LocalPolicy policy, OutboxStore outbox, IOptions<BridgeOptions> options, ILogger<ConnectorRegistry> logger)
    {
        _connectors = connectors;
        _policy = policy;
        _outbox = outbox;
        _options = options.Value;
        _logger = logger;
    }

    public async Task DiscoverAuthorizedSourcesAsync(CancellationToken cancellationToken)
    {
        foreach (var connector in _connectors)
        {
            if (!_policy.IsConnectorAuthorized(connector.Id))
                continue;

            var descriptor = await connector.DescribeAsync(cancellationToken);
            _logger.LogInformation("Authorized connector {Connector}: {Capability}", descriptor.Name, descriptor.Capability);

            if (!descriptor.Enabled)
                continue;

            var facts = await connector.DiscoverAsync(cancellationToken);
            if (facts.Count == 0)
                continue;

            _outbox.Enqueue(new SyncEnvelope(
                _options.CompanyId,
                DateTimeOffset.UtcNow,
                "BUSINESS_FACTS",
                new
                {
                    connector = descriptor.Id,
                    readOnly = descriptor.ReadOnly,
                    facts
                }));
        }
    }
}
