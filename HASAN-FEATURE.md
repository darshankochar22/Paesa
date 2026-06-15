# `hasan-feature` — backend modernization (major change)

This branch is a **major backend change**. The app's behavior is preserved (the Electron app, the
IPC channels, and the SQLite runtime all work as before), but the backend now has: auto-generated
API docs, a Drizzle ORM data layer with dual SQLite/Postgres schemas + migrations, and a fixed
banking-reconciliation feature.

> Nothing in `client/**` changed. The runtime database is still local SQLite (`startup.db`).
> Postgres is set up as a **target contract** (schemas + migrations), not yet the live DB.

---

## What changed (3 things)

### 1. Auto-generated API docs ("openhono")
Every IPC channel (`ipcMain.handle('ns:action', …)`) is documented as an OpenAPI 3.1 operation with
`x-ipc-channel` / `x-window-api` / `x-controller` extensions that bind the doc to the real channel
and renderer call site.

- **Source of truth:** per-module fragments in `docs/api/modules/<module>.yaml` + the live channel list
  in `server/index.js`. Assembled at runtime by `server/docs/openapiGenerator.js`.
- **Live UI (dev only):** `npm start` serves a Scalar UI at **http://localhost:5180/docs** (Hono server,
  `server/docs/server.js`). Never ships to production (`!app.isPackaged` gate in `main.js`).
- **CI gate:** `npm run docs:check` fails if any channel is undocumented or a fragment is broken.
- Coverage today: **252 operations = 252 channels, 0 gaps.**

### 2. Drizzle ORM — dual SQLite + Postgres schema
The schema is now defined in Drizzle and is the single source of truth, dual-dialect:

- `server/db/schema/sqlite/<module>.js` — `sqliteTable` (runtime DB)
- `server/db/schema/pg/<module>.js` — `pgTable` (Postgres target)
- `server/db/schema/index.js` — switches on `DB_DIALECT` (default sqlite); services import tables here.
- All 49 modules' service queries were rewritten from raw SQL to Drizzle (query builder for CRUD,
  Drizzle's typed `` sql`` `` operator for complex accounting/report/GST aggregations).
- Migrations are auto-generated for **both** dialects (`server/db/migrations/{sqlite,pg}`).
- A **parity gate** (`npm run db:parity`) asserts the two dialects never drift on tables/columns.

**Boot strategy = `init-kept` (important):** the app does **not** auto-apply Drizzle migrations on
boot. `initDB()` still runs each module's existing `init(db)` (DDL + seed) at startup — this guarantees
the exact schema/seed the test oracle was written against. The Drizzle migrations are provisioning
tooling (and the Postgres path). Use `npm run db:migrate` to apply migrations to a fresh DB explicitly.

### 3. Banking reconciliation fix
`server/banking/bankingService.js` was a dead duplicate of the schema-init file — its 5 methods never
existed (pre-existing bug on `main`). Now fully implemented (Drizzle) and covered by
`server/tests/banking.test.js`.

---

## Commands

| Command | Purpose |
|---|---|
| `npm start` | run the app; live API docs at http://localhost:5180/docs (dev only) |
| `npm test` | backend Jest suite (the correctness oracle) |
| `npm run docs:gen` | regenerate `docs/api/openapi.{json,yaml}` |
| `npm run docs:check` | **CI gate** — every channel must be documented |
| `npm run db:generate` | regenerate sqlite + pg migrations from the Drizzle schema |
| `npm run db:parity` | **CI gate** — sqlite/pg schemas must match on tables/columns |
| `npm run db:migrate` | apply migrations to a fresh DB (sqlite; pg when `DB_DIALECT=pg` + `DATABASE_URL`) |
| `npm run docs:db` | regenerate DB docs from the Drizzle schema |

Setup unchanged: `npm i` (root) **and** `npm i --prefix client`.

---

## Verification status

- **Backend tests: 135/135 pass (17/17 suites)** — was 126/16 on `main` (+9 new banking tests).
- **Schema parity:** PASS (79 tables, identical columns across pg + sqlite).
- **API docs:** `docs:check` PASS (252/252 channels).
- **Runtime smoke (headless):** 64 read paths + ~17 seeded insert paths across 46 modules execute with
  0 SQL errors.

### Coverage boundaries (read before relying on it)
- ✅ Test-covered (accounting core): voucher, ledger, gst, inventory, payroll, company, financial year,
  tax/tcs/tds, currency, cost centre, **banking**.
- ⚠️ **33 modules have no automated test** — converted mechanically + self-reviewed + read-path smoke,
  but their **write** paths (create/update/delete) were not round-tripped: e.g. `physicalStock`,
  `attendance`, `priceList`, `priceLevels.save`, `whatsapp.saveConfig`, `eInvoice.*`,
  `voucherEntryActions.create`. Verify these before depending on them.

---

## Future work (TODO)

1. **Wire the Banking UI.** Backend is complete + tested, but `client/src/pages/utilities/Banking.tsx`
   is still a static placeholder — it doesn't call `window.api.banking.*` yet.
2. **Smoke the untested write paths** (the ⚠️ list above) by driving each module's create/update/delete,
   then add Jest suites so they get a permanent oracle.
3. **Consider migrate-on-boot.** Flip `initDB()` from `init-kept` to applying Drizzle migrations once the
   seed logic is moved out of `init()` and the full suite is re-verified green.
4. **Postgres cut-over (when ready).** Swap the driver in `server/db/index.js`
   (`@libsql/client` → `drizzle-orm/node-postgres` + `pg`), apply `server/db/migrations/pg`, set
   `DB_DIALECT=pg` + `DATABASE_URL`. The contract + migrations are already generated and parity-checked.
5. **Add `db:parity` + `docs:check` to CI** (`.github/workflows/build-win.yml`) before the build step.

---

## Where to look

- `docs/CONTRIBUTING.md` — the rules for adding channels and changing the schema (openhono + Drizzle).
- `docs/README.md` — documentation index.
- `docs/api/openapi.yaml` — the full API spec.
- `docs/db/schema.postgres.sql` / `docs/db/SCHEMA.md` — DB contract + reference.
- `AGENTS.md` — repo conventions (note: its claim that `.gitignore` ignores `package.json` is stale —
  both `package.json` and `package-lock.json` are tracked).
