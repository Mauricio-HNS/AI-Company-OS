using Microsoft.Data.Sqlite;
using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record AgendaResource(
    string ResourceId,
    string CompanyId,
    string Name,
    string Type,
    bool Active,
    DateTimeOffset CreatedAt);

public sealed record AgendaResourceRequest(
    string Name,
    string Type = "ROOM",
    bool Active = true);

public enum WaitlistStatus
{
    Waiting,
    Fulfilled,
    Cancelled
}

public sealed record AgendaWaitlistEntry(
    string WaitlistId,
    string CompanyId,
    string CustomerId,
    string CustomerName,
    string ServiceId,
    string ServiceName,
    string? ProfessionalId,
    DateTimeOffset PreferredFrom,
    DateTimeOffset PreferredTo,
    string Status,
    string Notes,
    DateTimeOffset CreatedAt);

public sealed record WaitlistRequest(
    string CustomerId,
    string ServiceId,
    DateTimeOffset PreferredFrom,
    DateTimeOffset PreferredTo,
    string? ProfessionalId = null,
    string? Notes = null);

public sealed record RescheduleRequest(
    DateTimeOffset Start,
    string? Reason = null,
    string? ResourceId = null);

public sealed class CompanyAgendaAdvancedStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyAgendaAdvancedStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_agenda_resources (
                resource_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS ux_agenda_resources_company_name
                ON company_agenda_resources(company_id, name);

            CREATE INDEX IF NOT EXISTS ix_agenda_resources_company
                ON company_agenda_resources(company_id, active, name);

            CREATE TABLE IF NOT EXISTS company_agenda_waitlist (
                waitlist_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                service_id TEXT NOT NULL,
                service_name TEXT NOT NULL,
                professional_id TEXT,
                preferred_from TEXT NOT NULL,
                preferred_to TEXT NOT NULL,
                status TEXT NOT NULL,
                notes TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_agenda_waitlist_company_status
                ON company_agenda_waitlist(company_id, status, preferred_from);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<AgendaResource> CreateResourceAsync(
        string companyId, AgendaResourceRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Name) || input.Name.Trim().Length > 150)
            throw new ArgumentException("Resource name is required and must be at most 150 characters.");
        if (string.IsNullOrWhiteSpace(input.Type) || input.Type.Trim().Length > 50)
            throw new ArgumentException("Resource type is required.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            var resource = new AgendaResource(
                $"RES-{Guid.NewGuid():N}", companyId, input.Name.Trim(),
                input.Type.Trim().ToUpperInvariant(), input.Active, DateTimeOffset.UtcNow);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_agenda_resources
                    (resource_id, company_id, name, type, active, created_at)
                VALUES ($id,$company,$name,$type,$active,$created);
                """;
            Add(command, "$id", resource.ResourceId);
            Add(command, "$company", companyId);
            Add(command, "$name", resource.Name);
            Add(command, "$type", resource.Type);
            Add(command, "$active", resource.Active ? 1 : 0);
            Add(command, "$created", resource.CreatedAt.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);
            return resource;
        }
        catch (SqliteException e) when (e.SqliteErrorCode == 19)
        {
            throw new ArgumentException("A resource with the same name already exists in this company.");
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<AgendaResource>> ListResourcesAsync(
        string companyId, CancellationToken ct)
    {
        var result = new List<AgendaResource>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT resource_id, company_id, name, type, active, created_at
            FROM company_agenda_resources
            WHERE company_id=$company
            ORDER BY name COLLATE NOCASE;
            """;
        Add(command, "$company", companyId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            result.Add(new AgendaResource(
                reader.GetString(0), reader.GetString(1), reader.GetString(2),
                reader.GetString(3), reader.GetInt32(4) == 1,
                DateTimeOffset.Parse(reader.GetString(5))));
        }
        return result;
    }

    public async Task<AgendaWaitlistEntry> AddWaitlistAsync(
        string companyId, WaitlistRequest input, CancellationToken ct)
    {
        if (input.PreferredTo <= input.PreferredFrom)
            throw new ArgumentException("PreferredTo must be after PreferredFrom.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);

            var customer = await LoadCustomerAsync(connection, companyId, input.CustomerId, ct)
                ?? throw new ArgumentException("Customer does not exist in this company.");
            var service = await LoadServiceAsync(connection, companyId, input.ServiceId, ct)
                ?? throw new ArgumentException("Service does not exist or is inactive.");

            if (!string.IsNullOrWhiteSpace(input.ProfessionalId) &&
                !await ProfessionalExistsAsync(connection, companyId, input.ProfessionalId!, ct))
                throw new ArgumentException("Professional does not exist or is inactive.");

            var entry = new AgendaWaitlistEntry(
                $"WAIT-{Guid.NewGuid():N}", companyId, customer.Value.Id, customer.Value.Name,
                service.Value.Id, service.Value.Name, Normalize(input.ProfessionalId),
                input.PreferredFrom, input.PreferredTo, "WAITING",
                input.Notes?.Trim() ?? "", DateTimeOffset.UtcNow);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_agenda_waitlist(
                    waitlist_id, company_id, customer_id, customer_name,
                    service_id, service_name, professional_id,
                    preferred_from, preferred_to, status, notes, created_at)
                VALUES($id,$company,$customer,$customerName,$service,$serviceName,
                       $professional,$from,$to,$status,$notes,$created);
                """;
            Add(command, "$id", entry.WaitlistId);
            Add(command, "$company", companyId);
            Add(command, "$customer", entry.CustomerId);
            Add(command, "$customerName", entry.CustomerName);
            Add(command, "$service", entry.ServiceId);
            Add(command, "$serviceName", entry.ServiceName);
            Add(command, "$professional", (object?)entry.ProfessionalId ?? DBNull.Value);
            Add(command, "$from", entry.PreferredFrom.ToString("O"));
            Add(command, "$to", entry.PreferredTo.ToString("O"));
            Add(command, "$status", entry.Status);
            Add(command, "$notes", entry.Notes);
            Add(command, "$created", entry.CreatedAt.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);
            return entry;
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<AgendaWaitlistEntry>> ListWaitlistAsync(
        string companyId, string? status, CancellationToken ct)
    {
        var result = new List<AgendaWaitlistEntry>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT waitlist_id, company_id, customer_id, customer_name,
                   service_id, service_name, professional_id,
                   preferred_from, preferred_to, status, notes, created_at
            FROM company_agenda_waitlist
            WHERE company_id=$company
              AND ($status='' OR status=$status)
            ORDER BY preferred_from;
            """;
        Add(command, "$company", companyId);
        Add(command, "$status", status?.Trim().ToUpperInvariant() ?? "");
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            result.Add(new AgendaWaitlistEntry(
                reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
                reader.GetString(4), reader.GetString(5), reader.IsDBNull(6) ? null : reader.GetString(6),
                DateTimeOffset.Parse(reader.GetString(7)), DateTimeOffset.Parse(reader.GetString(8)),
                reader.GetString(9), reader.GetString(10), DateTimeOffset.Parse(reader.GetString(11))));
        }
        return result;
    }

    public async Task<Appointment> RescheduleAsync(
        string companyId, string appointmentId, RescheduleRequest input,
        string actor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(appointmentId))
            throw new ArgumentException("AppointmentId is required.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var tx = await connection.BeginTransactionAsync(ct);

            var current = await LoadAppointmentAsync(connection, tx, companyId, appointmentId, ct)
                ?? throw new ArgumentException("Appointment does not exist.");

            if (current.Status is "COMPLETED" or "CANCELLED" or "NO_SHOW")
                throw new ArgumentException("This appointment cannot be rescheduled from its current status.");

            var end = input.Start.AddMinutes(current.DurationMinutes);
            var resourceId = Normalize(input.ResourceId) ?? current.ResourceId;

            if (!await IsWithinWorkingScheduleAsync(connection, tx, companyId,
                current.ProfessionalId, input.Start, end, ct))
                throw new ArgumentException("The professional is not available during the new period.");

            if (await HasConflictAsync(connection, tx, companyId, current.ProfessionalId,
                input.Start, end, resourceId, appointmentId, ct))
                throw new ArgumentException("There is an appointment conflict for the new period.");

            var now = DateTimeOffset.UtcNow;
            await using var command = connection.CreateCommand();
            command.Transaction = tx;
            command.CommandText = """
                UPDATE company_appointments
                SET start_at=$start, end_at=$end, resource_id=$resource,
                    status='CONFIRMED', updated_at=$updated
                WHERE company_id=$company AND appointment_id=$id;
                """;
            Add(command, "$start", input.Start.ToString("O"));
            Add(command, "$end", end.ToString("O"));
            Add(command, "$resource", (object?)resourceId ?? DBNull.Value);
            Add(command, "$updated", now.ToString("O"));
            Add(command, "$company", companyId);
            Add(command, "$id", appointmentId);
            await command.ExecuteNonQueryAsync(ct);

            var updated = current with
            {
                Start = input.Start,
                End = end,
                ResourceId = resourceId,
                Status = "CONFIRMED",
                UpdatedAt = now
            };

            await InsertHistoryAsync(connection, tx, updated, current.Status, "RESCHEDULED",
                input.Reason?.Trim() ?? "Appointment rescheduled.", actor, ct);
            await InsertHistoryAsync(connection, tx, updated, "RESCHEDULED", "CONFIRMED",
                "Appointment confirmed at the new time.", actor, ct);

            await tx.CommitAsync(ct);
            return updated;
        }
        finally { _gate.Release(); }
    }

    private static async Task<bool> HasConflictAsync(
        SqliteConnection connection, SqliteTransaction tx, string companyId,
        string professionalId, DateTimeOffset start, DateTimeOffset end,
        string? resourceId, string excludedAppointmentId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            SELECT COUNT(*)
            FROM company_appointments
            WHERE company_id=$company
              AND appointment_id<>$excluded
              AND status NOT IN ('CANCELLED','NO_SHOW')
              AND start_at < $end AND end_at > $start
              AND (
                    professional_id=$professional
                    OR ($resource IS NOT NULL AND $resource<>'' AND resource_id=$resource)
                  );
            """;
        Add(command, "$company", companyId);
        Add(command, "$excluded", excludedAppointmentId);
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
                      AND kind='WORKING' AND start_at <= $start AND end_at >= $end
                )
                AND NOT EXISTS(
                    SELECT 1 FROM company_schedule_rules
                    WHERE company_id=$company AND professional_id=$professional
                      AND kind='BLOCKED' AND start_at < $end AND end_at > $start
                );
            """;
        Add(command, "$company", companyId);
        Add(command, "$professional", professionalId);
        Add(command, "$start", start.ToString("O"));
        Add(command, "$end", end.ToString("O"));
        return Convert.ToInt32(await command.ExecuteScalarAsync(ct)) == 1;
    }

    private static async Task<Appointment?> LoadAppointmentAsync(
        SqliteConnection connection, SqliteTransaction tx,
        string companyId, string id, CancellationToken ct)
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
        if (!await reader.ReadAsync(ct)) return null;
        return new Appointment(
            reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
            reader.GetString(4), reader.GetString(5), reader.GetString(6), reader.GetString(7),
            reader.GetInt32(8), DateTimeOffset.Parse(reader.GetString(9)), DateTimeOffset.Parse(reader.GetString(10)),
            reader.IsDBNull(11) ? null : reader.GetString(11), reader.GetString(12), reader.GetString(13),
            DateTimeOffset.Parse(reader.GetString(14)), DateTimeOffset.Parse(reader.GetString(15)), reader.GetString(16));
    }

    private static async Task<(string Id, string Name)?> LoadCustomerAsync(
        SqliteConnection connection, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT customer_id,name FROM company_customers WHERE company_id=$company AND customer_id=$id AND status <> 'BLOCKED' LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task<(string Id, string Name)?> LoadServiceAsync(
        SqliteConnection connection, string companyId, string id, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT service_id,name FROM company_services WHERE company_id=$company AND service_id=$id AND active=1 LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", id);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
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

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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

    private static void Add(SqliteCommand command, string name, object value)
        => command.Parameters.AddWithValue(name, value);
}

public static class CompanyAgendaAdvancedApi
{
    public static void MapCompanyAgendaAdvancedApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/agenda/resources", async (
            HttpRequest request, string companyId, AgendaResourceRequest input,
            CompanyAgendaAdvancedStore store, CloudStore audit,
            IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var resource = await store.CreateResourceAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(companyId, "AGENDA_RESOURCE_CREATED", Actor(request),
                    Correlation(request), "AGENDA_RESOURCE", resource.ResourceId,
                    "Agenda resource created.", JsonSerializer.Serialize(new { resource.Name, resource.Type }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/resources/{resource.ResourceId}",
                    new { resource });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/agenda/resources", async (
            HttpRequest request, string companyId, CompanyAgendaAdvancedStore store,
            IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            var resources = await store.ListResourcesAsync(companyId, ct);
            return Results.Ok(new { resources, count = resources.Count });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/waitlist", async (
            HttpRequest request, string companyId, WaitlistRequest input,
            CompanyAgendaAdvancedStore store, CloudStore audit,
            IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var entry = await store.AddWaitlistAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(companyId, "WAITLIST_ADDED", Actor(request),
                    Correlation(request), "WAITLIST", entry.WaitlistId,
                    "Customer added to agenda waitlist.", JsonSerializer.Serialize(new
                    {
                        entry.CustomerId, entry.ServiceId, entry.ProfessionalId,
                        entry.PreferredFrom, entry.PreferredTo
                    }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/agenda/waitlist/{entry.WaitlistId}",
                    new { entry });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/agenda/waitlist", async (
            HttpRequest request, string companyId, string? status,
            CompanyAgendaAdvancedStore store, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            var entries = await store.ListWaitlistAsync(companyId, status, ct);
            return Results.Ok(new { entries, count = entries.Count });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/agenda/appointments/{appointmentId}/reschedule", async (
            HttpRequest request, string companyId, string appointmentId, RescheduleRequest input,
            CompanyAgendaAdvancedStore store, CloudStore audit,
            IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(appointmentId))
                return Results.Unauthorized();
            try
            {
                var appointment = await store.RescheduleAsync(
                    companyId, appointmentId, input, Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "APPOINTMENT_RESCHEDULED", Actor(request),
                    Correlation(request), "APPOINTMENT", appointment.AppointmentId,
                    "Appointment rescheduled.", JsonSerializer.Serialize(new
                    {
                        appointment.Start, appointment.End, appointment.ResourceId
                    }), ct);
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
                System.Text.Encoding.UTF8.GetBytes(expected),
                System.Text.Encoding.UTF8.GetBytes(provided));
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
