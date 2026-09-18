using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record AgentExecutionResult(
    string ExecutionId,
    string DecisionId,
    string CompanyId,
    string Status,
    string Summary,
    string[] Observations,
    string[] NextSteps,
    DateTimeOffset ExecutedAt);

public sealed class AgentExecutionService
{
    private readonly BrainLlmGateway _llm;
    private readonly AgentRegistryService _registry;

    public AgentExecutionService(BrainLlmGateway llm, AgentRegistryService registry)
    {
        _llm = llm;
        _registry = registry;
    }

    public async Task<AgentExecutionResult?> ExecuteAsync(
        BrainDecision decision,
        IReadOnlyList<BrainMemory> memories,
        CancellationToken cancellationToken)
    {
        if (decision.Status != "APPROVED")
            return null;

        await _registry.EnsureRuntimeAgentAsync(decision.CompanyId, cancellationToken);

        var capability = decision.Action switch
        {
            "OBSERVE" => "OBSERVE",
            "PLAN" => "PLAN",
            _ => string.Empty
        };

        if (string.IsNullOrWhiteSpace(capability) ||
            !await _registry.CanExecuteAsync(
                decision.CompanyId,
                capability,
                decision.RiskLevel,
                cancellationToken))
            return null;

        var facts = string.Join(
            "\n",
            memories.Select((memory, index) =>
                $"{index + 1}. {memory.Statement} | confidence={memory.Confidence:0.00} | observedAt={memory.ObservedAt:O}"));

        var prompt = new BrainPrompt(
            decision.CompanyId,
            """
            You are a bounded Company OS agent executing one approved internal decision.
            The execution must be read-only and analytical. Never send messages, call external APIs,
            change files, move money, modify customer data, expose credentials or perform any external side effect.
            Return ONLY valid JSON with exactly:
            status, summary, observations, nextSteps.
            status must be COMPLETED or BLOCKED.
            observations and nextSteps must be arrays of short strings.
            Use only the supplied decision and memory facts. Never invent facts.
            """,
            $"Decision: {decision.Objective}\nAction: {decision.Action}\nReason: {decision.Reason}\nApproved risk: {decision.RiskLevel}\nMemory facts:\n{facts}");

        var raw = await _llm.CompleteAsync(prompt, cancellationToken);
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        try
        {
            var payload = JsonSerializer.Deserialize<ExecutionPayload>(raw, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (payload is null ||
                payload.Status is not ("COMPLETED" or "BLOCKED") ||
                string.IsNullOrWhiteSpace(payload.Summary))
                return null;

            return new AgentExecutionResult(
                $"EXE-{Guid.NewGuid():N}",
                decision.DecisionId,
                decision.CompanyId,
                payload.Status,
                payload.Summary.Trim(),
                payload.Observations?.Where(x => !string.IsNullOrWhiteSpace(x)).Take(20).Select(x => x.Trim()).ToArray() ?? [],
                payload.NextSteps?.Where(x => !string.IsNullOrWhiteSpace(x)).Take(20).Select(x => x.Trim()).ToArray() ?? [],
                DateTimeOffset.UtcNow);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record ExecutionPayload(
        string? Status,
        string? Summary,
        string[]? Observations,
        string[]? NextSteps);
}
