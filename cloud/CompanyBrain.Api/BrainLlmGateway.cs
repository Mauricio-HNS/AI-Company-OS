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

        using var response = await _http.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("LLM request failed with status {StatusCode}", response.StatusCode);
            return null;
        }

        using var json = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
        return json?.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();
    }
}
