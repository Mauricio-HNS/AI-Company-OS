using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using CompanyBrain.Api;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<CloudStore>();
builder.Services.AddSingleton<CompanyDataStore>();
builder.Services.AddSingleton<CompanyOutputStore>();
builder.Services.AddSingleton<AutonomyStore>();
builder.Services.AddSingleton<FiscalBrainStore>();
builder.Services.AddSingleton<BrainProcessor>();
builder.Services.AddSingleton<BrainDecisionEngine>();
builder.Services.AddSingleton<AgentRegistry>();
builder.Services.AddSingleton<AgentExecutionService>();
builder.Services.AddSingleton<EvaluationReplanningService>();
builder.Services.AddSingleton<AutonomousCycleService>();
builder.Services.AddHttpClient<BrainLlmGateway>();
builder.Services.AddHostedService<BrainProcessorWorker>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-Id"].ToString();
    if (string.IsNullOrWhiteSpace(correlationId) || correlationId.Length > 100)
        correlationId = Guid.NewGuid().ToString("N");

    context.Response.Headers["X-Correlation-Id"] = correlationId;
    await next();
});

app.UseRateLimiter();
app.MapCompanyDataApi();
app.MapCompanyOutputApi();
app.MapCompanyAutonomyApi();
app.MapCompanyFiscalBrainApi();

static bool HasBrainAdminKey(HttpRequest request, IConfiguration configuration)
{
    var configured = configuration["BrainAdmin:ApiKey"];
    var provided = request.Headers["X-Brain-Admin-Key"].ToString();
    return !string.IsNullOrWhiteSpace(configured)
        && !string.IsNullOrWhiteSpace(provided)
        && CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(configured),
            Encoding.UTF8.GetBytes(provided));
}

app.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    component = "company-brain-ingress",
    persistence = "sqlite",
    utc = DateTimeOffset.UtcNow
}));

app.MapPost("/api/bridge/v1/enroll", async (EnrollmentRequest input, CloudStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(input.CompanyId) || !IsSafeIdentifier(input.DeviceId))
        return Results.BadRequest(new { enrolled = false, reason = "Invalid company or device identifier" });

    var configuredToken = configuration["BridgeEnrollment:Token"];
    if (string.IsNullOrWhiteSpace(configuredToken))
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

    var result = await store.EnrollAsync(
        input.CompanyId,
        input.DeviceId,
        input.EnrollmentToken,
        configuredToken,
        cancellationToken);

    if (result is null)
        return Results.Unauthorized();

    return Results.Ok(new
    {
        enrolled = true,
        companyId = result.CompanyId,
        deviceId = result.DeviceId,
        apiKey = result.ApiKey,
        issuedAt = DateTimeOffset.UtcNow,
        note = "Store this API key securely. It is returned only during enrollment."
    });
});

