namespace CompanyBrain.Api;

public sealed class AutonomousCycleService
{
    private readonly CloudStore _store;
    private readonly BrainDecisionEngine _decisionEngine;
    private readonly AgentExecutionService _execution;
    private readonly EvaluationReplanningService _evaluation;

    public AutonomousCycleService(
        CloudStore store,
        BrainDecisionEngine decisionEngine,
        AgentExecutionService execution,
        EvaluationReplanningService evaluation)
    {
        _store = store;
        _decisionEngine = decisionEngine;
        _execution = execution;
        _evaluation = evaluation;
    }

    public async Task<int> RunAsync(CancellationToken cancellationToken)
    {
        var companies = await _store.GetCompanyIdsAsync(cancellationToken);
        var actions = 0;

        foreach (var companyId in companies)
        {
            var decisions = await _store.GetDecisionsAsync(companyId, 20, cancellationToken);

            if (decisions.Any(d => d.Status is "PROPOSED" or "APPROVAL_REQUIRED" or "APPROVED"))
                continue;

            var latest = decisions.FirstOrDefault();
            if (latest is not null && DateTimeOffset.UtcNow - latest.CreatedAt < TimeSpan.FromMinutes(15))
                continue;

            var memories = await _store.GetMemoriesAsync(companyId, 100, cancellationToken);
            if (memories.Count == 0)
                continue;

            var decision = await _decisionEngine.GenerateAsync(companyId, memories, cancellationToken);
            if (decision is null)
                continue;

            await _store.SaveDecisionAsync(decision, cancellationToken);
            actions++;

            if (!decision.ApprovalRequired)
            {
                var promoted = await _store.UpdateDecisionStatusAsync(
                    companyId,
                    decision.DecisionId,
                    "PROPOSED",
                    "APPROVED",
                    "autonomous-cycle",
                    "Low-risk decision promoted automatically.",
                    cancellationToken);

                if (!promoted)
                    continue;
            }

            var approved = await _store.GetDecisionAsync(companyId, decision.DecisionId, cancellationToken);
            if (approved is null || approved.Status != "APPROVED")
                continue;

            var execution = await _execution.ExecuteAsync(approved, memories, cancellationToken);
            if (execution is null)
                continue;

            await _store.SaveExecutionResultAsync(execution, cancellationToken);
            await _store.SaveExecutionMemoriesAsync(execution, cancellationToken);

            var evaluation = await _evaluation.EvaluateAsync(
                approved,
                execution,
                memories,
                cancellationToken);

            if (evaluation is not null)
            {
                await _store.SaveEvaluationAsync(evaluation.Value.Evaluation, cancellationToken);
                if (evaluation.Value.Replan is not null)
                    await _store.SaveReplanAsync(evaluation.Value.Replan, cancellationToken);

                await _store.SaveMemoryAsync(new BrainMemory(
                    $"EVAL-{evaluation.Value.Evaluation.EvaluationId}",
                    companyId,
                    $"Evaluation: {evaluation.Value.Evaluation.Outcome} | score={evaluation.Value.Evaluation.Score:0.00} | {evaluation.Value.Evaluation.Summary}",
                    $"Evaluation of decision {approved.DecisionId} and execution {execution.ExecutionId}.",
                    "evaluation-engine",
                    evaluation.Value.Evaluation.EvaluationId,
                    "EVALUATION",
                    "cloud",
                    evaluation.Value.Evaluation.EvaluatedAt,
                    evaluation.Value.Evaluation.Score), cancellationToken);
            }

            if (execution.Status == "COMPLETED")
            {
                await _store.UpdateDecisionStatusAsync(
                    companyId,
                    decision.DecisionId,
                    "APPROVED",
                    "EXECUTED",
                    "autonomous-cycle",
                    execution.Summary,
                    cancellationToken);
            }
        }

        return actions;
    }
}
