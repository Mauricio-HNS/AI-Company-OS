using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record FiscalEntryInput(
    string EntryId,
    string Kind,
    string InvoiceNumber,
    decimal NetAmount,
    decimal TaxAmount,
    decimal GrossAmount,
    string Currency,
    DateTimeOffset IssuedAt,
    string Counterparty,
    string? TaxCode = null);

public sealed record FiscalEntry(
    string EntryId,
    string CompanyId,
    string Kind,
    string InvoiceNumber,
    decimal NetAmount,
    decimal TaxAmount,
    decimal GrossAmount,
    string Currency,
    DateTimeOffset IssuedAt,
    string Counterparty,
    string? TaxCode);

public sealed record FiscalClose(
    string CloseId,
    string CompanyId,
    string Period,
    decimal RevenueNet,
    decimal ExpenseNet,
    decimal OutputTax,
    decimal InputTax,
    decimal NetTax,
    decimal DeclaredTax,
    decimal TaxDifference,
    int EntryCount,
    int InconsistencyCount,
    string Status,
    string[] Alerts,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed record FiscalCloseRequest(
    string Period,
    decimal DeclaredTax,
    decimal Tolerance = 0.01m);

public sealed class FiscalBrainStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public FiscalBrainStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS fiscal_entries (
                entry_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                kind TEXT NOT NULL,
                invoice_number TEXT NOT NULL,
                net_amount TEXT NOT NULL,
                tax_amount TEXT NOT NULL,
                gross_amount TEXT NOT NULL,
                currency TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                counterparty TEXT NOT NULL,
                tax_code TEXT,
                PRIMARY KEY(company_id, entry_id)
            );
            CREATE INDEX IF NOT EXISTS ix_fiscal_entries_company_date
                ON fiscal_entries(company_id, issued_at);

            CREATE TABLE IF NOT EXISTS fiscal_closes (
                close_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                period TEXT NOT NULL,
                revenue_net TEXT NOT NULL,
                expense_net TEXT NOT NULL,
                output_tax TEXT NOT NULL,
                input_tax TEXT NOT NULL,
                net_tax TEXT NOT NULL,
                declared_tax TEXT NOT NULL,
                tax_difference TEXT NOT NULL,
                entry_count INTEGER NOT NULL,
                inconsistency_count INTEGER NOT NULL,
                status TEXT NOT NULL,
                alerts TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_fiscal_closes_company_period
                ON fiscal_closes(company_id, period, created_at);
            """;
        command.ExecuteNonQuery();
    }

    public async Task UpsertEntryAsync(string companyId, FiscalEntryInput input, CancellationToken cancellationToken)
    {
        ValidateEntry(input);
        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO fiscal_entries(
                    entry_id, company_id, kind, invoice_number, net_amount, tax_amount,
                    gross_amount, currency, issued_at, counterparty, tax_code)
                VALUES($id, $company, $kind, $invoice, $net, $tax, $gross,
                       $currency, $issued, $counterparty, $taxCode)
                ON CONFLICT(company_id, entry_id) DO UPDATE SET
                    kind=excluded.kind,
                    invoice_number=excluded.invoice_number,
                    net_amount=excluded.net_amount,
                    tax_amount=excluded.tax_amount,
                    gross_amount=excluded.gross_amount,
                    currency=excluded.currency,
                    issued_at=excluded.issued_at,
                    counterparty=excluded.counterparty,
                    tax_code=excluded.tax_code;
                """;
            command.Parameters.AddWithValue("$id", input.EntryId.Trim());
            command.Parameters.AddWithValue("$company", companyId);
            command.Parameters.AddWithValue("$kind", input.Kind.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("$invoice", input.InvoiceNumber.Trim());
            command.Parameters.AddWithValue("$net", input.NetAmount.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$tax", input.TaxAmount.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$gross", input.GrossAmount.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$currency", input.Currency.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("$issued", input.IssuedAt.ToString("O"));
            command.Parameters.AddWithValue("$counterparty", input.Counterparty.Trim());
            command.Parameters.AddWithValue("$taxCode", (object?)input.TaxCode ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<FiscalEntry>> GetEntriesAsync(
        string companyId, DateTimeOffset from, DateTimeOffset to, CancellationToken cancellationToken)
    {
        var items = new List<FiscalEntry>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT entry_id, company_id, kind, invoice_number, net_amount, tax_amount,
                   gross_amount, currency, issued_at, counterparty, tax_code
            FROM fiscal_entries
            WHERE company_id = $company
              AND issued_at >= $from
              AND issued_at < $to
            ORDER BY issued_at, entry_id;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$from", from.ToString("O"));
        command.Parameters.AddWithValue("$to", to.ToString("O"));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new FiscalEntry(
                reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
                ParseDecimal(reader.GetString(4)), ParseDecimal(reader.GetString(5)),
                ParseDecimal(reader.GetString(6)), reader.GetString(7),
                DateTimeOffset.Parse(reader.GetString(8)), reader.GetString(9),
                reader.IsDBNull(10) ? null : reader.GetString(10)));
        }
        return items;
    }

    public async Task<FiscalClose> ClosePeriodAsync(
        string companyId, FiscalCloseRequest request, string createdBy, CancellationToken cancellationToken)
    {
        if (!IsPeriod(request.Period) || request.DeclaredTax < 0 || request.Tolerance < 0)
            throw new ArgumentException("Invalid fiscal close request.");

        var start = DateTimeOffset.ParseExact(request.Period + "-01T00:00:00+00:00", "yyyy-MM-dd'T'HH:mm:sszzz", CultureInfo.InvariantCulture);
        var end = start.AddMonths(1);
        var entries = await GetEntriesAsync(companyId, start, end, cancellationToken);

        var alerts = new List<string>();
        foreach (var entry in entries)
        {
            if (entry.GrossAmount != entry.NetAmount + entry.TaxAmount)
                alerts.Add($"ENTRY_TOTAL_MISMATCH:{entry.EntryId}");

            if (entry.NetAmount < 0 || entry.TaxAmount < 0 || entry.GrossAmount < 0)
                alerts.Add($"NEGATIVE_AMOUNT:{entry.EntryId}");

            if (!string.Equals(entry.Currency, "EUR", StringComparison.OrdinalIgnoreCase))
                alerts.Add($"NON_EUR_CURRENCY:{entry.EntryId}");
        }

        var revenue = entries.Where(x => x.Kind == "REVENUE").Sum(x => x.NetAmount);
        var expenses = entries.Where(x => x.Kind == "EXPENSE").Sum(x => x.NetAmount);
        var outputTax = entries.Where(x => x.Kind == "REVENUE").Sum(x => x.TaxAmount);
        var inputTax = entries.Where(x => x.Kind == "EXPENSE").Sum(x => x.TaxAmount);
        var netTax = outputTax - inputTax;
        var difference = netTax - request.DeclaredTax;

        if (Math.Abs(difference) > request.Tolerance)
            alerts.Add($"DECLARED_TAX_MISMATCH:{difference.ToString("0.00", CultureInfo.InvariantCulture)}");

        if (entries.Count == 0)
            alerts.Add("NO_ENTRIES_FOR_PERIOD");

        var status = alerts.Count == 0 ? "READY_FOR_HUMAN_APPROVAL" : "BLOCKED_INCONSISTENCIES";
        var close = new FiscalClose(
            $"FISCAL-{Guid.NewGuid():N}",
            companyId,
            request.Period,
            revenue,
            expenses,
            outputTax,
            inputTax,
            netTax,
            request.DeclaredTax,
            difference,
            entries.Count,
            alerts.Count,
            status,
            alerts.ToArray(),
            DateTimeOffset.UtcNow,
            string.IsNullOrWhiteSpace(createdBy) ? "company-brain" : createdBy);

        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO fiscal_closes(
                    close_id, company_id, period, revenue_net, expense_net, output_tax,
                    input_tax, net_tax, declared_tax, tax_difference, entry_count,
                    inconsistency_count, status, alerts, created_at, created_by)
                VALUES($id, $company, $period, $revenue, $expenses, $output, $input,
                       $net, $declared, $difference, $count, $inconsistencies,
                       $status, $alerts, $created, $createdBy);
                """;
            command.Parameters.AddWithValue("$id", close.CloseId);
            command.Parameters.AddWithValue("$company", close.CompanyId);
            command.Parameters.AddWithValue("$period", close.Period);
            command.Parameters.AddWithValue("$revenue", close.RevenueNet.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$expenses", close.ExpenseNet.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$output", close.OutputTax.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$input", close.InputTax.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$net", close.NetTax.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$declared", close.DeclaredTax.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$difference", close.TaxDifference.ToString(CultureInfo.InvariantCulture));
            command.Parameters.AddWithValue("$count", close.EntryCount);
            command.Parameters.AddWithValue("$inconsistencies", close.InconsistencyCount);
            command.Parameters.AddWithValue("$status", close.Status);
            command.Parameters.AddWithValue("$alerts", JsonSerializer.Serialize(close.Alerts));
            command.Parameters.AddWithValue("$created", close.CreatedAt.ToString("O"));
            command.Parameters.AddWithValue("$createdBy", close.CreatedBy);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally { _gate.Release(); }

        return close;
    }

    public async Task<IReadOnlyList<FiscalClose>> GetClosesAsync(
        string companyId, int limit, CancellationToken cancellationToken)
    {
        var items = new List<FiscalClose>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT close_id, company_id, period, revenue_net, expense_net, output_tax,
                   input_tax, net_tax, declared_tax, tax_difference, entry_count,
                   inconsistency_count, status, alerts, created_at, created_by
            FROM fiscal_closes
            WHERE company_id = $company
            ORDER BY created_at DESC
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 200));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var alerts = JsonSerializer.Deserialize<string[]>(reader.GetString(13)) ?? Array.Empty<string>();
            items.Add(new FiscalClose(
                reader.GetString(0), reader.GetString(1), reader.GetString(2),
                ParseDecimal(reader.GetString(3)), ParseDecimal(reader.GetString(4)),
                ParseDecimal(reader.GetString(5)), ParseDecimal(reader.GetString(6)),
                ParseDecimal(reader.GetString(7)), ParseDecimal(reader.GetString(8)),
                ParseDecimal(reader.GetString(9)), reader.GetInt32(10), reader.GetInt32(11),
                reader.GetString(12), alerts, DateTimeOffset.Parse(reader.GetString(14)),
                reader.GetString(15)));
        }
        return items;
    }

    private static void ValidateEntry(FiscalEntryInput input)
    {
        if (string.IsNullOrWhiteSpace(input.EntryId) ||
            string.IsNullOrWhiteSpace(input.Kind) ||
            string.IsNullOrWhiteSpace(input.InvoiceNumber) ||
            string.IsNullOrWhiteSpace(input.Currency) ||
            string.IsNullOrWhiteSpace(input.Counterparty))
            throw new ArgumentException("Fiscal entry requires id, kind, invoice number, currency and counterparty.");

        if (input.NetAmount < 0 || input.TaxAmount < 0 || input.GrossAmount < 0)
            throw new ArgumentException("Fiscal amounts cannot be negative.");

        if (input.GrossAmount != input.NetAmount + input.TaxAmount)
            throw new ArgumentException("Gross amount must equal net amount plus tax amount.");

        if (input.Kind.Trim().ToUpperInvariant() is not ("REVENUE" or "EXPENSE"))
            throw new ArgumentException("Kind must be REVENUE or EXPENSE.");
    }

    private static decimal ParseDecimal(string value)
        => decimal.Parse(value, CultureInfo.InvariantCulture);

    private static bool IsPeriod(string value)
        => !string.IsNullOrWhiteSpace(value)
           && value.Length == 7
           && value[4] == '-'
           && int.TryParse(value[..4], out _)
           && int.TryParse(value[5..], out var month)
           && month is >= 1 and <= 12;
}

public static class CompanyFiscalBrainApi
{
    public static void MapCompanyFiscalBrainApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/fiscal/entries", async (
            HttpRequest request,
            string companyId,
            FiscalEntryInput input,
            FiscalBrainStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest(new { saved = false, reason = "Invalid companyId." });

            try
            {
                await store.UpsertEntryAsync(companyId, input, cancellationToken);
                return Results.Ok(new { saved = true, companyId, entryId = input.EntryId });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { saved = false, reason = ex.Message });
            }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/fiscal/entries", async (
            HttpRequest request,
            string companyId,
            string period,
            FiscalBrainStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId) || !Period(period))
                return Results.BadRequest();

            var start = DateTimeOffset.ParseExact(period + "-01T00:00:00+00:00", "yyyy-MM-dd'T'HH:mm:sszzz", CultureInfo.InvariantCulture);
            var entries = await store.GetEntriesAsync(companyId, start, start.AddMonths(1), cancellationToken);
            return Results.Ok(new { companyId, period, count = entries.Count, entries });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/fiscal/close", async (
            HttpRequest request,
            string companyId,
            FiscalCloseRequest input,
            FiscalBrainStore store,
            CloudStore cloudStore,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest();

            try
            {
                var close = await store.ClosePeriodAsync(
                    companyId,
                    input,
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    cancellationToken);

                await cloudStore.AppendAuditJournalAsync(
                    companyId,
                    "FISCAL_CLOSE",
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    request.Headers["X-Correlation-Id"].ToString(),
                    "FISCAL_CLOSE",
                    close.CloseId,
                    close.Status,
                    JsonSerializer.Serialize(new
                    {
                        close.Period,
                        close.RevenueNet,
                        close.ExpenseNet,
                        close.OutputTax,
                        close.InputTax,
                        close.NetTax,
                        close.DeclaredTax,
                        close.TaxDifference,
                        close.InconsistencyCount
                    }),
                    cancellationToken);

                return Results.Ok(new { closed = true, close, officialSubmission = false });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { closed = false, reason = ex.Message });
            }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/fiscal/closes", async (
            HttpRequest request,
            string companyId,
            FiscalBrainStore store,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest();

            var closes = await store.GetClosesAsync(companyId, 100, cancellationToken);
            return Results.Ok(new { companyId, count = closes.Count, closes });
        });
    }

    private static bool HasAdminKey(HttpRequest request, IConfiguration configuration)
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
        => !string.IsNullOrWhiteSpace(value) && value.Length <= 100
           && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');

    private static bool Period(string? value)
        => !string.IsNullOrWhiteSpace(value) && value.Length == 7 && value[4] == '-'
           && int.TryParse(value[..4], out _) && int.TryParse(value[5..], out var m) && m is >= 1 and <= 12;

    private static string NormalizeActor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "brain-admin";
        var actor = value.Trim();
        return actor.Length <= 100 && actor.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.' or '@')
            ? actor : "brain-admin";
    }
}
