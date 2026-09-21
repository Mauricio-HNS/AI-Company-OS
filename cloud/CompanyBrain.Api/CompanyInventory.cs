using Microsoft.Data.Sqlite;
using System.Globalization;
using System.Text.Json;

namespace CompanyBrain.Api;

public enum InventoryMovementKind
{
    Receipt,
    Issue,
    AdjustmentIn,
    AdjustmentOut
}

public sealed record InventoryLocation(
    string LocationId,
    string CompanyId,
    string Name,
    string? Description,
    bool Active,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record InventoryLocationRequest(
    string Name,
    string? Description = null,
    bool Active = true);

public sealed record InventoryMovementRequest(
    string LocationId,
    string ItemId,
    InventoryMovementKind Kind,
    decimal Quantity,
    string? ReferenceType = null,
    string? ReferenceId = null,
    string Reason = "");

public sealed record InventoryMovement(
    string MovementId,
    string CompanyId,
    string LocationId,
    string ItemId,
    string ItemName,
    string Kind,
    decimal Quantity,
    decimal SignedQuantity,
    string? ReferenceType,
    string? ReferenceId,
    string Reason,
    DateTimeOffset CreatedAt,
    string CreatedBy);

public sealed record InventoryBalance(
    string CompanyId,
    string LocationId,
    string LocationName,
    string ItemId,
    string ItemName,
    decimal QuantityOnHand,
    decimal QuantityReserved,
    decimal QuantityAvailable);

public sealed class CompanyInventoryStore
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public CompanyInventoryStore(IConfiguration configuration)
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
            CREATE TABLE IF NOT EXISTS company_inventory_locations (
                location_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                active INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_inventory_locations_company
                ON company_inventory_locations(company_id, active, name);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_locations_company_name
                ON company_inventory_locations(company_id, name);

            CREATE TABLE IF NOT EXISTS company_inventory_movements (
                movement_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                item_name TEXT NOT NULL,
                kind TEXT NOT NULL,
                quantity TEXT NOT NULL,
                signed_quantity TEXT NOT NULL,
                reference_type TEXT,
                reference_id TEXT,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_inventory_movements_company_item
                ON company_inventory_movements(company_id, item_id, created_at);

            CREATE INDEX IF NOT EXISTS ix_inventory_movements_company_location
                ON company_inventory_movements(company_id, location_id, created_at);

            CREATE TABLE IF NOT EXISTS company_inventory_reservations (
                reservation_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                location_id TEXT NOT NULL,
                item_id TEXT NOT NULL,
                quantity TEXT NOT NULL,
                reference_type TEXT NOT NULL,
                reference_id TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS ix_inventory_reservations_company_item
                ON company_inventory_reservations(company_id, item_id, status);

            CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_reservation_reference_item
                ON company_inventory_reservations(company_id, location_id, item_id, reference_type, reference_id)
                WHERE status = 'ACTIVE';
            """;

        command.ExecuteNonQuery();
    }

    public async Task<InventoryLocation> CreateLocationAsync(
        string companyId,
        InventoryLocationRequest input,
        CancellationToken ct)
    {
        ValidateLocation(input);

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);

            var now = DateTimeOffset.UtcNow;
            var location = new InventoryLocation(
                $"LOC-{Guid.NewGuid():N}",
                companyId,
                input.Name.Trim(),
                Normalize(input.Description),
                input.Active,
                now,
                now);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO company_inventory_locations(
                    location_id, company_id, name, description, active, created_at, updated_at)
                VALUES($id,$company,$name,$description,$active,$created,$updated);
                """;
            Add(command, "$id", location.LocationId);
            Add(command, "$company", location.CompanyId);
            Add(command, "$name", location.Name);
            Add(command, "$description", (object?)location.Description ?? DBNull.Value);
            Add(command, "$active", location.Active ? 1 : 0);
            Add(command, "$created", location.CreatedAt.ToString("O"));
            Add(command, "$updated", location.UpdatedAt.ToString("O"));
            await command.ExecuteNonQueryAsync(ct);

            return location;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyList<InventoryLocation>> ListLocationsAsync(
        string companyId,
        bool? active,
        CancellationToken ct)
    {
        var result = new List<InventoryLocation>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT location_id, company_id, name, description, active, created_at, updated_at
            FROM company_inventory_locations
            WHERE company_id = $company
              AND ($active = -1 OR active = $active)
            ORDER BY name COLLATE NOCASE;
            """;
        Add(command, "$company", companyId);
        Add(command, "$active", active is null ? -1 : active.Value ? 1 : 0);

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            result.Add(new InventoryLocation(
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetInt32(4) == 1,
                DateTimeOffset.Parse(reader.GetString(5)),
                DateTimeOffset.Parse(reader.GetString(6))));
        }

        return result;
    }

    public async Task<InventoryMovement> RegisterMovementAsync(
        string companyId,
        InventoryMovementRequest input,
        string actor,
        CancellationToken ct)
    {
        ValidateMovement(input);

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);

            var location = await LoadLocationAsync(connection, transaction, companyId, input.LocationId, ct)
                ?? throw new ArgumentException("Inventory location does not exist in this company.");

            if (!location.Active)
                throw new ArgumentException("Inventory location is inactive.");

            var item = await LoadProductAsync(connection, transaction, companyId, input.ItemId, ct)
                ?? throw new ArgumentException("Inventory item does not exist or is not a PRODUCT.");

            var quantity = decimal.Round(input.Quantity, 3, MidpointRounding.AwayFromZero);
            var signed = input.Kind switch
            {
                InventoryMovementKind.Receipt or InventoryMovementKind.AdjustmentIn => quantity,
                InventoryMovementKind.Issue or InventoryMovementKind.AdjustmentOut => -quantity,
                _ => throw new ArgumentException("Unsupported inventory movement.")
            };

            if (signed < 0)
            {
                var available = await CalculateAvailableAsync(
                    connection, transaction, companyId, input.LocationId, input.ItemId, ct);

                if (quantity > available)
                    throw new ArgumentException(
                        $"Insufficient available stock. Available: {available.ToString(CultureInfo.InvariantCulture)}.");
            }

            var now = DateTimeOffset.UtcNow;
            var movement = new InventoryMovement(
                $"MOV-{Guid.NewGuid():N}",
                companyId,
                input.LocationId,
                input.ItemId,
                item.Value.Name,
                input.Kind.ToString().ToUpperInvariant(),
                quantity,
                signed,
                Normalize(input.ReferenceType),
                Normalize(input.ReferenceId),
                input.Reason.Trim(),
                now,
                actor);

            await using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT INTO company_inventory_movements(
                    movement_id, company_id, location_id, item_id, item_name, kind,
                    quantity, signed_quantity, reference_type, reference_id, reason,
                    created_at, created_by)
                VALUES($id,$company,$location,$item,$itemName,$kind,$quantity,$signed,
                       $referenceType,$referenceId,$reason,$created,$actor);
                """;
            Add(command, "$id", movement.MovementId);
            Add(command, "$company", movement.CompanyId);
            Add(command, "$location", movement.LocationId);
            Add(command, "$item", movement.ItemId);
            Add(command, "$itemName", movement.ItemName);
            Add(command, "$kind", movement.Kind);
            Add(command, "$quantity", movement.Quantity.ToString(CultureInfo.InvariantCulture));
            Add(command, "$signed", movement.SignedQuantity.ToString(CultureInfo.InvariantCulture));
            Add(command, "$referenceType", (object?)movement.ReferenceType ?? DBNull.Value);
            Add(command, "$referenceId", (object?)movement.ReferenceId ?? DBNull.Value);
            Add(command, "$reason", movement.Reason);
            Add(command, "$created", movement.CreatedAt.ToString("O"));
            Add(command, "$actor", movement.CreatedBy);
            await command.ExecuteNonQueryAsync(ct);

            await transaction.CommitAsync(ct);
            return movement;
        }
        catch
        {
            throw;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<IReadOnlyList<InventoryBalance>> GetBalancesAsync(
        string companyId,
        string? locationId,
        string? itemId,
        CancellationToken ct)
    {
        var result = new List<InventoryBalance>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync(ct);
        await using var command = connection.CreateCommand();

        command.CommandText = """
            SELECT
                l.location_id,
                l.name,
                m.item_id,
                m.item_name,
                COALESCE(SUM(m.signed_quantity), 0),
                COALESCE((
                    SELECT SUM(r.quantity)
                    FROM company_inventory_reservations r
                    WHERE r.company_id = m.company_id
                      AND r.location_id = m.location_id
                      AND r.item_id = m.item_id
                      AND r.status = 'ACTIVE'
                ), 0)
            FROM company_inventory_movements m
            INNER JOIN company_inventory_locations l
                ON l.company_id = m.company_id AND l.location_id = m.location_id
            WHERE m.company_id = $company
              AND ($location = '' OR m.location_id = $location)
              AND ($item = '' OR m.item_id = $item)
            GROUP BY l.location_id, l.name, m.item_id, m.item_name
            ORDER BY l.name COLLATE NOCASE, m.item_name COLLATE NOCASE;
            """;

        Add(command, "$company", companyId);
        Add(command, "$location", locationId?.Trim() ?? "");
        Add(command, "$item", itemId?.Trim() ?? "");

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var onHand = decimal.Parse(reader.GetString(4), CultureInfo.InvariantCulture);
            var reserved = decimal.Parse(reader.GetString(5), CultureInfo.InvariantCulture);
            result.Add(new InventoryBalance(
                companyId,
                reader.GetString(0),
                reader.GetString(1),
                reader.GetString(2),
                reader.GetString(3),
                onHand,
                reserved,
                onHand - reserved));
        }

        return result;
    }

    public async Task<decimal> ReserveAsync(
        string companyId,
        string locationId,
        string itemId,
        decimal quantity,
        string referenceType,
        string referenceId,
        string actor,
        CancellationToken ct)
    {
        if (quantity <= 0) throw new ArgumentException("Reservation quantity must be greater than zero.");
        if (string.IsNullOrWhiteSpace(referenceType) || string.IsNullOrWhiteSpace(referenceId))
            throw new ArgumentException("Reservation reference type and reference id are required.");

        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);

            _ = await LoadLocationAsync(connection, transaction, companyId, locationId, ct)
                ?? throw new ArgumentException("Inventory location does not exist in this company.");

            _ = await LoadProductAsync(connection, transaction, companyId, itemId, ct)
                ?? throw new ArgumentException("Inventory item does not exist or is not a PRODUCT.");

            var available = await CalculateAvailableAsync(
                connection, transaction, companyId, locationId, itemId, ct);

            var normalizedQuantity = decimal.Round(quantity, 3, MidpointRounding.AwayFromZero);
            if (normalizedQuantity > available)
                throw new ArgumentException(
                    $"Insufficient available stock for reservation. Available: {available.ToString(CultureInfo.InvariantCulture)}.");

            await using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT INTO company_inventory_reservations(
                    reservation_id, company_id, location_id, item_id, quantity,
                    reference_type, reference_id, status, created_at, created_by)
                VALUES($id,$company,$location,$item,$quantity,$referenceType,$referenceId,
                       'ACTIVE',$created,$actor);
                """;
            Add(command, "$id", $"RES-{Guid.NewGuid():N}");
            Add(command, "$company", companyId);
            Add(command, "$location", locationId);
            Add(command, "$item", itemId);
            Add(command, "$quantity", normalizedQuantity.ToString(CultureInfo.InvariantCulture));
            Add(command, "$referenceType", referenceType.Trim().ToUpperInvariant());
            Add(command, "$referenceId", referenceId.Trim());
            Add(command, "$created", DateTimeOffset.UtcNow.ToString("O"));
            Add(command, "$actor", actor);
            await command.ExecuteNonQueryAsync(ct);

            await transaction.CommitAsync(ct);
            return normalizedQuantity;
        }
        finally
        {
            _gate.Release();
        }
    }


    public async Task<IReadOnlyList<string>> ReserveForSalesOrderAsync(
        string companyId, string orderId, string actor, CancellationToken ct, bool allowDraft = false)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);

            await using var orderCommand = connection.CreateCommand();
            orderCommand.Transaction = transaction;
            orderCommand.CommandText = """
                SELECT lines, status
                FROM company_sales_orders
                WHERE company_id=$company AND order_id=$order
                LIMIT 1;
                """;
            Add(orderCommand, "$company", companyId);
            Add(orderCommand, "$order", orderId);
            await using var orderReader = await orderCommand.ExecuteReaderAsync(ct);
            if (!await orderReader.ReadAsync(ct))
                throw new ArgumentException("Sales order does not exist in this company.");
            var status = orderReader.GetString(1);
            if (status is not ("CONFIRMED" or "INVOICED") && !(allowDraft && status == "DRAFT"))
                throw new ArgumentException("Only confirmed sales orders can reserve inventory.");
            var lines = JsonSerializer.Deserialize<SalesOrderLine[]>(orderReader.GetString(0))
                ?? Array.Empty<SalesOrderLine>();

            var reservedItems = new List<string>();
            foreach (var line in lines.Where(x => x.ItemKind == "PRODUCT" && x.Quantity > 0))
            {
                var existing = await FindActiveReservationAsync(
                    connection, transaction, companyId, "SALES_ORDER", orderId, line.ItemId, ct);
                if (existing is not null)
                {
                    reservedItems.Add(line.ItemId);
                    continue;
                }

                var locations = await LoadActiveLocationsAsync(connection, transaction, companyId, ct);
                var remaining = line.Quantity;
                foreach (var location in locations)
                {
                    var available = await CalculateAvailableAsync(
                        connection, transaction, companyId, location.LocationId, line.ItemId, ct);
                    if (available <= 0) continue;

                    var take = Math.Min(available, remaining);
                    if (take <= 0) continue;

                    await InsertReservationAsync(
                        connection, transaction, companyId, location.LocationId, line.ItemId,
                        take, "SALES_ORDER", orderId, actor, ct);

                    remaining -= take;
                    if (remaining <= 0) break;
                }

                if (remaining > 0)
                    throw new ArgumentException(
                        $"Insufficient available stock for '{line.ItemName}'. Missing: {remaining.ToString(CultureInfo.InvariantCulture)}.");

                reservedItems.Add(line.ItemId);
            }

            await transaction.CommitAsync(ct);
            return reservedItems;
        }
        finally { _gate.Release(); }
    }

    public async Task<int> ReleaseSalesOrderReservationsAsync(
        string companyId, string orderId, string actor, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE company_inventory_reservations
                SET status='RELEASED'
                WHERE company_id=$company
                  AND reference_type='SALES_ORDER'
                  AND reference_id=$order
                  AND status='ACTIVE';
                """;
            Add(command, "$company", companyId);
            Add(command, "$order", orderId);
            return await command.ExecuteNonQueryAsync(ct);
        }
        finally { _gate.Release(); }
    }

    public async Task<int> ConsumeSalesOrderReservationsAsync(
        string companyId, string orderId, string actor, CancellationToken ct)
    {
        await _gate.WaitAsync(ct);
        try
        {
            await using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(ct);
            await using var transaction = await connection.BeginTransactionAsync(ct);

            var reservations = new List<(string ReservationId, string LocationId, string ItemId, decimal Quantity)>();
            await using (var command = connection.CreateCommand())
            {
                command.Transaction = transaction;
                command.CommandText = """
                    SELECT reservation_id, location_id, item_id, quantity
                    FROM company_inventory_reservations
                    WHERE company_id=$company
                      AND reference_type='SALES_ORDER'
                      AND reference_id=$order
                      AND status='ACTIVE';
                    """;
                Add(command, "$company", companyId);
                Add(command, "$order", orderId);
                await using var reader = await command.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct))
                    reservations.Add((
                        reader.GetString(0),
                        reader.GetString(1),
                        reader.GetString(2),
                        ParseDecimal(reader.GetString(3))));
            }

            foreach (var reservation in reservations)
            {
                var onHand = await CalculateOnHandAsync(
                    connection, transaction, companyId, reservation.LocationId, reservation.ItemId, ct);
                if (onHand < reservation.Quantity)
                    throw new ArgumentException(
                        $"Cannot consume reservation '{reservation.ReservationId}': stock is below reserved quantity.");

                var item = await LoadProductAsync(
                    connection, transaction, companyId, reservation.ItemId, ct)
                    ?? throw new ArgumentException("Reserved inventory item no longer exists or is inactive.");

                await InsertIssueAsync(
                    connection, transaction, companyId, reservation.LocationId,
                    reservation.ItemId, item.Value.Name, reservation.Quantity,
                    "SALES_ORDER", orderId, actor, ct);

                await using var update = connection.CreateCommand();
                update.Transaction = transaction;
                update.CommandText = """
                    UPDATE company_inventory_reservations
                    SET status='CONSUMED'
                    WHERE company_id=$company AND reservation_id=$reservation AND status='ACTIVE';
                    """;
                Add(update, "$company", companyId);
                Add(update, "$reservation", reservation.ReservationId);
                await update.ExecuteNonQueryAsync(ct);
            }

            await transaction.CommitAsync(ct);
            return reservations.Count;
        }
        finally { _gate.Release(); }
    }

    private static async Task<List<InventoryLocation>> LoadActiveLocationsAsync(
        SqliteConnection connection, SqliteTransaction transaction, string companyId, CancellationToken ct)
    {
        var result = new List<InventoryLocation>();
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT location_id, company_id, name, description, active, created_at, updated_at
            FROM company_inventory_locations
            WHERE company_id=$company AND active=1
            ORDER BY name COLLATE NOCASE;
            """;
        Add(command, "$company", companyId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
            result.Add(new InventoryLocation(
                reader.GetString(0), reader.GetString(1), reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3), reader.GetInt32(4) == 1,
                DateTimeOffset.Parse(reader.GetString(5)), DateTimeOffset.Parse(reader.GetString(6))));
        return result;
    }

    private static async Task<(string ReservationId, decimal Quantity)?> FindActiveReservationAsync(
        SqliteConnection connection, SqliteTransaction transaction, string companyId,
        string referenceType, string referenceId, string itemId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT reservation_id, quantity
            FROM company_inventory_reservations
            WHERE company_id=$company AND reference_type=$type AND reference_id=$reference
              AND item_id=$item AND status='ACTIVE'
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$type", referenceType);
        Add(command, "$reference", referenceId);
        Add(command, "$item", itemId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)
            ? (reader.GetString(0), ParseDecimal(reader.GetString(1)))
            : null;
    }

    private static async Task InsertReservationAsync(
        SqliteConnection connection, SqliteTransaction transaction, string companyId,
        string locationId, string itemId, decimal quantity, string referenceType,
        string referenceId, string actor, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO company_inventory_reservations(
                reservation_id, company_id, location_id, item_id, quantity,
                reference_type, reference_id, status, created_at, created_by)
            VALUES($id,$company,$location,$item,$quantity,$type,$reference,'ACTIVE',$created,$actor);
            """;
        Add(command, "$id", $"RES-{Guid.NewGuid():N}");
        Add(command, "$company", companyId);
        Add(command, "$location", locationId);
        Add(command, "$item", itemId);
        Add(command, "$quantity", quantity.ToString(CultureInfo.InvariantCulture));
        Add(command, "$type", referenceType);
        Add(command, "$reference", referenceId);
        Add(command, "$created", DateTimeOffset.UtcNow.ToString("O"));
        Add(command, "$actor", actor);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task<decimal> CalculateOnHandAsync(
        SqliteConnection connection, SqliteTransaction transaction,
        string companyId, string locationId, string itemId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT COALESCE(SUM(CAST(signed_quantity AS REAL)), 0)
            FROM company_inventory_movements
            WHERE company_id=$company AND location_id=$location AND item_id=$item;
            """;
        Add(command, "$company", companyId);
        Add(command, "$location", locationId);
        Add(command, "$item", itemId);
        var value = await command.ExecuteScalarAsync(ct);
        return Convert.ToDecimal(value ?? 0d, CultureInfo.InvariantCulture);
    }

    private static async Task InsertIssueAsync(
        SqliteConnection connection, SqliteTransaction transaction, string companyId,
        string locationId, string itemId, string itemName, decimal quantity,
        string referenceType, string referenceId, string actor, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO company_inventory_movements(
                movement_id, company_id, location_id, item_id, item_name, kind,
                quantity, signed_quantity, reference_type, reference_id, reason,
                created_at, created_by)
            VALUES($id,$company,$location,$item,$itemName,'ISSUE',$quantity,$signed,
                   $type,$reference,$reason,$created,$actor);
            """;
        Add(command, "$id", $"MOV-{Guid.NewGuid():N}");
        Add(command, "$company", companyId);
        Add(command, "$location", locationId);
        Add(command, "$item", itemId);
        Add(command, "$itemName", itemName);
        Add(command, "$quantity", quantity.ToString(CultureInfo.InvariantCulture));
        Add(command, "$signed", (-quantity).ToString(CultureInfo.InvariantCulture));
        Add(command, "$type", referenceType);
        Add(command, "$reference", referenceId);
        Add(command, "$reason", $"Consumed by sales order {referenceId}.");
        Add(command, "$created", DateTimeOffset.UtcNow.ToString("O"));
        Add(command, "$actor", actor);
        await command.ExecuteNonQueryAsync(ct);
    }

    private static async Task<(string ItemId, string Name)?> LoadProductAsync(
        SqliteConnection connection, SqliteTransaction transaction,
        string companyId, string itemId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT item_id, name
            FROM company_catalog_items
            WHERE company_id = $company
              AND item_id = $item
              AND kind = 'PRODUCT'
              AND active = 1
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$item", itemId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct) ? (reader.GetString(0), reader.GetString(1)) : null;
    }

    private static async Task<InventoryLocation?> LoadLocationAsync(
        SqliteConnection connection, SqliteTransaction transaction,
        string companyId, string locationId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT location_id, company_id, name, description, active, created_at, updated_at
            FROM company_inventory_locations
            WHERE company_id=$company AND location_id=$location
            LIMIT 1;
            """;
        Add(command, "$company", companyId);
        Add(command, "$location", locationId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return await reader.ReadAsync(ct)
            ? new InventoryLocation(
                reader.GetString(0), reader.GetString(1), reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetInt32(4) == 1,
                DateTimeOffset.Parse(reader.GetString(5)),
                DateTimeOffset.Parse(reader.GetString(6)))
            : null;
    }

    private static async Task<decimal> CalculateAvailableAsync(
        SqliteConnection connection, SqliteTransaction transaction,
        string companyId, string locationId, string itemId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT
                COALESCE((
                    SELECT SUM(CAST(signed_quantity AS REAL))
                    FROM company_inventory_movements
                    WHERE company_id=$company AND location_id=$location AND item_id=$item
                ), 0),
                COALESCE((
                    SELECT SUM(CAST(quantity AS REAL))
                    FROM company_inventory_reservations
                    WHERE company_id=$company AND location_id=$location AND item_id=$item
                      AND status='ACTIVE'
                ), 0);
            """;
        Add(command, "$company", companyId);
        Add(command, "$location", locationId);
        Add(command, "$item", itemId);
        await using var reader = await command.ExecuteReaderAsync(ct);
        if (!await reader.ReadAsync(ct)) return 0m;
        var onHand = Convert.ToDecimal(reader.GetDouble(0), CultureInfo.InvariantCulture);
        var reserved = Convert.ToDecimal(reader.GetDouble(1), CultureInfo.InvariantCulture);
        return onHand - reserved;
    }

    private static void ValidateLocation(InventoryLocationRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
            throw new ArgumentException("Location name is required.");
        if (input.Name.Trim().Length > 150)
            throw new ArgumentException("Location name is too long.");
        if (input.Description?.Length > 2000)
            throw new ArgumentException("Location description is too long.");
    }

    private static void ValidateMovement(InventoryMovementRequest input)
    {
        if (string.IsNullOrWhiteSpace(input.LocationId))
            throw new ArgumentException("LocationId is required.");
        if (string.IsNullOrWhiteSpace(input.ItemId))
            throw new ArgumentException("ItemId is required.");
        if (input.Quantity <= 0)
            throw new ArgumentException("Quantity must be greater than zero.");
        if (input.Quantity > 1_000_000_000m)
            throw new ArgumentException("Quantity is too large.");
        if (input.Reason.Trim().Length > 2000)
            throw new ArgumentException("Reason is too long.");
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static void Add(SqliteCommand command, string name, object value)
        => command.Parameters.AddWithValue(name, value);
}

public static class CompanyInventoryApi
{
    public static void MapCompanyInventoryApi(this WebApplication app)
    {
        app.MapPost("/api/company/v1/companies/{companyId}/inventory/locations", async (
            HttpRequest request,
            string companyId,
            InventoryLocationRequest input,
            CompanyInventoryStore store,
            CloudStore audit,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId))
                return Results.Unauthorized();

            try
            {
                var location = await store.CreateLocationAsync(companyId, input, ct);
                await audit.AppendAuditJournalAsync(
                    companyId, "INVENTORY_LOCATION_CREATED", Actor(request), Correlation(request),
                    "INVENTORY_LOCATION", location.LocationId,
                    "Inventory location created.",
                    JsonSerializer.Serialize(new { location.Name, location.Active }), ct);
                return Results.Created(
                    $"/api/company/v1/companies/{companyId}/inventory/locations/{location.LocationId}",
                    new { location });
            }
            catch (ArgumentException e)
            {
                return Results.BadRequest(new { error = e.Message });
            }
            catch (SqliteException e) when (e.SqliteErrorCode == 19)
            {
                return Results.Conflict(new { error = "An inventory location with the same name already exists for this company." });
            }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/inventory/locations", async (
            HttpRequest request,
            string companyId,
            bool? active,
            CompanyInventoryStore store,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId))
                return Results.Unauthorized();

            var locations = await store.ListLocationsAsync(companyId, active, ct);
            return Results.Ok(new { locations, count = locations.Count });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/inventory/movements", async (
            HttpRequest request,
            string companyId,
            InventoryMovementRequest input,
            CompanyInventoryStore store,
            CloudStore audit,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId))
                return Results.Unauthorized();

            try
            {
                var movement = await store.RegisterMovementAsync(
                    companyId, input, Actor(request), ct);

                await audit.AppendAuditJournalAsync(
                    companyId, "INVENTORY_MOVEMENT_REGISTERED", Actor(request), Correlation(request),
                    "INVENTORY_MOVEMENT", movement.MovementId,
                    "Inventory movement registered.",
                    JsonSerializer.Serialize(new
                    {
                        movement.LocationId,
                        movement.ItemId,
                        movement.Kind,
                        movement.Quantity,
                        movement.SignedQuantity,
                        movement.ReferenceType,
                        movement.ReferenceId
                    }), ct);

                return Results.Ok(new { movement });
            }
            catch (ArgumentException e)
            {
                return Results.BadRequest(new { error = e.Message });
            }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/inventory/reservations", async (
            HttpRequest request,
            string companyId,
            InventoryMovementRequest input,
            CompanyInventoryStore store,
            CloudStore audit,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId))
                return Results.Unauthorized();

            try
            {
                var quantity = await store.ReserveAsync(
                    companyId,
                    input.LocationId,
                    input.ItemId,
                    input.Quantity,
                    input.ReferenceType ?? "",
                    input.ReferenceId ?? "",
                    Actor(request),
                    ct);

                await audit.AppendAuditJournalAsync(
                    companyId, "INVENTORY_RESERVED", Actor(request), Correlation(request),
                    "INVENTORY_RESERVATION", input.ReferenceId ?? input.ItemId,
                    "Inventory quantity reserved.",
                    JsonSerializer.Serialize(new
                    {
                        input.LocationId,
                        input.ItemId,
                        quantity,
                        input.ReferenceType,
                        input.ReferenceId
                    }), ct);

                return Results.Ok(new { reserved = quantity });
            }
            catch (ArgumentException e)
            {
                return Results.BadRequest(new { error = e.Message });
            }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/inventory/sales-orders/{orderId}/reserve", async (
            HttpRequest request, string companyId, string orderId,
            CompanyInventoryStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(orderId))
                return Results.Unauthorized();
            try
            {
                var items = await store.ReserveForSalesOrderAsync(companyId, orderId, Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "SALES_ORDER_INVENTORY_RESERVED", Actor(request),
                    Correlation(request), "SALES_ORDER", orderId, "Sales order inventory reserved.",
                    JsonSerializer.Serialize(new { items }), ct);
                return Results.Ok(new { reserved = true, items });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { reserved = false, error = e.Message }); }
        });

        app.MapPost("/api/company/v1/companies/{companyId}/inventory/sales-orders/{orderId}/release", async (
            HttpRequest request, string companyId, string orderId,
            CompanyInventoryStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(orderId))
                return Results.Unauthorized();
            var released = await store.ReleaseSalesOrderReservationsAsync(companyId, orderId, Actor(request), ct);
            await audit.AppendAuditJournalAsync(companyId, "SALES_ORDER_INVENTORY_RELEASED", Actor(request),
                Correlation(request), "SALES_ORDER", orderId, "Sales order inventory reservations released.",
                JsonSerializer.Serialize(new { released }), ct);
            return Results.Ok(new { released });
        });

        app.MapPost("/api/company/v1/companies/{companyId}/inventory/sales-orders/{orderId}/consume", async (
            HttpRequest request, string companyId, string orderId,
            CompanyInventoryStore store, CloudStore audit, IConfiguration configuration, CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId) || !Safe(orderId))
                return Results.Unauthorized();
            try
            {
                var consumed = await store.ConsumeSalesOrderReservationsAsync(companyId, orderId, Actor(request), ct);
                await audit.AppendAuditJournalAsync(companyId, "SALES_ORDER_INVENTORY_CONSUMED", Actor(request),
                    Correlation(request), "SALES_ORDER", orderId, "Sales order inventory consumed.",
                    JsonSerializer.Serialize(new { consumed }), ct);
                return Results.Ok(new { consumed });
            }
            catch (ArgumentException e) { return Results.BadRequest(new { consumed = false, error = e.Message }); }
        });

        app.MapGet("/api/company/v1/companies/{companyId}/inventory/balances", async (
            HttpRequest request,
            string companyId,
            string? locationId,
            string? itemId,
            CompanyInventoryStore store,
            IConfiguration configuration,
            CancellationToken ct) =>
        {
            if (!Authorized(request, configuration) || !Safe(companyId))
                return Results.Unauthorized();

            var balances = await store.GetBalancesAsync(companyId, locationId, itemId, ct);
            return Results.Ok(new { balances, count = balances.Count });
        });
    }

    private static bool Authorized(HttpRequest request, IConfiguration configuration)
    {
        var expected = configuration["BrainAdmin:ApiKey"];
        var provided = request.Headers["X-Brain-Admin-Key"].ToString();
        return !string.IsNullOrWhiteSpace(expected) && !string.IsNullOrWhiteSpace(provided)
            && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(expected),
                System.Text.Encoding.UTF8.GetBytes(provided));
    }

    private static bool Safe(string? value)
        => !string.IsNullOrWhiteSpace(value) && value.Length <= 100
           && value.All(c => char.IsLetterOrDigit(c) || c is '-' or '_' or '.');

    private static string Actor(HttpRequest request)
    {
        var actor = request.Headers["X-Brain-Actor"].ToString();
        return string.IsNullOrWhiteSpace(actor) || actor.Length > 100 ? "company-admin" : actor;
    }

    private static string Correlation(HttpRequest request)
        => request.Headers["X-Correlation-Id"].ToString();
}
