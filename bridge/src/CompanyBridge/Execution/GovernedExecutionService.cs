using System.Diagnostics;
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
        var stopwatch = Stopwatch.StartNew();

        if (string.IsNullOrWhiteSpace(request.CompanyId) || string.IsNullOrWhiteSpace(request.AgentId))
            return Fail(executionId, steps, "CompanyId and AgentId are required.");

        if (string.IsNullOrWhiteSpace(request.Objective))
            return Fail(executionId, steps, "Execution objective is required.");

        if (request.Actions.Count == 0)
            return Fail(executionId, steps, "At least one execution action is required.");

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

            if (stopwatch.Elapsed.TotalSeconds > policy.MaxExecutionSeconds)
                return Fail(executionId, steps, "Execution exceeded the local policy time limit.");

            switch (action)
            {
                case ExecutionAction.Discover:
                    steps.Add("discover: authorized local sources only");
                    break;

                case ExecutionAction.Generate when policy.AllowCodeGeneration:
                    steps.Add("generate: artifact generation permitted");
                    break;

                case ExecutionAction.Validate:
                    if (!ValidateWorkspace(workspace, out var validationError))
                        return Fail(executionId, steps, validationError);
                    steps.Add("validate: execution workspace and manifest validated");
                    break;

                case ExecutionAction.SandboxTest when policy.AllowSandbox:
                    if (!ValidateWorkspace(workspace, out var sandboxError))
                        return Fail(executionId, steps, sandboxError);
                    steps.Add("sandbox: pre-deployment validation passed; no external side effects executed");
                    break;

                case ExecutionAction.StageDeployment:
                    if (!ValidateWorkspace(workspace, out var stageError))
                        return Fail(executionId, steps, stageError);

                    var artifact = await CreateDeploymentArtifactAsync(
                        executionId,
                        request,
                        workspace,
                        cancellationToken);

                    steps.Add($"stage: deployment artifact {artifact.ArtifactId} prepared with SHA-256 {artifact.Sha256}");
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

    private static bool ValidateWorkspace(string workspace, out string error)
    {
        error = string.Empty;
        if (!Directory.Exists(workspace))
        {
            error = "Execution workspace does not exist.";
            return false;
        }

        var files = Directory.GetFiles(workspace, "*", SearchOption.AllDirectories);
        if (files.Length == 0)
        {
            error = "Execution workspace is empty; no artifact can be validated.";
            return false;
        }

        foreach (var file in files)
        {
            if (!Path.GetFullPath(file).StartsWith(
                    Path.GetFullPath(workspace) + Path.DirectorySeparatorChar,
                    StringComparison.OrdinalIgnoreCase))
            {
                error = "Execution artifact escapes the workspace boundary.";
                return false;
            }
        }

        return true;
    }

    private static async Task<DeploymentArtifact> CreateDeploymentArtifactAsync(
        string executionId,
        ExecutionRequest request,
        string workspace,
        CancellationToken cancellationToken)
    {
        var manifestPath = Path.Combine(workspace, $"artifact-{executionId}.json");
        var sourceFiles = Directory.GetFiles(workspace, "*", SearchOption.AllDirectories)
            .Select(Path.GetFullPath)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .Select(path => new
            {
                path = Path.GetRelativePath(workspace, path),
                size = new FileInfo(path).Length
            })
            .ToArray();

        var payload = JsonSerializer.Serialize(new
        {
            artifactId = $"ART-{executionId}",
            request.CompanyId,
            request.AgentId,
            request.Objective,
            sourceFiles,
            createdAt = DateTimeOffset.UtcNow
        }, new JsonSerializerOptions { WriteIndented = true });

        await File.WriteAllTextAsync(manifestPath, payload, Encoding.UTF8, cancellationToken);
        var bytes = await File.ReadAllBytesAsync(manifestPath, cancellationToken);
        var sha256 = Convert.ToHexString(SHA256.HashData(bytes));

        return new DeploymentArtifact(
            $"ART-{executionId}",
            request.CompanyId,
            request.AgentId,
            manifestPath,
            sha256,
            DateTimeOffset.UtcNow);
    }

    private static ExecutionResult Fail(string id, List<string> steps, string error) =>
        new(false, id, "blocked", steps, Error: error);
}