app.MapPost("/api/bridge/v1/sync", async (HttpRequest request, SyncRequest input, CloudStore store, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(input.CompanyId) || !IsSafeIdentifier(input.DeviceId) || string.IsNullOrWhiteSpace(input.Envelope))
        return Results.BadRequest(new { accepted = false, reason = "Invalid bridge envelope" });

    var apiKey = request.Headers["X-Bridge-Api-Key"].ToString();
    if (string.IsNullOrWhiteSpace(apiKey) || !await store.IsDeviceAuthorizedAsync(input.CompanyId, input.DeviceId, apiKey, cancellationToken))
        return Results.Unauthorized();

    try
    {
        using var document = JsonDocument.Parse(input.Envelope);
        if (document.RootElement.ValueKind != JsonValueKind.Object)
            return Results.BadRequest(new { accepted = false, reason = "Envelope must be a JSON object" });

        if (!document.RootElement.TryGetProperty("CompanyId", out var envelopeCompany)
            || !string.Equals(envelopeCompany.GetString(), input.CompanyId, StringComparison.Ordinal))
            return Results.BadRequest(new { accepted = false, reason = "Envelope CompanyId does not match the authenticated bridge tenant" });

        if (document.RootElement.TryGetProperty("Payload", out var payload)
            && payload.ValueKind == JsonValueKind.Object
            && payload.TryGetProperty("companyId", out var payloadCompany)
            && !string.Equals(payloadCompany.GetString(), input.CompanyId, StringComparison.Ordinal))
            return Results.BadRequest(new { accepted = false, reason = "Source payload belongs to a different company" });
    }
    catch (JsonException)
    {
        return Results.BadRequest(new { accepted = false, reason = "Envelope contains invalid JSON" });
    }

    var eventId = Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes(input.CompanyId + "\n" + input.DeviceId + "\n" + input.Envelope)));

    var accepted = await store.AppendEventIfNewAsync(
        new StoredEvent(eventId, input.CompanyId, input.DeviceId, input.Envelope, DateTimeOffset.UtcNow),
        cancellationToken);

    return Results.Ok(new
    {
        accepted = true,
        duplicate = !accepted,
        eventId,
        receivedAt = DateTimeOffset.UtcNow
    });
});

app.MapPost("/api/brain/v1/process", async (HttpRequest request, BrainProcessor processor, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    var processed = await processor.ProcessPendingAsync(cancellationToken);
    return Results.Ok(new { processed });
});

app.MapGet("/api/brain/v1/companies/{companyId}/memories", async (HttpRequest request, string companyId, CloudStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var memories = await store.GetMemoriesAsync(companyId, 100, cancellationToken);
    return Results.Ok(new { companyId, count = memories.Count, memories });
});

app.MapPost("/api/brain/v1/companies/{companyId}/analyze", async (HttpRequest request, string companyId, CloudStore store, BrainLlmGateway llm, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    var memories = await store.GetMemoriesAsync(companyId, 100, cancellationToken);
    if (memories.Count == 0)
        return Results.Ok(new { companyId, analysis = (string?)null, memoryCount = 0, reason = "No company memories available yet." });

    var facts = string.Join(
        "\n",
        memories.Select((memory, index) =>
            $"{index + 1}. {memory.Statement} | confidence={memory.Confidence:0.00} | observedAt={memory.ObservedAt:O} | source={memory.Source}"));

    var prompt = new BrainPrompt(
        companyId,
        "You are the Company Brain. Analyze only the supplied business facts. Separate observed facts, hypotheses, risks and recommended next investigations. Never invent missing data.",
        $"Company: {companyId}\nCurrent memory facts:\n{facts}");

    var analysis = await llm.CompleteAsync(prompt, cancellationToken);
    return analysis is null
        ? Results.StatusCode(StatusCodes.Status503ServiceUnavailable)
        : Results.Ok(new { companyId, analysis, memoryCount = memories.Count });
});

app.MapPost("/api/brain/v1/companies/{companyId}/decisions/generate", async (
    HttpRequest request,
    string companyId,
    CloudStore store,
    BrainDecisionEngine decisionEngine,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var memories = await store.GetMemoriesAsync(companyId, 100, cancellationToken);
    if (memories.Count == 0)
        return Results.Ok(new
        {
            companyId,
            decision = (BrainDecision?)null,
            memoryCount = 0,
            reason = "No company memories available yet."
        });

    var decision = await decisionEngine.GenerateAsync(companyId, memories, cancellationToken);
    if (decision is null)
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

    await store.SaveDecisionAsync(decision, cancellationToken);
    return Results.Ok(new
    {
        companyId,
        decision,
        memoryCount = memories.Count,
        externalSideEffect = false
    });
});

app.MapGet("/api/brain/v1/companies/{companyId}/decisions", async (
    HttpRequest request,
    string companyId,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var decisions = await store.GetDecisionsAsync(companyId, 100, cancellationToken);
    return Results.Ok(new { companyId, count = decisions.Count, decisions });
});

