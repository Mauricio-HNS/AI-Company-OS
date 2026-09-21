using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace CompanyBrain.Api;

public sealed record SalesOrderLineRequest(
    string ItemId,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount = 0m,
    decimal TaxRate = 0m);

public sealed record SalesOrderRequest(
    string CustomerId,
    string Currency,
    DateTimeOffset OrderedAt,
    string? QuoteId,
    SalesOrderLineRequest[] Lines,
    string Notes = "",
    string? SourceType = null,
    string? SourceId = null);

public sealed record SalesOrderLine(
    string ItemId,
    string ItemKind,
    string ItemName,
    decimal Quantity,
    decimal UnitPrice,
    decimal Discount,
    decimal TaxRate,
    decimal NetAmount,
    decimal TaxAmount,
    decimal GrossAmount);

public sealed record SalesOrder(
    string OrderId,
    string CompanyId,
    string Number,
    string CustomerId,
    string CustomerName,
    string Currency,
    DateTimeOffset OrderedAt,
    string? QuoteId,
    decimal NetAmount,
    decimal TaxAmount,
    decimal GrossAmount,
    SalesOrderLine[] Lines,
    string Notes,
    string Status,
    DateTimeOffset CreatedAt,
    string CreatedBy,
    string? SourceType,
    string? SourceId);

