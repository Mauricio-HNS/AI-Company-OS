using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace CompanyBrain.Api;

public enum AppointmentStatus
{
    Requested,
    Confirmed,
    Arrived,
    InService,
    Completed,
    Cancelled,
    Rescheduled,
    NoShow
}

public enum ScheduleBlockKind
{
    Working,
    Blocked
}

public sealed record CompanyProfessional(
    string ProfessionalId,
    string CompanyId,
    string Name,
    string? Email,
    string? Phone,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ProfessionalRequest(
    string Name,
    string? Email = null,
    string? Phone = null,
    bool Active = true);

public sealed record CompanyService(
    string ServiceId,
    string CompanyId,
    string Name,
    int DurationMinutes,
    decimal Price,
    string Currency,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record ServiceRequest(
    string Name,
    int DurationMinutes,
    decimal Price = 0m,
    string Currency = "EUR",
    bool Active = true);

public sealed record ScheduleRuleRequest(
    string ProfessionalId,
    DateTimeOffset Start,
    DateTimeOffset End,
    ScheduleBlockKind Kind = ScheduleBlockKind.Working,
    string Reason = "");

public sealed record ScheduleRule(
    string RuleId,
    string CompanyId,
    string ProfessionalId,
    DateTimeOffset Start,
    DateTimeOffset End,
    string Kind,
    string Reason);

public sealed record AppointmentRequest(
    string CustomerId,
    string ProfessionalId,
    string ServiceId,
    DateTimeOffset Start,
    string? Notes = null,
    string? ResourceId = null,
    string Status = "CONFIRMED");

public sealed record Appointment(
    string AppointmentId,
    string CompanyId,
    string CustomerId,
    string CustomerName,
    string ProfessionalId,
    string ProfessionalName,
    string ServiceId,
    string ServiceName,
    int DurationMinutes,
    DateTimeOffset Start,
    DateTimeOffset End,
    string? ResourceId,
    string Notes,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string CreatedBy);

public sealed record AppointmentHistory(
    string HistoryId,
    string AppointmentId,
    string CompanyId,
    string FromStatus,
    string ToStatus,
    string Reason,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed class CompanyAgendaStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyAgendaStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_professionals (
                professional_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_professionals_company
                ON company_professionals(company_id, active, name);

            CREATE TABLE IF NOT EXISTS company_services (
                service_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                name TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                price TEXT NOT NULL,
                currency TEXT NOT NULL,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_services_company
                ON company_services(company_id, active, name);

            CREATE TABLE IF NOT EXISTS company_schedule_rules (
                rule_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                professional_id TEXT NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                kind TEXT NOT NULL,
                reason TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_rules_professional
                ON company_schedule_rules(company_id, professional_id, start_at, end_at);

            CREATE TABLE IF NOT EXISTS company_appointments (
                appointment_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                professional_id TEXT NOT NULL,
                professional_name TEXT NOT NULL,
                service_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                duration_minutes INTEGER NOT NULL,
                start_at TEXT NOT NULL,
                end_at TEXT NOT NULL,
                resource_id TEXT,
                notes TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_appointments_company_start
                ON company_appointments(company_id, start_at);

            CREATE INDEX IF NOT EXISTS ix_agenda_appointments_professional
                ON company_appointments(company_id, professional_id, start_at, end_at);

            CREATE INDEX IF NOT EXISTS ix_agenda_appointments_customer
                ON company_appointments(company_id, customer_id, start_at);

            CREATE TABLE IF NOT EXISTS company_appointment_history (
                history_id TEXT PRIMARY KEY,
                appointment_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                from_status TEXT NOT NULL,
                to_status TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_history_appointment
                ON company_appointment_history(company_id, appointment_id, created_at);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CompanyProfessional> CreateProfessionalAsync(
        string companyId, ProfessionalRequest input, CancellationToken ct)
    {
        ValidateProfessional(input);
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            var now = DateTimeOffset.UtcNow;
            var professional = new CompanyProfessional(
                $"PRO-{Guid.NewGuid():N}", companyId, input.Name.Trim(),
                Normalize(input.Email), Normalize(input.Phone), input.Active, now, now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_professionals
                    (professional_id, company_id, name, email, phone, active, created_at, updated_at)
                VALUES ($id,$company,$name,$email,$phone,$active,$created,$updated);
                """;
            Add(command, "$id", professional.ProfessionalId);
            Add(command, "$company", companyId);
            Add(command, "$name", professional.Name);
            Add(command, "$email", (object?)professional.Email ?? DBNull.Value);
            Add(command, "$phone", (object?)professional.Phone ?? DBNull.Value);
            Add(command, "$active", professional.Active ? 1 : 0);
            Add(command, "$created", now.ToString("O"));
            Add(command, "$updated", now.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);
            return professional;
        }
        finally { _gate.Release(); }
    }

    public async Task<CompanyService> CreateServiceAsync(
        string companyId, ServiceRequest input, CancellationToken ct)
    {
        ValidateService(input);
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            var now = DateTimeOffset.UtcNow;
            var service = new CompanyService(
                $"SVC-{Guid.NewGuid():N}", companyId, input.Name.Trim(),
                input.DurationMinutes, decimal.Round(input.Price, 2, MidpointRounding.AwayFromZero),
                input.Currency.Trim().ToUpperInvariant(), input.Active, now, now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_services
                    (service_id, company_id, name, duration_minutes, price, currency, active, created_at, updated_at)
                VALUES ($id,$company,$name,$duration,$price,$currency,$active,$created,$updated);
                """;
            Add(command, "$id", service.ServiceId);
            Add(command, "$company", companyId);
            Add(command, "$name", service.Name);
            Add(command, "$duration", service.DurationMinutes);
            Add(command, "$price", service.Price.ToString(System.Globalization.CultureInfo.InvariantCulture));
            Add(command, "$currency", service.Currency);
            Add(command, "$active", service.Active ? 1 : 0);
            Add(command, "$created", now.ToString("O"));
            Add(command, "$updated", now.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);
            return service;
        }
        finally { _gate.Release(); }
    }

    public async Task<ScheduleRule> CreateScheduleRuleAsync(
        string companyId, ScheduleRuleRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.ProfessionalId) || input.End <= input.Start)
            throw new ArgumentException("A valid professional and time range are required.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);

            if (!await ProfessionalExistsAsync(connection, companyId, input.ProfessionalId, ct))
                throw new ArgumentException("Professional does not exist in this company.");

            var rule = new ScheduleRule(
                $"SCH-{Guid.NewGuid():N}", companyId, input.ProfessionalId,
                input.Start, input.End, input.Kind.ToString().ToUpperInvariant(),
                input.Reason.Trim());

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_schedule_rules
                    (rule_id, company_id, professional_id, start_at, end_at, kind, reason)
                VALUES ($id,$company,$professional,$start,$end,$kind,$reason);
                """;
            Add(command, "$id", rule.RuleId);
            Add(command, "$company", companyId);
            Add(command, "$professional", rule.ProfessionalId);
            Add(command, "$start", rule.Start.ToString("O"));
            Add(command, "$end", rule.End.ToString("O"));
            Add(command, "$kind", rule.Kind);
            Add(command, "$reason", rule.Reason);
            await command.ExecuteNonQueryAsync(ct);
            return rule;
        }
        finally { _gate.Release(); }
    }

    public async Task<Appointment> CreateAppointmentAsync(
        string companyId, AppointmentRequest input, string actor, CancellationToken ct)
    {
        ValidateAppointment(input);
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var tx = await connection.BeginTransactionAsync(ct);

            var customer = await LoadCustomerAsync(connection, tx, companyId, input.CustomerId, ct)
                ?? throw new ArgumentException("Customer does not exist in this company.");

            var professional = await LoadProfessionalAsync(connection, tx, companyId, input.ProfessionalId, ct)
                ?? throw new ArgumentException("Professional does not exist or is inactive.");

            var service = await LoadServiceAsync(connection, tx, companyId, input.ServiceId, ct)
                ?? throw new ArgumentException("Service does not exist or is inactive.");

            var end = input.Start.AddMinutes(service.Value.DurationMinutes);

            if (!await IsWithinWorkingScheduleAsync(connection, tx, companyId, input.ProfessionalId, input.Start, end, ct))
                throw new ArgumentException("The professional is not available during this period.");

            if (await HasConflictAsync(connection, tx, companyId, input.ProfessionalId, input.Start, end, input.ResourceId, ct))
                throw new ArgumentException("There is an appointment conflict for this professional or resource.");

            var now = DateTimeOffset.UtcNow;
            var status = ParseStatus(input.Status);
            var appointment = new Appointment(
                $"APT-{Guid.NewGuid():N}", companyId,
                customer.Value.Id, customer.Value.Name,
                professional.Value.Id, professional.Value.Name,
                service.Value.Id, service.Value.Name, service.Value.Duration,
                input.Start, end, Normalize(input.ResourceId), input.Notes?.Trim() ?? "",
                status, now, now, actor);

            await InsertAppointmentAsync(connection, tx, appointment, ct);
            await InsertHistoryAsync(connection, tx, appointment, "", status, "Appointment created.", actor, ct);
            await tx.CommitAsync(ct);
            return appointment;
        }
        finally { _gate.Release(); }
    }

    public async Task<Appointment?> GetAppointmentAsync(
        string companyId, string appointmentId, CancellationToken ct)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT appointment_id, company_id, customer_id, customer_name,
                   professional_id, professional_name, service_id, service_name,
                   duration_minutes, start_at, end_at, resource_id, notes, status,
                   created_at, updated_at, created_by
            FROM company_appointments
            WHERE company_id=$company AND appointment_id=$id LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$id", appointmentId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadAppointment(reader) : null;
    }

    public async Task<IReadOnlyList<Appointment>> ListAppointmentsAsync(
        string companyId, DateTimeOffset from, DateTimeOffset to,
        string? professionalId, string? customerId, string? status, CancellationToken ct)
    {
        var result = new List<Appointment>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT appointment_id, company_id, customer_id, customer_name,
                   professional_id, professional_name, service_id, service_name,
                   duration_minutes, start_at, end_at, resource_id, notes, status,
                   created_at, updated_at, created_by
            FROM company_appointments
            WHERE company_id=$company
              AND start_at < $to
              AND end_at > $from
              AND ($professional = '' OR professional_id=$professional)
              AND ($customer = '' OR customer_id=$customer)
              AND ($status = '' OR status=$status)
            ORDER BY start_at;
            """;
        Add(command, "$company", companyId);
        Add(command, "$from", from.ToString("O"));
        Add(command, "$to", to.ToString("O"));
        Add(command, "$professional", professionalId?.Trim() ?? "");
        Add(command, "$customer", customerId?.Trim() ?? "");
        Add(command, "$status", status?.Trim().ToUpperInvariant() ?? "");

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) result.Add(ReadAppointment(reader));
        return result;
    }

    public async Task<Appointment> ChangeStatusAsync(
        string companyId, string appointmentId, AppointmentStatus target,
        string reason, string actor, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var tx = await connection.BeginTransactionAsync(ct);

            var current = await LoadAppointmentAsync(connection, tx, companyId, appointmentId, ct)
                ?? throw new ArgumentException("Appointment does not exist.");

            var targetStatus = target.ToString().ToUpperInvariant();
            if (!IsValidTransition(current.Status, targetStatus))
                throw new ArgumentException($"Invalid appointment transition: {current.Status} -> {targetStatus}.");

            await using var command = connection.CreateCommand();
            command.Transaction = tx;
            command.CommandText = """
                UPDATE company_appointments
                SET status=$status, updated_at=$updated
                WHERE company_id=$company AND appointment_id=$id;
                """;
            Add(command, "$status", targetStatus);
            Add(command, "$updated", DateTimeOffset.UtcNow.ToString("O"));
            Add(command, "$company", companyId);
            Add(command, "$id", appointmentId);
            await command.ExecuteNonQueryAsync(ct);

            await InsertHistoryAsync(connection, tx, current with { Status = targetStatus },
                current.Status, targetStatus, reason.Trim(), actor, ct);

            await tx.CommitAsync(ct);
            return current with { Status = targetStatus, UpdatedAt = DateTimeOffset.UtcNow };
        }
        finally { _gate.Release(); }
    }

    private static async Task<bool> HasConflictAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId,
        string professionalId, DateTimeOffset start, DateTimeOffset end,
        string? resourceId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            SELECT COUNT(*)
            FROM company_appointments
            WHERE company_id=$company
              AND status NOT IN ('CANCELLED','NO_SHOW')
              AND start_at < $end
              AND end_at > $start
              AND (
                    professional_id=$professional
                    OR ($resource IS NOT NULL AND $resource <> '' AND resource_id=$resource)
                  );
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId);
        Add(command, "$start", start.ToString("O"));
        Add(command, "$end", end.ToString("O"));
        Add(command, "$resource", (object?)Normalize(resourceId) ?? DBNull.Value);
        return Convert.ToInt32(await command.ExecuteScalarAsync(ct)) > 0;
    }

    private static async Task<bool> IsWithinWorkingScheduleAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId,
        string professionalId, DateTimeOffset start, DateTimeOffset end, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            SELECT
                EXISTS(
                    SELECT 1 FROM company_schedule_rules
                    WHERE company_id=$company AND professional_id=$professional
                      AND kind='WORKING'
                      AND start_at <= $start AND end_at >= $end
                )
                AND NOT EXISTS(
                    SELECT 1 FROM company_schedule_rules
                    WHERE company_id=$company AND professional_id=$professional
                      AND kind='BLOCKED'
                      AND start_at < $end AND end_at > $start
                );
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId);
        Add(command, "$start", start.ToString("O"));
        Add(command, "$end", end.ToString("O"));
        return Convert.ToInt32(await command.ExecuteScalarAsync(ct)) == 1;
    }

    private static async Task InsertAppointmentAsync(
        SqliteConnection connection, SqliteTransaction tx, Appointment appointment, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            INSERT INTO company_appointments(
                appointment_id, company_id, customer_id, customer_name,
                professional_id, professional_name, service_id, service_name,
                duration_minutes, start_at, end_at, resource_id, notes, status,
                created_at, updated_at, created_by)
            VALUES($id,$company,$customer,$customerName,$professional,$professionalName,
                   $service,$serviceName,$duration,$start,$end,$resource,$notes,$status,
                   $created,$updated,$actor);
            """;
        Add(command, "$id", appointment.AppointmentId);
        Add(command, "$company", appointment.CompanyId);
        Add(command, "$customer", appointment.CustomerId);
        Add(command, "$customerName", appointment.CustomerName);
        Add(command, "$professional", appointment.ProfessionalId);
        Add(command, "$professionalName", appointment.ProfessionalName);
        Add(command, "$service", appointment.ServiceId);
        Add(command, "$serviceName", appointment.ServiceName);
        Add(command, "$duration", appointment.DurationMinutes);
        Add(command, "$start", appointment.Start.ToString("O"));
        Add(command, "$end", appointment.End.ToString("O"));
        Add(command, "$resource", (object?)appointment.ResourceId ?? DBNull.Value);
        Add(command, "$notes", appointment.Notes);
        Add(command, "$status", appointment.Status);
        Add(command, "$created", appointment.CreatedAt.ToString("O"));
        Add(command, "$updated", appointment.UpdatedAt.ToString("O"));
        Add(command, "$actor", appointment.CreatedBy);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task InsertHistoryAsync(
        SqliteConnection connection, SqliteTransaction tx, Appointment appointment,
        string fromStatus, string toStatus, string reason, string actor, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            INSERT INTO company_appointment_history(
                history_id, appointment_id, company_id, from_status, to_status,
                reason, created_at, created_by)
            VALUES($id,$appointment,$company,$from,$to,$reason,$created,$actor);
            """;
        Add(command, "$id", $"AH-{Guid.NewGuid():N}");
        Add(command, "$appointment", appointment.AppointmentId);
        Add(command, "$company", appointment.CompanyId);
        Add(command, "$from", fromStatus);
        Add(command, "$to", toStatus);
        Add(command, "$reason", reason);
        Add(command, "$created", DateTimeOffset.UtcNow.ToString("O"));
        Add(command, "$actor", actor);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task<Appointment?> LoadAppointmentAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            SELECT appointment_id, company_id, customer_id, customer_name,
                   professional_id, professional_name, service_id, service_name,
                   duration_minutes, start_at, end_at, resource_id, notes, status,
                   created_at, updated_at, created_by
            FROM company_appointments
            WHERE company_id=$company AND appointment_id=$id LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? ReadAppointment(reader) : null;
    }

    private static async Task<(string Id, string Name)?> LoadCustomerAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = "SELECT customer_id,name FROM company_customers WHERE company_id=$company AND customer_id=$id AND status <> 'BLOCKED' LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task<(string Id, string Name)?> LoadProfessionalAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = "SELECT professional_id,name FROM company_professionals WHERE company_id=$company AND professional_id=$id AND active=1 LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task<(string Id, string Name, int Duration)?> LoadServiceAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = "SELECT service_id,name,duration_minutes FROM company_services WHERE company_id=$company AND service_id=$id AND active=1 LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1), reader.GetInt32(2)) : null;
    }

    private static async Task<bool> ProfessionalExistsAsync(
        SqliteConnection connection, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM company_professionals WHERE company_id=$company AND professional_id=$id AND active=1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        return Convert.ToInt32(await command.ExecuteScalarAsync(ct)) == 1;
    }

    private static Appointment ReadAppointment(SqliteDataReader reader) => new(
        reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
        reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7),
        reader.GetInt32(8), DateTimeOffset.Parse(reader.GetString(9)), DateTimeOffset.Parse(reader.GetString(10)),
        reader.IsDBNull(11) ? null : reader.GetString(11), reader.GetString(12), reader.GetString(13),
        DateTimeOffset.Parse(reader.GetString(14)), DateTimeOffset.Parse(reader.GetString(15)), reader.GetString(16));

    private static string ParseStatus(string status)
    {
        var value = status.Trim().ToUpperInvariant();
        return value switch
        {
            "REQUESTED" or "CONFIRMED" => value,
            _ => throw new ArgumentException("New appointments may start as REQUESTED or CONFIRMED.")
        };
    }

    private static bool IsValidTransition(string current, string target)
    {
        if (current == target) return true;
        return current switch
        {
            "REQUESTED" => target is "CONFIRMED" or "CANCELLED",
            "CONFIRMED" => target is "ARRIVED" or "RESCHEDULED" or "CANCELLED" or "NO_SHOW",
            "ARRIVED" => target is "IN_SERVICE" or "CANCELLED" or "NO_SHOW",
            "IN_SERVICE" => target is "COMPLETED",
            "RESCHEDULED" => target is "CONFIRMED" or "CANCELLED",
            "COMPLETED" => false,
            "CANCELLED" => false,
            "NO_SHOW" => false,
            _ => false
        };
    }

    private static void ValidateProfessional(ProfessionalRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 200)
            throw new ArgumentException("Professional name is required and must be at most 200 characters.");
    }

    private static void ValidateService(ServiceRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 200)
            throw new ArgumentException("Service name is required and must be at most 200 characters.");
        if (input.DurationMinutes <= 0 || input.DurationMinutes > 1440)
            throw new ArgumentException("DurationMinutes must be between 1 and 1440.");
        if (input.Price < 0)
            throw new ArgumentException("Price cannot be negative.");
        if (string.IsNullOrWhiteSpace(input.Currency) || input.Currency.Trim().Length != 3)
            throw new ArgumentException("Currency must be a 3-letter code.");
    }

    private static void ValidateAppointment(AppointmentRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.CustomerId) ||
            string.IsNullOrWhiteSpace(input.ProfessionalId) ||
            string.IsNullOrWhiteSpace(input.ServiceId))
            throw new ArgumentException("CustomerId, ProfessionalId and ServiceId are required.");
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Add(SqliteCommand command, string name, object value)
        => command.Parameters.AddWithValue(name, value);
}

