# salaryStructure module — database reference

Source: `server/salaryStructure/salaryStructure.js`
Target: PostgreSQL (translated from SQLite)

This module defines a single table: `salary_structures`.

## Table: `salary_structures`

One row per pay-head amount for an employee, effective from a given date.

| Column | Postgres type | Nullable | Default | Notes |
|---|---|---|---|---|
| `structure_id` | `BIGINT` IDENTITY | no | identity | Primary key. SQLite `INTEGER PRIMARY KEY AUTOINCREMENT`. |
| `company_id` | `BIGINT` | no | — | FK -> `companies.company_id` (explicit in source, ON DELETE CASCADE). |
| `employee_id` | `BIGINT` | no | — | FK -> `employees.employee_id` (explicit in source, ON DELETE CASCADE). |
| `effective_from` | `DATE` | no | — | Date-only TEXT in SQLite -> DATE. |
| `pay_head_id` | `BIGINT` | no | — | FK -> `pay_heads.pay_head_id` (explicit in source, ON DELETE CASCADE). |
| `amount` | `NUMERIC(18,2)` | no | `0` | MONEY. Never floating point. SQLite `REAL DEFAULT 0`. |
| `calculation_mode` | `TEXT` | no | `'Flat Rate'` | E.g. flat rate vs computed. SQLite `TEXT DEFAULT 'Flat Rate'`. |
| `is_active` | `BOOLEAN` | no | `TRUE` | Soft-delete flag. SQLite `INTEGER DEFAULT 1` (0 -> false, 1 -> true). |
| `created_at` | `TIMESTAMPTZ` | no | `now()` | SQLite `TEXT DEFAULT (datetime('now'))` ISO string. |
| `updated_at` | `TIMESTAMPTZ` | no | `now()` | SQLite `TEXT DEFAULT (datetime('now'))`; set on update. |

### Nullability note

In the SQLite source, `amount`, `calculation_mode`, `is_active`, `created_at`,
and `updated_at` have DEFAULTs but no explicit `NOT NULL`. Per the translation
rules, columns with a DEFAULT are emitted `NOT NULL` in Postgres since the
DEFAULT guarantees a value on insert and the application never writes NULL.

## Relationships

- `company_id` -> `companies.company_id` — **explicit** FK in source, `ON DELETE CASCADE`.
- `employee_id` -> `employees.employee_id` — **explicit** FK in source, `ON DELETE CASCADE`.
- `pay_head_id` -> `pay_heads.pay_head_id` — **explicit** FK in source, `ON DELETE CASCADE`.

All three foreign keys are declared explicitly in the SQLite `CREATE TABLE`
(`REFERENCES ... ON DELETE CASCADE`); none are inferred.

## Uniqueness

There is **no** UNIQUE constraint in the table DDL. Uniqueness of an active
`(company_id, employee_id, effective_from, pay_head_id)` combination is enforced
only in application code (`salaryStructureService.create`). A partial unique
index (`WHERE is_active = TRUE`) is suggested but commented out in the SQL file.
