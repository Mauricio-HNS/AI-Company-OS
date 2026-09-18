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

            // Resume an already-approved decision before generating anything new.
            var approved = decisions.FirstOrDefault(d => d.Status == "APPROVED");
            if (approved is not null)
            {
                await ExecuteApprovedAsync(approved, cancellationToken);
                actions++;
                continue;
            }

            // Human-gated or newly proposed work must remain pending.
            if (decisions.Any(d => d.Status is "PROPOSED" or "APPROVAL_REQUIRED"))
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

                approved = await _store.GetDecisionAsync(companyId, decision.DecisionId, cancellationToken);
                if (approved is not null)
                    await ExecuteApprovedAsync(approved, cancellationToken);
            }
            else
            {
                await _store.UpdateDecisionStatusAsync(
                    companyId,
                    decision.DecisionId,
                    "PROPOSED",
                    "APPROVAL_REQUIRED",
                    "autonomous-cycle",
                    "Decision requires human approval.",
                    cancellationToken);
            }
        }

        return actions;
    }

    private async Task ExecuteApprovedAsync(BrainDecision approved, CancellationToken cancellationToken)
    {
        var memories = await _store.GetMemoriesAsync(approved.CompanyId, 100, cancellationToken);
        var execution = await _execution.ExecuteAsync(approved, memories, cancellationToken);
        if (execution is null)
            return;

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
            {
                var replan = evaluation.Value.Replan;
                await _store.SaveReplanAsync(replan, cancellationToken);
                await CreateNextDecisionFromReplanAsync(approved, replan, cancellationToken);
            }

            await _store.SaveMemoryAsync(new BrainMemory(
                $"EVAL-{evaluation.Value.Evaluation.EvaluationId}",
                approved.CompanyId,
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
                approved.CompanyId,
                approved.DecisionId,
                "APPROVED",
                "EXECUTED",
                "autonomous-cycle",
                execution.Summary,
                cancellationToken);
        }
    }

    private async Task CreateNextDecisionFromReplanAsync(
        BrainDecision parent,
        ReplanProposal replan,
        CancellationToken cancellationToken)
    {
        var nextDecision = new BrainDecision(
            $"REPLAN-{replan.ReplanId}",
            replan.CompanyId,
            replan.Objective,
            "PLAN",
            replan.Strategy,
            replan.RiskLevel,
            parent.Confidence,
            replan.ApprovalRequired,
            replan.Steps,
            parent.Evidence,
            "PROPOSED",
            replan.CreatedAt);

        await _store.SaveDecisionAsync(nextDecision, cancellationToken);

        if (replan.ApprovalRequired)
        {
            await _store.UpdateDecisionStatusAsync(
                replan.CompanyId,
                nextDecision.DecisionId,
                "PROPOSED",
                "APPROVAL_REQUIRED",
                "replanning-engine",
                $"Replan generated from evaluation {replan.EvaluationId}.",
                cancellationToken);
            return;
        }

        await _store.UpdateDecisionStatusAsync(
            replan.CompanyId,
            nextDecision.DecisionId,
            "PROPOSED",
            "APPROVED",
            "replanning-engine",
            $"Low-risk replan generated from evaluation {replan.EvaluationId}.",
            cancellationToken);
    }
}
