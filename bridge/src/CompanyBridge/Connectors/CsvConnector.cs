using CompanyBridge.Security;

namespace CompanyBridge.Connectors;

public sealed class CsvConnector : ICompanyConnector
{
    public string Id => "csv-readonly";
    private readonly string _filePath;
    private readonly IReadOnlySet<string> _allowedFields;

    public CsvConnector(string filePath, IEnumerable<string> allowedFields)
    {
        _filePath = filePath;
        _allowedFields = allowedFields.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public Task<ConnectorDescriptor> DescribeAsync(CancellationToken cancellationToken) =>
        Task.FromResult(new ConnectorDescriptor(Id, "Local CSV export", "read-only tabular export", true, true));

    public async Task<IReadOnlyCollection<BusinessFact>> DiscoverAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_filePath))
            return Array.Empty<BusinessFact>();

        using var reader = new StreamReader(_filePath);
        var headerLine = await reader.ReadLineAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(headerLine))
            return Array.Empty<BusinessFact>();

        var headers = headerLine.Split(';', ',', StringSplitOptions.TrimEntries);
        var facts = new List<BusinessFact>();
        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) is not null)
        {
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var values = line.Split(';', ',', StringSplitOptions.TrimEntries);
            var raw = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < Math.Min(headers.Length, values.Length); i++)
                raw[headers[i]] = values[i];

            var minimized = LocalPolicy.Minimize(raw, _allowedFields);
            if (minimized.Count == 0)
                continue;

            facts.Add(new BusinessFact("CSV_RECORD", Path.GetFileName(_filePath), DateTimeOffset.UtcNow, Id, 0.75, minimized, new[] { Path.GetFileName(_filePath) }));
        }

        return facts;
    }
}
