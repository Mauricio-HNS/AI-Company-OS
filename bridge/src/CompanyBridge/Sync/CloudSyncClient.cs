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
        if (pending.Count == 0 || _options.CompanyId == "un-enrolled" || string.IsNullOrWhiteSpace(_options.CloudApiKey))
            return;

        var remaining = new List<string>();
        foreach (var line in pending)
        {
            try
            {
                using var request = new HttpRequestMessage(
                    HttpMethod.Post,
                    new Uri(new Uri(_options.CloudEndpoint), "/api/bridge/v1/sync"));
                request.Headers.Add("X-Bridge-Api-Key", _options.CloudApiKey);
                request.Content = JsonContent.Create(new
                {
                    companyId = _options.CompanyId,
                    deviceId = _options.DeviceId,
                    envelope = line
                });

                using var response = await _http.SendAsync(request, cancellationToken);

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