public sealed class CompanySalesOrderStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanySalesOrderStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_sales_orders (
                order_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                number TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                customer_name TEXT NOT NULL,
                currency TEXT NOT NULL,
                ordered_at TEXT NOT NULL,
                quote_id TEXT,
                net_amount TEXT NOT NULL,
                tax_amount TEXT NOT NULL,
                gross_amount TEXT NOT NULL,
                lines TEXT NOT NULL,
                notes TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL,
                source_type TEXT,
                source_id TEXT
            );
            CREATE INDEX IF NOT EXISTS ix_sales_orders_company_date
                ON company_sales_orders(company_id, ordered_at);
            CREATE INDEX IF NOT EXISTS ix_sales_orders_company_customer
                ON company_sales_orders(company_id, customer_id, ordered_at);
            """;
        command.ExecuteNonQuery();

        EnsureColumn(connection, "source_type");
        EnsureColumn(connection, "source_id");
        using var index = connection.CreateCommand();
        index.CommandText = """
            CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_orders_company_source
                ON company_sales_orders(company_id, source_type, source_id)
                WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
            """;
        index.ExecuteNonQuery();
    }

    public async Task<SalesOrder> CreateAsync(
        string companyId,
        SalesOrderRequest input,
        string actor,
        CancellationToken cancellationToken)
    {
        Validate(input);
        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            if (!string.IsNullOrWhiteSpace(input.SourceType) && !string.IsNullOrWhiteSpace(input.SourceId))
            {
                var existing = await GetBySourceAsync(connection, companyId, input.SourceType.Trim(), input.SourceId.Trim(), cancellationToken);
                if (existing is not null) return existing;
            }

            var customer = await LoadCustomerAsync(connection, companyId, input.CustomerId, cancellationToken)
                ?? throw new ArgumentException("Customer does not exist in this company.");

            var lines = new List<SalesOrderLine>();
            foreach (var requestLine in input.Lines)
            {
                var item = await LoadCatalogItemAsync(connection, companyId, requestLine.ItemId, cancellationToken)
                    ?? throw new ArgumentException($"Catalog item '{requestLine.ItemId}' does not exist in this company.");

                if (!item.Active)
                    throw new ArgumentException($"Catalog item '{item.Name}' is inactive.");

                if (!string.Equals(item.Currency, input.Currency.Trim(), StringComparison.OrdinalIgnoreCase))
                    throw new ArgumentException($"Currency mismatch for catalog item '{item.Name}'.");

                var price = decimal.Round(requestLine.UnitPrice, 2, MidpointRounding.AwayFromZero);
                if (price < 0 || requestLine.Quantity <= 0 || requestLine.Discount < 0)
                    throw new ArgumentException("Invalid order line values.");

                var baseAmount = decimal.Round(
                    requestLine.Quantity * price - requestLine.Discount,
                    2,
                    MidpointRounding.AwayFromZero);
                if (baseAmount < 0)
                    throw new ArgumentException($"Discount exceeds line value for '{item.Name}'.");

                var tax = decimal.Round(
                    baseAmount * requestLine.TaxRate / 100m,
                    2,
                    MidpointRounding.AwayFromZero);

                lines.Add(new SalesOrderLine(
                    item.ItemId,
                    item.Kind,
                    item.Name,
                    requestLine.Quantity,
                    price,
                    decimal.Round(requestLine.Discount, 2, MidpointRounding.AwayFromZero),
                    requestLine.TaxRate,
                    baseAmount,
                    tax,
                    baseAmount + tax));
            }

            var net = lines.Sum(x => x.NetAmount);
            var taxAmount = lines.Sum(x => x.TaxAmount);
            var gross = net + taxAmount;
            var now = DateTimeOffset.UtcNow;
            var order = new SalesOrder(
                $"ORD-{Guid.NewGuid():N}",
                companyId,
                $"SO-{DateTime.UtcNow:yyyy}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                customer.Value.CustomerId,
                customer.Value.Name,
                input.Currency.Trim().ToUpperInvariant(),
                input.OrderedAt,
                string.IsNullOrWhiteSpace(input.QuoteId) ? null : input.QuoteId.Trim(),
                net,
                taxAmount,
                gross,
                lines.ToArray(),
                input.Notes.Trim(),
                "DRAFT",
                now,
                actor,
                string.IsNullOrWhiteSpace(input.SourceType) ? null : input.SourceType.Trim().ToUpperInvariant(),
                string.IsNullOrWhiteSpace(input.SourceId) ? null : input.SourceId.Trim());

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_sales_orders(
                    order_id, company_id, number, customer_id, customer_name, currency,
                    ordered_at, quote_id, net_amount, tax_amount, gross_amount, lines,
                    notes, status, created_at, created_by, source_type, source_id)
                VALUES($id,$company,$number,$customer,$customerName,$currency,$ordered,
                       $quote,$net,$tax,$gross,$lines,$notes,$status,$created,$actor,$sourceType,$sourceId);
                """;
            Add(command, "$id", order.OrderId);
            Add(command, "$company", order.CompanyId);
            Add(command, "$number", order.Number);
            Add(command, "$customer", order.CustomerId);
            Add(command, "$customerName", order.CustomerName);
            Add(command, "$currency", order.Currency);
            Add(command, "$ordered", order.OrderedAt.ToString("O"));
            Add(command, "$quote", (object?)order.QuoteId ?? DBNull.Value);
            Add(command, "$net", order.NetAmount.ToString(CultureInfo.InvariantCulture));
            Add(command, "$tax", order.TaxAmount.ToString(CultureInfo.InvariantCulture));
            Add(command, "$gross", order.GrossAmount.ToString(CultureInfo.InvariantCulture));
            Add(command, "$lines", JsonSerializer.Serialize(order.Lines));
            Add(command, "$notes", order.Notes);
            Add(command, "$status", order.Status);
            Add(command, "$created", order.CreatedAt.ToString("O"));
            Add(command, "$actor", order.CreatedBy);
            Add(command, "$sourceType", (object?)order.SourceType ?? DBNull.Value);
            Add(command, "$sourceId", (object?)order.SourceId ?? DBNull.Value);
            await command.ExecuteNonQueryAsync(cancellationToken);
            return order;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<SalesOrder> ConfirmAsync(string companyId, string orderId, string actor, CompanyInventoryStore inventory, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try {
            var order=await GetAsync(companyId,orderId,ct) ?? throw new ArgumentException("Sales order does not exist in this company.");
            if (order.Status=="CONFIRMED" || order.Status=="INVOICED") return order;
            if (order.Status=="CANCELLED") throw new ArgumentException("Cancelled sales orders cannot be confirmed.");
            if (order.Lines.Any(line => line.ItemKind == "PRODUCT"))
                await inventory.ReserveForSalesOrderAsync(companyId, orderId, actor, ct);

            await using var connection=new SqliteConnection(_connectionString); await connection.OpenAsync(ct);
            await using var command=connection.CreateCommand(); command.CommandText="UPDATE company_sales_orders SET status='CONFIRMED' WHERE company_id=$company AND order_id=$id;";
            Add(command,"$company",companyId);Add(command,"$id",orderId);await command.ExecuteNonQueryAsync(ct);
            return order with { Status="CONFIRMED" };
        } finally { _gate.Release(); }
    }

    public async Task<SalesOrder> CreateFromCompletedAppointmentAsync(
        string companyId, Appointment appointment, string actor, CancellationToken cancellationToken)
    {
        if (!string.Equals(appointment.Status, "COMPLETED", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Only completed appointments can generate a sales order.");

        await _gate.WaitAsync(cancellationToken);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);
            var existing = await GetBySourceAsync(connection, companyId, "APPOINTMENT", appointment.AppointmentId, cancellationToken);
            if (existing is not null) return existing;

            var item = await LoadServiceCatalogItemAsync(connection, companyId, appointment.ServiceName, cancellationToken)
                ?? throw new ArgumentException($"No active SERVICE catalog item matches appointment service '{appointment.ServiceName}'.");

            var request = new SalesOrderRequest(
                appointment.CustomerId, item.Currency, appointment.Start, null,
                [new SalesOrderLineRequest(item.ItemId, 1m, item.UnitPrice, 0m, item.TaxRate)],
                $"Generated from completed appointment {appointment.AppointmentId}.", "APPOINTMENT", appointment.AppointmentId);
            return await CreateInternalAsync(connection, companyId, request, actor, cancellationToken);
        }
        finally { _gate.Release(); }
    }

    private async Task<SalesOrder> CreateInternalAsync(SqliteConnection connection, string companyId, SalesOrderRequest input, string actor, CancellationToken ct)
    {
        var customer = await LoadCustomerAsync(connection, companyId, input.CustomerId, ct)
            ?? throw new ArgumentException("Customer does not exist in this company.");
        var lines = new List<SalesOrderLine>();
        foreach (var requestLine in input.Lines)
        {
            var item = await LoadCatalogItemAsync(connection, companyId, requestLine.ItemId, ct)
                ?? throw new ArgumentException($"Catalog item '{requestLine.ItemId}' does not exist in this company.");
            if (!item.Active) throw new ArgumentException($"Catalog item '{item.Name}' is inactive.");
            if (!string.Equals(item.Currency, input.Currency.Trim(), StringComparison.OrdinalIgnoreCase)) throw new ArgumentException($"Currency mismatch for catalog item '{item.Name}'.");
            var price = decimal.Round(requestLine.UnitPrice, 2, MidpointRounding.AwayFromZero);
            var baseAmount = decimal.Round(requestLine.Quantity * price - requestLine.Discount, 2, MidpointRounding.AwayFromZero);
            if (price < 0 || requestLine.Quantity <= 0 || requestLine.Discount < 0 || baseAmount < 0) throw new ArgumentException("Invalid order line values.");
            var tax = decimal.Round(baseAmount * requestLine.TaxRate / 100m, 2, MidpointRounding.AwayFromZero);
            lines.Add(new SalesOrderLine(item.ItemId, item.Kind, item.Name, requestLine.Quantity, price, decimal.Round(requestLine.Discount,2,MidpointRounding.AwayFromZero), requestLine.TaxRate, baseAmount, tax, baseAmount + tax));
        }
        var net=lines.Sum(x=>x.NetAmount); var taxAmount=lines.Sum(x=>x.TaxAmount); var now=DateTimeOffset.UtcNow;
        var order=new SalesOrder($"ORD-{Guid.NewGuid():N}",companyId,$"SO-{DateTime.UtcNow:yyyy}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",customer.Value.CustomerId,customer.Value.Name,input.Currency.Trim().ToUpperInvariant(),input.OrderedAt,string.IsNullOrWhiteSpace(input.QuoteId)?null:input.QuoteId.Trim(),net,taxAmount,net+taxAmount,lines.ToArray(),input.Notes.Trim(),"DRAFT",now,actor,input.SourceType?.Trim().ToUpperInvariant(),input.SourceId?.Trim());
        await using var command=connection.CreateCommand(); command.CommandText="""
            INSERT INTO company_sales_orders(order_id,company_id,number,customer_id,customer_name,currency,ordered_at,quote_id,net_amount,tax_amount,gross_amount,lines,notes,status,created_at,created_by,source_type,source_id)
            VALUES($id,$company,$number,$customer,$customerName,$currency,$ordered,$quote,$net,$tax,$gross,$lines,$notes,$status,$created,$actor,$sourceType,$sourceId);""";
        Add(command,"$id",order.OrderId);Add(command,"$company",order.CompanyId);Add(command,"$number",order.Number);Add(command,"$customer",order.CustomerId);Add(command,"$customerName",order.CustomerName);Add(command,"$currency",order.Currency);Add(command,"$ordered",order.OrderedAt.ToString("O"));Add(command,"$quote",(object?)order.QuoteId??DBNull.Value);Add(command,"$net",order.NetAmount.ToString(CultureInfo.InvariantCulture));Add(command,"$tax",order.TaxAmount.ToString(CultureInfo.InvariantCulture));Add(command,"$gross",order.GrossAmount.ToString(CultureInfo.InvariantCulture));Add(command,"$lines",JsonSerializer.Serialize(order.Lines));Add(command,"$notes",order.Notes);Add(command,"$status",order.Status);Add(command,"$created",order.CreatedAt.ToString("O"));Add(command,"$actor",order.CreatedBy);Add(command,"$sourceType",(object?)order.SourceType??DBNull.Value);Add(command,"$sourceId",(object?)order.SourceId??DBNull.Value);
        await command.ExecuteNonQueryAsync(ct); return order;
    }

    public async Task<SalesOrder> IssueInvoiceAsync(
        string companyId, string orderId, string actor, FiscalBrainStore fiscal, CompanyInventoryStore inventory, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var order = await GetAsync(companyId, orderId, ct)
                ?? throw new ArgumentException("Sales order does not exist in this company.");
            if (order.Status == "INVOICED") return order;
            if (order.Status == "CANCELLED") throw new ArgumentException("Cancelled sales orders cannot be invoiced.");
            if (order.Status == "DRAFT") throw new ArgumentException("Sales order must be confirmed before invoicing.");

            if (order.Lines.Any(line => line.ItemKind == "PRODUCT"))
                await inventory.ConsumeSalesOrderReservationsAsync(companyId, orderId, actor, ct);

            var invoiceNumber = $"INV-{DateTime.UtcNow:yyyy}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            await fiscal.UpsertEntryAsync(companyId, new FiscalEntryInput(
                $"SALE-{order.OrderId}",
                "REVENUE",
                invoiceNumber,
                order.NetAmount,
                order.TaxAmount,
                order.GrossAmount,
                order.Currency,
                order.OrderedAt,
                order.CustomerName), ct);

            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var command = connection.CreateCommand();
            command.CommandText = "UPDATE company_sales_orders SET status='INVOICED' WHERE company_id=$company AND order_id=$id;";
            Add(command, "$company", companyId); Add(command, "$id", orderId);
            await command.ExecuteNonQueryAsync(ct);

            return order with { Status = "INVOICED" };
        }
        finally { _gate.Release(); }
    }

    public async Task<SalesOrder> CancelAsync(string companyId, string orderId, string actor, CompanyInventoryStore inventory, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var order = await GetAsync(companyId, orderId, ct)
                ?? throw new ArgumentException("Sales order does not exist in this company.");
            if (order.Status == "CANCELLED") return order;
            if (order.Status == "INVOICED")
                throw new ArgumentException("Invoiced sales orders cannot be cancelled.");

            await inventory.ReleaseSalesOrderReservationsAsync(companyId, orderId, actor, ct);

            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var command = connection.CreateCommand();
            command.CommandText = "UPDATE company_sales_orders SET status='CANCELLED' WHERE company_id=$company AND order_id=$id;";
            Add(command, "$company", companyId);
            Add(command, "$id", orderId);
            await command.ExecuteNonQueryAsync(ct);
            return order with { Status = "CANCELLED" };
        }
        finally { _gate.Release(); }
    }

    public async Task<IReadOnlyList<SalesOrder>> ListAsync(
        string companyId,
        string? customerId,
        string? status,
        int limit,
        CancellationToken cancellationToken)
    {
        var result = new List<SalesOrder>();
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT order_id, company_id, number, customer_id, customer_name, currency,
                   ordered_at, quote_id, net_amount, tax_amount, gross_amount, lines,
                   notes, status, created_at, created_by, source_type, source_id
            FROM company_sales_orders
            WHERE company_id = $company
              AND ($customer = '' OR customer_id = $customer)
              AND ($status = '' OR status = $status)
            ORDER BY ordered_at DESC
            LIMIT $limit;
            """;
        Add(command, "$company", companyId);
        Add(command, "$customer", customerId?.Trim() ?? "");
        Add(command, "$status", status?.Trim().ToUpperInvariant() ?? "");
        Add(command, "$limit", Math.Clamp(limit, 1, 500));
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            result.Add(Read(reader));
        return result;
    }

    public async Task<SalesOrder?> GetAsync(string companyId, string orderId, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT order_id, company_id, number, customer_id, customer_name, currency,
                   ordered_at, quote_id, net_amount, tax_amount, gross_amount, lines,
                   notes, status, created_at, created_by
            FROM company_sales_orders
            WHERE company_id = $company AND order_id = $id LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$id", orderId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? Read(reader) : null;
    }

    private static async Task<(string CustomerId, string Name)?> LoadCustomerAsync(
        SqliteConnection connection, string companyId, string customerId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT customer_id, name FROM company_customers WHERE company_id=$company AND customer_id=$id AND status <> 'BLOCKED' LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", customerId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task<(string ItemId, string Kind, string Name, string Currency, bool Active, decimal UnitPrice, decimal TaxRate)?> LoadServiceCatalogItemAsync(SqliteConnection connection, string companyId, string name, CancellationToken ct)
    {
        await using var command=connection.CreateCommand(); command.CommandText="""
            SELECT item_id,kind,name,currency,active,unit_price,tax_rate FROM company_catalog_items
            WHERE company_id=$company AND kind='SERVICE' AND active=1 AND lower(name)=lower($name)
            ORDER BY updated_at DESC LIMIT 1;"""; Add(command,"$company",companyId);Add(command,"$name",name.Trim());
        await using var reader=await command.ExecuteReaderAsync(ct); return await reader.ReadAsync(ct) ? (reader.GetString(0),reader.GetString(1),reader.GetString(2),reader.GetString(3),reader.GetInt32(4)==1,decimal.Parse(reader.GetString(5),CultureInfo.InvariantCulture),decimal.Parse(reader.GetString(6),CultureInfo.InvariantCulture)) : null;
    }

    private static async Task<(string ItemId, string Kind, string Name, string Currency, bool Active)?> LoadCatalogItemAsync(
        SqliteConnection connection, string companyId, string itemId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT item_id, kind, name, currency, active FROM company_catalog_items WHERE company_id=$company AND item_id=$id LIMIT 1";
        Add(command, "$company", companyId);
        Add(command, "$id", itemId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)
            ? (reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetInt32(4) == 1)
            : null;
    }

    private static SalesOrder Read(SqliteDataReader reader) => new(
        reader.GetString(0), reader.GetString(1), reader.GetString(2), reader.GetString(3), reader.GetString(4),
        reader.GetString(5), DateTimeOffset.Parse(reader.GetString(6)), reader.IsDBNull(7) ? null : reader.GetString(7),
        decimal.Parse(reader.GetString(8), CultureInfo.InvariantCulture), decimal.Parse(reader.GetString(9), CultureInfo.InvariantCulture),
        decimal.Parse(reader.GetString(10), CultureInfo.InvariantCulture), JsonSerializer.Deserialize<SalesOrderLine[]>(reader.GetString(11)) ?? [],
        reader.GetString(12), reader.GetString(13), DateTimeOffset.Parse(reader.GetString(14)), reader.GetString(15),
        reader.IsDBNull(16) ? null : reader.GetString(16), reader.IsDBNull(17) ? null : reader.GetString(17));

    private static void Validate(SalesOrderRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.CustomerId)) throw new ArgumentException("CustomerId is required.");
        if (string.IsNullOrWhiteSpace(input.Currency) || input.Currency.Trim().Length != 3) throw new ArgumentException("Currency must be a 3-letter code.");
        if (input.Lines is null || input.Lines.Length == 0) throw new ArgumentException("At least one order line is required.");
        if (input.Lines.Length > 500) throw new ArgumentException("An order cannot contain more than 500 lines.");
    }

    private static void Add(SqliteCommand command, string name, object value) => command.Parameters.AddWithValue(name, value);
}

public static class CompanySalesOrdersApi
{
    public static void MapCompanySalesOrdersApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/sales-orders", async (
            HttpRequest request, string companyId, SalesOrderRequest input,
            CompanySalesOrderStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            try
            {
                var order = await store.CreateAsync(companyId, input, Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "SALES_ORDER_CREATED", Actor(request),
                    request.Headers["X-Correlation-Id"].ToString(), "SALES_ORDER", order.OrderId,
                    "Sales order created in DRAFT status.",
                    JsonSerializer.Serialize(new { order.Number, order.CustomerId, order.QuoteId, order.NetAmount, order.TaxAmount, order.GrossAmount }), ct);
                return Results.Created($"/api/company/v1/companies/{companyId}/sales-orders/{order.OrderId}", new { order, externalSendAllowed = false });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { error = e.Message }); }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/sales-orders/{orderId}/confirm", async (
            HttpRequest request,string companyId,string orderId,CompanySalesOrderStore sales,CompanyInventoryStore inventory,CloudStore audit,IConfiguration configuration,CancellationToken ct) =>
        {
            if (!Authorized(request,configuration) || !Safe(companyId) || !Safe(orderId)) return Results.Unauthorized();
            try {
                var order=await sales.ConfirmAsync(companyId,orderId,Actor(request),inventory,ct);
                await audit.AppendAuditJournalAsync(companyId,"SALES_ORDER_CONFIRMED",Actor(request),request.Headers["X-Correlation-Id"].ToString(),"SALES_ORDER",order.OrderId,"Sales order confirmed and ready for invoicing.",JsonSerializer.Serialize(new {order.Number,order.GrossAmount}),ct);
                return Results.Ok(new {order});
            } catch(ArgumentException e){return Results.BadRequest(new {error=e.Message});}
        });

        app.MapPost("/api/company/v1/companies/{companyId}/sales-orders/{orderId}/cancel", async (
            HttpRequest request,string companyId,string orderId,CompanySalesOrderStore sales,CompanyInventoryStore inventory,CloudStore audit,IConfiguration configuration,CancellationToken ct) =>
        {
            if (!Authorized(request,configuration) || !Safe(companyId) || !Safe(orderId)) return Results.Unauthorized();
            try {
                var order=await sales.CancelAsync(companyId,orderId,Actor(request),inventory,ct);
                await audit.AppendAuditJournalAsync(companyId,"SALES_ORDER_CANCELLED",Actor(request),request.Headers["X-Correlation-Id"].ToString(),"SALES_ORDER",order.OrderId,"Sales order cancelled and inventory reservations released.",JsonSerializer.Serialize(new {order.Number,order.GrossAmount}),ct);
                return Results.Ok(new {order});
            } catch(ArgumentException e){return Results.BadRequest(new {error=e.Message});}
        });

        app.MapPost("/api/company/v1/companies/{companyId}/appointments/{appointmentId}/complete-and-bill", async (
            HttpRequest request,string companyId,string appointmentId,CompanyAgendaStore agenda,CompanySalesOrderStore sales,CloudStore audit,IConfiguration configuration,CancellationToken ct) =>
        {
            if (!Authorized(request,configuration) || !Safe(companyId) || !Safe(appointmentId)) return Results.Unauthorized();
            try {
                var appointment=await agenda.GetAppointmentAsync(companyId,appointmentId,ct); if (appointment is null) return Results.NotFound();
                if (string.Equals(appointment.Status,"IN_SERVICE",StringComparison.OrdinalIgnoreCase)) appointment=await agenda.ChangeStatusAsync(companyId,appointmentId,AppointmentStatus.Completed,"Service completed and billing requested.",Actor(request),ct);
                if (!string.Equals(appointment.Status,"COMPLETED",StringComparison.OrdinalIgnoreCase)) return Results.BadRequest(new { error=$"Appointment must be IN_SERVICE or COMPLETED. Current status: {appointment.Status}." });
                var order=await sales.CreateFromCompletedAppointmentAsync(companyId,appointment,Actor(request),ct);
                await audit.AppendAuditJournalAsync(companyId,"APPOINTMENT_BILLED",Actor(request),request.Headers["X-Correlation-Id"].ToString(),"APPOINTMENT",appointment.AppointmentId,"Completed appointment linked to a draft sales order.",JsonSerializer.Serialize(new {appointment.ServiceId,appointment.ServiceName,order.OrderId,order.Number,order.GrossAmount}),ct);
                return Results.Ok(new {appointment,order,externalSendAllowed=false});
            } catch(ArgumentException e){return Results.BadRequest(new {error=e.Message});}
        });

        app.MapPost("/api/company/v1/companies/{companyId}/sales-orders/{orderId}/invoice", async (
            HttpRequest request,string companyId,string orderId,CompanySalesOrderStore sales,FiscalBrainStore fiscal,CompanyInventoryStore inventory,CompanyCommissionStore commissions,CloudStore audit,IConfiguration configuration,CancellationToken ct) =>
        {
            if (!Authorized(request,configuration) || !Safe(companyId) || !Safe(orderId)) return Results.Unauthorized();
            try {
                var order=await sales.IssueInvoiceAsync(companyId,orderId,Actor(request),fiscal,inventory,ct);
                CommissionEntry? commission = null;
                try { commission = await commissions.CalculateFromInvoicedOrderAsync(companyId, order.OrderId, Actor(request), ct); }
                catch (ArgumentException) { /* Commission is optional until a matching rule is configured. */ }
                await audit.AppendAuditJournalAsync(companyId,"SALES_ORDER_INVOICED",Actor(request),request.Headers["X-Correlation-Id"].ToString(),"SALES_ORDER",order.OrderId,"Sales order invoiced and revenue posted to Fiscal Brain.",JsonSerializer.Serialize(new {order.Number,order.GrossAmount,order.Currency}),ct);
                return Results.Ok(new {order,commission,officialSubmission=false});
            } catch(ArgumentException e){return Results.BadRequest(new {error=e.Message});}
        });

        app.MapGet("/api/company/v1/companies/{companyId}/sales-orders", async (
            HttpRequest request, string companyId, string? customerId, string? status, int? limit,
            CompanySalesOrderStore store, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId)) return Results.Unauthorized();
            var orders = await store.ListAsync(companyId, customerId, status, limit ?? 100, ct);
            return Results.Ok(new { orders, count = orders.Count });
        });

        app.MapGet("/api/company/v1/companies/{companyId}/sales-orders/{orderId}", async (
            HttpRequest request, string companyId, string orderId,
            CompanySalesOrderStore store, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(orderId)) return Results.Unauthorized();
            var order = await store.GetAsync(companyId, orderId, ct);
            return order is null ? Results.NotFound() : Results.Ok(new { order });
        });
    }

    private static bool Authorized(HttpRequest request, IConfiguration configuration)
    {
        var expected = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(expected) && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(expected), System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool Safe(string? value) => !string.IsNullOrWhiteSpace(value) && value.Length <= 100
        && value.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.');

    private static string Actor(HttpRequest request)
    {
        var actor = request.Headers["X-Brain-Actor"].ToString();
        return string.IsNullOrWhiteSpace(actor) || actor.Length > 100 ? "company-admin" : actor;
    }
}
