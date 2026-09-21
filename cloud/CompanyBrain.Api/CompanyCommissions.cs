using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace CompanyBrain.Api;

public enum CommissionRuleKind
{
    Percentage,
    Fixed
}

public sealed record CommissionRuleRequest(
    string ProfessionalId,
    string? ServiceId = null,
    CommissionRuleKind Kind = CommissionRuleKind.Percentage,
    decimal Value = 0m,
    bool Active = true);

public sealed record CommissionRule(
    string RuleId,
    string CompanyId,
    string ProfessionalId,
    string? ServiceId,
    string Kind,
    decimal Value,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record CommissionEntry(
    string CommissionId,
    string CompanyId,
    string ProfessionalId,
    string ProfessionalName,
    string? ServiceId,
    string ServiceName,
    string AppointmentId,
    string SalesOrderId,
    string Currency,
    decimal BaseAmount,
    string RuleKind,
    decimal RuleValue,
    decimal CommissionAmount,
    string Status,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed class CompanyCommissionStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyCommissionStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_commission_rules (
                rule_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                professional_id TEXT NOT NULL,
                service_id TEXT,
                kind TEXT NOT NULL,
                value TEXT NOT NULL,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_commission_rules_company_professional
                ON company_commission_rules(company_id, professional_id, active);

            CREATE INDEX IF NOT EXISTS ix_commission_rules_company_service
                ON company_commission_rules(company_id, service_id, active);

            CREATE TABLE IF NOT EXISTS company_commission_entries (
                commission_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                professional_id TEXT NOT NULL,
                professional_name TEXT NOT NULL,
                service_id TEXT,
                service_name TEXT NOT NULL,
                appointment_id TEXT NOT NULL,
                sales_order_id TEXT NOT NULL,
                currency TEXT NOT NULL,
                base_amount TEXT NOT NULL,
                rule_kind TEXT NOT NULL,
                rule_value TEXT NOT NULL,
                commission_amount TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ux_commission_entries_company_order
                ON company_commission_entries(company_id, sales_order_id);

            CREATE INDEX IF NOT EXISTS ix_commission_entries_company_professional
                ON company_commission_entries(company_id, professional_id, created_at);

            CREATE INDEX IF NOT EXISTS ix_commission_entries_company_appointment
                ON company_commission_entries(company_id, appointment_id);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CommissionRule> CreateRuleAsync(
        string companyId, CommissionRuleRequest input, string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.ProfessionalId))
            throw new ArgumentException("ProfessionalId is required.");
        if (input.Value < 0)
            throw new ArgumentException("Commission value cannot be negative.");
        if (input.Kind == CommissionRuleKind.Percentage && input.Value > 100m)
            throw new ArgumentException("Percentage commission cannot exceed 100.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);

            if (!await ProfessionalExistsAsync(connection, companyId, input.ProfessionalId, ct))
                throw new ArgumentException("Professional does not exist or is inactive.");

            var now = DateTimeOffset.UtcNow;
            var rule = new CommissionRule(
                $"COM-RULE-{Guid.NewGuid():N}",
                companyId,
                input.ProfessionalId.Trim(),
                Normalize(input.ServiceId),
                input.Kind.ToString().ToUpperInvariant(),
                decimal.Round(input.Value, 2, MidpointRounding.AwayFromZero),
                input.Active,
                now,
                now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_commission_rules(
                    rule_id, company_id, professional_id, service_id, kind, value,
                    active, created_at, updated_at)
                VALUES($id,$company,$professional,$service,$kind,$value,$active,$created,$updated);
                """;
            Add(command, "$id", rule.RuleId);
            Add(command, "$company", rule.CompanyId);
            Add(command, "$professional", rule.ProfessionalId);
            Add(command, "$service", (object?)rule.ServiceId ?? DBNull.Value);
            Add(command, "$kind", rule.Kind);
            Add(command, "$value", rule.Value.ToString(CultureInfo.InvariantCulture));
            Add(command, "$active", rule.Active ? 1 : 0);
            Add(command, "$created", rule.CreatedAt.ToString("O"));
            Add(command, "$updated", rule.UpdatedAt.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);

            return rule;
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<CommissionRule>> ListRulesAsync(
        string companyId, string? professionalId, CancellationToken ct)
    {
        var result = new List<CommissionRule>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT rule_id, company_id, professional_id, service_id, kind, value,
                   active, created_at, updated_at
            FROM company_commission_rules
            WHERE company_id=$company
              AND ($professional='' OR professional_id=$professional)
            ORDER BY created_at DESC;
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId?.Trim() ?? "");

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            result.Add(new CommissionRule(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetString(4),
                ParseDecimal(reader.GetString(5)),
                reader.GetInt32(6) == 1,
                DateTimeOffset.Parse(reader.GetString(7)),
                DateTimeOffset.Parse(reader.GetString(8))));
        }
        return result;
    }

    public async Task<CommissionEntry> CalculateFromInvoicedOrderAsync(
        string companyId, string salesOrderId, string actor, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);

            var existing = await LoadEntryByOrderAsync(connection, companyId, salesOrderId, ct);
            if (existing is not null) return existing;

            var order = await LoadSalesOrderAsync(connection, companyId, salesOrderId, ct)
                ?? throw new ArgumentException("Sales order does not exist in this company.");

            if (!string.Equals(order.Status, "INVOICED", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("Commission can only be calculated for an invoiced sales order.");

            if (!string.Equals(order.SourceType, "APPOINTMENT", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(order.SourceId))
                throw new ArgumentException("Only appointment-linked sales orders can generate professional commissions.");

            var appointment = await LoadAppointmentAsync(connection, companyId, order.SourceId, ct)
                ?? throw new ArgumentException("The appointment linked to this sales order does not exist.");

            var rule = await LoadBestRuleAsync(
                connection, companyId, appointment.ProfessionalId, appointment.ServiceId, ct)
                ?? throw new ArgumentException("No active commission rule matches the professional and service.");

            var baseAmount = decimal.Round(
                order.NetAmount,
                2,
                MidpointRounding.AwayFromZero);

            var commissionAmount = rule.Kind == "PERCENTAGE"
                ? decimal.Round(baseAmount * rule.Value / 100m, 2, MidpointRounding.AwayFromZero)
                : decimal.Round(rule.Value, 2, MidpointRounding.AwayFromZero);

            var entry = new CommissionEntry(
                $"COM-{Guid.NewGuid():N}",
                companyId,
                appointment.ProfessionalId,
                appointment.ProfessionalName,
                appointment.ServiceId,
                appointment.ServiceName,
                appointment.AppointmentId,
                order.OrderId,
                order.Currency,
                baseAmount,
                rule.Kind,
                rule.Value,
                commissionAmount,
                "EARNED",
                DateTimeOffset.UtcNow,
                string.IsNullOrWhiteSpace(actor) ? "company-brain" : actor);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_commission_entries(
                    commission_id, company_id, professional_id, professional_name,
                    service_id, service_name, appointment_id, sales_order_id, currency,
                    base_amount, rule_kind, rule_value, commission_amount, status,
                    created_at, created_by)
                VALUES($id,$company,$professional,$professionalName,$service,$serviceName,
                       $appointment,$order,$currency,$base,$kind,$ruleValue,$amount,
                       $status,$created,$actor);
                """;
            Add(command, "$id", entry.CommissionId);
            Add(command, "$company", entry.CompanyId);
            Add(command, "$professional", entry.ProfessionalId);
            Add(command, "$professionalName", entry.ProfessionalName);
            Add(command, "$service", (object?)entry.ServiceId ?? DBNull.Value);
            Add(command, "$serviceName", entry.ServiceName);
            Add(command, "$appointment", entry.AppointmentId);
            Add(command, "$order", entry.SalesOrderId);
            Add(command, "$currency", entry.Currency);
            Add(command, "$base", entry.BaseAmount.ToString(CultureInfo.InvariantCulture));
            Add(command, "$kind", entry.RuleKind);
            Add(command, "$ruleValue", entry.RuleValue.ToString(CultureInfo.InvariantCulture));
            Add(command, "$amount", entry.CommissionAmount.ToString(CultureInfo.InvariantCulture));
            Add(command, "$status", entry.Status);
            Add(command, "$created", entry.CreatedAt.ToString("O"));
            Add(command, "$actor", entry.CreatedBy);

            try
            {
                await command.ExecuteNonQueryAsync(ct);
            }
            catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
            {
                var concurrent = await LoadEntryByOrderAsync(connection, companyId, salesOrderId, ct);
                if (concurrent is not null) return concurrent;
                throw;
            }

            return entry;
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<CommissionEntry>> ListEntriesAsync(
        string companyId, string? professionalId, string? status, int limit, CancellationToken ct)
    {
        var result = new List<CommissionEntry>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT commission_id, company_id, professional_id, professional_name,
                   service_id, service_name, appointment_id, sales_order_id, currency,
                   base_amount, rule_kind, rule_value, commission_amount, status,
                   created_at, created_by
            FROM company_commission_entries
            WHERE company_id=$company
              AND ($professional='' OR professional_id=$professional)
              AND ($status='' OR status=$status)
            ORDER BY created_at DESC
            LIMIT $limit;
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId?.Trim() ?? "");
        Add(command, "$status", status?.Trim().ToUpperInvariant() ?? "");
        Add(command, "$limit", Math.Clamp(limit, 1, 500));

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            result.Add(ReadEntry(reader));
        return result;
    }

    private static async Task<CommissionRule?> LoadBestRuleAsync(
        SqliteConnection connection, string companyId, string professionalId,
        string serviceId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT rule_id, company_id, professional_id, service_id, kind, value,
                   active, created_at, updated_at
            FROM company_commission_rules
            WHERE company_id=$company
              AND professional_id=$professional
              AND active=1
              AND (service_id=$service OR service_id IS NULL)
            ORDER BY CASE WHEN service_id=$service THEN 0 ELSE 1 END, created_at DESC
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId);
        Add(command, "$service", serviceId);

        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        return new CommissionRule(
            reader.GetString(0), reader.GetString(1), reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3), reader.GetString(4),
            ParseDecimal(reader.GetString(5)), reader.GetInt32(6) == 1,
            DateTimeOffset.Parse(reader.GetString(7)),
            DateTimeOffset.Parse(reader.GetString(8)));
    }

    private static async Task<CommissionEntry?> LoadEntryByOrderAsync(
        SqliteConnection connection, string companyId, string orderId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT commission_id, company_id, professional_id, professional_name,
                   service_id, service_name, appointment_id, sales_order_id, currency,
                   base_amount, rule_kind, rule_value, commission_amount, status,
                   created_at, created_by
            FROM company_commission_entries
            WHERE company_id=$company AND sales_order_id=$order
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$order", orderId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadEntry(reader) : null;
    }

    private static async Task<(string OrderId, string CustomerName, string Currency, decimal NetAmount,
        string Status, string? SourceType, string? SourceId)?> LoadSalesOrderAsync(
        SqliteConnection connection, string companyId, string orderId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT order_id, customer_name, currency, net_amount, status, source_type, source_id
            FROM company_sales_orders
            WHERE company_id=$company AND order_id=$order
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$order", orderId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        return (
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            ParseDecimal(reader.GetString(3)),
            reader.GetString(4),
            reader.IsDBNull(5) ? null : reader.GetString(5),
            reader.IsDBNull(6) ? null : reader.GetString(6));
    }

    private static async Task<(string AppointmentId, string ProfessionalId, string ProfessionalName,
        string ServiceId, string ServiceName)?> LoadAppointmentAsync(
        SqliteConnection connection, string companyId, string appointmentId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT appointment_id, professional_id, professional_name, service_id, service_name
            FROM company_appointments
            WHERE company_id=$company AND appointment_id=$appointment
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$appointment", appointmentId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return null;
        return (
            reader.GetString(0),
            reader.GetString(1),
            reader.GetString(2),
            reader.GetString(3),
            reader.GetString(4));
    }

    private static async Task<bool> ProfessionalExistsAsync(
        SqliteConnection connection, string companyId, string professionalId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(*)
            FROM company_professionals
            WHERE company_id=$company AND professional_id=$professional AND active=1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(ct)) == 1;
    }

    private static CommissionEntry ReadEntry(SqliteDataReader reader)
        => new(
            reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
            reader.IsDBNull(4) ? null : reader.GetString(4), reader.GetString(5),
            reader.GetString(6), reader.GetString(7), reader.GetString(8),
            ParseDecimal(reader.GetString(9)), reader.GetString(10),
            ParseDecimal(reader.GetString(11)), ParseDecimal(reader.GetString(12)),
            reader.GetString(13), DateTimeOffset.Parse(reader.GetString(14)),
            reader.GetString(15));

    private static decimal ParseDecimal(string value)
        => decimal.Parse(value, CultureInfo.InvariantCulture);

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Add(SqliteCommand command, string name, object value)
        => command.Parameters.AddWithValue(name, value);
}

