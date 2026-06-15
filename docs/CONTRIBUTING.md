# Backend API & DB — contribution rules

This repo's backend API surface is **documented as code** and **enforced in CI**. Every IPC
channel must be described in the OpenAPI ("openhono") format, and the database schema is defined in
Drizzle ORM (`server/db/schema/{pg,sqlite}`). The live docs at `http://localhost:5180/docs`
(dev-only) and the committed `docs/api/openapi.{json,yaml}` are **auto-generated** — never hand-edit
the bundle.

> TL;DR for any backend change: update the matching `docs/api/modules/<module>.yaml` fragment, then
> run `npm run docs:gen && npm run docs:check`. If you changed the schema, edit **both** Drizzle
> dialect files and run `npm run db:generate && npm run db:parity && npm run docs:db`.

---

## The openhono format (required for all new endpoints)

The spec is assembled at runtime by `server/docs/openapiGenerator.js` from two sources:

1. **`docs/api/modules/<module>.yaml`** — one OpenAPI 3.1 fragment per backend module (the schemas).
2. **`server/index.js`** — the ground-truth `ipcMain.handle(...)` channel list.

`npm run docs:check` fails the build if any registered channel has **no** fragment operation.
That is what "openhono format only" means in practice: a channel that isn't documented in the
fragment format is a CI failure (and shows up in `/docs` flagged `x-undocumented: true`).

### Adding a new IPC channel — checklist

The 3-point IPC contract plus the doc fragment — **all four must be updated together**:

1. **Service + controller** — add the logic in `server/<module>/<module>Service.js` and a thin
   wrapper in `server/<module>/<module>Controller.js` (existing pattern: `(event, data) => service.fn(data)`).
2. **Register the channel** — `ipcMain.handle('<namespace>:<action>', <module>Controller.fn)` in `server/index.js`.
3. **Expose to renderer** — add `<action>: (...) => ipcRenderer.invoke('<namespace>:<action>', ...)`
   under `window.api.<namespace>` in `preload.js`.
4. **Document it (openhono)** — add the operation to `docs/api/modules/<module>.yaml`.

### Fragment operation template

Add this under `paths:` in the module fragment. The `x-*` extensions are required — they bind the
HTTP-style doc to the real IPC channel and renderer call site.

```yaml
  /<namespace>/<action>:
    post:
      operationId: <namespace>.<action>
      tags: [<module>]
      summary: One line describing what it does.
      x-ipc-channel: "<namespace>:<action>"
      x-window-api: "window.api.<namespace>.<action>"
      x-controller: "<module>Controller.<fn>"
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/<Module>Input'   # or an inline schema
      responses:
        '200':
          description: What comes back.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/<Module>Row'
        '500':
          description: Error
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
```

Define `requestBody`/response schemas under the fragment's own `components.schemas:`. The generator
**namespaces every schema per module** (`<Module>_<Name>`) before merging, so you can reuse plain
names like `Input`/`Row` without colliding with other modules. Keep `$ref`s local
(`#/components/schemas/...`); the generator rewrites them during the merge.

> ⚠️ YAML gotcha: any `summary`/`description` containing `: ` (colon-space) or `{ }` must be quoted,
> e.g. `description: "Returns { success: true } on save."` — otherwise the fragment fails to parse
> and `docs:check` will reject it.

### Adding a whole new module

1. Create `server/<module>/` with `<module>.js` (schema `init(db)`), `<module>Service.js`, `<module>Controller.js`.
2. Register its `init` in `server/db/index.js` and its channels in `server/index.js`.
3. Create `docs/api/modules/<module>.yaml` — a standalone OpenAPI 3.1 fragment
   (`openapi: 3.1.0`, `info`, `paths`, `components`). It is auto-discovered by filename; the tag is the filename.
4. Create the DB contract files (below).
5. `npm run docs:gen && npm run docs:check`.

---

## Database changes (Drizzle ORM — dual SQLite + Postgres schema)

**The schema is defined in Drizzle ORM**, and Drizzle is the **single source of truth**. The schema is
dual-dialect and lives in two parallel trees, one file per module:

- `server/db/schema/sqlite/<module>.js` — `sqliteTable` definitions (the runtime DB: `@libsql/client`,
  file `startup.db`).
- `server/db/schema/pg/<module>.js` — `pgTable` definitions (the Postgres target).

`server/db/schema/index.js` picks the active dialect from `DB_DIALECT` (`'pg'` → Postgres, otherwise
SQLite). Services import tables from the barrel: `const { ledgers } = require('../db/schema')`.

**To change the schema:**