app.MapPost("/api/brain/v1/companies/{companyId}/decisions/{decisionId}/execute", async (
    HttpRequest request,
    string companyId,
    string decisionId,
    CloudStore store,
    AgentExecutionService executionService,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(decisionId))
        return Results.BadRequest();

    var decision = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    if (decision is null)
        return Results.NotFound();

    if (decision.Status != "APPROVED")
        return Results.Conflict(new { executed = false, reason = $"Decision must be APPROVED before execution. Current status: {decision.Status}." });

    var memories = await store.GetMemoriesAsync(companyId, 100, cancellationToken);
    var execution = await executionService.ExecuteAsync(decision, memories, cancellationToken);
    if (execution is null)
        return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);

    await store.SaveExecutionResultAsync(execution, cancellationToken);
    await store.AppendAuditJournalAsync(
        companyId,
        "AGENT_EXECUTION",
        NormalizeActor(request.Headers["X-Brain-Actor"].ToString()),
        request.Headers["X-Correlation-Id"].ToString(),
        "EXECUTION",
        execution.ExecutionId,
        execution.Summary,
        System.Text.Json.JsonSerializer.Serialize(new
        {
            decisionId,
            status = execution.Status,
            observations = execution.Observations,
            nextSteps = execution.NextSteps
        }),
        cancellationToken);

    if (execution.Status == "COMPLETED")
    {
        await store.UpdateDecisionStatusAsync(
            companyId,
            decisionId,
            "APPROVED",
            "EXECUTED",
            "agent-runtime",
            execution.Summary,
            cancellationToken);
    }

    return Results.Ok(new
    {
        companyId,
        decisionId,
        execution,
        externalSideEffect = false
    });
});

app.MapGet("/api/brain/v1/companies/{companyId}/runtime/decisions", async (
    HttpRequest request,
    string companyId,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    var configured = configuration["BrainRuntime:ApiKey"];
    var provided = request.Headers["X-Brain-Runtime-Key"].ToString();
    if (string.IsNullOrWhiteSpace(configured) || string.IsNullOrWhiteSpace(provided) ||
        !CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(configured), Encoding.UTF8.GetBytes(provided)))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var decisions = await store.GetDecisionsAsync(companyId, 100, cancellationToken);
    var approved = decisions
        .Where(decision => decision.Status == "APPROVED")
        .ToArray();

    return Results.Ok(new
    {
        companyId,
        count = approved.Length,
        decisions = approved,
        externalSideEffect = false
    });
});

app.MapGet("/api/brain/v1/companies/{companyId}/approvals", async (
    HttpRequest request,
    string companyId,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var decisions = await store.GetDecisionsAsync(companyId, 100, cancellationToken);
    var approvals = decisions.Where(decision => decision.Status == "APPROVAL_REQUIRED").ToArray();
    return Results.Ok(new { companyId, count = approvals.Length, approvals });
});

app.MapPost("/api/brain/v1/companies/{companyId}/decisions/{decisionId}/approve", async (
    HttpRequest request,
    string companyId,
    string decisionId,
    ApprovalRequest input,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(decisionId))
        return Results.BadRequest();

    var decision = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    if (decision is null)
        return Results.NotFound();

    if (decision.Status != "APPROVAL_REQUIRED")
        return Results.Conflict(new { approved = false, reason = $"Decision is already {decision.Status}." });

    if (!input.PreconditionsSatisfied)
        return Results.BadRequest(new { approved = false, reason = "Approval requires all preconditions to be satisfied." });

    var actor = NormalizeActor(request.Headers["X-Brain-Actor"].ToString());
    var updated = await store.UpdateDecisionStatusAsync(
        companyId, decisionId, "APPROVAL_REQUIRED", "APPROVED",
        actor, input.Reason, cancellationToken);

    if (!updated)
        return Results.Conflict(new { approved = false, reason = "Decision changed before approval was recorded." });

    var approved = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    return Results.Ok(new { approved = true, decision = approved });
});

