# `hasan-feature` — branch guide & onboarding

This branch turns the app from a Tally-style accounting ERP into an **AI-native, API-first, compliance-ready** one — a "Cursor for Tally." This doc is the map of *what changed* and *how to work with it*. Deep how-to rules live in **[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)**; the parity plan lives in **[`docs/ROADMAP-tally-parity.md`](docs/ROADMAP-tally-parity.md)**.

> Status: backend **166/166 tests**, client **build green** + **108 vitest**, **270/270** API channels documented, schema **parity 80 tables**. Runtime DB is still local **SQLite**; Postgres is a ready (parity-checked) target, not yet the live DB.

---

## What's on this branch (high level)

| Area | What it is |
|---|---|
| **Backend modernization** | Drizzle ORM (dual SQLite + Postgres schema), auto-generated OpenAPI ("openhono") docs, MCP server. |
| **AI Copilot** | "Cursor for Tally" — BYO model (Anthropic **or** any OpenAI-compatible endpoint incl. DeepSeek), 3-tool anti-loop agent, propose→approve. |
| **Banking** | Bank reconciliation (BRS) — service + live UI. |
| **Tally import** | Import ledgers/vouchers from a real Tally over its XML/TDL interface. |
| **Reports** | 5 new Tally-parity reports (outstanding/ageing, cash flow, funds flow, stock summary, ratios), copilot-callable. |
| **Compliance** | Tamper-evident, transactional audit trail (MCA Rule 11(g)); optional/post-dated voucher fix. |
| **UI** | shadcn/ui foundation + reusable components; 10 interactive pages refactored. |

Commit arc: `backend modernization → banking UI → shadcn (10 pages) → AI copilot → Tally import → parity reports → audit trail → transactional audit → model-agnostic`.

---

## 1. Backend: Drizzle + auto API docs

- **Schema is Drizzle, dual-dialect:** `server/db/schema/{sqlite,pg}/<module>.js`. `DB_DIALECT=pg` switches dialect (default sqlite). Services import tables from `server/db/schema`.
- **Boot strategy = `init-kept`:** `initDB()` still runs each module's `init(db)` (DDL + seed). Drizzle migrations (`server/db/migrations/{sqlite,pg}`) are kept in parity as provisioning tooling + the Postgres path.
- **Auto API docs ("openhono"):** every IPC channel is an OpenAPI 3.1 operation with `x-ipc-channel` / `x-window-api` extensions, generated from `docs/api/modules/*.yaml` + the live `server/index.js` channel list. **`npm run docs:check` is a CI gate** — an undocumented channel fails the build.
- Dev-only live docs UI: **http://localhost:5180/docs** (Scalar) when you `npm start`.

## 2. AI Copilot (`server/ai/`, `server/mcp/`)

- **Model-agnostic / BYOK.** Settings → Gateway → Utilities → **AI Copilot**. Two providers:
  - `anthropic` — native Claude (SDK).
  - `openai` — **any OpenAI-compatible `/chat/completions` endpoint** (OpenAI, **DeepSeek**, Groq, OpenRouter, local) via base URL + model. There's a **DeepSeek preset** button.
  - The API **key is encrypted at rest** (Electron `safeStorage`) in the **main process** — never sent to the renderer.
- **Anti-loop design:** the agent gets **3 consolidated tools** (`query` enum-routed reads, `lookup` name→id, `propose` reviewable write) instead of 252 — the model fills one enum field, so it doesn't thrash. Hard cap on tool rounds.
- **Safety:** the agent never writes — it returns **proposals** the user approves in the app (the "accept the diff" model).
- **MCP server** (`npm run mcp`) exposes the same 3 tools over MCP for Claude Desktop / Cursor (`STARTUP_DB_PATH=/path/to/startup.db`).

## 3. Banking (`server/banking/`)
Bank reconciliation: unreconciled list, reconcile/unreconcile, statement with running balance, BRS summary. Live UI at **Utilities → Banking**.

