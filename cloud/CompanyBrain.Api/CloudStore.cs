using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text;

namespace CompanyBrain.Api;

public sealed record EnrollmentResult(string CompanyId, string DeviceId, string ApiKey);
public sealed record BrainDecisionAudit(string AuditId, string DecisionId, string CompanyId, string Action, string Actor, string? Reason, DateTimeOffset CreatedAt);
public sealed record StoredEvent(string EventId, string CompanyId, string DeviceId, string Envelope, DateTimeOffset ReceivedAt);
public sealed record MemoryProvenance(string CompanyId, string DeviceId, string SourceId, string SourceType);

public sealed class CloudStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CloudStore(IConfiguration configuration)
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
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS devices (
                company_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                api_key_hash TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_seen_at TEXT,
                PRIMARY KEY (company_id, device_id)
            );
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                device_id TEXT NOT NULL,
                envelope TEXT NOT NULL,
                received_at TEXT NOT NULL,
                processed_at TEXT
            );
            CREATE INDEX IF NOT EXISTS ix_events_company_received
                ON events(company_id, received_at);
            CREATE TABLE IF NOT EXISTS brain_decisions (
                decision_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                objective TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                confidence REAL NOT NULL,
                approval_required INTEGER NOT NULL,
                preconditions TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_brain_decisions_company_status
                ON brain_decisions(company_id, status, created_at);
            CREATE TABLE IF NOT EXISTS brain_decision_audit (
                audit_id TEXT PRIMARY KEY,
                decision_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                reason TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_brain_decision_audit_decision
                ON brain_decision_audit(decision_id, created_at);
            """;
        command.ExecuteNonQuery();

        using var migration = connection.CreateCommand();
        migration.CommandText = "ALTER TABLE events ADD COLUMN processed_at TEXT";
        try { migration.ExecuteNonQuery(); } catch (SqliteException ex) when (ex.SqliteErrorCode == 1) { }
    }

    public async Task<EnrollmentResult?> EnrollAsync(string companyId, string deviceId, string enrollmentToken, string configuredEnrollmentToken, CancellationToken cancellationToken)
    {
        if (!FixedEquals(enrollmentToken, configuredEnrollmentToken))
            return null;

        var apiKey = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var hash = Hash(apiKey);
        var now = DateTimeOffset.UtcNow.ToString("O");

        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO devices(company_id, device_id, api_key_hash, status, created_at, last_seen_at)
                VALUES($company, $device, $hash, 'ACTIVE', $created, $created)
                ON CONFLICT(company_id, device_id) DO UPDATE SET
                    api_key_hash = excluded.api_key_hash,
                    status = 'ACTIVE',
                    last_seen_at = excluded.last_seen_at;
                """;
            command.Parameters.AddWithValue("$company", companyId);
            command.Parameters.AddWithValue("$device", deviceId);
            command.Parameters.AddWithValue("$hash", hash);
            command.Parameters.AddWithValue("$created", now);
            await command.ExecuteNonQueryAsync(cancellationToken);
            return new EnrollmentResult(companyId, deviceId, apiKey);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<bool> IsDeviceAuthorizedAsync(string companyId, string deviceId, string apiKey, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT api_key_hash FROM devices
            WHERE company_id = $company AND device_id = $device AND status = 'ACTIVE'
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$device", deviceId);
        var stored = await command.ExecuteScalarAsync(cancellationToken) as string;
        if (stored is null || !FixedEquals(stored, Hash(apiKey)))
            return false;

        await using var touch = connection.CreateCommand();
        touch.CommandText = "UPDATE devices SET last_seen_at = $seen WHERE company_id = $company AND device_id = $device";
        touch.Parameters.AddWithValue("$seen", DateTimeOffset.UtcNow.ToString("O"));
        touch.Parameters.AddWithValue("$company", companyId);
        touch.Parameters.AddWithValue("$device", deviceId);
        await touch.ExecuteNonQueryAsync(cancellationToken);
        return true;
    }

    public async Task<bool> AppendEventIfNewAsync(StoredEvent item, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT OR IGNORE INTO events(event_id, company_id, device_id, envelope, received_at)
                VALUES($id, $company, $device, $envelope, $received);
                SELECT changes();
                """;
            command.Parameters.AddWithValue("$id", item.EventId);
            command.Parameters.AddWithValue("$company", item.CompanyId);
            command.Parameters.AddWithValue("$device", item.DeviceId);
            command.Parameters.AddWithValue("$envelope", item.Envelope);
            command.Parameters.AddWithValue("$received", item.ReceivedAt.ToString("O"));
            var changes = Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
            return changes == 1;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyList<StoredEvent>> GetUnprocessedEventsAsync(int limit, CancellationToken cancellationToken)
    {
        var items = new List<StoredEvent>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT event_id, company_id, device_id, envelope, received_at
            FROM events
            WHERE processed_at IS NULL
            ORDER BY received_at
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 500));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new StoredEvent(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                DateTimeOffset.Parse(reader.GetString(4))));
        }
        return items;
    }

    public async Task MarkEventProcessedAsync(string eventId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE events SET processed_at = $processed WHERE event_id = $id AND processed_at IS NULL";
        command.Parameters.AddWithValue("$processed", DateTimeOffset.UtcNow.ToString("O"));
        command.Parameters.AddWithValue("$id", eventId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task SaveMemoryAsync(BrainMemory memory, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS memories (
                memory_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                statement TEXT NOT NULL,
                context TEXT NOT NULL,
                source TEXT NOT NULL,
                source_id TEXT NOT NULL DEFAULT '',
                source_type TEXT NOT NULL DEFAULT 'UNKNOWN',
                device_id TEXT NOT NULL DEFAULT '',
                observed_at TEXT NOT NULL,
                confidence REAL NOT NULL
            );
            INSERT OR REPLACE INTO memories(memory_id, company_id, statement, context, source, source_id, source_type, device_id, observed_at, confidence)
            VALUES($id, $company, $statement, $context, $source, $sourceId, $sourceType, $deviceId, $observed, $confidence);
            """;
        command.Parameters.AddWithValue("$id", memory.MemoryId);
        command.Parameters.AddWithValue("$company", memory.CompanyId);
        command.Parameters.AddWithValue("$statement", memory.Statement);
        command.Parameters.AddWithValue("$context", memory.Context);
        command.Parameters.AddWithValue("$source", memory.Source);
        command.Parameters.AddWithValue("$sourceId", memory.SourceId);
        command.Parameters.AddWithValue("$sourceType", memory.SourceType);
        command.Parameters.AddWithValue("$deviceId", memory.DeviceId);
        command.Parameters.AddWithValue("$observed", memory.ObservedAt.ToString("O"));
        command.Parameters.AddWithValue("$confidence", memory.Confidence);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BrainMemory>> GetMemoriesAsync(string companyId, int limit, CancellationToken cancellationToken)
    {
        var items = new List<BrainMemory>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT memory_id, company_id, statement, context, source, observed_at, confidence
            FROM memories
            WHERE company_id = $company
            ORDER BY observed_at DESC
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 200));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new BrainMemory(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                DateTimeOffset.Parse(reader.GetString(5)),
                reader.GetDouble(6)));
        }
        return items;
    }

    public async Task SaveExecutionMemoriesAsync(AgentExecutionResult result, CancellationToken cancellationToken)
    {
        var now = result.ExecutedAt;
        var index = 0;

        foreach (var observation in result.Observations)
        {
            if (string.IsNullOrWhiteSpace(observation))
                continue;

            index++;
            await SaveMemoryAsync(new BrainMemory(
                $"EXEC-{result.ExecutionId}-{index}",
                result.CompanyId,
                $"Execution observation: {observation.Trim()}",
                $"Generated by execution {result.ExecutionId} for decision {result.DecisionId}.",
                "agent-runtime",
                now,
                0.85d), cancellationToken);
        }

        foreach (var nextStep in result.NextSteps)
        {
            if (string.IsNullOrWhiteSpace(nextStep))
                continue;

            index++;
            await SaveMemoryAsync(new BrainMemory(
                $"EXEC-{result.ExecutionId}-{index}",
                result.CompanyId,
                $"Recommended next step: {nextStep.Trim()}",
                $"Generated by execution {result.ExecutionId} for decision {result.DecisionId}.",
                "agent-runtime",
                now,
                0.75d), cancellationToken);
        }
    }

    public async Task<int> GetMemoryCountAsync(string companyId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM memories WHERE company_id = $company";
        command.Parameters.AddWithValue("$company", companyId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }

    public async Task<int> GetEventCountAsync(string companyId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM events WHERE company_id = $company";
        command.Parameters.AddWithValue("$company", companyId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
    }

    public async Task SaveDecisionAsync(BrainDecision decision, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS brain_decisions (
                decision_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                objective TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                confidence REAL NOT NULL,
                approval_required INTEGER NOT NULL,
                preconditions TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            INSERT OR REPLACE INTO brain_decisions(
                decision_id, company_id, objective, action, reason, risk_level,
                confidence, approval_required, preconditions, status, created_at)
            VALUES(
                $id, $company, $objective, $action, $reason, $risk,
                $confidence, $approval, $preconditions, $status, $created);
            """;
        command.Parameters.AddWithValue("$id", decision.DecisionId);
        command.Parameters.AddWithValue("$company", decision.CompanyId);
        command.Parameters.AddWithValue("$objective", decision.Objective);
        command.Parameters.AddWithValue("$action", decision.Action);
        command.Parameters.AddWithValue("$reason", decision.Reason);
        command.Parameters.AddWithValue("$risk", decision.RiskLevel);
        command.Parameters.AddWithValue("$confidence", decision.Confidence);
        command.Parameters.AddWithValue("$approval", decision.ApprovalRequired ? 1 : 0);
        command.Parameters.AddWithValue("$preconditions", System.Text.Json.JsonSerializer.Serialize(decision.Preconditions));
        command.Parameters.AddWithValue("$status", decision.Status);
        command.Parameters.AddWithValue("$created", decision.CreatedAt.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<BrainDecision>> GetDecisionsAsync(string companyId, int limit, CancellationToken cancellationToken)
    {
        var items = new List<BrainDecision>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT decision_id, company_id, objective, action, reason, risk_level,
                   confidence, approval_required, preconditions, status, created_at
            FROM brain_decisions
            WHERE company_id = $company
            ORDER BY created_at DESC
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 100));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var preconditions = System.Text.Json.JsonSerializer.Deserialize<string[]>(reader.GetString(8)) ?? Array.Empty<string>();
            items.Add(new BrainDecision(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetDouble(6),
                reader.GetInt32(7) == 1,
                preconditions,
                reader.GetString(9),
                DateTimeOffset.Parse(reader.GetString(10))));
        }
        return items;
    }

    public async Task<BrainDecision?> GetDecisionAsync(string companyId, string decisionId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT decision_id, company_id, objective, action, reason, risk_level,
                   confidence, approval_required, preconditions, status, created_at
            FROM brain_decisions
            WHERE company_id = $company AND decision_id = $id
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$id", decisionId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var preconditions = System.Text.Json.JsonSerializer.Deserialize<string[]>(reader.GetString(8)) ?? Array.Empty<string>();
        return new BrainDecision(
            reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3),
            reader.GetString(4), reader.GetString(5), reader.GetDouble(6), reader.GetInt32(7) == 1,
            preconditions, reader.GetString(9), DateTimeOffset.Parse(reader.GetString(10)));
    }

    public async Task<bool> UpdateDecisionStatusAsync(
        string companyId,
        string decisionId,
        string expectedStatus,
        string newStatus,
        string actor,
        string? reason,
        CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                UPDATE brain_decisions
                SET status = $status
                WHERE company_id = $company
                  AND decision_id = $id
                  AND status = $expected;
                """;
            command.Parameters.AddWithValue("$status", newStatus);
            command.Parameters.AddWithValue("$company", companyId);
            command.Parameters.AddWithValue("$id", decisionId);
            command.Parameters.AddWithValue("$expected", expectedStatus);
            var changed = await command.ExecuteNonQueryAsync(cancellationToken);

            if (changed != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }

            await using var audit = connection.CreateCommand();
            audit.Transaction = transaction;
            audit.CommandText = """
                INSERT INTO brain_decision_audit(
                    audit_id, decision_id, company_id, action, actor, reason, created_at)
                VALUES($audit, $decision, $company, $action, $actor, $reason, $created);
                """;
            audit.Parameters.AddWithValue("$audit", Guid.NewGuid().ToString("N"));
            audit.Parameters.AddWithValue("$decision", decisionId);
            audit.Parameters.AddWithValue("$company", companyId);
            audit.Parameters.AddWithValue("$action", newStatus);
            audit.Parameters.AddWithValue("$actor", actor);
            audit.Parameters.AddWithValue("$reason", (object?)reason ?? DBNull.Value);
            audit.Parameters.AddWithValue("$created", DateTimeOffset.UtcNow.ToString("O"));
            await audit.ExecuteNonQueryAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyList<BrainDecisionAudit>> GetDecisionAuditAsync(
        string companyId,
        string decisionId,
        CancellationToken cancellationToken)
    {
        var items = new List<BrainDecisionAudit>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT audit_id, decision_id, company_id, action, actor, reason, created_at
            FROM brain_decision_audit
            WHERE company_id = $company AND decision_id = $id
            ORDER BY created_at DESC;
            """;
        command.Parameters.AddWithValue("$company", companyId);
        command.Parameters.AddWithValue("$id", decisionId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(new BrainDecisionAudit(
                reader.GetString(0), reader.GetString(1), reader.GetString(2),
                reader.GetString(3), reader.GetString(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                DateTimeOffset.Parse(reader.GetString(6))));
        }
        return items;
    }


    public async Task SaveExecutionResultAsync(AgentExecutionResult result, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS agent_executions (
                execution_id TEXT PRIMARY KEY,
                decision_id TEXT NOT NULL,
                company_id TEXT NOT NULL,
                status TEXT NOT NULL,
                summary TEXT NOT NULL,
                observations TEXT NOT NULL,
                next_steps TEXT NOT NULL,
                executed_at TEXT NOT NULL
            );
            INSERT OR REPLACE INTO agent_executions(
                execution_id, decision_id, company_id, status, summary, observations, next_steps, executed_at)
            VALUES($execution, $decision, $company, $status, $summary, $observations, $nextSteps, $executed);
            """;
        command.Parameters.AddWithValue("$execution", result.ExecutionId);
        command.Parameters.AddWithValue("$decision", result.DecisionId);
        command.Parameters.AddWithValue("$company", result.CompanyId);
        command.Parameters.AddWithValue("$status", result.Status);
        command.Parameters.AddWithValue("$summary", result.Summary);
        command.Parameters.AddWithValue("$observations", System.Text.Json.JsonSerializer.Serialize(result.Observations));
        command.Parameters.AddWithValue("$nextSteps", System.Text.Json.JsonSerializer.Serialize(result.NextSteps));
        command.Parameters.AddWithValue("$executed", result.ExecutedAt.ToString("O"));
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<string>> GetCompanyIdsAsync(CancellationToken cancellationToken)
    {
        var items = new List<string>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT DISTINCT company_id FROM memories ORDER BY company_id";
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken)) items.Add(reader.GetString(0));
        return items;
    }

    private static string Hash(string value)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private static bool FixedEquals(string left, string right)
    {
        var a = Encoding.UTF8.GetBytes(left);
        var b = Encoding.UTF8.GetBytes(right);
        return CryptographicOperations.FixedTimeEquals(a, b);
    }
}
