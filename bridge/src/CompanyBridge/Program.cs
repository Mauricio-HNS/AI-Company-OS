using CompanyBridge.Connectors;
using CompanyBridge.Security;
using CompanyBridge.Sync;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddWindowsService(options => options.ServiceName = "AI Company OS Company Bridge Service");
builder.Services.Configure<BridgeOptions>(builder.Configuration.GetSection("Bridge"));
builder.Services.AddSingleton<LocalPolicy>();
builder.Services.AddSingleton<ConnectorRegistry>();
builder.Services.AddSingleton<OutboxStore>();
builder.Services.AddHttpClient<CloudSyncClient>();
builder.Services.AddSingleton<ICompanyConnector>(sp =>
{
    var options = sp.GetRequiredService<IOptions<BridgeOptions>>().Value;
    return new SqliteConnector(options.LocalDatabasePath, options.AllowedTables);
});
builder.Services.AddHostedService<BridgeWorker>();

var app = builder.Build();
app.Urls.Add("http://127.0.0.1:48731");

app.MapGet("/health", (IOptions<BridgeOptions> options) => Results.Ok(new
{
    status = "ok",
    component = "company-bridge",
    companyId = options.Value.CompanyId,
    localOnlyApi = true,
    utc = DateTimeOffset.UtcNow
}));

app.MapGet("/api/v1/status", (IOptions<BridgeOptions> options, OutboxStore outbox) => Results.Ok(new
{
    companyId = options.Value.CompanyId,
    enrolled = options.Value.CompanyId != "un-enrolled",
    cloudEndpoint = options.Value.CloudEndpoint,
    pendingSyncItems = outbox.ReadPending().Count,
    localApi = "127.0.0.1:48731"
}));

await app.RunAsync();

public sealed class BridgeOptions
{
    public string CompanyId { get; set; } = "un-enrolled";
    public string CloudEndpoint { get; set; } = "https://api.aicompanyos.com";
    public string DataDirectory { get; set; } = @"C:\ProgramData\AI Company OS\Company Bridge";
    public int SyncIntervalSeconds { get; set; } = 60;
    public bool AllowLocalDiscovery { get; set; } = true;
    public string LocalDatabasePath { get; set; } = "";
    public string[] AllowedTables { get; set; } = Array.Empty<string>();
}

public sealed class BridgeWorker : BackgroundService
{
    private readonly ConnectorRegistry _connectors;
    private readonly OutboxStore _outbox;
    private readonly CloudSyncClient _sync;
    private readonly BridgeOptions _options;
    private readonly ILogger<BridgeWorker> _logger;

    public BridgeWorker(ConnectorRegistry connectors, OutboxStore outbox, CloudSyncClient sync, IOptions<BridgeOptions> options, ILogger<BridgeWorker> logger)
    {
        _connectors = connectors;
        _outbox = outbox;
        _sync = sync;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Directory.CreateDirectory(_options.DataDirectory);
        _logger.LogInformation("Company Bridge started for company {CompanyId}", _options.CompanyId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_options.AllowLocalDiscovery)
                    await _connectors.DiscoverAuthorizedSourcesAsync(stoppingToken);

                await _sync.FlushAsync(_outbox, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Company Bridge cycle failed; local data remains protected in the outbox");
            }

            await Task.Delay(TimeSpan.FromSeconds(Math.Max(15, _options.SyncIntervalSeconds)), stoppingToken);
        }
    }
}
