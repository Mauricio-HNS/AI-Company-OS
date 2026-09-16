using CompanyBridge.Security;
using CompanyBridge.Sync;
using Microsoft.Extensions.Options;

namespace CompanyBridge.Connectors;

public enum ConnectorSourceKind
{
    Api,
    Database,
    File,
    Application,
    Device,
    Manual,
    Other
}

public sealed record ConnectorDescriptor(
    string Id,
    string Name,
    ConnectorSourceKind SourceKind,
    IReadOnlyCollection<string> Capabilities,
    IReadOnlyCollection<string> DataClasses,
    IReadOnlyCollection<string> RequestedPermissions,
    bool ReadOnly,
    bool Enabled);

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
            _logger.LogInformation(
                "Authorized connector {Connector}: {SourceKind} / {Capabilities}",
                descriptor.Name,
                descriptor.SourceKind,
                string.Join(", ", descriptor.Capabilities));

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
                    sourceKind = descriptor.SourceKind.ToString(),
                    capabilities = descriptor.Capabilities,
                    dataClasses = descriptor.DataClasses,
                    readOnly = descriptor.ReadOnly,
                    facts
                }));
        }
    }
}
