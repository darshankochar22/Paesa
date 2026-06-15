# physicalStock — database tables

Source: `server/physicalStock/physicalStock.js`. SQLite -> PostgreSQL mapping.
DDL in `docs/db/modules/physicalStock.sql`.

## Table: `physical_stock_entries`

Stocktake voucher header. One row per physical-stock voucher.

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| physical_stock_entry_id | BIGINT IDENTITY | no | identity | PK. SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`. |
| company_id | BIGINT | no | — | FK -> companies(company_id), ON DELETE CASCADE. |
| voucher_no | TEXT | yes | — | Auto-generated `PST-NNNNN` if not supplied at create. |
| voucher_date | DATE | no | — | date-only TEXT -> DATE. |
| reference_no | TEXT | yes | — | External reference. |
| narration | TEXT | yes | — | Free-text notes. |
| is_optional | BOOLEAN | no | false | SQLite INTEGER 0/1 -> BOOLEAN. |
| is_post_dated | BOOLEAN | no | false | SQLite INTEGER 0/1 -> BOOLEAN. |
| created_at | TIMESTAMPTZ | no | now() | ISO string default `datetime('now')` -> now(). |
| updated_at | TIMESTAMPTZ | no | now() | ISO string default `datetime('now')` -> now(). Not updated by any code path in this module. |

### Relationships
- `company_id` -> `companies.company_id` (EXPLICIT in source, ON DELETE CASCADE).
- Parent of `physical_stock_entry_lines` (1-to-many).

## Table: `physical_stock_entry_lines`

Per-item count lines belonging to a voucher.

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| line_id | BIGINT IDENTITY | no | identity | PK. SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`. |
| physical_stock_entry_id | BIGINT | no | — | FK -> physical_stock_entries, ON DELETE CASCADE. |
| stock_item_id | BIGINT | yes | — | FK -> stock_items(item_id). |
| godown_id | BIGINT | yes | — | FK -> godowns(godown_id). |
| batch_no | TEXT | yes | — | |
| lot_no | TEXT | yes | — | |
| manufacturing_date | DATE | yes | — | date-only TEXT -> DATE. |
| expiry_date | DATE | yes | — | date-only TEXT -> DATE. |
| quantity | NUMERIC(18,4) | no | 0 | Counted qty. Never floating point. |
| rate | NUMERIC(18,4) | no | 0 | Unit rate. Never floating point. |
| amount | NUMERIC(18,2) | no | 0 | Currency = quantity * rate, computed server-side. Never floating point. |
| line_order | INTEGER | no | 0 | Display order (set to array index at insert). |
| created_at | TIMESTAMPTZ | no | now() | ISO string -> TIMESTAMPTZ. |
| updated_at | TIMESTAMPTZ | no | now() | ISO string -> TIMESTAMPTZ. |

### Relationships
- `physical_stock_entry_id` -> `physical_stock_entries.physical_stock_entry_id` (EXPLICIT, ON DELETE CASCADE).
- `stock_item_id` -> `stock_items.item_id` (EXPLICIT in source).
- `godown_id` -> `godowns.godown_id` (EXPLICIT in source).

## Notes / warnings
- All four FKs are declared explicitly via `REFERENCES` clauses in the SQLite source —
  none were inferred from naming alone.
- The `quantity`, `rate`, and `amount` columns are SQLite `REAL` in the source. They hold
  money/quantity values and are intentionally mapped to NUMERIC (not float) to avoid rounding
  errors in an accounting context.
- Source `DEFAULT 0` on REAL columns and `DEFAULT 0` on flags are preserved; flag defaults are
  translated to `false`, datetime defaults to `now()`. NOT NULL is added wherever the source
  has NOT NULL or a DEFAULT.
- The service's `getById` join references `stock_items.stock_item_id`, which does not exist
  (the PK is `item_id`); this is an application bug, not a schema issue. The FK column
  `physical_stock_entry_lines.stock_item_id` correctly targets `stock_items(item_id)`.