public static class CompanyAgendaApi
{
    public static void MapCompanyAgendaApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/agenda/professionals", async (
            HttpRequest request, string companyId, ProfessionalRequest input,
            CompanyAgendaStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var professional = await store.CreateProfessionalAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(companyId, "AGENDA_PROFESSIONAL_CREATED", Actor(request),
                    Correlation(request), "PROFESSIONAL", professional.ProfessionalId,
                    "Agenda professional created.", JsonSerializer.Serialize(new { professional.Name }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/professionals/{professional.ProfessionalId}",
                    new { professional });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/services", async (
            HttpRequest request, string companyId, ServiceRequest input,
            CompanyAgendaStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration)) return Results.Unauthorized();
            try
            {
                var service = await store.CreateServiceAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(companyId, "AGENDA_SERVICE_CREATED", Actor(request),
                    Correlation(request), "SERVICE", service.ServiceId,
                    "Agenda service created.", JsonSerializer.Serialize(new { service.Name, service.DurationMinutes }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/services/{service.ServiceId}",
                    new { service });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/schedule-rules", async (
            HttpRequest request, string companyId, ScheduleRuleRequest input,
            CompanyAgendaStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var rule = await store.CreateScheduleRuleAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(companyId, "AGENDA_SCHEDULE_RULE_CREATED", Actor(request),
                    Correlation(request), "SCHEDULE_RULE", rule.RuleId,
                    "Agenda schedule rule created.", JsonSerializer.Serialize(new { rule.ProfessionalId, rule.Start, rule.End, rule.Kind }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/schedule-rules/{rule.RuleId}",
                    new { rule });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/appointments", async (
            HttpRequest request, string companyId, AppointmentRequest input,
            CompanyAgendaStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var appointment = await store.CreateAppointmentAsync(companyId, input, Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "APPOINTMENT_CREATED", Actor(request),
                    Correlation(request), "APPOINTMENT", appointment.AppointmentId,
                    "Appointment created.", JsonSerializer.Serialize(new
                    {
                        appointment.CustomerId, appointment.ProfessionalId, appointment.ServiceId,
                        appointment.Start, appointment.End, appointment.Status
                    }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/appointments/{appointment.AppointmentId}",
                    new { appointment });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/agenda/appointments", async (
            HttpRequest request, string companyId, DateTimeOffset from, DateTimeOffset to,
            string? professionalId, string? customerId, string? status,
            CompanyAgendaStore store, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            if (to <= from) return Results.BadRequest(new { error = "to must be after from." });
            var appointments = await store.ListAppointmentsAsync(companyId, from, to, professionalId, customerId, status, ct);
            return Results.Ok(new { appointments, count = appointments.Count });
        });

        app.MapGet("/api/company/v1/companies/{companyId}/agenda/appointments/{appointmentId}", async (
            HttpRequest request, string companyId, string appointmentId,
            CompanyAgendaStore store, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(appointmentId)) return Results.Unauthorized();
            var appointment = await store.GetAppointmentAsync(companyId, appointmentId, ct);
            return appointment is null ? Results.NotFound() : Results.Ok(new { appointment });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/appointments/{appointmentId}/status", async (
            HttpRequest request, string companyId, string appointmentId,
            AppointmentStatus status, string? reason,
            CompanyAgendaStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(appointmentId)) return Results.Unauthorized();
            try
            {
                var appointment = await store.ChangeStatusAsync(companyId, appointmentId, status, reason ?? "", Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "APPOINTMENT_STATUS_CHANGED", Actor(request),
                    Correlation(request), "APPOINTMENT", appointment.AppointmentId,
                    "Appointment status changed.", JsonSerializer.Serialize(new { appointment.Status }), ct);
                return Results.Ok(new { appointment });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });
    }

    private static bool Authorized(HttpRequest request, IConfiguration configuration)
    {
        var expected = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(expected) && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(expected), System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool Safe(string? value)
        => !string.IsNullOrWhiteSpace(value) && value.Length <= 100 &&
           value.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.');

    private static string Actor(HttpRequest request)
    {
        var actor = request.Headers["X-Brain-Actor"].ToString();
        return string.IsNullOrWhiteSpace(actor) || actor.Length > 100 ? "company-admin" : actor;
    }

    private static string Correlation(HttpRequest request)
        => request.Headers["X-Correlation-Id"].ToString();
}
