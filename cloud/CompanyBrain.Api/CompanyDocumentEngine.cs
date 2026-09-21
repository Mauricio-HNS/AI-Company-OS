using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record CompanyBranding(
    string CompanyId,
    string LegalName,
    string TaxId,
    string? LogoReference,
    string PrimaryColor,
    string SecondaryColor,
    string Typography,
    string Address,
    string Contact,
    string HeaderText,
    string FooterText,
    string LegalFooter,
    string DocumentPrefix,
    int Version,
    DateTimeOffset UpdatedAt,
    string UpdatedBy);

public sealed record CompanyBrandingRequest(
    string LegalName,
    string TaxId,
    string? LogoReference,
    string PrimaryColor = "#091E24",
    string SecondaryColor = "#C2A46A",
    string Typography = "Inter",
    string Address = "",
    string Contact = "",
    string HeaderText = "",
    string FooterText = "",
    string LegalFooter = "",
    string DocumentPrefix = "DOC");

public sealed record QuoteLine(
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount = 0m,
    decimal TaxRate = 0m);

public sealed record CompanyQuoteRequest(
    string CustomerName,
    string? CustomerTaxId,
    string Currency,
    DateTimeOffset IssuedAt,
    DateTimeOffset? ValidUntil,
    QuoteLine[] Lines,
    string Terms = "",
    string Notes = "");

