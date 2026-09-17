using Microsoft.Data.Sqlite;
using System.Security.Cryptography;
using System.Text;

namespace CompanyBrain.Api;

public sealed record EnrollmentResult(string CompanyId, string DeviceId, string ApiKey);
public sealed record StoredEvent(string EventId, string CompanyId, string DeviceId, string Envelope, DateTimeOffset ReceivedAt);

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
                received_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_events_company_received
                ON events(company_id, received_at);
            """;
        command.ExecuteNonQuery();
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

    public async Task<int> GetEventCountAsync(string companyId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM events WHERE company_id = $company";
        command.Parameters.AddWithValue("$company", companyId);
        return Convert.ToInt32(await command.ExecuteScalarAsync(cancellationToken));
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
