using Microsoft.Data.Sqlite;

namespace CompanyBrain.Api;

public sealed class CompanyOutputStore
{
    private readonly string _connectionString;

    public CompanyOutputStore(IConfiguration configuration)
    {
        var configured = configuration["CloudStore:ConnectionString"];
        if (string.IsNullOrWhiteSpace(configured))
        {
            var directory = configuration["CloudStore:DataDirectory"]
                ?? Path.Combine(AppContext.BaseDirectory, "data", "company-brain");
            Directory.CreateDirectory(directory);
            configured = $"Data Source={Path.Combine(directory, "company-brain.db")}";
        }

        _connectionString = configured;
        Initialize();
    }

    private void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS company_outputs (
                output_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                output_type TEXT NOT NULL,
                title TEXT NOT NULL,
                format TEXT NOT NULL,
                content TEXT NOT NULL,
                source_summary TEXT NOT NULL,
                version INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_company_outputs_company_time
                ON company_outputs(company_id, created_at);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CompanyOutput> SaveAsync(
        string companyId,
        string outputType,
        string title,
        string format,
        string content,
        string sourceSummary,
        string createdBy,
        CancellationToken cancellationToken)
    {
        var output = new CompanyOutput(
            Guid.NewGuid().ToString("N"),
            companyId,
            outputType.Trim().ToUpperInvariant(),
            title.Trim(),
            format.Trim().ToUpperInvariant(),
            content,
            sourceSummary,
            await GetNextVersionAsync(companyId, outputType, title, cancellationToken),
            DateTimeOffset.UtcNow,
            createdBy);

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO company_outputs(
                output_id, company_id, output_type, title, format, content,
                source_summary, version, created_at, created_by)
            VALUES(
                $id, $company, $type, $title, $format, $content,
                $sources, $version, $created, $createdBy);
            """;

        command.Parameters.AddWithValue("$id", output.OutputId);
        command.Parameters.AddWithValue("$company", output.CompanyId);
        command.Parameters.AddWithValue("$type", output.OutputType);
        command.Parameters.AddWithValue("$title", output.Title);
        command.Parameters.AddWithValue("$format", output.Format);
        command.Parameters.AddWithValue("$content", output.Content);
        command.Parameters.AddWithValue("$sources", output.SourceSummary);
        command.Parameters.AddWithValue("$version", output.Version);
        command.Parameters.AddWithValue("$created", output.CreatedAt.ToString("O"));
        command.Parameters.AddWithValue("$createdBy", output.CreatedBy);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return output;
    }

    public async Task<IReadOnlyList<CompanyOutput>> GetAsync(
        string companyId,
        int limit,
        CancellationToken cancellationToken)
    {
        var outputs = new List<CompanyOutput>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT output_id, company_id, output_type, title, format, content,
                   source_summary, version, created_at, created_by
            FROM company_outputs
            WHERE company_id = $company
            ORDER BY created_at DESC
            LIMIT $limit;
            """;

        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 200));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            outputs.Add(new CompanyOutput(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetInt32(7),
                DateTimeOffset.Parse(reader.GetString(8)),
                reader.GetString(9)));
        }

        return outputs;
    }

    private async Task<int> GetNextVersionAsync(
        string companyId,
        string outputType,
        string title,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COALESCE(MAX(version), 0) + 1
            FROM company_outputs
            WHERE company_id = $company
              AND output_type = $type
              AND title = $title;
            """;

        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$type", outputType.Trim().ToUpperInvariant());
        command.Parameters.AddWithValue("$title", title.Trim());

        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }
}
