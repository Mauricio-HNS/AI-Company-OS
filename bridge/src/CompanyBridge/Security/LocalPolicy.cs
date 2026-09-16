using Microsoft.Extensions.Options;

namespace CompanyBridge.Security;

public sealed class LocalPolicy
{
    private readonly HashSet<string> _authorizedConnectors;

    public LocalPolicy(IOptions<BridgeOptions> options)
    {
        _authorizedConnectors = options.Value.AuthorizedConnectors.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public bool IsConnectorAuthorized(string connectorId) => _authorizedConnectors.Contains(connectorId);

    public static IReadOnlyDictionary<string, object?> Minimize(IReadOnlyDictionary<string, object?> payload, IEnumerable<string> allowedFields)
    {
        var allowed = allowedFields.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return payload.Where(x => allowed.Contains(x.Key))
            .ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase);
    }
}