app.MapPost("/api/brain/v1/companies/{companyId}/decisions/{decisionId}/reject", async (
    HttpRequest request,
    string companyId,
    string decisionId,
    ApprovalRequest input,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(decisionId))
        return Results.BadRequest();

    var decision = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    if (decision is null)
        return Results.NotFound();

    if (decision.Status != "APPROVAL_REQUIRED")
        return Results.Conflict(new { rejected = false, reason = $"Decision is already {decision.Status}." });

    if (string.IsNullOrWhiteSpace(input.Reason))
        return Results.BadRequest(new { rejected = false, reason = "A rejection reason is required." });

    var actor = NormalizeActor(request.Headers["X-Brain-Actor"].ToString());
    var updated = await store.UpdateDecisionStatusAsync(
        companyId, decisionId, "APPROVAL_REQUIRED", "REJECTED",
        actor, input.Reason, cancellationToken);

    if (!updated)
        return Results.Conflict(new { rejected = false, reason = "Decision changed before rejection was recorded." });

    var rejected = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    return Results.Ok(new { rejected = true, decision = rejected });
});

app.MapGet("/api/brain/v1/companies/{companyId}/decisions/{decisionId}/audit", async (
    HttpRequest request,
    string companyId,
    string decisionId,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(decisionId))
        return Results.BadRequest();

    if (await store.GetDecisionAsync(companyId, decisionId, cancellationToken) is null)
        return Results.NotFound();

    var audit = await store.GetDecisionAuditAsync(companyId, decisionId, cancellationToken);
    return Results.Ok(new { companyId, decisionId, count = audit.Count, audit });
});

app.MapPost("/api/brain/v1/companies/{companyId}/decisions/{decisionId}/human-action", async (
    HttpRequest request,
    string companyId,
    string decisionId,
    HumanActionRequest input,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(decisionId) || string.IsNullOrWhiteSpace(input.Action))
        return Results.BadRequest(new { recorded = false, reason = "Invalid human action." });

    var decision = await store.GetDecisionAsync(companyId, decisionId, cancellationToken);
    if (decision is null)
        return Results.NotFound();

    var allowed = new[] { "ACCEPT", "EDIT", "INTERVENE", "REQUEST_MORE_ANALYSIS", "DELETE_PLAN", "BLOCK_IDEA", "BLOCK_PLAN", "BLOCK_AGENT" };
    if (!allowed.Contains(input.Action, StringComparer.Ordinal))
        return Results.BadRequest(new { recorded = false, reason = "Unsupported human action." });

    var actor = NormalizeActor(request.Headers["X-Brain-Actor"].ToString());
    var recorded = await store.RecordDecisionActionAsync(companyId, decisionId, input.Action, actor, input.Reason, cancellationToken);

    if (recorded && input.Action is "ACCEPT" or "EDIT" or "INTERVENE")
    {
        var reviewStatus = input.Action switch
        {
            "ACCEPT" => "ACCEPTED",
            "EDIT" => "EDITED",
            _ => "INTERVENED"
        };
        recorded = await store.UpsertHumanReviewAsync(
            companyId, decisionId, input.OptionId, reviewStatus,
            input.HumanNote ?? input.Reason, cancellationToken);
    }

    if (recorded && input.Action == "REQUEST_MORE_ANALYSIS")
    {
        recorded = await store.UpsertHumanReviewAsync(
            companyId, decisionId, input.OptionId, "ANALYSIS_REQUESTED",
            input.HumanNote ?? input.Reason, cancellationToken);
        if (recorded)
            recorded = await store.CreateAnalysisRequestAsync(
                companyId, decisionId,
                input.HumanNote ?? input.Reason ?? "Additional human analysis requested.",
                actor, cancellationToken);
    }

    if (recorded && input.Action == "DELETE_PLAN")
    {
        recorded = await store.UpsertHumanReviewAsync(
            companyId, decisionId, input.OptionId, "DELETED",
            input.HumanNote ?? input.Reason ?? "Plan deleted by human.",
            cancellationToken);
        if (recorded && decision.Status == "APPROVAL_REQUIRED")
            recorded = await store.UpdateDecisionStatusAsync(
                companyId, decisionId, "APPROVAL_REQUIRED", "REJECTED",
                actor, input.Reason ?? "Plan deleted by human.",
                cancellationToken);
    }

    if (recorded && input.Action is "BLOCK_IDEA" or "BLOCK_PLAN" or "BLOCK_AGENT")
    {
        if (input.Action == "BLOCK_AGENT" && string.IsNullOrWhiteSpace(input.AgentId))
            return Results.BadRequest(new { recorded = false, reason = "agentId is required for BLOCK_AGENT." });

        var fingerprint = input.Fingerprint;
        if (string.IsNullOrWhiteSpace(fingerprint) && input.OptionId is not null)
        {
            var option = decision.Options.FirstOrDefault(x => x.OptionId == input.OptionId);
            if (option is not null)
                fingerprint = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes($"{option.Title.Trim().ToUpperInvariant()}|{option.Summary.Trim().ToUpperInvariant()}")));
        }

        if (input.Action != "BLOCK_AGENT" && string.IsNullOrWhiteSpace(fingerprint))
            return Results.BadRequest(new { recorded = false, reason = "optionId or fingerprint is required for a plan/idea block." });

        recorded = await store.AddDecisionBlockAsync(
            companyId,
            input.AgentId,
            input.Action == "BLOCK_AGENT" ? "AGENT" : input.Action == "BLOCK_IDEA" ? "IDEA" : "PLAN",
            fingerprint ?? $"AGENT:{input.AgentId}",
            input.Reason ?? $"Human block: {input.Action}",
            cancellationToken);
    }

    return Results.Ok(new { recorded, companyId, decisionId, action = input.Action, actor });
});

