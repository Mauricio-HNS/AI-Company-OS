using Microsoft.Data.Sqlite;

namespace CompanyBrain.Api;

public sealed record AgentCapabilityPolicy(string Capability, string AutonomyLevel, string MaxRiskLevel, bool Enabled);
public sealed record AgentProfile(string AgentId, string CompanyId, string Name, string Status, AgentCapabilityPolicy[] Capabilities, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed class AgentRegistryService
{
    private static readonly IReadOnlyDictionary<string, int> AutonomyRank = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) { ["NONE"] = 0, ["LOW"] = 1, ["MEDIUM"] = 2, ["HIGH"] = 3 };
    private static readonly IReadOnlyDictionary<string, int> RiskRank = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) { ["LOW"] = 0, ["MEDIUM"] = 1, ["HIGH"] = 2, ["CRITICAL"] = 3 };
    private readonly CloudStore _store;
    public AgentRegistryService(CloudStore store) => _store = store;
    public Task<AgentProfile?> GetAsync(string companyId, string agentId, CancellationToken ct) => _store.GetAgentAsync(companyId, agentId, ct);
    public Task<IReadOnlyList<AgentProfile>> ListAsync(string companyId, CancellationToken ct) => _store.GetAgentsAsync(companyId, ct);
    public Task RegisterAsync(AgentProfile agent, CancellationToken ct) => _store.SaveAgentAsync(agent, ct);
    public async Task EnsureRuntimeAgentAsync(string companyId, CancellationToken ct)
    {
        if (await _store.GetAgentAsync(companyId, "company-brain-runtime", ct) is not null) return;
        var now = DateTimeOffset.UtcNow;
        await _store.SaveAgentAsync(new AgentProfile("company-brain-runtime", companyId, "Company Brain Runtime Agent", "ACTIVE", [
            new AgentCapabilityPolicy("OBSERVE", "LOW", "LOW", true),
            new AgentCapabilityPolicy("PLAN", "LOW", "LOW", true)
        ], now, now), ct);
    }
    public async Task<bool> CanExecuteAsync(string companyId, string capability, string riskLevel, CancellationToken ct)
    {
        if (!RiskRank.TryGetValue(riskLevel, out var requestedRisk)) return false;
        var agents = await _store.GetAgentsAsync(companyId, ct);
        return agents.Any(agent => string.Equals(agent.Status, "ACTIVE", StringComparison.OrdinalIgnoreCase) && agent.Capabilities.Any(policy =>
            policy.Enabled && string.Equals(policy.Capability, capability, StringComparison.OrdinalIgnoreCase) &&
            AutonomyRank.TryGetValue(policy.AutonomyLevel, out var autonomy) && autonomy >= 1 &&
            RiskRank.TryGetValue(policy.MaxRiskLevel, out var maxRisk) && requestedRisk <= maxRisk));
    }
}
