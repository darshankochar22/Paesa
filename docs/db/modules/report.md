# Report Module — Database Tables

**This module owns no tables.**

`server/report/` contains only `reportController.js` and `reportService.js`.
There is **no `report.js` schema-init file**, and nothing in the report module
runs `CREATE TABLE`. The module is purely a read/aggregation layer.

Accordingly `docs/db/modules/report.sql` contains **no CREATE TABLE statements**
and **no ALTER TABLE / FK statements** — only a documentation header.

## Foreign tables this module reads (owned elsewhere)

These are NOT defined by the report module; their authoritative DDL belongs to
the listed owning modules. Listed here only to document the read dependency and
the columns the report SQL touches.

| Table | Owning module | Columns read by report | Notes |
|---|---|---|---|
| `vouchers` | voucher | `voucher_id`, `company_id`, `fy_id`, `date`, `voucher_type`, `voucher_number`, `narration`, `is_cancelled` | `date` -> Postgres `DATE`. `is_cancelled` (0/1) -> `BOOLEAN`. Filtered `is_cancelled = 0`. |
| `voucher_entries` | voucher | `voucher_id`, `ledger_id`, `type`, `amount`, `narration` | `type` is `'Dr'`/`'Cr'`. `amount` is currency -> `NUMERIC(18,2)`, never float. |
| `ledgers` | ledger / master | `ledger_id`, `company_id`, `group_id`, `name`, `opening_balance`, `is_active`, `ledger_type` | `opening_balance` currency -> `NUMERIC(18,2)`. `is_active` (0/1) -> `BOOLEAN`, filtered `is_active = 1`. `ledger_type = 'Cash'` resolves the cash book ledger. |
| `groups` | group / master | `group_id`, `nature` | `nature` ∈ {`Assets`,`Liabilities`,`Income`,`Expenses`} drives balance-sheet / P&L bucketing. |

## Relationships (inferred, enforced in the owning modules)

These FK relationships are inferred from `*_id` columns and used by the report
joins. They should be declared as constraints in the OWNING modules' DDL, not
here:

- `vouchers.company_id` -> `companies.company_id`  *(inferred)*
- `vouchers.fy_id` -> `financial_years.fy_id`  *(inferred)*
- `voucher_entries.voucher_id` -> `vouchers.voucher_id`  *(inferred; INNER JOIN in report SQL)*
- `voucher_entries.ledger_id` -> `ledgers.ledger_id`  *(inferred)*
- `ledgers.company_id` -> `companies.company_id`  *(inferred)*
- `ledgers.group_id` -> `groups.group_id`  *(inferred; INNER JOIN in report SQL)*

## Money safety

Every monetary column the report touches (`voucher_entries.amount`,
`ledgers.opening_balance`, and all derived `debit`/`credit`/`balance` outputs)
must be `NUMERIC` in Postgres. Do **not** map these to floating-point types —
doing so corrupts cent-level totals and breaks trial-balance reconciliation.
