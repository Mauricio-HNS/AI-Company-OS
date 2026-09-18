using Microsoft.Data.Sqlite;

namespace CompanyBrain.Api;

public sealed record AgentCapabilityPolicy(
    string Capability,
    string AutonomyLevel,
    string MaxRiskLevel,
    bool Enabled);

public sealed record AgentProfile(
    string AgentId,
    string CompanyId,
    string Name,
    string Status,
    AgentCapabilityPolicy[] Capabilities,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed class AgentRegistryService
{
    private static readonly IReadOnlyDictionary<string, int> AutonomyRank =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["NONE"] = 0,
            ["LOW"] = 1,
            ["MEDIUM"] = 2,
            ["HIGH"] = 3
        };

    private static readonly IReadOnlyDictionary<string, int> RiskRank =
        new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["LOW"] = 0,
            ["MEDIUM"] = 1,
            ["HIGH"] = 2,
            ["CRITICAL"] = 3
        };

    private readonly CloudStore _store;

    public AgentRegistryService(CloudStore store) => _store = store;

    public Task<AgentProfile?> GetAsync(string companyId, string agentId, CancellationToken cancellationToken)
        => _store.GetAgentAsync(companyId, agentId, cancellationToken);

    public Task<IReadOnlyList<AgentProfile>> ListAsync(string companyId, CancellationToken cancellationToken)
        => _store.GetAgentsAsync(companyId, cancellationToken);

    public Task RegisterAsync(AgentProfile agent, CancellationToken cancellationToken)
        => _store.SaveAgentAsync(agent, cancellationToken);

    public async Task EnsureRuntimeAgentAsync(string companyId, CancellationToken cancellationToken)
    {
        var existing = await _store.GetAgentAsync(companyId, "company-brain-runtime", cancellationToken);
        if (existing is not null)
            return;

        var now = DateTimeOffset.UtcNow;
        await _store.SaveAgentAsync(
            new AgentProfile(
                "company-brain-runtime",
                companyId,
                "Company Brain Runtime Agent",
                "ACTIVE",
                [
                    new AgentCapabilityPolicy("OBSERVE", "LOW", "LOW", true),
                    new AgentCapabilityPolicy("PLAN", "LOW", "LOW", true)
                ],
                now,
                now),
            cancellationToken);
    }

    public Task<bool> CanExecuteAsync(
        string companyId,
        string capability,
        string riskLevel,
        CancellationToken cancellationToken)
        => _store.HasAgentCapabilityAsync(
            companyId,
            capability,
            riskLevel,
            AutonomyRank,
            RiskRank,
            cancellationToken);
}
