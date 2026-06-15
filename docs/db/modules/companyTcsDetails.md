# companyTcsDetails — database schema

Source: `server/companyTcsDetails/companyTcsDetails.js`
Postgres DDL: `docs/db/modules/companyTcsDetails.sql`

One table. Stores a single TCS (Tax Collected at Source) profile per company,
keyed 1:1 by `company_id`.

## Table: `company_tcs_details`

| Column | Postgres type | Nullable | Default | Notes |
|--------|---------------|----------|---------|-------|
| `company_id` | BIGINT | NO | — | PRIMARY KEY **and** FK to `companies(company_id)`. 1:1 extension key; not auto-generated. SQLite source: `INTEGER PRIMARY KEY`. |
| `tan_reg_number` | TEXT | YES | — | TAN registration number. |
| `tan` | TEXT | YES | — | Tax Collection / Deduction Account Number. |
| `collector_type` | TEXT | YES | `'Company'` | Preserved DEFAULT. |
| `collector_branch` | TEXT | YES | — | |
| `set_alter_person_responsible` | BOOLEAN | NO | `false` | SQLite `INTEGER DEFAULT 0`; 0/1 -> false/true. |
| `person_responsible_name` | TEXT | YES | — | |
| `person_responsible_son_daughter_of` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_designation` | TEXT | YES | — | |
| `person_responsible_pan` | TEXT | YES | — | |
| `person_responsible_flat_no` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_premises` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_road` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_area` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_city` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_state` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_pincode` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_phone` | TEXT | YES | — | |
| `person_responsible_std_code` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_telephone` | TEXT | YES | — | Added via migration ALTER. |
| `person_responsible_email` | TEXT | YES | — | |
| `ignore_it_exemption` | BOOLEAN | NO | `true` | SQLite `INTEGER DEFAULT 1`; 0/1 -> false/true. |
| `created_at` | TIMESTAMPTZ | NO | `now()` | SQLite `TEXT DEFAULT (datetime('now'))`, ISO-8601 string -> TIMESTAMPTZ. |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | SQLite `TEXT DEFAULT (datetime('now'))`; bumped on each `save` UPDATE. |

### Type-mapping notes

- **Booleans**: `set_alter_person_responsible` and `ignore_it_exemption` are SQLite
  INTEGER 0/1 flags, mapped to Postgres `BOOLEAN`. The app converts 0→false, 1→true.
- **Datetimes**: `created_at` / `updated_at` are stored as ISO-8601 TEXT strings in
  SQLite via `datetime('now')`; mapped to `TIMESTAMPTZ DEFAULT now()`.
- **No money / quantity / rate columns** in this table — no `NUMERIC` precision concerns.
- All `person_responsible_*` address/contact columns are free TEXT (no length cap in source).

## Relationships

- **`company_id` → `companies(company_id)`** — **EXPLICIT** in source
  (`REFERENCES companies(company_id) ON DELETE CASCADE`). Emitted as
  `fk_company_tcs_details_company` with `ON DELETE CASCADE`. Because `company_id` is also
  the PRIMARY KEY, this enforces a strict 1:1 relationship: each company has at most one
  TCS details row, and deleting a company removes its TCS row.

No other `*_id` columns are present, so no further FKs are inferred.
