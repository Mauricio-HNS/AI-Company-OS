using System.Net.Http.Json;
using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record BrainPrompt(string CompanyId, string System, string User);

public sealed class BrainLlmGateway
{
    private readonly HttpClient _http;
    private readonly IConfiguration _configuration;
    private readonly ILogger<BrainLlmGateway> _logger;

    public BrainLlmGateway(HttpClient http, IConfiguration configuration, ILogger<BrainLlmGateway> logger)
    {
        _http = http;
        _configuration = configuration;
        _logger = logger;
        _http.Timeout = TimeSpan.FromSeconds(60);
    }

    public async Task<string?> CompleteAsync(BrainPrompt prompt, CancellationToken cancellationToken)
    {
        var endpoint = _configuration["Llm:Endpoint"];
        var apiKey = _configuration["Llm:ApiKey"];
        var model = _configuration["Llm:Model"];

        if (string.IsNullOrWhiteSpace(endpoint) ||
            string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(model))
            return null;

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Authorization = new("Bearer", apiKey);
        request.Content = JsonContent.Create(new
        {
            model,
            messages = new[]
            {
                new { role = "system", content = prompt.System },
                new { role = "user", content = prompt.User }
            },
            temperature = 0.1
        });

        try
        {
            using var response = await _http.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("LLM request failed with status {StatusCode}", response.StatusCode);
                return null;
            }

            using var json = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
            if (json is null ||
                !json.RootElement.TryGetProperty("choices", out var choices) ||
                choices.ValueKind != JsonValueKind.Array ||
                choices.GetArrayLength() == 0 ||
                !choices[0].TryGetProperty("message", out var message) ||
                !message.TryGetProperty("content", out var content))
                return null;

            return content.GetString();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "LLM request failed for company {CompanyId}", prompt.CompanyId);
            return null;
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning("LLM request timed out for company {CompanyId}", prompt.CompanyId);
            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "LLM response was not valid JSON for company {CompanyId}", prompt.CompanyId);
            return null;
        }
    }
}
