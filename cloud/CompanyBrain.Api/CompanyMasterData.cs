using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace CompanyBrain.Api;

public enum MasterDataEntityKind
{
    Customer,
    Product,
    Service
}

public sealed record CompanyCustomer(
    string CustomerId,
    string CompanyId,
    string CustomerType,
    string Name,
    string? TaxId,
    string? Email,
    string? Phone,
    string? Address,
    string Status,
    string Notes,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CompanyCustomerRequest(
    string CustomerType,
    string Name,
    string? TaxId = null,
    string? Email = null,
    string? Phone = null,
    string? Address = null,
    string Status = "ACTIVE",
    string Notes = "");

public sealed record CompanyCatalogItem(
    string ItemId,
    string CompanyId,
    string Kind,
    string Name,
    string? Sku,
    string? Description,
    string Unit,
    decimal UnitPrice,
    string Currency,
    decimal TaxRate,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CompanyCatalogItemRequest(
    string Kind,
    string Name,
    string? Sku = null,
    string? Description = null,
    string Unit = "UNIT",
    decimal UnitPrice = 0m,
    string Currency = "EUR",
    decimal TaxRate = 0m,
    bool Active = true);

public sealed class CompanyMasterDataStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyMasterDataStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_customers (
                customer_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_type TEXT NOT NULL,
                name TEXT NOT NULL,
                tax_id TEXT,
                email TEXT,
                phone TEXT,
                address TEXT,
                status TEXT NOT NULL,
                notes TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_company_customers_company_name
                ON company_customers(company_id, name);

            CREATE INDEX IF NOT EXISTS ix_company_customers_company_status
                ON company_customers(company_id, status);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_company_customers_company_tax
                ON company_customers(company_id, tax_id)
                WHERE tax_id IS NOT NULL AND tax_id <> '';

            CREATE TABLE IF NOT EXISTS company_catalog_items (
                item_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                name TEXT NOT NULL,
                sku TEXT,
                description TEXT,
                unit TEXT NOT NULL,
                unit_price TEXT NOT NULL,
                currency TEXT NOT NULL,
                tax_rate TEXT NOT NULL,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_company_catalog_company_kind_name
                ON company_catalog_items(company_id, kind, name);

            CREATE INDEX IF NOT EXISTS ix_company_catalog_company_active
                ON company_catalog_items(company_id, active);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_company_catalog_company_kind_sku
                ON company_catalog_items(company_id, kind, sku)
                WHERE sku IS NOT NULL AND sku <> '';
            """;

        command.ExecuteNonQuery();
    }

    public async Task<CompanyCustomer> UpsertCustomerAsync(
        string companyId,
        string? customerId,
        CompanyCustomerRequest input,
        string actor,
        CancellationToken cancellationToken)
    {
        ValidateCustomer(input);
        await _gate.WaitAsync(cancellationToken);

        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var id = string.IsNullOrWhiteSpace(customerId)
                ? $"CUS-{Guid.NewGuid():N}"
                : customerId.Trim();

            var existing = await GetCustomerInternalAsync(connection, companyId, id, cancellationToken);
            var value = new CompanyCustomer(
                id,
                companyId,
                input.CustomerType.Trim().ToUpperInvariant(),
                input.Name.Trim(),
                Normalize(input.TaxId),
                Normalize(input.Email),
                Normalize(input.Phone),
                Normalize(input.Address),
                input.Status.Trim().ToUpperInvariant(),
                input.Notes?.Trim() ?? "",
                existing?.CreatedAt ?? now,
                now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_customers(
                    customer_id, company_id, customer_type, name, tax_id, email, phone,
                    address, status, notes, created_at, updated_at)
                VALUES(
                    $id, $company, $type, $name, $tax, $email, $phone,
                    $address, $status, $notes, $created, $updated)
                ON CONFLICT(customer_id) DO UPDATE SET
                    company_id = excluded.company_id,
                    customer_type = excluded.customer_type,
                    name = excluded.name,
                    tax_id = excluded.tax_id,
                    email = excluded.email,
                    phone = excluded.phone,
                    address = excluded.address,
                    status = excluded.status,
                    notes = excluded.notes,
                    updated_at = excluded.updated_at;
                """;

            Add(command, "$id", value.CustomerId);
            Add(command, "$company", value.CompanyId);
            Add(command, "$type", value.CustomerType);
            Add(command, "$name", value.Name);
            Add(command, "$tax", (object?)value.TaxId ?? DBNull.Value);
            Add(command, "$email", (object?)value.Email ?? DBNull.Value);
            Add(command, "$phone", (object?)value.Phone ?? DBNull.Value);
            Add(command, "$address", (object?)value.Address ?? DBNull.Value);
            Add(command, "$status", value.Status);
            Add(command, "$notes", value.Notes);
            Add(command, "$created", value.CreatedAt.ToString("O"));
            Add(command, "$updated", value.UpdatedAt.ToString("O"));

            await command.ExecuteNonQueryAsync(cancellationToken);
            return value;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CompanyCustomer?> GetCustomerAsync(
        string companyId,
        string customerId,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return await GetCustomerInternalAsync(connection, companyId, customerId, cancellationToken);
    }

    public async Task<IReadOnlyList<CompanyCustomer>> ListCustomersAsync(
        string companyId,
        string? query,
        string? status,
        int limit,
        CancellationToken cancellationToken)
    {
        var items = new List<CompanyCustomer>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT customer_id, company_id, customer_type, name, tax_id, email, phone,
                   address, status, notes, created_at, updated_at
            FROM company_customers
            WHERE company_id = $company
              AND ($status = '' OR status = $status)
              AND (
                    $query = ''
                    OR lower(name) LIKE lower($pattern)
                    OR lower(COALESCE(tax_id, '')) LIKE lower($pattern)
                    OR lower(COALESCE(email, '')) LIKE lower($pattern)
                  )
            ORDER BY name COLLATE NOCASE
            LIMIT $limit;
            """;

        var normalizedQuery = query?.Trim() ?? "";
        var normalizedStatus = status?.Trim().ToUpperInvariant() ?? "";
        Add(command, "$company", companyId);
        Add(command, "$status", normalizedStatus);
        Add(command, "$query", normalizedQuery);
        Add(command, "$pattern", $"%{normalizedQuery}%");
        Add(command, "$limit", Math.Clamp(limit, 1, 500));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            items.Add(ReadCustomer(reader));

        return items;
    }

    public async Task<CompanyCatalogItem> UpsertCatalogItemAsync(
        string companyId,
        string? itemId,
        CompanyCatalogItemRequest input,
        CancellationToken cancellationToken)
    {
        ValidateCatalogItem(input);
        await _gate.WaitAsync(cancellationToken);

        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var now = DateTimeOffset.UtcNow;
            var id = string.IsNullOrWhiteSpace(itemId)
                ? $"{NormalizeKind(input.Kind) switch { "PRODUCT" => "PRD", _ => "SRV" }}-{Guid.NewGuid():N}"
                : itemId.Trim();

            var existing = await GetCatalogItemInternalAsync(connection, companyId, id, cancellationToken);
            var value = new CompanyCatalogItem(
                id,
                companyId,
                NormalizeKind(input.Kind),
                input.Name.Trim(),
                Normalize(input.Sku),
                Normalize(input.Description),
                input.Unit.Trim().ToUpperInvariant(),
                decimal.Round(input.UnitPrice, 2, MidpointRounding.AwayFromZero),
                input.Currency.Trim().ToUpperInvariant(),
                decimal.Round(input.TaxRate, 2, MidpointRounding.AwayFromZero),
                input.Active,
                existing?.CreatedAt ?? now,
                now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_catalog_items(
                    item_id, company_id, kind, name, sku, description, unit,
                    unit_price, currency, tax_rate, active, created_at, updated_at)
                VALUES(
                    $id, $company, $kind, $name, $sku, $description, $unit,
                    $price, $currency, $tax, $active, $created, $updated)
                ON CONFLICT(item_id) DO UPDATE SET
                    company_id = excluded.company_id,
                    kind = excluded.kind,
                    name = excluded.name,
                    sku = excluded.sku,
                    description = excluded.description,
                    unit = excluded.unit,
                    unit_price = excluded.unit_price,
                    currency = excluded.currency,
                    tax_rate = excluded.tax_rate,
                    active = excluded.active,
                    updated_at = excluded.updated_at;
                """;

            Add(command, "$id", value.ItemId);
            Add(command, "$company", value.CompanyId);
            Add(command, "$kind", value.Kind);
            Add(command, "$name", value.Name);
            Add(command, "$sku", (object?)value.Sku ?? DBNull.Value);
            Add(command, "$description", (object?)value.Description ?? DBNull.Value);
            Add(command, "$unit", value.Unit);
            Add(command, "$price", value.UnitPrice.ToString(CultureInfo.InvariantCulture));
            Add(command, "$currency", value.Currency);
            Add(command, "$tax", value.TaxRate.ToString(CultureInfo.InvariantCulture));
            Add(command, "$active", value.Active ? 1 : 0);
            Add(command, "$created", value.CreatedAt.ToString("O"));
            Add(command, "$updated", value.UpdatedAt.ToString("O"));

            await command.ExecuteNonQueryAsync(cancellationToken);
            return value;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<CompanyCatalogItem?> GetCatalogItemAsync(
        string companyId,
        string itemId,
        CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return await GetCatalogItemInternalAsync(connection, companyId, itemId, cancellationToken);
    }

    public async Task<IReadOnlyList<CompanyCatalogItem>> ListCatalogItemsAsync(
        string companyId,
        string? kind,
        string? query,
        bool? active,
        int limit,
        CancellationToken cancellationToken)
    {
        var items = new List<CompanyCatalogItem>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT item_id, company_id, kind, name, sku, description, unit,
                   unit_price, currency, tax_rate, active, created_at, updated_at
            FROM company_catalog_items
            WHERE company_id = $company
              AND ($kind = '' OR kind = $kind)
              AND ($query = '' OR lower(name) LIKE lower($pattern)
                   OR lower(COALESCE(sku, '')) LIKE lower($pattern))
              AND ($active = -1 OR active = $active)
            ORDER BY name COLLATE NOCASE
            LIMIT $limit;
            """;

        var normalizedKind = string.IsNullOrWhiteSpace(kind) ? "" : NormalizeKind(kind);
        var normalizedQuery = query?.Trim() ?? "";
        Add(command, "$company", companyId);
        Add(command, "$kind", normalizedKind);
        Add(command, "$query", normalizedQuery);
        Add(command, "$pattern", $"%{normalizedQuery}%");
        Add(command, "$active", active is null ? -1 : active.Value ? 1 : 0);
        Add(command, "$limit", Math.Clamp(limit, 1, 500));

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            items.Add(ReadCatalogItem(reader));

        return items;
    }

    private static async Task<CompanyCustomer?> GetCustomerInternalAsync(
        SqliteConnection connection,
        string companyId,
        string customerId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT customer_id, company_id, customer_type, name, tax_id, email, phone,
                   address, status, notes, created_at, updated_at
            FROM company_customers
            WHERE company_id = $company AND customer_id = $id
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$id", customerId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadCustomer(reader) : null;
    }

    private static async Task<CompanyCatalogItem?> GetCatalogItemInternalAsync(
        SqliteConnection connection,
        string companyId,
        string itemId,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT item_id, company_id, kind, name, sku, description, unit,
                   unit_price, currency, tax_rate, active, created_at, updated_at
            FROM company_catalog_items
            WHERE company_id = $company AND item_id = $id
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$id", itemId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadCatalogItem(reader) : null;
    }

    private static CompanyCustomer ReadCustomer(SqliteDataReader reader) => new(
        reader.GetString(0),
        reader.GetString(1),
        reader.GetString(2),
        reader.GetString(3),
        reader.IsDBNull(4) ? null : reader.GetString(4),
        reader.IsDBNull(5) ? null : reader.GetString(5),
        reader.IsDBNull(6) ? null : reader.GetString(6),
        reader.IsDBNull(7) ? null : reader.GetString(7),
        reader.GetString(8),
        reader.GetString(9),
        DateTimeOffset.Parse(reader.GetString(10)),
        DateTimeOffset.Parse(reader.GetString(11)));

    private static CompanyCatalogItem ReadCatalogItem(SqliteDataReader reader) => new(
        reader.GetString(0),
        reader.GetString(1),
        reader.GetString(2),
        reader.GetString(3),
        reader.IsDBNull(4) ? null : reader.GetString(4),
        reader.IsDBNull(5) ? null : reader.GetString(5),
        reader.GetString(6),
        decimal.Parse(reader.GetString(7), CultureInfo.InvariantCulture),
        reader.GetString(8),
        decimal.Parse(reader.GetString(9), CultureInfo.InvariantCulture),
        reader.GetInt32(10) == 1,
        DateTimeOffset.Parse(reader.GetString(11)),
        DateTimeOffset.Parse(reader.GetString(12)));

    private static string NormalizeKind(string value)
    {
        var kind = value.Trim().ToUpperInvariant();
        return kind switch
        {
            "PRODUCT" => "PRODUCT",
            "SERVICE" => "SERVICE",
            _ => throw new ArgumentException("Kind must be PRODUCT or SERVICE.")
        };
    }

    private static void ValidateCustomer(CompanyCustomerRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            throw new ArgumentException("Customer name is required.");

        if (input.Name.Trim().Length > 200)
            throw new ArgumentException("Customer name is too long.");

        var type = input.CustomerType.Trim().ToUpperInvariant();
        if (type is not ("INDIVIDUAL" or "BUSINESS"))
            throw new ArgumentException("CustomerType must be INDIVIDUAL or BUSINESS.");

        var status = input.Status.Trim().ToUpperInvariant();
        if (status is not ("ACTIVE" or "INACTIVE" or "BLOCKED"))
            throw new ArgumentException("Status must be ACTIVE, INACTIVE or BLOCKED.");

        if (input.Email?.Length > 320)
            throw new ArgumentException("Email is too long.");

        if (input.Notes?.Length > 5000)
            throw new ArgumentException("Notes are too long.");
    }

    private static void ValidateCatalogItem(CompanyCatalogItemRequest input)
    {
        NormalizeKind(input.Kind);

        if (string.IsNullOrWhiteSpace(input.Name))
            throw new ArgumentException("Product/service name is required.");

        if (input.Name.Trim().Length > 200)
            throw new ArgumentException("Product/service name is too long.");

        if (input.UnitPrice < 0)
            throw new ArgumentException("UnitPrice cannot be negative.");

        if (input.TaxRate < 0 || input.TaxRate > 100)
            throw new ArgumentException("TaxRate must be between 0 and 100.");

        if (string.IsNullOrWhiteSpace(input.Currency) || input.Currency.Trim().Length != 3)
            throw new ArgumentException("Currency must be a 3-letter code.");
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Add(SqliteCommand command, string name, object value)
        => command.Parameters.AddWithValue(name, value);
}

public static class CompanyMasterDataApi
{
    public static void MapCompanyMasterDataApi(this WebApplication app)
    {
        app.MapPut(
            "/api/company/v1/companies/{companyId}/customers/{customerId}",
            async (
                HttpRequest request,
                string companyId,
                string customerId,
                CompanyCustomerRequest input,
                CompanyMasterDataStore store,
                CompanyDataStore brain,
                CloudStore audit,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(customerId))
                    return Results.Unauthorized();

                try
                {
                    var customer = await store.UpsertCustomerAsync(
                        companyId, customerId, input, Actor(request), cancellationToken);

                    await brain.AddFactAsync(
                        companyId,
                        new BusinessFactInput(
                            "ERP:CUSTOMER",
                            "STRUCTURED_ENTITY",
                            $"Customer '{customer.Name}' is {customer.Status.ToLowerInvariant()} in the company master data.",
                            JsonSerializer.Serialize(new
                            {
                                entityKind = "CUSTOMER",
                                customer.CustomerId,
                                customer.Name,
                                customer.CustomerType,
                                customer.Status
                            }),
                            1.0),
                        cancellationToken);

                    await audit.AppendAuditJournalAsync(
                        companyId,
                        "CUSTOMER_UPSERTED",
                        Actor(request),
                        Correlation(request),
                        "CUSTOMER",
                        customer.CustomerId,
                        "Customer master data created or updated.",
                        JsonSerializer.Serialize(new { customer.Name, customer.Status }),
                        cancellationToken);

                    return Results.Ok(new { customer });
                }
                catch (ArgumentException exception)
                {
                    return Results.BadRequest(new { error = exception.Message });
                }
                catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
                {
                    return Results.Conflict(new { error = "A customer with the same tax identifier already exists for this company." });
                }
            });

        app.MapPost(
            "/api/company/v1/companies/{companyId}/customers",
            async (
                HttpRequest request,
                string companyId,
                CompanyCustomerRequest input,
                CompanyMasterDataStore store,
                CompanyDataStore brain,
                CloudStore audit,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId))
                    return Results.Unauthorized();

                try
                {
                    var customer = await store.UpsertCustomerAsync(
                        companyId, null, input, Actor(request), cancellationToken);

                    await brain.AddFactAsync(
                        companyId,
                        new BusinessFactInput(
                            "ERP:CUSTOMER",
                            "STRUCTURED_ENTITY",
                            $"Customer '{customer.Name}' was added to the company master data.",
                            JsonSerializer.Serialize(new
                            {
                                entityKind = "CUSTOMER",
                                customer.CustomerId,
                                customer.Name,
                                customer.CustomerType,
                                customer.Status
                            }),
                            1.0),
                        cancellationToken);

                    await audit.AppendAuditJournalAsync(
                        companyId,
                        "CUSTOMER_CREATED",
                        Actor(request),
                        Correlation(request),
                        "CUSTOMER",
                        customer.CustomerId,
                        "Customer master data created.",
                        JsonSerializer.Serialize(new { customer.Name, customer.Status }),
                        cancellationToken);

                    return Results.Created(
                        $"/api/company/v1/companies/{companyId}/customers/{customer.CustomerId}",
                        new { customer });
                }
                catch (ArgumentException exception)
                {
                    return Results.BadRequest(new { error = exception.Message });
                }
                catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
                {
                    return Results.Conflict(new { error = "A customer with the same tax identifier already exists for this company." });
                }
            });

        app.MapGet(
            "/api/company/v1/companies/{companyId}/customers",
            async (
                HttpRequest request,
                string companyId,
                string? q,
                string? status,
                int? limit,
                CompanyMasterDataStore store,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId))
                    return Results.Unauthorized();

                var customers = await store.ListCustomersAsync(
                    companyId, q, status, limit ?? 100, cancellationToken);

                return Results.Ok(new { customers, count = customers.Count });
            });

        app.MapGet(
            "/api/company/v1/companies/{companyId}/customers/{customerId}",
            async (
                HttpRequest request,
                string companyId,
                string customerId,
                CompanyMasterDataStore store,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(customerId))
                    return Results.Unauthorized();

                var customer = await store.GetCustomerAsync(companyId, customerId, cancellationToken);
                return customer is null ? Results.NotFound() : Results.Ok(new { customer });
            });

        app.MapPost(
            "/api/company/v1/companies/{companyId}/catalog-items",
            async (
                HttpRequest request,
                string companyId,
                CompanyCatalogItemRequest input,
                CompanyMasterDataStore store,
                CloudStore audit,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId))
                    return Results.Unauthorized();

                try
                {
                    var item = await store.UpsertCatalogItemAsync(
                        companyId, null, input, cancellationToken);

                    await audit.AppendAuditJournalAsync(
                        companyId,
                        $"{item.Kind}_CREATED",
                        Actor(request),
                        Correlation(request),
                        item.Kind,
                        item.ItemId,
                        $"{item.Kind.ToLowerInvariant()} master data created.",
                        JsonSerializer.Serialize(new { item.Name, item.Sku, item.UnitPrice, item.Currency, item.TaxRate }),
                        cancellationToken);

                    return Results.Created(
                        $"/api/company/v1/companies/{companyId}/catalog-items/{item.ItemId}",
                        new { item });
                }
                catch (ArgumentException exception)
                {
                    return Results.BadRequest(new { error = exception.Message });
                }
                catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
                {
                    return Results.Conflict(new { error = "A product/service with the same SKU already exists for this company." });
                }
            });

        app.MapPut(
            "/api/company/v1/companies/{companyId}/catalog-items/{itemId}",
            async (
                HttpRequest request,
                string companyId,
                string itemId,
                CompanyCatalogItemRequest input,
                CompanyMasterDataStore store,
                CloudStore audit,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(itemId))
                    return Results.Unauthorized();

                try
                {
                    var item = await store.UpsertCatalogItemAsync(
                        companyId, itemId, input, cancellationToken);

                    await audit.AppendAuditJournalAsync(
                        companyId,
                        $"{item.Kind}_UPSERTED",
                        Actor(request),
                        Correlation(request),
                        item.Kind,
                        item.ItemId,
                        $"{item.Kind.ToLowerInvariant()} master data created or updated.",
                        JsonSerializer.Serialize(new { item.Name, item.Sku, item.UnitPrice, item.Currency, item.TaxRate, item.Active }),
                        cancellationToken);

                    return Results.Ok(new { item });
                }
                catch (ArgumentException exception)
                {
                    return Results.BadRequest(new { error = exception.Message });
                }
                catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
                {
                    return Results.Conflict(new { error = "A product/service with the same SKU already exists for this company." });
                }
            });

        app.MapGet(
            "/api/company/v1/companies/{companyId}/catalog-items",
            async (
                HttpRequest request,
                string companyId,
                string? kind,
                string? q,
                bool? active,
                int? limit,
                CompanyMasterDataStore store,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId))
                    return Results.Unauthorized();

                try
                {
                    var items = await store.ListCatalogItemsAsync(
                        companyId, kind, q, active, limit ?? 100, cancellationToken);

                    return Results.Ok(new { items, count = items.Count });
                }
                catch (ArgumentException exception)
                {
                    return Results.BadRequest(new { error = exception.Message });
                }
            });

        app.MapGet(
            "/api/company/v1/companies/{companyId}/catalog-items/{itemId}",
            async (
                HttpRequest request,
                string companyId,
                string itemId,
                CompanyMasterDataStore store,
                IConfiguration configuration,
                CancellationToken cancellationToken) =>
            {
                if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(itemId))
                    return Results.Unauthorized();

                var item = await store.GetCatalogItemAsync(companyId, itemId, cancellationToken);
                return item is null ? Results.NotFound() : Results.Ok(new { item });
            });
    }

    private static bool Authorized(HttpRequest request, IConfiguration configuration)
    {
        var configured = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();

        return !string.IsNullOrWhiteSpace(configured)
            && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(configured),
                System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool Safe(string? value)
        => !string.IsNullOrWhiteSpace(value)
           && value.Length <= 100
           && value.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.');

    private static string Actor(HttpRequest request)
    {
        var actor = request.Headers["X-Brain-Actor"].ToString();
        return string.IsNullOrWhiteSpace(actor) || actor.Length > 100
            ? "company-admin"
            : actor;
    }

    private static string Correlation(HttpRequest request)
        => request.Headers["X-Correlation-Id"].ToString();
}