app.MapGet("/api/brain/v1/companies/{companyId}/audit-journal", async (
    HttpRequest request,
    string companyId,
    CloudStore store,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var entries = await store.GetAuditJournalAsync(companyId, 200, cancellationToken);
    return Results.Ok(new { companyId, count = entries.Count, entries });
});

app.MapGet("/api/brain/v1/companies/{companyId}/status", async (HttpRequest request, string companyId, CloudStore store, IConfiguration configuration, CancellationToken cancellationToken) =>
{
    if (!HasBrainAdminKey(request, configuration))
        return Results.Unauthorized();

    if (!IsSafeIdentifier(companyId))
        return Results.BadRequest();

    var eventCount = await store.GetEventCountAsync(companyId, cancellationToken);
    return Results.Ok(new
    {
        companyId,
        eventCount,
        brainIngress = "active",
        persistence = "durable"
    });
});

app.Run();

static bool IsSafeIdentifier(string? value)
    => !string.IsNullOrWhiteSpace(value)
       && value.Length <= 100
       && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');

static string NormalizeActor(string? value)
{
    if (string.IsNullOrWhiteSpace(value))
        return "brain-admin";

    var actor = value.Trim();
    return actor.Length <= 100 && actor.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.' || ch == '@')
        ? actor
        : "brain-admin";
}

public sealed record ApprovalRequest(bool PreconditionsSatisfied = true, string? Reason = null);\npublic sealed record HumanActionRequest(
    string Action,
    string? Reason = null,
    string? OptionId = null,
    string? AgentId = null,
    string? Fingerprint = null,
    string? HumanNote = null);
public sealed record EnrollmentRequest(string CompanyId, string DeviceId, string EnrollmentToken);
public sealed record SyncRequest(string CompanyId, string DeviceId, string Envelope);
