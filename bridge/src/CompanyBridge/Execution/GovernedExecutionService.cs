using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace CompanyBridge.Execution;

public sealed class GovernedExecutionService
{
    private readonly ILogger<GovernedExecutionService> _logger;
    private readonly BridgeOptions _options;

    public GovernedExecutionService(ILogger<GovernedExecutionService> logger, IOptions<BridgeOptions> options)
    {
        _logger = logger;
        _options = options.Value;
    }

    public async Task<ExecutionResult> ExecuteAsync(
        ExecutionRequest request,
        ExecutionPolicy policy,
        CancellationToken cancellationToken = default)
    {
        var executionId = Guid.NewGuid().ToString("N");
        var steps = new List<string>();

        if (string.IsNullOrWhiteSpace(request.CompanyId) || string.IsNullOrWhiteSpace(request.AgentId))
            return Fail(executionId, steps, "CompanyId and AgentId are required.");

        if (string.IsNullOrWhiteSpace(request.Objective))
            return Fail(executionId, steps, "Execution objective is required.");

        if (string.IsNullOrWhiteSpace(request.Workspace) || Path.IsPathRooted(request.Workspace))
            return Fail(executionId, steps, "Workspace must be a relative execution workspace.");

        var workspaceName = request.Workspace.Trim();
        if (workspaceName.Contains("..", StringComparison.Ordinal) ||
            workspaceName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
            return Fail(executionId, steps, "Workspace contains an invalid path.");

        var executionRoot = Path.GetFullPath(Path.Combine(_options.DataDirectory, "execution"));
        var workspace = Path.GetFullPath(Path.Combine(executionRoot, workspaceName));
        if (!workspace.StartsWith(executionRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            return Fail(executionId, steps, "Workspace escapes the Bridge execution directory.");

        Directory.CreateDirectory(workspace);

        foreach (var action in request.Actions.Distinct())
        {
            cancellationToken.ThrowIfCancellationRequested();

            switch (action)
            {
                case ExecutionAction.Discover:
                    steps.Add("discover: authorized local sources only");
                    break;

                case ExecutionAction.Generate when policy.AllowCodeGeneration:
                    steps.Add("generate: artifact generation permitted");
                    break;

                case ExecutionAction.Validate:
                    steps.Add("validate: artifact validation requested");
                    break;

                case ExecutionAction.SandboxTest when policy.AllowSandbox:
                    steps.Add("sandbox: isolated validation requested");
                    break;

                case ExecutionAction.StageDeployment:
                    steps.Add("stage: deployment manifest may be prepared");
                    break;

                case ExecutionAction.Deploy:
                    if (!policy.AllowDeployment)
                        return Fail(executionId, steps, "Deployment is disabled by local policy.");
                    if (policy.RequireHumanApprovalForDeployment)
                        return Fail(executionId, steps, "Deployment requires explicit human authorization.");
                    if (string.IsNullOrWhiteSpace(request.DeploymentTarget))
                        return Fail(executionId, steps, "Deployment target is required.");
                    return Fail(executionId, steps, "Remote deployment adapter is not installed.");

                case ExecutionAction.Rollback:
                    return Fail(executionId, steps, "Rollback adapter is not installed.");

                default:
                    return Fail(executionId, steps, $"Action '{action}' is not permitted.");
            }
        }

        var manifestPath = Path.Combine(workspace, $"execution-{executionId}.json");
        var manifest = JsonSerializer.Serialize(new
        {
            executionId,
            request.CompanyId,
            request.AgentId,
            request.Objective,
            actions = request.Actions.Distinct().ToArray(),
            createdAt = DateTimeOffset.UtcNow
        }, new JsonSerializerOptions { WriteIndented = true });

        await File.WriteAllTextAsync(manifestPath, manifest, Encoding.UTF8, cancellationToken);
        steps.Add("manifest: execution manifest persisted inside the Bridge execution boundary");

        _logger.LogInformation(
            "Governed execution {ExecutionId} prepared for company {CompanyId}",
            executionId,
            request.CompanyId);

        return new ExecutionResult(true, executionId, "prepared", steps, manifestPath);
    }

    private static ExecutionResult Fail(string id, List<string> steps, string error) =>
        new(false, id, "blocked", steps, Error: error);
}
