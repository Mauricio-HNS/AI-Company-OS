namespace CompanyBrain.Api;

public enum AdministrativeAutonomyLevel
{
    Observe = 0,
    Analyze = 1,
    Recommend = 2,
    ApprovalRequired = 3,
    LimitedAutonomy = 4,
    OperationalAutonomy = 5
}

public sealed record CompanyAutonomyPolicy(
    string CompanyId,
    AdministrativeAutonomyLevel Level,
    double TrustScore,
    int AcceptedRecommendations,
    int RejectedRecommendations,
    int SuccessfulExecutions,
    int FailedExecutions,
    DateTimeOffset UpdatedAt,
    string UpdatedBy);

public sealed record CompanyAutonomyUpdateRequest(
    AdministrativeAutonomyLevel Level,
    string Reason);

public sealed record AutonomyAssessment(
    string CompanyId,
    AdministrativeAutonomyLevel CurrentLevel,
    AdministrativeAutonomyLevel SuggestedLevel,
    double TrustScore,
    string[] Evidence,
    string[] Reasons,
    bool RequiresOwnerAcceptance,
    DateTimeOffset AssessedAt);

public sealed class AutonomyStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public AutonomyStore(IConfiguration configuration)
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
        using var connection = new Microsoft.Data.Sqlite.SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS company_autonomy_policies (
                company_id TEXT PRIMARY KEY,
                level INTEGER NOT NULL,
                trust_score REAL NOT NULL DEFAULT 0,
                accepted_recommendations INTEGER NOT NULL DEFAULT 0,
                rejected_recommendations INTEGER NOT NULL DEFAULT 0,
                successful_executions INTEGER NOT NULL DEFAULT 0,
                failed_executions INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                updated_by TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CompanyAutonomyPolicy> GetOrCreateAsync(string companyId, CancellationToken cancellationToken)
    {
        await using var connection = new Microsoft.Data.Sqlite.SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT company_id, level, trust_score, accepted_recommendations,
                   rejected_recommendations, successful_executions, failed_executions,
                   updated_at, updated_by
            FROM company_autonomy_policies
            WHERE company_id = $company
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$company", companyId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
            return Read(reader);

        var created = new CompanyAutonomyPolicy(
            companyId,
            AdministrativeAutonomyLevel.Observe,
            0,
            0, 0, 0, 0,
            DateTimeOffset.UtcNow,
            "system");

        await SaveAsync(created, cancellationToken);
        return created;
    }

    public async Task SaveAsync(CompanyAutonomyPolicy policy, CancellationToken cancellationToken)
    {
        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new Microsoft.Data.Sqlite.SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_autonomy_policies(
                    company_id, level, trust_score, accepted_recommendations,
                    rejected_recommendations, successful_executions, failed_executions,
                    updated_at, updated_by)
                VALUES($company, $level, $trust, $accepted, $rejected, $successes, $failures, $updated, $by)
                ON CONFLICT(company_id) DO UPDATE SET
                    level = excluded.level,
                    trust_score = excluded.trust_score,
                    accepted_recommendations = excluded.accepted_recommendations,
                    rejected_recommendations = excluded.rejected_recommendations,
                    successful_executions = excluded.successful_executions,
                    failed_executions = excluded.failed_executions,
                    updated_at = excluded.updated_at,
                    updated_by = excluded.updated_by;
                """;
            command.Parameters.AddWithValue("$company", policy.CompanyId);
            command.Parameters.AddWithValue("$level", (int)policy.Level);
            command.Parameters.AddWithValue("$trust", policy.TrustScore);
            command.Parameters.AddWithValue("$accepted", policy.AcceptedRecommendations);
            command.Parameters.AddWithValue("$rejected", policy.RejectedRecommendations);
            command.Parameters.AddWithValue("$successes", policy.SuccessfulExecutions);
            command.Parameters.AddWithValue("$failures", policy.FailedExecutions);
            command.Parameters.AddWithValue("$updated", policy.UpdatedAt.ToString("O"));
            command.Parameters.AddWithValue("$by", policy.UpdatedBy);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task RecordRecommendationAsync(string companyId, bool accepted, CancellationToken cancellationToken)
    {
        var policy = await GetOrCreateAsync(companyId, cancellationToken);
        var updated = policy with
        {
            AcceptedRecommendations = policy.AcceptedRecommendations + (accepted ? 1 : 0),
            RejectedRecommendations = policy.RejectedRecommendations + (accepted ? 0 : 1),
            TrustScore = RecalculateTrust(
                policy.AcceptedRecommendations + (accepted ? 1 : 0),
                policy.RejectedRecommendations + (accepted ? 0 : 1),
                policy.SuccessfulExecutions,
                policy.FailedExecutions),
            UpdatedAt = DateTimeOffset.UtcNow,
            UpdatedBy = "owner-decision"
        };
        await SaveAsync(updated, cancellationToken);
    }

    public async Task RecordExecutionAsync(string companyId, bool successful, CancellationToken cancellationToken)
    {
        var policy = await GetOrCreateAsync(companyId, cancellationToken);
        var updated = policy with
        {
            SuccessfulExecutions = policy.SuccessfulExecutions + (successful ? 1 : 0),
            FailedExecutions = policy.FailedExecutions + (successful ? 0 : 1),
            TrustScore = RecalculateTrust(
                policy.AcceptedRecommendations,
                policy.RejectedRecommendations,
                policy.SuccessfulExecutions + (successful ? 1 : 0),
                policy.FailedExecutions + (successful ? 0 : 1)),
            UpdatedAt = DateTimeOffset.UtcNow,
            UpdatedBy = "execution-result"
        };
        await SaveAsync(updated, cancellationToken);
    }

    public async Task<AutonomyAssessment> AssessAsync(string companyId, CancellationToken cancellationToken)
    {
        var policy = await GetOrCreateAsync(companyId, cancellationToken);
        var evidence = new List<string>();
        var reasons = new List<string>();

        var suggested = policy.Level;
        var positive = policy.AcceptedRecommendations + policy.SuccessfulExecutions;
        var negative = policy.RejectedRecommendations + policy.FailedExecutions;

        if (positive >= 10 && negative == 0 && policy.TrustScore >= 0.90 && policy.Level < AdministrativeAutonomyLevel.LimitedAutonomy)
        {
            suggested = policy.Level + 1;
            evidence.Add("At least 10 positive outcomes with no recorded negative outcomes.");
            reasons.Add("The observed decision history supports a cautious increase in autonomy.");
        }
        else if (negative >= 3 || policy.TrustScore < 0.60)
        {
            suggested = policy.Level == AdministrativeAutonomyLevel.Observe
                ? AdministrativeAutonomyLevel.Observe
                : policy.Level - 1;
            evidence.Add("Negative outcomes or reduced trust were observed.");
            reasons.Add("Autonomy should be reduced until the operating pattern is understood.");
        }
        else
        {
            evidence.Add("Current evidence is insufficient for an automatic autonomy change.");
            reasons.Add("Keep the current level and continue collecting evidence.");
        }

        return new AutonomyAssessment(
            companyId,
            policy.Level,
            suggested,
            policy.TrustScore,
            evidence.ToArray(),
            reasons.ToArray(),
            suggested != policy.Level,
            DateTimeOffset.UtcNow);
    }

    private static double RecalculateTrust(int accepted, int rejected, int successes, int failures)
    {
        var positive = accepted + successes;
        var negative = rejected + failures;
        var total = positive + negative;
        if (total == 0)
            return 0;

        return Math.Round((double)positive / total, 4);
    }

    private static CompanyAutonomyPolicy Read(Microsoft.Data.Sqlite.SqliteDataReader reader)
        => new(
            reader.GetString(0),
            (AdministrativeAutonomyLevel)reader.GetInt32(1),
            reader.GetDouble(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.GetInt32(5),
            reader.GetInt32(6),
            DateTimeOffset.Parse(reader.GetString(7)),
            reader.GetString(8));
}