public static class CompanyCommissionApi
{
    public static void MapCompanyCommissionApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/commissions/rules", async (
            HttpRequest request,
            string companyId,
            CommissionRuleRequest input,
            CompanyCommissionStore store,
            CloudStore cloudStore,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest(new { saved = false, reason = "Invalid companyId." });

            try
            {
                var rule = await store.CreateRuleAsync(
                    companyId,
                    input,
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    ct);

                await cloudStore.AppendAuditJournalAsync(
                    companyId,
                    "COMMISSION_RULE_CREATED",
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    request.Headers["X-Correlation-Id"].ToString(),
                    "COMMISSION_RULE",
                    rule.RuleId,
                    "CREATED",
                    JsonSerializer.Serialize(rule),
                    ct);

                return Results.Ok(new { saved = true, rule });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { saved = false, reason = ex.Message });
            }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/commissions/rules", async (
            HttpRequest request,
            string companyId,
            string? professionalId,
            CompanyCommissionStore store,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest();

            var rules = await store.ListRulesAsync(companyId, professionalId, ct);
            return Results.Ok(new { companyId, count = rules.Count, rules });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/commissions/from-order/{orderId}", async (
            HttpRequest request,
            string companyId,
            string orderId,
            CompanyCommissionStore store,
            CloudStore cloudStore,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId) || !Safe(orderId))
                return Results.BadRequest();

            try
            {
                var entry = await store.CalculateFromInvoicedOrderAsync(
                    companyId,
                    orderId,
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    ct);

                await cloudStore.AppendAuditJournalAsync(
                    companyId,
                    "COMMISSION_CALCULATED",
                    NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
                    request.Headers["X-Correlation-Id"].ToString(),
                    "COMMISSION",
                    entry.CommissionId,
                    entry.Status,
                    JsonSerializer.Serialize(new
                    {
                        entry.AppointmentId,
                        entry.SalesOrderId,
                        entry.ProfessionalId,
                        entry.ServiceId,
                        entry.BaseAmount,
                        entry.RuleKind,
                        entry.RuleValue,
                        entry.CommissionAmount
                    }),
                    ct);

                return Results.Ok(new { calculated = true, entry });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { calculated = false, reason = ex.Message });
            }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/commissions", async (
            HttpRequest request,
            string companyId,
            string? professionalId,
            string? status,
            CompanyCommissionStore store,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();
            if (!Safe(companyId))
                return Results.BadRequest();

            var entries = await store.ListEntriesAsync(companyId, professionalId, status, 500, ct);
            return Results.Ok(new { companyId, count = entries.Count, entries });
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
        => !string.IsNullOrWhiteSpace(value)
           && value.Length <= 100
           && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');

    private static string NormalizeActor(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return "brain-admin";
        var actor = value.Trim();
        return actor.Length <= 100 && actor.All(ch =>
            char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.' or '@')
            ? actor
            : "brain-admin";
    }
}