## 4. Tally import (`server/integrations/tally/`)
Imports masters + vouchers from a running Tally via its official XML/TDL server (`localhost:9000`). Channels `tally:testConnection/preview/importMasters/importVouchers`. Accepts a live `{host,port}` **or** raw `{xml}` (so it's usable/testable without Tally). *No UI screen yet — backend + IPC only.*

## 5. Reports (`server/report/*ReportService.js`)
New: **Bills Receivable/Payable + ageing, Cash Flow, Funds Flow, Stock Summary, Ratio Analysis.** Read-only, wired to IPC **and** the copilot's `query` tool — ask *"show overdue receivables"* / *"what's my current ratio"*.

## 6. Compliance: audit trail (`server/auditTrail/`)
- **Tamper-evident edit log** (MCA Rule 11(g)): per-company **hash chain** (`row_hash = sha256(prev_hash + content)`); `verifyChain()` detects any tampered row.
- **Transactional for vouchers:** the audit row is written inside the voucher's `BEGIN/COMMIT`, so it's **atomic** — no write without its audit row, and vice-versa (a failed voucher leaves zero audit rows). Ledger/group master edits are controller-level best-effort (documented follow-up).
- Channels `auditTrail:getAll/getByEntity/verifyChain`; copilot resource `audit_trail`.
- **Correctness fix:** `is_optional` / `is_post_dated` vouchers are now excluded from all balances/reports.

## 7. UI (shadcn)
- Primitives in `client/src/components/shadcn/` (kept separate from the existing custom `components/ui/*` to avoid case-collisions). Reusable composites in `client/src/components/blocks/` (StatCard, StatGrid, DataTableCard, PageToolbar, EmptyState).
- **10 interactive pages** refactored to shadcn (Banking, Vouchers/VoucherList/VoucherView, Daybook, the report menus, GST return views, Copilot). The other ~190 pages still use hand-rolled Tailwind.

---

## Setup & run (for everyone)

```bash
npm i                  # root (Electron + backend deps)
npm i --prefix client  # client deps (REQUIRED — easy to forget)
npm start              # Vite dev server + Electron; live API docs at :5180/docs
```

## Commands

| Command | What it does |
|---|---|
| `npm test` | backend Jest suite (the correctness oracle) |
| `npm run docs:gen` / `docs:check` | regenerate / **CI-gate** the OpenAPI spec (every channel must be documented) |
| `npm run db:generate` / `db:parity` | regenerate migrations / **CI-gate** that pg+sqlite schemas match |
| `npm run db:migrate` | apply migrations to a fresh DB |
| `npm run docs:db` | regenerate DB docs from the Drizzle schema |
| `npm run mcp` | run the MCP server (set `STARTUP_DB_PATH`) |
| `cd client && npm run build` | type-check + build the renderer |

---

## How to contribute (read `docs/CONTRIBUTING.md` for the full rules)

**Adding/altering an IPC channel** — keep the 3-point contract in sync, then document it:
1. `server/<module>/<module>Service.js` (logic) + `<module>Controller.js` (thin wrapper)
2. register `ipcMain.handle('ns:action', ...)` in `server/index.js`
3. expose under `window.api.<ns>` in `preload.js` (+ a type in `client/src/types/api/`)
4. **add an OpenAPI operation** to `docs/api/modules/<module>.yaml`, then `npm run docs:gen && npm run docs:check`

**Changing the schema** — edit **both** Drizzle dialect files (`server/db/schema/{sqlite,pg}/<module>.js`; column **names** identical, types differ), update the runtime `init()`, then `npm run db:generate && npm run db:parity && npm run docs:db`.

**UI** — use shadcn primitives from `@/components/shadcn/*` and composites from `@/components/blocks/*`; keep the dense Tally look (compact sizing). Strict TS: no unused imports (the build fails on them).

**Audit-logged writes** — voucher create/update/cancel/delete log transactionally via `auditTrailService.recordInTx` inside the service transaction. New transactional write paths should follow that pattern; masters use best-effort `record`.

**Before pushing:** `npm test` + `cd client && npm run build` + `npm run docs:check` + `npm run db:parity` must all be green.

---

## Known gaps / next steps (see `docs/ROADMAP-tally-parity.md`)

- **Next big features:** stock valuation/costing engine (FIFO/LIFO/Avg → exact inventory value + Balance Sheet), Budgets + variance, Sales/Purchase order processing.
- **Hardening:** make master (ledger/group) audit transactional too; the client `.tsx` tests fail under the backend Jest config (separate `jest`/`vitest` projects — pre-existing, run `cd client && npm test` for client tests).
- **UI debt:** screens for the new reports, an audit-trail viewer, and a Tally-import wizard; ~190 pages still un-migrated to shadcn.
- **Postgres cutover:** schema + migrations are parity-checked and ready; swap the driver in `server/db/index.js` when needed.
- **Not GUI-verified:** most of this is verified by tests/build, not yet clicked through in the packaged app — do a manual smoke before release.

---

## Notes for maintainers

- `AGENTS.md`'s claim that `.gitignore` ignores `package.json`/`package-lock.json` is **stale** — both are tracked.
- New deps added on this branch: `hono`, `@hono/node-server`, `yaml`, `drizzle-kit`, `pg`, `@anthropic-ai/sdk`, `fastmcp`, `zod`, `fast-xml-parser`.
