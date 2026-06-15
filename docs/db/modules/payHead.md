# payHead Module — Database Schema

Source: `server/payHead/payHead.js` (SQLite `init`). Postgres translation in
`payHead.sql`. Three tables: `pay_heads`, `pay_head_slab_lines`,
`pay_head_formula_lines`.

> Note on migration drift: `payHead.js` runs an idempotent `ALTER TABLE ... ADD COLUMN`
> loop that re-adds `alias, income_type, payslip_display_name, use_for_gratuity,
> set_alter_income_tax, calculation_period, rounding_method, rounding_limit` **as TEXT**
> for older databases. In the canonical `CREATE TABLE` these columns have their proper
> types (e.g. the flag columns are INTEGER, `rounding_limit` is REAL). The Postgres
> contract below uses the canonical/correct types from the `CREATE TABLE`, not the
> TEXT fallback. (The fallback `ADD COLUMN` only fires on legacy SQLite files missing
> these columns.)

---

## Table: `pay_heads`

A salary/payroll pay head definition belonging to a company.

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| pay_head_id | BIGINT IDENTITY | no | identity | Primary key. SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`. |
| company_id | BIGINT | no | — | FK → companies.company_id (CASCADE). |
| name | TEXT | no | — | Pay head name. Unique (active) per company, case-insensitive. |
| alias | TEXT | yes | — | |
| pay_head_type | TEXT | yes | `'Earnings for Employees'` | e.g. Earnings, Deductions, Employer Statutory Contributions. |
| income_type | TEXT | yes | `'Fixed'` | |
| under_group | TEXT | yes | — | Accounting group the pay head posts under. |
| affects_net_salary | BOOLEAN | yes | TRUE | SQLite INTEGER 0/1 (default 1). 0→false, 1→true. |
| payslip_display_name | TEXT | yes | — | |
| use_for_gratuity | BOOLEAN | yes | FALSE | SQLite INTEGER 0/1 (default 0). 0→false, 1→true. |
| set_alter_income_tax | BOOLEAN | yes | FALSE | SQLite INTEGER 0/1 (default 0). 0→false, 1→true. |
| calculation_type | TEXT | yes | `'As User Defined Value'` | e.g. Flat Rate, Percentage. |
| calculation_period | TEXT | yes | `'Months'` | |
| rounding_method | TEXT | yes | `'Not Applicable'` | |
| rounding_limit | NUMERIC(18,4) | yes | 0 | Quantity/amount — **never float**. |
| statutory_component | TEXT | yes | — | e.g. PF, PT, TDS, ESI, Gratuity. |
| percentage_or_amount | NUMERIC(18,4) | yes | 0 | Rate or flat amount (MONEY/rate) — **never float**. |
| is_active | BOOLEAN | yes | TRUE | SQLite 0/1 (default 1). Soft-delete flag; delete sets it false. |
| is_predefined | BOOLEAN | yes | FALSE | SQLite 0/1 (default 0). Predefined rows cannot be edited/deleted. |
| created_at | TIMESTAMPTZ | yes | now() | App stores ISO-8601 string via `datetime('now')`. |
| updated_at | TIMESTAMPTZ | yes | now() | App stores ISO-8601 string; bumped on update. |

**Relationships**
- `company_id` → `companies(company_id)` — **explicit** FK in source, `ON DELETE CASCADE`.

**Constraints / indexes**
- Partial unique index on `(company_id, lower(name)) WHERE is_active` — enforces the
  service's case-insensitive duplicate-name check among active rows.
- Index on `company_id`.

---

## Table: `pay_head_slab_lines`

Amount/income slabs attached to a pay head (e.g. tiered tax/contribution bands).

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| slab_line_id | BIGINT IDENTITY | no | identity | Primary key. |
| pay_head_id | BIGINT | no | — | FK → pay_heads.pay_head_id (CASCADE). |
| effective_from | DATE | yes | — | Date-only TEXT → DATE. Slabs ordered by this in `getSlabs`. |
| amount_gt | NUMERIC(18,4) | yes | 0 | Lower bound (greater-than) — **never float**. |
| amount_up_to | NUMERIC(18,4) | yes | 0 | Upper bound (up to) — **never float**. |
| slab_type | TEXT | yes | — | |
| value | NUMERIC(18,4) | yes | 0 | Slab value (rate/amount) — **never float**. |
| created_at | TIMESTAMPTZ | yes | now() | App stores ISO-8601 string. |

**Relationships**
- `pay_head_id` → `pay_heads(pay_head_id)` — **explicit** FK in source, `ON DELETE CASCADE`.

**Indexes**
- Index on `pay_head_id`.

---

## Table: `pay_head_formula_lines`

Ordered formula components used to compute a pay head's value.

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| formula_line_id | BIGINT IDENTITY | no | identity | Primary key. |
| pay_head_id | BIGINT | no | — | Owning pay head. FK → pay_heads.pay_head_id (CASCADE). |
| sequence | INTEGER | yes | 0 | Order within the formula; `getFormulas` orders by this. |
| function | TEXT | yes | — | (Column literally named `function`.) |
| pay_head_id_ref | BIGINT | yes | — | Operand reference to another pay head. FK → pay_heads (SET NULL). |
| operator | TEXT | yes | — | |
| created_at | TIMESTAMPTZ | yes | now() | App stores ISO-8601 string. |

**Relationships**
- `pay_head_id` → `pay_heads(pay_head_id)` — **explicit** FK in source, `ON DELETE CASCADE`.
- `pay_head_id_ref` → `pay_heads(pay_head_id)` — **explicit** FK in source (nullable
  self-reference into pay_heads). Modeled `ON DELETE SET NULL` in Postgres to avoid
  orphaning formula lines. `getFormulas` LEFT JOINs this to expose `pay_head_name`.

**Indexes**
- Index on `pay_head_id` and on `pay_head_id_ref`.

---

## Money / type-safety callout

All amount, rate, and bound columns (`percentage_or_amount`, `rounding_limit`,
`value`, `amount_gt`, `amount_up_to`) are stored as SQLite `REAL` but represent
money/quantities. They are mapped to `NUMERIC(18,4)` in Postgres and **must never**
be stored as `REAL`/`DOUBLE PRECISION`/floating point — this preserves exact decimal
arithmetic for payroll calculations.
