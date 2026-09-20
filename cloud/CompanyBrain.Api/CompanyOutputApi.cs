using System.Text;

namespace CompanyBrain.Api;

public static class CompanyOutputApi
{
    public static void MapCompanyOutputApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/reports", async (
            HttpRequest request,
            string companyId,
            CompanyReportRequest input,
            CompanyDataStore dataStore,
            CompanyOutputStore outputStore,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId) || string.IsNullOrWhiteSpace(input.Title))
                return Results.BadRequest(new { generated = false, reason = "Invalid companyId or report title." });

            var profile = await dataStore.GetProfileAsync(companyId, cancellationToken);
            var facts = await dataStore.GetFactsAsync(companyId, Math.Clamp(input.FactLimit, 1, 200), cancellationToken);

            if (profile is null && facts.Count == 0)
                return Results.Conflict(new
                {
                    generated = false,
                    reason = "The company has no registered profile or business facts yet."
                });

            var content = BuildReport(profile, facts, input);
            var sourceSummary = BuildSourceSummary(profile, facts);
            var output = await outputStore.SaveAsync(
                companyId,
                "REPORT",
                input.Title,
                "MARKDOWN",
                content,
                sourceSummary,
                "company-brain",
                cancellationToken);

            return Results.Ok(new
            {
                generated = true,
                output,
                note = "The report contains only information currently registered in the company's knowledge base."
            });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/documents", async (
            HttpRequest request,
            string companyId,
            CompanyDocumentRequest input,
            CompanyOutputStore outputStore,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId) ||
                string.IsNullOrWhiteSpace(input.Title) ||
                string.IsNullOrWhiteSpace(input.Content))
                return Results.BadRequest(new { saved = false, reason = "Company, title and content are required." });

            if (input.Content.Length > 2_000_000)
                return Results.BadRequest(new { saved = false, reason = "Document content exceeds the 2 MB limit." });

            var output = await outputStore.SaveAsync(
                companyId,
                "DOCUMENT",
                input.Title,
                input.Format,
                input.Content,
                "Provided directly by the company/user.",
                "company-user",
                cancellationToken);

            return Results.Ok(new { saved = true, output });
        });

        app.MapGet("/api/company/v1/companies/{companyId}/outputs", async (
            HttpRequest request,
            string companyId,
            CompanyOutputStore outputStore,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId))
                return Results.BadRequest();

            var outputs = await outputStore.GetAsync(companyId, 100, cancellationToken);
            return Results.Ok(new { companyId, count = outputs.Count, outputs });
        });

        app.MapGet("/api/company/v1/companies/{companyId}/outputs/{outputId}", async (
            HttpRequest request,
            string companyId,
            string outputId,
            CompanyOutputStore outputStore,
            IConfiguration configuration,
            CancellationToken cancellationToken) =>
        {
            if (!HasAdminKey(request, configuration))
                return Results.Unauthorized();

            if (!IsSafeIdentifier(companyId) || !IsSafeIdentifier(outputId))
                return Results.BadRequest();

            var output = (await outputStore.GetAsync(companyId, 200, cancellationToken))
                .FirstOrDefault(x => x.OutputId == outputId);

            return output is null ? Results.NotFound() : Results.Ok(output);
        });
    }

    private static string BuildReport(
        CompanyProfile? profile,
        IReadOnlyList<BusinessFact> facts,
        CompanyReportRequest input)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"# {input.Title.Trim()}");
        builder.AppendLine();
        builder.AppendLine($"**Tipo:** {input.ReportType.Trim().ToUpperInvariant()}  ");
        builder.AppendLine($"**Gerado em:** {DateTimeOffset.UtcNow:O}  ");
        builder.AppendLine();

        builder.AppendLine("## Identidade da empresa");
        if (profile is null)
        {
            builder.AppendLine("Perfil empresarial ainda não cadastrado.");
        }
        else
        {
            builder.AppendLine($"- Razão social: {profile.LegalName}");
            builder.AppendLine($"- Identificador fiscal: {profile.TaxId}");
            builder.AppendLine($"- Tipo de negócio: {profile.BusinessType}");
            builder.AppendLine($"- Localização: {profile.City}, {profile.Country}");
            builder.AppendLine($"- Contato principal: {profile.PrimaryContact}");
        }

        builder.AppendLine();
        builder.AppendLine("## Conhecimento empresarial disponível");
        if (facts.Count == 0)
        {
            builder.AppendLine("Nenhum fato empresarial registrado.");
        }
        else
        {
            foreach (var fact in facts.OrderByDescending(x => x.ObservedAt))
            {
                builder.AppendLine($"- {fact.Statement}");
                builder.AppendLine($"  - Fonte: {fact.Source} ({fact.SourceType})");
                builder.AppendLine($"  - Contexto: {fact.Context}");
                builder.AppendLine($"  - Confiança: {fact.Confidence:0.00}");
                builder.AppendLine($"  - Observado em: {fact.ObservedAt:O}");
            }
        }

        builder.AppendLine();
        builder.AppendLine("## Limitações");
        builder.AppendLine("Este relatório não inventa dados ausentes. Informações não registradas permanecem explicitamente desconhecidas.");

        return builder.ToString();
    }

    private static string BuildSourceSummary(
        CompanyProfile? profile,
        IReadOnlyList<BusinessFact> facts)
    {
        var sources = new List<string>();
        if (profile is not null)
            sources.Add("company_profiles");

        sources.AddRange(facts.Select(x => x.Source).Distinct(StringComparer.OrdinalIgnoreCase));
        return string.Join(", ", sources);
    }

    private static bool HasAdminKey(HttpRequest request, IConfiguration configuration)
    {
        var configured = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();

        return !string.IsNullOrWhiteSpace(configured)
            && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(configured),
                Encoding.UTF8.GetBytes(provided));
    }

    private static bool IsSafeIdentifier(string? value)
        => !string.IsNullOrWhiteSpace(value)
           && value.Length <= 100
           && value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.');
}
