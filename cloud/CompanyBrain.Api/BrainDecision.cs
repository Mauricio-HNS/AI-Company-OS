using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record BrainDecisionProvenance(
    string MemoryId,
    string CompanyId,
    string SourceId,
    string SourceType,
    string DeviceId);

public sealed record BrainDecision(
    string DecisionId,
    string CompanyId,
    string Objective,
    string Action,
    string Reason,
    string RiskLevel,
    double Confidence,
    bool ApprovalRequired,
    string[] Preconditions,
    BrainDecisionProvenance[] Evidence,
    string Status,
    DateTimeOffset CreatedAt);

public sealed class BrainDecisionEngine
{
    private static readonly HashSet<string> AllowedActions = new(StringComparer.OrdinalIgnoreCase)
    {
        "OBSERVE",
        "PLAN",
        "REQUEST_APPROVAL",
        "NO_ACTION"
    };

    private static readonly HashSet<string> AllowedRiskLevels = new(StringComparer.OrdinalIgnoreCase)
    {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    };

    private readonly BrainLlmGateway _llm;

    public BrainDecisionEngine(BrainLlmGateway llm) => _llm = llm;

    public async Task<BrainDecision?> GenerateAsync(
        string companyId,
        IReadOnlyList<BrainMemory> memories,
        CancellationToken cancellationToken)
    {
        if (memories.Count == 0)
            return null;

        var verifiedMemories = memories
            .Where(memory =>
                string.Equals(memory.CompanyId, companyId, StringComparison.Ordinal) &&
                !string.IsNullOrWhiteSpace(memory.MemoryId) &&
                !string.IsNullOrWhiteSpace(memory.SourceId) &&
                !string.IsNullOrWhiteSpace(memory.SourceType) &&
                !string.IsNullOrWhiteSpace(memory.DeviceId))
            .ToArray();

        if (verifiedMemories.Length == 0)
            return null;

        var facts = string.Join(
            "\n",
            verifiedMemories.Select((memory, index) =>
                $"{index + 1}. {memory.Statement} | confidence={memory.Confidence:0.00} | observedAt={memory.ObservedAt:O} | source={memory.Source}"));

        var prompt = new BrainPrompt(
            companyId,
            """
            You are the Company Brain decision layer.
            Return ONLY valid JSON. No markdown, no code fences and no commentary.
            Use exactly these fields:
            objective, action, reason, riskLevel, confidence, approvalRequired, preconditions.
            action must be one of: OBSERVE, PLAN, REQUEST_APPROVAL, NO_ACTION.
            riskLevel must be one of: LOW, MEDIUM, HIGH, CRITICAL.
            confidence must be a number from 0 to 1.
            approvalRequired must be true for HIGH or CRITICAL risk.
            preconditions must be an array of short strings.
            Never invent facts. Never output executable commands, credentials, URLs or external side effects.
            """,
            $"Company: {companyId}\nMemory facts:\n{facts}");

        var raw = await _llm.CompleteAsync(prompt, cancellationToken);
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        try
        {
            var dto = JsonSerializer.Deserialize<DecisionPayload>(raw, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto is null ||
                string.IsNullOrWhiteSpace(dto.Objective) ||
                string.IsNullOrWhiteSpace(dto.Action) ||
                string.IsNullOrWhiteSpace(dto.Reason) ||
                string.IsNullOrWhiteSpace(dto.RiskLevel) ||
                dto.Preconditions is null ||
                !AllowedActions.Contains(dto.Action) ||
                !AllowedRiskLevels.Contains(dto.RiskLevel) ||
                dto.Confidence is < 0 or > 1)
                return null;

            var risk = dto.RiskLevel.ToUpperInvariant();
            var approvalRequired = dto.ApprovalRequired || risk is "HIGH" or "CRITICAL";

            return new BrainDecision(
                $"DEC-{Guid.NewGuid():N}",
                companyId,
                dto.Objective.Trim(),
                dto.Action.ToUpperInvariant(),
                dto.Reason.Trim(),
                risk,
                dto.Confidence,
                approvalRequired,
                dto.Preconditions.Where(x => !string.IsNullOrWhiteSpace(x)).Take(20).Select(x => x.Trim()).ToArray(),
                verifiedMemories.Select(memory => new BrainDecisionProvenance(
                    memory.MemoryId,
                    memory.CompanyId,
                    memory.SourceId,
                    memory.SourceType,
                    memory.DeviceId)).ToArray(),
                approvalRequired ? "APPROVAL_REQUIRED" : "PROPOSED",
                DateTimeOffset.UtcNow);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record DecisionPayload(
        string? Objective,
        string? Action,
        string? Reason,
        string? RiskLevel,
        double Confidence,
        bool ApprovalRequired,
        string[]? Preconditions);
}
