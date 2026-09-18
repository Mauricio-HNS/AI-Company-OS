using Microsoft.Data.Sqlite;

namespace CompanyBrain.Api;

public sealed record AgentCapability(string Name, string Description, string[] AllowedActions);
public sealed record AgentAutonomyPolicy(string AgentId, string CompanyId, string[] AllowedCapabilities, string MaxRiskLevel, bool RequiresHumanApproval, int MaxConsecutiveFailures);
public sealed record RegisteredAgent(string AgentId, string Role, string[] Capabilities, bool Enabled);

public sealed class AgentRegistry
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly IReadOnlyList<AgentCapability> _capabilities =
    [
        new AgentCapability("OBSERVE", "Analyze verified company memory without external side effects.", ["OBSERVE"]),
        new AgentCapability("PLAN", "Produce a bounded internal plan without executing external actions.", ["PLAN"])
    ];

    public AgentRegistry(IConfiguration configuration)
    {
        var configured = configuration["CloudStore:ConnectionString"];
        if (string.IsNullOrWhiteSpace(configured))
        {
            var directory = configuration["CloudStore:DataDirectory"] ?? Path.Combine(AppContext.BaseDirectory, "data", "company-brain");
            Directory.CreateDirectory(directory);
            configured = $"Data Source={Path.Combine(directory, "company-brain.db")}";
        }
        _connectionString = configured;
        Initialize();
    }

    public IReadOnlyList<AgentCapability> Capabilities => _capabilities;

    public IReadOnlyList<RegisteredAgent> Agents =>
    [
        new RegisteredAgent("company-analyst", "Business analysis and observation", ["OBSERVE"], true),
        new RegisteredAgent("company-planner", "Planning and bounded replanning", ["PLAN"], true)
    ];

    private void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS agents (
                company_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                role TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY(company_id, agent_id)
            );
            CREATE TABLE IF NOT EXISTS agent_capabilities (
                company_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                capability TEXT NOT NULL,
                max_risk_level TEXT NOT NULL,
                autonomy_level TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                PRIMARY KEY(company_id, agent_id, capability),
                FOREIGN KEY(company_id, agent_id) REFERENCES agents(company_id, agent_id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS ix_agents_company_enabled ON agents(company_id, enabled);
            CREATE INDEX IF NOT EXISTS ix_agent_capabilities_company_capability ON agent_capabilities(company_id, capability, enabled);
            """;
        command.ExecuteNonQuery();
    }

    private void EnsureCompanyDefaults(string companyId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();
        var now = DateTimeOffset.UtcNow.ToString("O");

        foreach (var agent in Agents)
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT INTO agents(company_id, agent_id, role, enabled, created_at, updated_at)
                VALUES($company, $agent, $role, 1, $now, $now)
                ON CONFLICT(company_id, agent_id) DO NOTHING;
                INSERT INTO agent_capabilities(company_id, agent_id, capability, max_risk_level, autonomy_level, enabled)
                VALUES($company, $agent, $capability, 'LOW', 'LOW', 1)
                ON CONFLICT(company_id, agent_id, capability) DO NOTHING;
                """;
            command.Parameters.AddWithValue("$company", companyId);
            command.Parameters.AddWithValue("$agent", agent.AgentId);
            command.Parameters.AddWithValue("$role", agent.Role);
            command.Parameters.AddWithValue("$capability", agent.Capabilities[0]);
            command.Parameters.AddWithValue("$now", now);
            command.ExecuteNonQuery();
        }
        transaction.Commit();
    }

    public AgentAutonomyPolicy ResolvePolicy(BrainDecision decision)
    {
        EnsureCompanyDefaults(decision.CompanyId);
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT a.agent_id, c.autonomy_level, c.max_risk_level
            FROM agents a
            INNER JOIN agent_capabilities c ON c.company_id = a.company_id AND c.agent_id = a.agent_id
            WHERE a.company_id = $company AND a.enabled = 1 AND c.enabled = 1 AND c.capability = $capability
            ORDER BY a.agent_id
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$company", decision.CompanyId);
        command.Parameters.AddWithValue("$capability", decision.Action);
        using var reader = command.ExecuteReader();
        if (!reader.Read())
            throw new InvalidOperationException($"No enabled agent is registered for action '{decision.Action}' in company '{decision.CompanyId}'.");

        return new AgentAutonomyPolicy(
            reader.GetString(0), decision.CompanyId, [decision.Action], reader.GetString(2),
            decision.RiskLevel is "HIGH" or "CRITICAL", 3);
    }

    public bool CanExecute(BrainDecision decision, out AgentAutonomyPolicy policy, out string reason)
    {
        try { policy = ResolvePolicy(decision); }
        catch (InvalidOperationException ex)
        {
            policy = new AgentAutonomyPolicy("none", decision.CompanyId, [], "LOW", true, 0);
            reason = ex.Message;
            return false;
        }

        if (!policy.AllowedCapabilities.Contains(decision.Action, StringComparer.OrdinalIgnoreCase))
        {
            reason = $"Agent '{policy.AgentId}' does not have capability '{decision.Action}'.";
            return false;
        }
        if (RiskRank(decision.RiskLevel) > RiskRank(policy.MaxRiskLevel))
        {
            reason = $"Decision risk '{decision.RiskLevel}' exceeds agent policy '{policy.MaxRiskLevel}'.";
            return false;
        }
        if (policy.RequiresHumanApproval && decision.Status != "APPROVED")
        {
            reason = $"Agent '{policy.AgentId}' requires human approval for risk '{decision.RiskLevel}'.";
            return false;
        }
        reason = string.Empty;
        return true;
    }

    private static int RiskRank(string risk) => risk switch
    {
        "LOW" => 0,
        "MEDIUM" => 1,
        "HIGH" => 2,
        "CRITICAL" => 3,
        _ => 99
    };
}
