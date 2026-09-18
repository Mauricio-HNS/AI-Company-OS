using System.Collections.Concurrent;

namespace CompanyBridge.Sync;

public sealed record RuntimeBrainDecision(
    string DecisionId,
    string CompanyId,
    string Objective,
    string Action,
    string Reason,
    string RiskLevel,
    double Confidence,
    bool ApprovalRequired,
    string[] Preconditions,
    string Status,
    DateTimeOffset CreatedAt);

public sealed class RuntimeDecisionStore
{
    private readonly ConcurrentDictionary<string, RuntimeBrainDecision> _decisions = new(StringComparer.Ordinal);

    public IReadOnlyList<RuntimeBrainDecision> Read(string companyId)
        => _decisions.Values
            .Where(item => item.CompanyId == companyId && item.Status == "APPROVED")
            .OrderBy(item => item.CreatedAt)
            .ToArray();

    public int Merge(IEnumerable<RuntimeBrainDecision> decisions)
    {
        var added = 0;
        foreach (var decision in decisions)
        {
            if (decision.Status != "APPROVED" || string.IsNullOrWhiteSpace(decision.DecisionId))
                continue;

            if (_decisions.TryAdd(decision.DecisionId, decision))
                added++;
        }

        return added;
    }
}
