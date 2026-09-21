using Microsoft.Data.Sqlite;

namespace CompanyBrain.Api;

public sealed class CompanyDataStore
{
    private readonly string _connectionString;

    public CompanyDataStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_profiles (
                company_id TEXT PRIMARY KEY,
                legal_name TEXT NOT NULL,
                tax_id TEXT NOT NULL,
                business_type TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                postal_code TEXT NOT NULL,
                country TEXT NOT NULL,
                primary_contact TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS company_business_facts (
                fact_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                source TEXT NOT NULL,
                source_type TEXT NOT NULL,
                statement TEXT NOT NULL,
                context TEXT NOT NULL,
                confidence REAL NOT NULL,
                observed_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_company_business_facts_company_time
                ON company_business_facts(company_id, observed_at);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CompanyProfile?> GetProfileAsync(string companyId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT company_id, legal_name, tax_id, business_type, address, city,
                   postal_code, country, primary_contact, email, phone, created_at, updated_at
            FROM company_profiles WHERE company_id = $company LIMIT 1;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return ReadProfile(reader);
    }

    public async Task<CompanyProfile> UpsertProfileAsync(string companyId, CompanyProfileInput input, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO company_profiles(
                company_id, legal_name, tax_id, business_type, address, city, postal_code,
                country, primary_contact, email, phone, created_at, updated_at)
            VALUES(
                $company, $legal, $tax, $type, $address, $city, $postal, $country,
                $contact, $email, $phone, $created, $updated)
            ON CONFLICT(company_id) DO UPDATE SET
                legal_name = excluded.legal_name,
                tax_id = excluded.tax_id,
                business_type = excluded.business_type,
                address = excluded.address,
                city = excluded.city,
                postal_code = excluded.postal_code,
                country = excluded.country,
                primary_contact = excluded.primary_contact,
                email = excluded.email,
                phone = excluded.phone,
                updated_at = excluded.updated_at;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$legal", input.LegalName.Trim());
        command.Parameters.AddWithValue("$tax", input.TaxId.Trim());
        command.Parameters.AddWithValue("$type", input.BusinessType.Trim());
        command.Parameters.AddWithValue("$address", input.Address.Trim());
        command.Parameters.AddWithValue("$city", input.City.Trim());
        command.Parameters.AddWithValue("$postal", input.PostalCode.Trim());
        command.Parameters.AddWithValue("$country", input.Country.Trim());
        command.Parameters.AddWithValue("$contact", input.PrimaryContact.Trim());
        command.Parameters.AddWithValue("$email", input.Email.Trim());
        command.Parameters.AddWithValue("$phone", input.Phone.Trim());
        command.Parameters.AddWithValue("$created", now.ToString("O"));
        command.Parameters.AddWithValue("$updated", now.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
        return (await GetProfileAsync(companyId, cancellationToken))!;
    }

    public async Task<BusinessFact> AddFactAsync(string companyId, BusinessFactInput input, CancellationToken cancellationToken)
    {
        var fact = new BusinessFact(
            Guid.NewGuid().ToString("N"),
            companyId,
            input.Source.Trim(),
            input.SourceType.Trim().ToUpperInvariant(),
            input.Statement.Trim(),
            input.Context.Trim(),
            Math.Clamp(input.Confidence, 0, 1),
            DateTimeOffset.UtcNow);

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO company_business_facts(
                fact_id, company_id, source, source_type, statement, context, confidence, observed_at)
            VALUES($id, $company, $source, $type, $statement, $context, $confidence, $observed);
            """;
        command.Parameters.AddWithValue("$id", fact.FactId);
        command.Parameters.AddWithValue("$company", fact.CompanyId);
        command.Parameters.AddWithValue("$source", fact.Source);
        command.Parameters.AddWithValue("$type", fact.SourceType);
        command.Parameters.AddWithValue("$statement", fact.Statement);
        command.Parameters.AddWithValue("$context", fact.Context);
        command.Parameters.AddWithValue("$confidence", fact.Confidence);
        command.Parameters.AddWithValue("$observed", fact.ObservedAt.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
        return fact;
    }

    public async Task<IReadOnlyList<BusinessFact>> GetFactsAsync(string companyId, int limit, CancellationToken cancellationToken)
    {
        var items = new List<BusinessFact>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT fact_id, company_id, source, source_type, statement, context, confidence, observed_at
            FROM company_business_facts
            WHERE company_id = $company
            ORDER BY observed_at DESC
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 500));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new BusinessFact(
                reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
                reader.GetString(4), reader.GetString(5), reader.GetDouble(6),
                DateTimeOffset.Parse(reader.GetString(7))));
        }
        return items;
    }

    private static CompanyProfile ReadProfile(SqliteDataReader reader) => new(
        reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
        reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7),
        reader.GetString(8), reader.GetString(9), reader.GetString(10),
        DateTimeOffset.Parse(reader.GetString(11)), DateTimeOffset.Parse(reader.GetString(12)));
}

public sealed record CompanyProfileInput(
    string LegalName,
    string TaxId,
    string BusinessType,
    string Address,
    string City,
    string PostalCode,
    string Country,
    string PrimaryContact,
    string Email,
    string Phone);