public sealed record CompanyQuote(
    string QuoteId,
    string CompanyId,
    string Number,
    string CustomerName,
    string? CustomerTaxId,
    string Currency,
    DateTimeOffset IssuedAt,
    DateTimeOffset? ValidUntil,
    decimal NetAmount,
    decimal TaxAmount,
    decimal GrossAmount,
    QuoteLine[] Lines,
    string Terms,
    string Notes,
    string Status,
    string Provenance,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed record DocumentValidationResult(
    bool Valid,
    string[] Errors,
    string[] Warnings,
    DateTimeOffset ValidatedAt);

public sealed record DocumentArtifact(
    string ArtifactId,
    string CompanyId,
    string DocumentId,
    string Format,
    string Content,
    string Sha256,
    int Version,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed class CompanyDocumentEngineStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyDocumentEngineStore(IConfiguration configuration)
    {
        var configured = configuration["CloudStore:ConnectionString"];
        if (string.IsNullOrWhiteSpace(configured))
        {
            var directory = configuration["CloudStore:DataDirectory"]
                ?? Path.Combine(AppContext.BaseDirectory, "data", "company-brain");
            Directory.CreateDirectory(directory);
            configured = $"Data Source={Path.Combine(directory, "company-brain.db")}";
        }
        _connectionString = configured;
        Initialize();
    }

    private void Initialize()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS company_branding (
                company_id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, tax_id TEXT NOT NULL,
                logo_reference TEXT, primary_color TEXT NOT NULL, secondary_color TEXT NOT NULL,
                typography TEXT NOT NULL, address TEXT NOT NULL, contact TEXT NOT NULL,
                header_text TEXT NOT NULL, footer_text TEXT NOT NULL, legal_footer TEXT NOT NULL,
                document_prefix TEXT NOT NULL, version INTEGER NOT NULL, updated_at TEXT NOT NULL,
                updated_by TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS company_quotes (
                quote_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, number TEXT NOT NULL,
                customer_name TEXT NOT NULL, customer_tax_id TEXT, currency TEXT NOT NULL,
                issued_at TEXT NOT NULL, valid_until TEXT, net_amount TEXT NOT NULL,
                tax_amount TEXT NOT NULL, gross_amount TEXT NOT NULL, lines TEXT NOT NULL,
                terms TEXT NOT NULL, notes TEXT NOT NULL, status TEXT NOT NULL,
                provenance TEXT NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_company_quotes_company_date
                ON company_quotes(company_id, created_at);
            CREATE TABLE IF NOT EXISTS document_artifacts (
                artifact_id TEXT PRIMARY KEY, company_id TEXT NOT NULL, document_id TEXT NOT NULL,
                format TEXT NOT NULL, content TEXT NOT NULL, sha256 TEXT NOT NULL,
                version INTEGER NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_document_artifacts_company_doc
                ON document_artifacts(company_id, document_id, version);
            """;
        command.ExecuteNonQuery();
    }

    public async Task<CompanyBranding> UpsertBrandingAsync(string companyId, CompanyBrandingRequest input, string actor, CancellationToken ct)
    {
        ValidateBranding(input);
        var current = await GetBrandingAsync(companyId, ct);
        var value = new CompanyBranding(companyId, input.LegalName.Trim(), input.TaxId.Trim(),
            string.IsNullOrWhiteSpace(input.LogoReference) ? null : input.LogoReference.Trim(),
            input.PrimaryColor.Trim(), input.SecondaryColor.Trim(), input.Typography.Trim(),
            input.Address.Trim(), input.Contact.Trim(), input.HeaderText.Trim(), input.FooterText.Trim(),
            input.LegalFooter.Trim(), input.DocumentPrefix.Trim().ToUpperInvariant(),
            (current?.Version ?? 0) + 1, DateTimeOffset.UtcNow, actor);
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_branding(
                    company_id, legal_name, tax_id, logo_reference, primary_color, secondary_color,
                    typography, address, contact, header_text, footer_text, legal_footer,
                    document_prefix, version, updated_at, updated_by)
                VALUES($company,$legal,$tax,$logo,$primary,$secondary,$type,$address,$contact,
                       $header,$footer,$legalFooter,$prefix,$version,$updated,$actor)
                ON CONFLICT(company_id) DO UPDATE SET
                    legal_name=excluded.legal_name, tax_id=excluded.tax_id, logo_reference=excluded.logo_reference,
                    primary_color=excluded.primary_color, secondary_color=excluded.secondary_color,
                    typography=excluded.typography, address=excluded.address, contact=excluded.contact,
                    header_text=excluded.header_text, footer_text=excluded.footer_text,
                    legal_footer=excluded.legal_footer, document_prefix=excluded.document_prefix,
                    version=excluded.version, updated_at=excluded.updated_at, updated_by=excluded.updated_by;
                """;
            Add(command,"$company",value.CompanyId); Add(command,"$legal",value.LegalName); Add(command,"$tax",value.TaxId);
            Add(command,"$logo",(object?)value.LogoReference??DBNull.Value); Add(command,"$primary",value.PrimaryColor);
            Add(command,"$secondary",value.SecondaryColor); Add(command,"$type",value.Typography); Add(command,"$address",value.Address);
            Add(command,"$contact",value.Contact); Add(command,"$header",value.HeaderText); Add(command,"$footer",value.FooterText);
            Add(command,"$legalFooter",value.LegalFooter); Add(command,"$prefix",value.DocumentPrefix); Add(command,"$version",value.Version);
            Add(command,"$updated",value.UpdatedAt.ToString("O")); Add(command,"$actor",value.UpdatedBy);
            await command.ExecuteNonQueryAsync(ct);
            return value;
        } finally { _gate.Release(); }
    }

    public async Task<CompanyBranding?> GetBrandingAsync(string companyId, CancellationToken ct)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT company_id,legal_name,tax_id,logo_reference,primary_color,secondary_color,typography,address,contact,header_text,footer_text,legal_footer,document_prefix,version,updated_at,updated_by FROM company_branding WHERE company_id=$company";
        Add(command,"$company",companyId);
        await using var reader=await command.ExecuteReaderAsync(ct);
        if(!await reader.ReadAsync(ct)) return null;
        return new CompanyBranding(reader.GetString(0),reader.GetString(1),reader.GetString(2),
            reader.IsDBNull(3)?null:reader.GetString(3),reader.GetString(4),reader.GetString(5),reader.GetString(6),
            reader.GetString(7),reader.GetString(8),reader.GetString(9),reader.GetString(10),reader.GetString(11),
            reader.GetString(12),reader.GetInt32(13),DateTimeOffset.Parse(reader.GetString(14)),reader.GetString(15));
    }

    public async Task<CompanyQuote> SaveQuoteAsync(string companyId, CompanyQuoteRequest input, string actor, CancellationToken ct)
    {
        ValidateQuote(input);
        var net=input.Lines.Sum(x=>Math.Round(x.Quantity*x.UnitPrice-x.Discount,2,MidpointRounding.AwayFromZero));
        var tax=input.Lines.Sum(x=>Math.Round((x.Quantity*x.UnitPrice-x.Discount)*x.TaxRate/100m,2,MidpointRounding.AwayFromZero));
        var gross=net+tax;
        var number=$"Q-{DateTime.UtcNow:yyyy}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
        var quote=new CompanyQuote($"QUOTE-{Guid.NewGuid():N}",companyId,number,input.CustomerName.Trim(),
            string.IsNullOrWhiteSpace(input.CustomerTaxId)?null:input.CustomerTaxId.Trim(),input.Currency.Trim().ToUpperInvariant(),
            input.IssuedAt,input.ValidUntil,net,tax,gross,input.Lines,input.Terms,input.Notes,"DRAFT",
            "STRUCTURED_INPUT",DateTimeOffset.UtcNow,actor);
        await _gate.WaitAsync(ct);
        try{
            await using var connection=new SqliteConnection(_connectionString); await connection.OpenAsync(ct);
            await using var command=connection.CreateCommand();
            command.CommandText="INSERT INTO company_quotes(quote_id,company_id,number,customer_name,customer_tax_id,currency,issued_at,valid_until,net_amount,tax_amount,gross_amount,lines,terms,notes,status,provenance,created_at,created_by) VALUES($id,$company,$number,$customer,$taxid,$currency,$issued,$valid,$net,$tax,$gross,$lines,$terms,$notes,$status,$prov,$created,$actor)";
            Add(command,"$id",quote.QuoteId);Add(command,"$company",quote.CompanyId);Add(command,"$number",quote.Number);Add(command,"$customer",quote.CustomerName);
            Add(command,"$taxid",(object?)quote.CustomerTaxId??DBNull.Value);Add(command,"$currency",quote.Currency);Add(command,"$issued",quote.IssuedAt.ToString("O"));
            Add(command,"$valid",(object?)quote.ValidUntil?.ToString("O")??DBNull.Value);Add(command,"$net",quote.NetAmount.ToString(CultureInfo.InvariantCulture));
            Add(command,"$tax",quote.TaxAmount.ToString(CultureInfo.InvariantCulture));Add(command,"$gross",quote.GrossAmount.ToString(CultureInfo.InvariantCulture));
            Add(command,"$lines",JsonSerializer.Serialize(quote.Lines));Add(command,"$terms",quote.Terms);Add(command,"$notes",quote.Notes);Add(command,"$status",quote.Status);
            Add(command,"$prov",quote.Provenance);Add(command,"$created",quote.CreatedAt.ToString("O"));Add(command,"$actor",quote.CreatedBy);
            await command.ExecuteNonQueryAsync(ct); return quote;
        } finally { _gate.Release(); }
    }

    public async Task<DocumentArtifact> SaveArtifactAsync(string companyId,string documentId,string format,string content,string actor,CancellationToken ct)
    {
        var bytes=Encoding.UTF8.GetBytes(content);
        var hash=Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        var version=1;
        await using(var connection=new SqliteConnection(_connectionString)){
            await connection.OpenAsync(ct); await using var q=connection.CreateCommand();
            q.CommandText="SELECT COALESCE(MAX(version),0)+1 FROM document_artifacts WHERE company_id=$company AND document_id=$doc";
            Add(q,"$company",companyId);Add(q,"$doc",documentId);version=Convert.ToInt32(await q.ExecuteScalarAsync(ct));
        }
        var artifact=new DocumentArtifact($"ART-{Guid.NewGuid():N}",companyId,documentId,format.ToUpperInvariant(),content,hash,version,DateTimeOffset.UtcNow,actor);
        await _gate.WaitAsync(ct);
        try{
            await using var connection=new SqliteConnection(_connectionString);await connection.OpenAsync(ct);
            await using var command=connection.CreateCommand();
            command.CommandText="INSERT INTO document_artifacts(artifact_id,company_id,document_id,format,content,sha256,version,created_at,created_by) VALUES($id,$company,$doc,$format,$content,$hash,$version,$created,$actor)";
            Add(command,"$id",artifact.ArtifactId);Add(command,"$company",companyId);Add(command,"$doc",documentId);Add(command,"$format",artifact.Format);
            Add(command,"$content",content);Add(command,"$hash",hash);Add(command,"$version",version);Add(command,"$created",artifact.CreatedAt.ToString("O"));Add(command,"$actor",actor);
            await command.ExecuteNonQueryAsync(ct);return artifact;
        }finally{_gate.Release();}
    }

    private static void Add(SqliteCommand c,string name,object value)=>c.Parameters.AddWithValue(name,value);
    private static void ValidateBranding(CompanyBrandingRequest x){if(string.IsNullOrWhiteSpace(x.LegalName)||string.IsNullOrWhiteSpace(x.TaxId))throw new ArgumentException("LegalName and TaxId are required.");if(x.LegalName.Length>200||x.TaxId.Length>100)throw new ArgumentException("Branding field too long.");}
    private static void ValidateQuote(CompanyQuoteRequest x){if(string.IsNullOrWhiteSpace(x.CustomerName)||string.IsNullOrWhiteSpace(x.Currency)||x.Lines is null||x.Lines.Length==0)throw new ArgumentException("Customer, currency and at least one line are required.");foreach(var l in x.Lines)if(l.Quantity<=0||l.UnitPrice<0||l.Discount<0||l.TaxRate<0)throw new ArgumentException("Quote line contains invalid numeric values.");}
}

public static class CompanyDocumentEngineApi
{
    public static void MapCompanyDocumentEngineApi(this WebApplication app)
    {
        app.MapPut("/api/company/v1/companies/{companyId}/branding", async(HttpRequest request,string companyId,CompanyBrandingRequest input,CompanyDocumentEngineStore store,IConfiguration config,CancellationToken ct)=>{
            if(!Key(request,config)||!Safe(companyId))return Results.Unauthorized();
            try{return Results.Ok(await store.UpsertBrandingAsync(companyId,input,Actor(request),ct));}catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}
        });
        app.MapGet("/api/company/v1/companies/{companyId}/branding", async(HttpRequest request,string companyId,CompanyDocumentEngineStore store,IConfiguration config,CancellationToken ct)=>{
            if(!Key(request,config)||!Safe(companyId))return Results.Unauthorized(); var b=await store.GetBrandingAsync(companyId,ct); return b is null?Results.NotFound():Results.Ok(b);
        });
        app.MapPost("/api/company/v1/companies/{companyId}/quotes", async(HttpRequest request,string companyId,CompanyQuoteRequest input,CompanyDocumentEngineStore store,CloudStore audit,IConfiguration config,CancellationToken ct)=>{
            if(!Key(request,config)||!Safe(companyId))return Results.Unauthorized();
            try{var q=await store.SaveQuoteAsync(companyId,input,Actor(request),ct);await audit.AppendAuditJournalAsync(companyId,"QUOTE_CREATED",Actor(request),request.Headers["X-Correlation-Id"].ToString(),"QUOTE",q.QuoteId,"Quote created in DRAFT status",JsonSerializer.Serialize(new{q.Number,q.NetAmount,q.TaxAmount,q.GrossAmount,q.Currency}),ct);return Results.Ok(new{quote=q,externalSendAllowed=false});}catch(ArgumentException e){return Results.BadRequest(new{error=e.Message});}
        });
        app.MapPost("/api/company/v1/companies/{companyId}/documents/{documentId}/validate", async(HttpRequest request,string companyId,string documentId,CompanyDocumentRequest input,IConfiguration config,CancellationToken ct)=>{
            if(!Key(request,config)||!Safe(companyId)||!Safe(documentId))return Results.Unauthorized();
            var errors=new List<string>();var warnings=new List<string>();
            if(string.IsNullOrWhiteSpace(input.Title))errors.Add("TITLE_REQUIRED");
            if(string.IsNullOrWhiteSpace(input.Content))errors.Add("CONTENT_REQUIRED");
            if(input.Content?.Length>2_000_000)errors.Add("CONTENT_TOO_LARGE");
            if(string.Equals(input.DocumentType,"INVOICE",StringComparison.OrdinalIgnoreCase))warnings.Add("Invoice legal/fiscal validation requires jurisdiction-specific rules before issuance.");
            return Results.Ok(new DocumentValidationResult(errors.Count==0,errors.ToArray(),warnings.ToArray(),DateTimeOffset.UtcNow));
        });
        app.MapPost("/api/company/v1/companies/{companyId}/documents/{documentId}/artifacts", async(HttpRequest request,string companyId,string documentId,CompanyDocumentRequest input,CompanyDocumentEngineStore store,IConfiguration config,CancellationToken ct)=>{
            if(!Key(request,config)||!Safe(companyId)||!Safe(documentId)||string.IsNullOrWhiteSpace(input.Content))return Results.BadRequest();
            var validation=new DocumentValidationResult(true,Array.Empty<string>(),Array.Empty<string>(),DateTimeOffset.UtcNow);
            if(!validation.Valid)return Results.BadRequest(validation);
            var artifact=await store.SaveArtifactAsync(companyId,documentId,input.Format,input.Content,Actor(request),ct);
            return Results.Ok(new{artifact,externalSendAllowed=false});
        });
    }
    private static bool Key(HttpRequest r,IConfiguration c){var a=c["BrainAdmin:ApiKey"];var b=r.Headers["X-Brain-Admin-Key"].ToString();return !string.IsNullOrWhiteSpace(a)&&!string.IsNullOrWhiteSpace(b)&&CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(a),Encoding.UTF8.GetBytes(b));}
    private static bool Safe(string? x)=>!string.IsNullOrWhiteSpace(x)&&x.Length<=100&&x.All(c=>char.IsLetterOrDigit(c)||c is '-' or '_' or '.');
    private static string Actor(HttpRequest r){var x=r.Headers["X-Brain-Actor"].ToString();return string.IsNullOrWhiteSpace(x)?"company-admin":x.Length<=100?x:"company-admin";}
}
