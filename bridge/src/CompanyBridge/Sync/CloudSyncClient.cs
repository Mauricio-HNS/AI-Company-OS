using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace CompanyBridge.Sync;

public sealed class CloudSyncClient
{
    private readonly HttpClient _http;
    private readonly BridgeOptions _options;
    private readonly ILogger<CloudSyncClient> _logger;

    public CloudSyncClient(HttpClient http, IOptions<BridgeOptions> options, ILogger<CloudSyncClient> logger)
    {
        _http = http;
        _options = options.Value;
    
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(20);
    }

    public async Task FlushAsync(OutboxStore outbox, CancellationToken cancellationToken)
    {
        var pending = outbox.ReadPending();
        if (pending.Count == 0 || _options.CompanyId == "un-enrolled")
            return;

        var remaining = new List<string>();
        foreach (var line in pending)
        {
            try
            {
                using var response = await _http.PostAsJsonAsync(
                    new Uri(new Uri(_options.CloudEndpoint), "/api/bridge/v1/sync"),
                    new { companyId = _options.CompanyId, envelope = line },
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    remaining.Add(line);
                    _logger.LogWarning("Cloud sync returned {StatusCode}; keeping payload locally", response.StatusCode);
                }
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                remaining.Add(line);
                _logger.LogDebug(ex, "Cloud unavailable; retaining local outbox");
                break;
            }
        }

        outbox.ReplacePending(remaining);
    }
}
