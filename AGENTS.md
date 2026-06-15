# Agent Notes

High-signal guidance for working in this repo. If a fact is obvious from filenames or standard tooling, it is not here.

## What this repo is

Electron desktop app (accounting/ERP). The Electron main process loads a React + Vite frontend and a Node.js backend that talks to a local SQLite DB via IPC.

- `main.js` / `preload.js` — Electron main process and IPC bridge
- `client/` — React + TypeScript + Vite frontend
- `server/` — CommonJS backend loaded into the Electron main process

## Setup

Install deps in **both** root and client:

```bash
npm i              # root Electron + backend deps
npm i --prefix client
```

> Note: `.gitignore` currently ignores `package.json` and `package-lock.json`. Do not treat that as license to delete them.

## Running locally

```bash
npm start          # concurrently: Vite dev server + Electron
```

- Frontend dev server runs on `http://localhost:5173`.
- Electron loads `http://localhost:5173` in dev; `client/dist/index.html` in production.
- `main.js` has a typo (`isPacakaged` instead of `app.isPackaged`). Do not "fix" it unless asked — the current build works because production falls through to the `else` branch and loads `client/dist`.

## Testing

Backend integration tests use Jest with an in-memory SQLite DB:

```bash
npm test           # root; sets NODE_ENV=test automatically
```

Frontend unit tests use Vitest:

```bash
cd client && npm test
```

CI order (`.github/workflows/build-win.yml`): root install → `npm test` → client install → `cd client && npm test` → `cd client && npm run build` → `electron-builder`.

## Build / package

```bash
npm run build:client      # cd client && npm run build
npm run dist              # build client + electron-builder
npm run dist:win          # --win --publish never
npm run dist:mac          # --mac --publish never
npm run dist:linux        # --linux --publish never
```

- `electron-builder` config lives in root `package.json` under `"build"`.
- `asar: false`; `extraResources` copies the `server/` folder; `files` includes `main.js`, `preload.js`, `server/**/*`, `client/dist/**/*`, `node_modules/**/*`.
- The packaged app is not a monorepo with separate packages — `server/` has no `package.json`. All Node deps live in root `node_modules`.

## Architecture patterns

### Backend module layout

Each feature under `server/` is split the same way:

```
server/<feature>/
  <feature>.js           # schema init: exports { init(db) }
  <feature>Service.js    # business logic / DB queries
  <feature>Controller.js # thin wrapper invoked by ipcMain
```

- Schema tables are created by each module's `init(db)` function, registered in `server/db/index.js`.
- Controllers are wired to IPC channels in `server/index.js`.
- Shared DB helpers are in `server/db/dbUtils.js`.

### IPC contract

Three files must stay in sync for every channel:

1. `preload.js` — exposes the channel under `window.api.*`
2. `server/index.js` — registers `ipcMain.handle('<channel>', controllerFn)`
3. Frontend call site — invokes `window.api.<namespace>.<method>(...)`

If you add or rename a backend operation, update all three. Existing channel names use the form `namespace:action` (e.g. `company:create`, `voucher:getById`).

### Database

- Runtime DB: SQLite file in the user's Electron `userData` dir (`startup.db`).
- Test DB: `file::memory:` when `NODE_ENV=test`.
- Uses `@libsql/client` directly for raw SQL and `drizzle-orm/libsql` via `server/db/dbUtils.js`.
- No migrations — schema is created by `initDB()` on every app start with `CREATE TABLE IF NOT EXISTS`.

### Frontend

- Vite + React 19 + TypeScript + Tailwind CSS v4.
- Routing uses `HashRouter` (Electron-friendly).
- Path alias `@/` maps to `client/src/`. TypeScript `verbatimModuleSyntax` is enabled, so use `import type { ... }` for type-only imports.
- ESLint config is in `client/eslint.config.js`; several rules are intentionally disabled (`no-explicit-any`, `no-unused-vars`, `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`). Do not re-enable them without a reason.
- Frontend tests mock `window.api` globally in `client/src/tests/setup.ts`. Add new IPC mocks there when components need them.

## TypeScript conventions

- `verbatimModuleSyntax: true` — use `import type { Foo }` when `Foo` is only a type.
- `strictNullChecks: false` and `noImplicitAny: false` in the client app config.
- Backend is plain CommonJS JavaScript, not TypeScript.

## Editing rules

- Make minimal, targeted edits. Do not rewrite whole files for small changes.
- Never leave placeholders, `// TODO`, or truncated code in place of working logic.
- Preserve existing formatting, comments, and file structure unless the change directly touches them.
- After changes, run the relevant verification:
  - Backend changes: `npm test`
  - Client changes: `cd client && npm run build` and `cd client && npm test`
- Do not run destructive commands (`rm -rf`, `git clean -fd`, etc.) without explicit approval.
