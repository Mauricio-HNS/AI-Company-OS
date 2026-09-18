using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record ExecutionEvaluation(
    string EvaluationId,
    string CompanyId,
    string DecisionId,
    string ExecutionId,
    string Outcome,
    double Score,
    string Summary,
    string[] Evidence,
    DateTimeOffset EvaluatedAt);

public sealed record ReplanProposal(
    string ReplanId,
    string CompanyId,
    string DecisionId,
    string EvaluationId,
    string Objective,
    string Strategy,
    string[] Steps,
    string RiskLevel,
    bool ApprovalRequired,
    DateTimeOffset CreatedAt);

public sealed class EvaluationReplanningService
{
    private readonly BrainLlmGateway _llm;

    public EvaluationReplanningService(BrainLlmGateway llm) => _llm = llm;

    public async Task<(ExecutionEvaluation Evaluation, ReplanProposal? Replan)?> EvaluateAsync(
        BrainDecision decision,
        AgentExecutionResult execution,
        IReadOnlyList<BrainMemory> memories,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(decision.CompanyId, execution.CompanyId, StringComparison.Ordinal) ||
            !string.Equals(decision.DecisionId, execution.DecisionId, StringComparison.Ordinal))
            return null;

        var evidence = memories
            .Where(memory =>
                string.Equals(memory.CompanyId, decision.CompanyId, StringComparison.Ordinal) &&
                decision.Evidence.Any(source =>
                    source.MemoryId == memory.MemoryId &&
                    source.CompanyId == memory.CompanyId &&
                    source.SourceId == memory.SourceId &&
                    source.SourceType == memory.SourceType &&
                    source.DeviceId == memory.DeviceId))
            .Take(100)
            .ToArray();

        var facts = string.Join("
", evidence.Select((memory, index) =>
            $"{index + 1}. {memory.Statement} | confidence={memory.Confidence:0.00} | source={memory.SourceType}/{memory.SourceId}"));

        var executionFacts = string.Join("
",
            execution.Observations.Select((item, index) => $"OBS {index + 1}: {item}")
            .Concat(execution.NextSteps.Select((item, index) => $"NEXT {index + 1}: {item}")));

        var prompt = new BrainPrompt(
            decision.CompanyId,
            """
            You are the Company OS evaluation layer.
            Evaluate only the approved decision, its bounded execution result, and verified evidence.
            Return ONLY valid JSON with exactly:
            outcome, score, summary, evidence.
            outcome must be ACHIEVED, PARTIAL, BLOCKED, or INCONCLUSIVE.
            score must be 0 to 1.
            evidence must be short strings grounded in supplied facts.
            Do not invent business results or claim external effects.
            """,
            $"Decision objective: {decision.Objective}
Decision action: {decision.Action}
Decision reason: {decision.Reason}
Execution status: {execution.Status}
Execution summary: {execution.Summary}
Execution observations/next steps:
{executionFacts}
Verified evidence:
{facts}");

        var raw = await _llm.CompleteAsync(prompt, cancellationToken);
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        EvaluationPayload? dto;
        try
        {
            dto = JsonSerializer.Deserialize<EvaluationPayload>(raw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return null;
        }

        if (dto is null ||
            dto.Outcome is not ("ACHIEVED" or "PARTIAL" or "BLOCKED" or "INCONCLUSIVE") ||
            dto.Score is < 0 or > 1 ||
            string.IsNullOrWhiteSpace(dto.Summary))
            return null;

        var evaluation = new ExecutionEvaluation(
            $"EVAL-{Guid.NewGuid():N}",
            decision.CompanyId,
            decision.DecisionId,
            execution.ExecutionId,
            dto.Outcome,
            dto.Score,
            dto.Summary.Trim(),
            dto.Evidence?.Where(x => !string.IsNullOrWhiteSpace(x)).Take(20).Select(x => x.Trim()).ToArray() ?? [],
            DateTimeOffset.UtcNow);

        ReplanProposal? replan = null;
        if (dto.Outcome is not "ACHIEVED")
        {
            replan = await CreateReplanAsync(decision, evaluation, execution, cancellationToken);
        }

        return (evaluation, replan);
    }

    private async Task<ReplanProposal?> CreateReplanAsync(
        BrainDecision decision,
        ExecutionEvaluation evaluation,
        AgentExecutionResult execution,
        CancellationToken cancellationToken)
    {
        var prompt = new BrainPrompt(
            decision.CompanyId,
            """
            You are the Company OS replanning layer.
            Create a bounded next plan from the evaluation of one decision.
            Return ONLY valid JSON with exactly:
            objective, strategy, steps, riskLevel, approvalRequired.
            steps must contain 1 to 10 short internal/read-only planning steps.
            riskLevel must be LOW, MEDIUM, HIGH, or CRITICAL.
            approvalRequired must be true for HIGH or CRITICAL.
            Never create external side effects, commands, credentials or URLs.
            """,
            $"Original objective: {decision.Objective}
Original action: {decision.Action}
Evaluation outcome: {evaluation.Outcome}
Evaluation score: {evaluation.Score:0.00}
Evaluation summary: {evaluation.Summary}
Execution status: {execution.Status}
Next steps observed by agent: {string.Join(" | ", execution.NextSteps)}");

        var raw = await _llm.CompleteAsync(prompt, cancellationToken);
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        ReplanPayload? dto;
        try
        {
            dto = JsonSerializer.Deserialize<ReplanPayload>(raw, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (JsonException)
        {
            return null;
        }

        if (dto is null ||
            string.IsNullOrWhiteSpace(dto.Objective) ||
            string.IsNullOrWhiteSpace(dto.Strategy) ||
            dto.Steps is null ||
            dto.Steps.Length == 0 ||
            dto.RiskLevel is not ("LOW" or "MEDIUM" or "HIGH" or "CRITICAL"))
            return null;

        var risk = dto.RiskLevel.ToUpperInvariant();
        return new ReplanProposal(
            $"REPLAN-{Guid.NewGuid():N}",
            decision.CompanyId,
            decision.DecisionId,
            evaluation.EvaluationId,
            dto.Objective.Trim(),
            dto.Strategy.Trim(),
            dto.Steps.Where(x => !string.IsNullOrWhiteSpace(x)).Take(10).Select(x => x.Trim()).ToArray(),
            risk,
            dto.ApprovalRequired || risk is "HIGH" or "CRITICAL",
            DateTimeOffset.UtcNow);
    }

    private sealed record EvaluationPayload(string? Outcome, double Score, string? Summary, string[]? Evidence);
    private sealed record ReplanPayload(string? Objective, string? Strategy, string[]? Steps, string? RiskLevel, bool ApprovalRequired);
}
