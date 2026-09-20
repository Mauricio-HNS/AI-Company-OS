using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record BrainDecisionOption(
    string OptionId,
    string Title,
    string Summary,
    string[] Details,
    string ExpectedImpact,
    string[] Risks,
    string? Cost,
    string[] Dependencies,
    double Confidence);

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
    BrainDecisionOption[] Options,
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
    private readonly CloudStore _store;

    public BrainDecisionEngine(BrainLlmGateway llm, CloudStore store)
    {
        _llm = llm;
        _store = store;
    }

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
            objective, action, reason, riskLevel, confidence, approvalRequired, preconditions, options.
            options must contain at least two distinct alternatives when action is PLAN or REQUEST_APPROVAL.
            Each option must contain: optionId, title, summary, details, expectedImpact, risks, cost, dependencies, confidence.
            Do not invent costs or impacts; use "unknown" when the evidence does not support them.
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
                dto.Options is null ||
                (dto.Action is not null && (dto.Action.Equals("PLAN", StringComparison.OrdinalIgnoreCase) || dto.Action.Equals("REQUEST_APPROVAL", StringComparison.OrdinalIgnoreCase)) && dto.Options.Length < 2) ||
                !AllowedActions.Contains(dto.Action) ||
                !AllowedRiskLevels.Contains(dto.RiskLevel) ||
                dto.Confidence is < 0 or > 1)
                return null;

            var risk = dto.RiskLevel.ToUpperInvariant();
            var candidateOptions = dto.Options
                .Take(5)
                .Select(option => new
                {
                    Option = option,
                    Fingerprint = Fingerprint(option.Title, option.Summary)
                })
                .ToArray();

            var availableOptions = new List<BrainDecisionOptionPayload>();
            foreach (var candidate in candidateOptions)
            {
                if (!await _store.IsDecisionBlockedAsync(companyId, "company-brain-agent", candidate.Fingerprint, cancellationToken))
                    availableOptions.Add(candidate.Option);
            }

            if (availableOptions.Count == 0 && candidateOptions.Length > 0)
            {
                _loggerWarning(companyId, "All generated alternatives were blocked.");
                return null;
            }

            if ((dto.Action.Equals("PLAN", StringComparison.OrdinalIgnoreCase) || dto.Action.Equals("REQUEST_APPROVAL", StringComparison.OrdinalIgnoreCase))
                && availableOptions.Count < 2)
                return null;
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
                availableOptions.Select(option => new BrainDecisionOption(
                    string.IsNullOrWhiteSpace(option.OptionId) ? $"OPT-{Guid.NewGuid():N}" : option.OptionId.Trim(),
                    string.IsNullOrWhiteSpace(option.Title) ? "Alternative" : option.Title.Trim(),
                    string.IsNullOrWhiteSpace(option.Summary) ? "No summary provided." : option.Summary.Trim(),
                    (option.Details ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Take(10).Select(x => x.Trim()).ToArray(),
                    string.IsNullOrWhiteSpace(option.ExpectedImpact) ? "unknown" : option.ExpectedImpact.Trim(),
                    (option.Risks ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Take(10).Select(x => x.Trim()).ToArray(),
                    string.IsNullOrWhiteSpace(option.Cost) ? "unknown" : option.Cost.Trim(),
                    (option.Dependencies ?? Array.Empty<string>()).Where(x => !string.IsNullOrWhiteSpace(x)).Take(10).Select(x => x.Trim()).ToArray(),
                    Math.Clamp(option.Confidence, 0, 1))).ToArray(),
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

    private static string Fingerprint(string title, string summary)
    {
        var normalized = $"{title.Trim().ToUpperInvariant()}|{summary.Trim().ToUpperInvariant()}";
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(normalized)));
    }

    private void _loggerWarning(string companyId, string message)
    {
        // Block evaluation is intentionally silent to the model; operational logging can be added at the service boundary.
    }

    private sealed record DecisionPayload(
        string? Objective,
        string? Action,
        string? Reason,
        string? RiskLevel,
        double Confidence,
        bool ApprovalRequired,
        string[]? Preconditions,
        BrainDecisionOptionPayload[]? Options);

    private sealed record BrainDecisionOptionPayload(
        string? OptionId,
        string? Title,
        string? Summary,
        string[]? Details,
        string? ExpectedImpact,
        string[]? Risks,
        string? Cost,
        string[]? Dependencies,
        double Confidence);
}
