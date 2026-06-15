# DB schema: trialBalanceReport

Source: `server/trialBalanceReport/trialBalanceReport.js` (SQLite).
Postgres DDL: `docs/db/modules/trialBalanceReport.sql`.

Two tables: a report header (`trial_balance_reports`) and its detail rows
(`trial_balance_rows`).

## Table: `trial_balance_reports`

| Column                | Postgres type   | Nullable | Default | Notes |
|-----------------------|-----------------|----------|---------|-------|
| report_id             | BIGINT IDENTITY | no       | identity | PK. SQLite INTEGER PRIMARY KEY AUTOINCREMENT. |
| company_id            | BIGINT          | no       | —       | FK -> companies.company_id (explicit in source, ON DELETE CASCADE). |
| company_name          | TEXT            | yes      | —       | |
| report_date           | DATE            | yes      | —       | date-only TEXT -> DATE. Service defaults to today (YYYY-MM-DD) on create. |
| period_start          | DATE            | yes      | —       | date-only TEXT -> DATE. |
| period_end            | DATE            | yes      | —       | date-only TEXT -> DATE. |
| show_closing_balance  | BOOLEAN         | no       | TRUE    | SQLite INTEGER 0/1 -> BOOLEAN (1->true, 0->false). |
| show_debit_credit     | BOOLEAN         | no       | TRUE    | SQLite INTEGER 0/1 -> BOOLEAN. |
| show_groups           | BOOLEAN         | no       | TRUE    | SQLite INTEGER 0/1 -> BOOLEAN. |
| show_grand_total      | BOOLEAN         | no       | TRUE    | SQLite INTEGER 0/1 -> BOOLEAN. |
| detailed_mode         | BOOLEAN         | no       | FALSE   | SQLite INTEGER 0/1 -> BOOLEAN (default 0 -> false). |
| created_at            | TIMESTAMPTZ     | no       | now()   | App stores ISO datetime strings; SQLite default datetime('now'). |
| updated_at            | TIMESTAMPTZ     | no       | now()   | App stores ISO datetime strings; SQLite default datetime('now'). |

### Relationships
- `company_id` -> `companies(company_id)` — **explicit** FK in source, `ON DELETE CASCADE`.
- Referenced by `trial_balance_rows.report_id` (child rows, cascade delete).

## Table: `trial_balance_rows`

| Column          | Postgres type | Nullable | Default   | Notes |
|-----------------|---------------|----------|-----------|-------|
| row_id          | BIGINT IDENTITY | no     | identity  | PK. SQLite INTEGER PRIMARY KEY AUTOINCREMENT. |
| report_id       | BIGINT        | no       | —         | FK -> trial_balance_reports.report_id (explicit, ON DELETE CASCADE). |
| parent_row_id   | BIGINT        | yes      | —         | Self FK -> trial_balance_rows.row_id (inferred; no FK in source). |
| row_type        | TEXT          | no       | 'Ledger'  | e.g. 'Ledger', 'Group'. Has DEFAULT -> NOT NULL. |
| particulars     | TEXT          | yes      | —         | |
| group_id        | BIGINT        | yes      | —         | Inferred FK -> groups.group_id (no FK in source). |
| ledger_id       | BIGINT        | yes      | —         | Inferred FK -> ledgers.ledger_id (no FK in source). |
| display_order   | INTEGER       | no       | 0         | Sort order. Has DEFAULT -> NOT NULL. |
| opening_debit   | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| opening_credit  | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| period_debit    | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| period_credit   | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| closing_debit   | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| closing_credit  | NUMERIC(18,2) | no       | 0         | **Money** — NUMERIC, never float. |
| is_drillable    | BOOLEAN       | no       | TRUE      | SQLite INTEGER 0/1 -> BOOLEAN (default 1 -> true). |
| is_grand_total  | BOOLEAN       | no       | FALSE     | SQLite INTEGER 0/1 -> BOOLEAN (default 0 -> false). |
| notes           | TEXT          | yes      | —         | |
| created_at      | TIMESTAMPTZ   | no       | now()     | App stores ISO datetime strings. |
| updated_at      | TIMESTAMPTZ   | no       | now()     | App stores ISO datetime strings. |

### Relationships
- `report_id` -> `trial_balance_reports(report_id)` — **explicit** FK, `ON DELETE CASCADE`.
- `parent_row_id` -> `trial_balance_rows(row_id)` — **inferred** self-reference (row hierarchy); no FK in SQLite source.
- `group_id` -> `groups(group_id)` — **inferred** from `*_id` naming; no FK in SQLite source. Verify target table before applying.
- `ledger_id` -> `ledgers(ledger_id)` — **inferred** from `*_id` naming; no FK in SQLite source. Verify target table before applying.

## Notes
- All debit/credit amount columns are monetary and mapped to `NUMERIC(18,2)`. They are never mapped to floating point to avoid rounding errors in accounting balances.
- SQLite stores the visibility/mode flags as INTEGER 0/1; in Postgres they become real `BOOLEAN` (0->false, 1->true).
- `created_at` / `updated_at` are ISO/datetime strings in SQLite and become `TIMESTAMPTZ DEFAULT now()`.
