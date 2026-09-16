using Microsoft.Data.Sqlite;
using CompanyBridge.Security;

namespace CompanyBridge.Connectors;

public sealed class SqliteConnector : ICompanyConnector
{
    public string Id => "sqlite-readonly";
    private readonly string _databasePath;
    private readonly IReadOnlySet<string> _allowedTables;

    public SqliteConnector(string databasePath, IEnumerable<string> allowedTables)
    {
        _databasePath = databasePath;
        _allowedTables = allowedTables.ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public Task<ConnectorDescriptor> DescribeAsync(CancellationToken cancellationToken) =>
        Task.FromResult(new ConnectorDescriptor(Id, "SQLite local database", "read-only tabular business data", true, true));

    public async Task<IReadOnlyCollection<BusinessFact>> DiscoverAsync(CancellationToken cancellationToken)
    {
        if (!File.Exists(_databasePath))
            return Array.Empty<BusinessFact>();

        var facts = new List<BusinessFact>();
        await using var connection = new SqliteConnection($"Data Source={_databasePath};Mode=ReadOnly");
        await connection.OpenAsync(cancellationToken);

        foreach (var table in _allowedTables)
        {
            if (!IsSafeIdentifier(table))
                continue;

            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT * FROM [{table}] LIMIT 100";
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var raw = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                for (var i = 0; i < reader.FieldCount; i++)
                    raw[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);

                var minimized = LocalPolicy.Minimize(raw, raw.Keys.Where(IsBusinessField));
                facts.Add(new BusinessFact("DISCOVERED_RECORD", table, DateTimeOffset.UtcNow, Id, 0.8, minimized, new[] { table }));
            }
        }

        return facts;
    }

    private static bool IsSafeIdentifier(string value) => value.Length > 0 && value.All(c => char.IsLetterOrDigit(c) || c == '_');

    private static bool IsBusinessField(string field) =>
        field.Contains("date", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("data", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("product", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("produto", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("quantity", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("quantidade", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("price", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("preco", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("valor", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("stock", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("estoque", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("service", StringComparison.OrdinalIgnoreCase) ||
        field.Contains("servico", StringComparison.OrdinalIgnoreCase);
}
