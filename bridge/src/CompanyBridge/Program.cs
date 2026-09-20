using CompanyBridge.Connectors;
using CompanyBridge.Discovery;
using CompanyBridge.Execution;
using CompanyBridge.Security;
using CompanyBridge.Sync;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "AI Company OS Company Bridge Service");
builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection("Bridge"));
builder.Services.AddSingleton<LocalPolicy>();
builder.Services.AddSingleton<ConnectorRegistry>();
builder.Services.AddSingleton<LocalSourceDiscovery>();
builder.Services.AddSingleton<OutboxStore>();
builder.Services.AddHttpClient<CloudSyncClient>();
builder.Services.AddSingleton<RuntimeDecisionStore>();
builder.Services.AddSingleton<GovernedExecutionService>();
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    policy.WithOrigins(builder.Configuration.GetSection("Bridge:AllowedWebOrigins").Get<string[]>() ?? Array.Empty<string>())
        .AllowAnyHeader()
        .AllowAnyMethod();
}));
builder.Services.AddSingleton<ICompanyConnector>(sp =>
{
    var options = sp.GetRequiredService<IOptions<BridgeOptions>>().Value;
    return new SqliteConnector(options.LocalDatabasePath, options.AllowedTables);
});
builder.Services.AddSingleton<ICompanyConnector>(sp =>
{
    var options = sp.GetRequiredService<IOptions<BridgeOptions>>().Value;
    return new CsvConnector(options.LocalCsvPath, options.AllowedCsvFields);
});
builder.Services.AddHostedService<BridgeWorker>();

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:48731");
app.UseCors();

app.MapGet("/health", (IOptions<BridgeOptions> options) => Results.Ok(new
{
    status = "ok",
    component = "company-bridge",
    companyId = options.Value.CompanyId,
    deviceId = options.Value.DeviceId,
    enrolled = options.Value.CompanyId != "un-enrolled" && !string.IsNullOrWhiteSpace(options.Value.CloudApiKey),
    localOnlyApi = true,
    utc = DateTimeOffset.UtcNow
}));

app.MapGet("/api/v1/runtime/decisions", (IOptions<BridgeOptions> options, RuntimeDecisionStore store) => Results.Ok(new
{
    companyId = options.Value.CompanyId,
    deviceId = options.Value.DeviceId,
    count = store.Read(options.Value.CompanyId).Count,
    decisions = store.Read(options.Value.CompanyId),
    externalSideEffect = false
}));

app.MapGet("/api/v1/status", (IOptions<BridgeOptions> options, OutboxStore outbox) => Results.Ok(new
{
    companyId = options.Value.CompanyId,
    deviceId = options.Value.DeviceId,
    enrolled = options.Value.CompanyId != "un-enrolled" && !string.IsNullOrWhiteSpace(options.Value.CloudApiKey),
    cloudEndpoint = options.Value.CloudEndpoint,
    authorizedConnectors = options.Value.AuthorizedConnectors,
    pendingSyncItems = outbox.ReadPending().Count,
    localApi = "127.0.0.1:48731"
}));

app.MapGet("/api/v1/discovery", async (IOptions<BridgeOptions> options, LocalSourceDiscovery discovery, CancellationToken cancellationToken) =>
{
    if (!options.Value.AllowLocalDiscovery)
        return Results.Ok(new { enabled = false, sources = Array.Empty<LocalSourceDescriptor>() });

    var sources = await discovery.DiscoverAsync(options.Value.DiscoveryPaths, cancellationToken);
    return Results.Ok(new
    {
        enabled = true,
        localOnly = true,
        sourceCount = sources.Count,
        sources
    });
});

app.MapPost("/api/v1/execution", async (ExecutionRequest request, GovernedExecutionService executor, IOptions<BridgeOptions> options, CancellationToken cancellationToken) =>
{
    var policy = new ExecutionPolicy(
        AllowCodeGeneration: true,
        AllowSandbox: true,
        AllowDeployment: false,
        RequireHumanApprovalForDeployment: true,
        MaxExecutionSeconds: 300);

    if (!string.Equals(request.CompanyId, options.Value.CompanyId, StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();

    var result = await executor.ExecuteAsync(request, policy, cancellationToken);
    return result.Success ? Results.Ok(result) : Results.BadRequest(result);
});

await app.RunAsync();

public sealed class BridgeOptions
{
    public string CompanyId { get; set; } = "un-enrolled";
    public string DeviceId { get; set; } = Environment.MachineName;
    public string EnrollmentToken { get; set; } = "";
    public string CloudEndpoint { get; set; } = "https://api.aicompanyos.com";
    public string CloudApiKey { get; set; } = "";
    public string DataDirectory { get; set; } = @"C:\ProgramData\AI Company OS\Company Bridge";
    public int SyncIntervalSeconds { get; set; } = 60;
    public bool AllowLocalDiscovery { get; set; } = true;
    public string[] DiscoveryPaths { get; set; } = Array.Empty<string>();
    public string LocalDatabasePath { get; set; } = "";
    public string[] AllowedTables { get; set; } = Array.Empty<string>();
    public string LocalCsvPath { get; set; } = "";
    public string[] AllowedCsvFields { get; set; } = Array.Empty<string>();
    public string[] AuthorizedConnectors { get; set; } = Array.Empty<string>();
    public string[] AllowedWebOrigins { get; set; } = Array.Empty<string>();
    public List<DataSourceBinding> DataSources { get; set; } = [];
}

public sealed class BridgeWorker : BackgroundService
{
    private readonly ConnectorRegistry _connectors;
    private readonly OutboxStore _outbox;
    private readonly CloudSyncClient _sync;
    private readonly BridgeOptions _options;
    private readonly RuntimeDecisionStore _runtimeDecisions;
    private readonly ILogger<BridgeWorker> _logger;

    public BridgeWorker(ConnectorRegistry connectors, OutboxStore outbox, CloudSyncClient sync, RuntimeDecisionStore runtimeDecisions, IOptions<BridgeOptions> options, ILogger<BridgeWorker> logger)
    {
        _connectors = connectors;
        _outbox = outbox;
        _sync = sync;
        _runtimeDecisions = runtimeDecisions;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(_options.DataDirectory);
        _logger.LogInformation("Company Bridge started for company {CompanyId}, device {DeviceId}", _options.CompanyId, _options.DeviceId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_options.AllowLocalDiscovery)
                    await _connectors.DiscoverAuthorizedSourcesAsync(stoppingToken);

                await _sync.FlushAsync(_outbox, stoppingToken);
                if (_options.CompanyId != "un-enrolled" && !string.IsNullOrWhiteSpace(_options.CloudApiKey))
                    await _sync.PullApprovedDecisionsAsync(_runtimeDecisions, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Company Bridge cycle failed; local data remains protected in the outbox");
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Max(15, _options.SyncIntervalSeconds)), stoppingToken);
        }
    }
}
