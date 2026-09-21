namespace CompanyBrain.Api;

public sealed record CompanyProfile(
    string CompanyId,
    string LegalName,
    string TaxId,
    string BusinessType,
    string Address,
    string City,
    string PostalCode,
    string Country,
    string PrimaryContact,
    string Email,
    string Phone,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record BusinessFactInput(
    string Source,
    string SourceType,
    string Statement,
    string Context,
    double Confidence = 0.8);

public sealed record BusinessFact(
    string FactId,
    string CompanyId,
    string Source,
    string SourceType,
    string Statement,
    string Context,
    double Confidence,
    DateTimeOffset ObservedAt);
