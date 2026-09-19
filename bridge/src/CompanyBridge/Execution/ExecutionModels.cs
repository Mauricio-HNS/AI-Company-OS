namespace CompanyBridge.Execution;

public enum ExecutionAction
{
    Discover,
    Generate,
    Validate,
    SandboxTest,
    StageDeployment,
    Deploy,
    Rollback
}

public sealed record ExecutionRequest(
    string CompanyId,
    string AgentId,
    string Objective,
    IReadOnlyList<ExecutionAction> Actions,
    string Workspace,
    string? DeploymentTarget = null);

public sealed record ExecutionPolicy(
    bool AllowCodeGeneration = true,
    bool AllowSandbox = true,
    bool AllowDeployment = false,
    bool RequireHumanApprovalForDeployment = true,
    int MaxExecutionSeconds = 300);

public sealed record ExecutionResult(
    bool Success,
    string ExecutionId,
    string Status,
    IReadOnlyList<string> Steps,
    string? ArtifactPath = null,
    string? Error = null);

public sealed record DeploymentArtifact(
    string ArtifactId,
    string CompanyId,
    string AgentId,
    string Path,
    string Sha256,
    DateTimeOffset CreatedAt);
