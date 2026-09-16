using CompanyBridge.Security;

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
    private readonly ILogger<ConnectorRegistry> _logger;

    public ConnectorRegistry(LocalPolicy policy, ILogger<ConnectorRegistry> logger)
    {
        _policy = policy;
        _logger = logger;
        _connectors = Array.Empty<ICompanyConnector>();
    }

    public async Task DiscoverAuthorizedSourcesAsync(CancellationToken cancellationToken)
    {
        foreach (var connector in _connectors)
        {
            if (!_policy.IsConnectorAuthorized(connector.Id))
                continue;

            var descriptor = await connector.DescribeAsync(cancellationToken);
            _logger.LogInformation("Authorized connector {Connector}: {Capability}", descriptor.Name, descriptor.Capability);
        }
    }
}
