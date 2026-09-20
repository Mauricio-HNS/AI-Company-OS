namespace CompanyBrain.Api;

public sealed record CompanyOutput(
    string OutputId,
    string CompanyId,
    string OutputType,
    string Title,
    string Format,
    string Content,
    string SourceSummary,
    int Version,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed record CompanyReportRequest(
    string Title,
    string ReportType = "EXECUTIVE",
    int FactLimit = 100);

public sealed record CompanyDocumentRequest(
    string Title,
    string Content,
    string Format = "MARKDOWN",
    string DocumentType = "GENERAL");
