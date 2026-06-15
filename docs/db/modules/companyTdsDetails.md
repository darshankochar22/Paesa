# companyTdsDetails — Database Schema

Source: `server/companyTdsDetails/companyTdsDetails.js`
Postgres DDL: `docs/db/modules/companyTdsDetails.sql`

One table: `company_tds_details`. Holds a company's TDS (Tax Deducted at Source) deductor configuration. **1:1 with `companies`** — `company_id` is simultaneously the primary key and the foreign key, so there is at most one row per company.

## Table: `company_tds_details`

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| `company_id` | BIGINT | NO | — | Primary key. Also FK to `companies(company_id)`. Caller-supplied (not an identity column). |
| `tan_reg_number` | TEXT | YES | — | TEXT in SQLite. |
| `tan` | TEXT | YES | — | Tax deduction Account Number. |
| `deductor_type` | TEXT | NO | `'Company'` | SQLite `DEFAULT 'Company'`. |
| `deductor_branch` | TEXT | YES | — | |
| `set_alter_person_responsible` | BOOLEAN | NO | FALSE | SQLite `INTEGER DEFAULT 0`. 0 → false, 1 → true. |
| `person_responsible_name` | TEXT | YES | — | |
| `person_responsible_designation` | TEXT | YES | — | |
| `person_responsible_pan` | TEXT | YES | — | PAN of responsible person. |
| `person_responsible_phone` | TEXT | YES | — | |
| `person_responsible_email` | TEXT | YES | — | |
| `ignore_it_exemption` | BOOLEAN | NO | TRUE | SQLite `INTEGER DEFAULT 1`. 0 → false, 1 → true. |
| `activate_tds_for_items` | BOOLEAN | NO | FALSE | SQLite `INTEGER DEFAULT 0`. 0 → false, 1 → true. |
| `created_at` | TIMESTAMPTZ | NO | now() | App stores ISO-8601 string via SQLite `datetime('now')`. |
| `updated_at` | TIMESTAMPTZ | NO | now() | Bumped to `datetime('now')` on each `save` UPDATE. |

### Type mapping notes
- `INTEGER` 0/1 flag columns (`set_alter_person_responsible`, `ignore_it_exemption`, `activate_tds_for_items`) → **BOOLEAN**. The service converts storage 0/1 to/from JS booleans.
- `TEXT` datetime columns (`created_at`, `updated_at`) → **TIMESTAMPTZ**; the app persists ISO-8601 strings.
- All other `TEXT` columns → **TEXT** (source caps no lengths).
- **No money/quantity/rate columns exist in this module**, so no `NUMERIC(18,2)` / `NUMERIC(18,4)` columns are required. No floating-point money mapping concerns here.

## Relationships

- **`company_id` → `companies(company_id)`** — **EXPLICIT FK in source** (`REFERENCES companies(company_id) ON DELETE CASCADE`). One-to-one: the FK column is also the primary key, enforcing at most one TDS-details row per company. Deleting a company cascades to delete its TDS details.

No inferred foreign keys; the only relationship is the explicit one above.
