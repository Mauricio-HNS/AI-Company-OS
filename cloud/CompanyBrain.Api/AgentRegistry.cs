namespace CompanyBrain.Api;

public sealed record AgentCapability(
    string Name,
    string Description,
    string[] AllowedActions);

public sealed record AgentAutonomyPolicy(
    string AgentId,
    string CompanyId,
    string[] AllowedCapabilities,
    string MaxRiskLevel,
    bool RequiresHumanApproval,
    int MaxConsecutiveFailures);

public sealed record RegisteredAgent(
    string AgentId,
    string Role,
    string[] Capabilities,
    bool Enabled);

public sealed class AgentRegistry
{
    private readonly IReadOnlyList<RegisteredAgent> _agents =
    [
        new RegisteredAgent(
            "company-analyst",
            "Business analysis and observation",
            ["OBSERVE"],
            true),
        new RegisteredAgent(
            "company-planner",
            "Planning and bounded replanning",
            ["PLAN"],
            true)
    ];

    private readonly IReadOnlyList<AgentCapability> _capabilities =
    [
        new AgentCapability(
            "OBSERVE",
            "Analyze verified company memory without external side effects.",
            ["OBSERVE"]),
        new AgentCapability(
            "PLAN",
            "Produce a bounded internal plan without executing external actions.",
            ["PLAN"])
    ];

    public IReadOnlyList<RegisteredAgent> Agents => _agents;
    public IReadOnlyList<AgentCapability> Capabilities => _capabilities;

    public AgentAutonomyPolicy ResolvePolicy(BrainDecision decision)
    {
        var agent = _agents.FirstOrDefault(candidate =>
            candidate.Enabled &&
            candidate.Capabilities.Contains(decision.Action, StringComparer.OrdinalIgnoreCase));

        if (agent is null)
            throw new InvalidOperationException($"No enabled agent is registered for action '{decision.Action}'.");

        var maxRisk = decision.Action switch
        {
            "OBSERVE" => "MEDIUM",
            "PLAN" => "MEDIUM",
            _ => "LOW"
        };

        return new AgentAutonomyPolicy(
            agent.AgentId,
            decision.CompanyId,
            agent.Capabilities,
            maxRisk,
            decision.RiskLevel is "HIGH" or "CRITICAL",
            3);
    }

    public bool CanExecute(BrainDecision decision, out AgentAutonomyPolicy policy, out string reason)
    {
        policy = ResolvePolicy(decision);

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
