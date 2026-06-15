# companyPanCinDetails — database contract

Source: `server/companyPanCinDetails/companyPanCinDetails.js`
Postgres DDL: `docs/db/modules/companyPanCinDetails.sql`

One table. Stores a single PAN/CIN record per company (one-to-one with `companies`).

## Table: `company_pan_cin_details`

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| `company_id` | `BIGINT` | NO | — | PRIMARY KEY. Explicit FK to `companies(company_id)` in source. Supplied by caller, **not** generated as identity. |
| `pan` | `TEXT` | YES | — | Permanent Account Number. SQLite `TEXT`. Service writes `null` when falsy; `get` returns `''` when null. |
| `cin` | `TEXT` | YES | — | Corporate Identification Number. SQLite `TEXT`. Same null/`''` handling as `pan`. |
| `created_at` | `TIMESTAMPTZ` | NO | `now()` | SQLite `TEXT DEFAULT (datetime('now'))`; app stores ISO datetime strings. |
| `updated_at` | `TIMESTAMPTZ` | NO | `now()` | SQLite `TEXT DEFAULT (datetime('now'))`; bumped to `datetime('now')` on every `save` UPDATE. |

### Type-mapping notes

- `created_at` / `updated_at`: SQLite ISO datetime `TEXT` → `TIMESTAMPTZ`; the
  `datetime('now')` default is translated to `now()`. `NOT NULL` added because the
  source column carries a DEFAULT.
- `pan` / `cin`: kept as `TEXT` (source caps no length).
- No money, quantity, boolean, or date-only columns exist in this table.

### Relationships

- `company_id` → `companies(company_id)` — **EXPLICIT** foreign key in the SQLite
  source (`REFERENCES companies(company_id) ON DELETE CASCADE`). Reproduced as a
  Postgres `ON DELETE CASCADE` FK. This is a one-to-one relationship because
  `company_id` is also the primary key of this table.
