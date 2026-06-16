# companyGstDetails — database schema

Source: `server/companyGstDetails/companyGstDetails.js`
Postgres DDL: `docs/db/modules/companyGstDetails.sql`

This module owns a single table, `company_gst_details`, which holds GST configuration
for a company. It is a one-row-per-company settings table: `company_id` is **both** the
primary key and a foreign key to `companies`. There is no surrogate autoincrement id.

## Table: `company_gst_details`

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| company_id | BIGINT | NO | — | Primary key **and** FK to `companies(company_id)`. In SQLite: `INTEGER PRIMARY KEY REFERENCES companies(company_id)`. |
| hsn_sac_type | TEXT | YES | `'Not Defined'` | |
| hsn_sac_code | TEXT | YES | — | Service maps NULL -> `''` on read. |
| description | TEXT | YES | — | Service maps NULL -> `''` on read. |
| taxability_type | TEXT | YES | `'Not Defined'` | |
| gst_rate | NUMERIC(18,4) | YES | `0` | Rate. SQLite REAL; never floating point. |
| interstate_threshold_limit | NUMERIC(18,2) | YES | `50000` | **MONEY** — currency amount; never floating point. SQLite REAL. |
| intrastate_threshold_limit | NUMERIC(18,2) | YES | `50000` | **MONEY** — currency amount; never floating point. SQLite REAL. |
| threshold_limit_includes | TEXT | YES | `'Value of Invoice'` | |
| create_hsn_summary_for | TEXT | YES | `'All Sections'` | |
| minimum_hsn_length | INTEGER | YES | `4` | |
| show_gst_advances | BOOLEAN | YES | `false` | SQLite INTEGER `0/1` -> boolean (`0`=false, `1`=true). |
| update_gst_status | BOOLEAN | YES | `false` | SQLite INTEGER `0/1` -> boolean. |
| gst_returns_configured | BOOLEAN | YES | `false` | SQLite INTEGER `0/1` -> boolean. |
| effective_date | TEXT | YES | `'1-Apr-26'` | Free-form display string, **NOT** an ISO date — kept TEXT, not DATE. |
| download_gst_registration | TEXT | YES | — | Service maps NULL -> `''` on read. |
| download_return_type | TEXT | YES | `'All Returns'` | |
| set_state_wise_threshold_limit | BOOLEAN | YES | `false` | SQLite INTEGER `0/1` -> boolean. |
| state_wise_limits | JSONB | YES | — | SQLite TEXT holding a JSON string; parsed to an array on read, `JSON.stringify`'d on write. |
| gst_advances_applicable_from | TEXT | YES | — | Service maps NULL -> `''` on read. |
| created_at | TIMESTAMPTZ | NO | `now()` | App stores ISO datetime strings via `datetime('now')`. |
| updated_at | TIMESTAMPTZ | NO | `now()` | App stores ISO datetime strings; set to `datetime('now')` on each update. |

### Constraints
- **PRIMARY KEY**: `company_id`.
- **UNIQUE**: implied by the PK (one row per company); no other unique constraints.

## Relationships

- `company_id` → `companies(company_id)` — **EXPLICIT** in the SQLite source
  (`REFERENCES companies(company_id) ON DELETE CASCADE`). Emitted as
  `fk_company_gst_details_company` with `ON DELETE CASCADE`. No separate index is
  added because `company_id` is the primary key (already indexed).

## Migrations in source

`companyGstDetails.js` runs idempotent `ALTER TABLE ... ADD COLUMN` migrations for
columns added after the initial release: `effective_date`, `download_gst_registration`,
`download_return_type`, `set_state_wise_threshold_limit`, `state_wise_limits`,
`gst_advances_applicable_from`. The Postgres DDL already includes all of these in the
base `CREATE TABLE`, so no follow-up migration is needed for a fresh schema.