1. **Edit BOTH dialect files** for the module (`server/db/schema/sqlite/<module>.js` **and**
   `server/db/schema/pg/<module>.js`). Column **names** must be identical across dialects; the
   **types** differ by design. Follow the type rules (encoded in `docs/db/modules/<module>.sql`):
   - money → SQLite `real` / Postgres `NUMERIC(18,2)`; quantities/rates → `NUMERIC(18,4)` (**never** float in PG)
   - ISO datetime strings → SQLite `text` / Postgres `TIMESTAMPTZ`; date-only → `DATE`
   - 0/1 flags → SQLite `integer` / Postgres `BOOLEAN`
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → SQLite `integer(...).primaryKey({ autoIncrement: true })` /
     Postgres `bigint(...).generatedByDefaultAsIdentity()`
2. **Run the toolchain:**

   ```sh
   npm run db:generate   # regenerate sqlite + pg migrations from the Drizzle schema
   npm run db:parity     # assert identical table + column-name sets across both dialects
   npm run docs:db       # regenerate docs/db/SCHEMA.md + docs/db/schema.postgres.generated.sql FROM the schema
   ```

   `db:generate` writes new migration files under `server/db/migrations/{sqlite,pg}` —
   **migrations are auto-generated, do not hand-write them.** `db:parity` is a CI gate that fails on
   any table/column-name drift between dialects. `docs:db` regenerates the DB docs straight from the
   Drizzle metadata, so the docs always derive from the source of truth.
3. **Table docs** — `docs/db/modules/<module>.md` / `docs/db/erd.md` are the curated, prose notes;
   update them when relationships or intent change. The machine reference (`docs/db/SCHEMA.md`,
   `docs/db/schema.postgres.generated.sql`) is regenerated by `npm run docs:db` and must not be
   hand-edited.

**Boot / migration strategy — `bootStrategy = "init-kept"`.** The app does **not** auto-apply Drizzle
migrations on boot. `initDB()` in `server/db/index.js` still calls each module's existing `init(db)`
(DDL + seed) at startup, which guarantees the exact column defaults, constraints and seed data the
126-test Jest oracle was written against. The Drizzle schema + generated migrations are the
source-of-truth tooling for provisioning a fresh DB (and the eventual cut-over). To apply migrations
explicitly against a fresh DB use `npm run db:migrate` (SQLite by default; also Postgres when
`DB_DIALECT=pg` and `DATABASE_URL` are set).

---

## Commands

| Command | What it does |
|---|---|
| `npm start` | runs the app; serves live docs at `http://localhost:5180/docs` (dev-only) |
| `npm run docs:gen` | regenerates `docs/api/openapi.{json,yaml}` from fragments + channels |
| `npm run docs:check` | **CI gate** — fails if any channel is undocumented or a fragment is broken |
| `npm run db:parity` | **CI gate** — fails if the pg + sqlite Drizzle schemas disagree on tables/columns |
| `npm run db:generate` | regenerates sqlite + pg migrations from the Drizzle schema |
| `npm run docs:db` | regenerates `docs/db/SCHEMA.md` + `docs/db/schema.postgres.generated.sql` from the schema |
| `npm run db:migrate` | applies the generated migrations (sqlite; + pg when `DB_DIALECT=pg` + `DATABASE_URL`) |

Recommended: add `npm run docs:check` to `.github/workflows/build-win.yml` before the build step so
undocumented channels can't merge.

---

## What about Postgres?

Status today: the app **runs on SQLite** by default. Postgres is a **fully-defined Drizzle dialect**
(`server/db/schema/pg`) with its own generated migrations under `server/db/migrations/pg`. It is
selectable via `DB_DIALECT=pg` + `DATABASE_URL`, but the desktop app and the test oracle run on
SQLite. `docs/db/schema.postgres.generated.sql` is the Postgres DDL derived from the pg schema (via
`npm run docs:db`); `docs/db/schema.postgres.sql` remains the curated, richly-annotated contract.

To run on Postgres:

1. Set `DB_DIALECT=pg` and `DATABASE_URL=...`. `server/db/index.js` then binds Drizzle to
   `drizzle-orm/node-postgres` and `server/db/schema/index.js` serves the `pgTable` schema.
2. Provision the database with `npm run db:migrate` (applies `server/db/migrations/pg`).
3. The Drizzle type contract (booleans, `NUMERIC` money, `TIMESTAMPTZ`, identity columns) is already
   encoded in `server/db/schema/pg` — no manual reconciliation needed.

Whenever you touch the schema: **edit both dialect files** and run
`npm run db:generate && npm run db:parity && npm run docs:db`, the same way the openhono fragments are
kept in sync for the API.
