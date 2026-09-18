namespace CompanyBrain.Api;

public sealed class AutonomousCycleService
{
    private readonly CloudStore _store;
    private readonly BrainDecisionEngine _decisionEngine;
    private readonly AgentExecutionService _execution;

    public AutonomousCycleService(
        CloudStore store,
        BrainDecisionEngine decisionEngine,
        AgentExecutionService execution)
    {
        _store = store;
        _decisionEngine = decisionEngine;
        _execution = execution;
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
