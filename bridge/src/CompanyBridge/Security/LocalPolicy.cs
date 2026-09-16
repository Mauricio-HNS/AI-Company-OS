namespace CompanyBridge.Security;

public sealed class LocalPolicy
{
    private readonly HashSet<string> _authorizedConnectors = new(StringComparer.OrdinalIgnoreCase);

    public LocalPolicy()
    {
        // Production enrollment will populate this from an explicit company configuration.
        // No connector is authorized by default.
    }

    public bool IsConnectorAuthorized(string connectorId) => _authorizedConnectors.Contains(connectorId);

    public void AuthorizeConnector(string connectorId) => _authorizedConnectors.Add(connectorId);

    public static IReadOnlyDictionary<string, object?> Minimize(IReadOnlyDictionary<string, object?> payload, IEnumerable<string> allowedFields)
    {
        var allowed = allowedFields.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return payload.Where(x => allowed.Contains(x.Key))
            .ToDictionary(x => x.Key, x => x.Value, StringComparer.OrdinalIgnoreCase);
    }
}
