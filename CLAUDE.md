# Project: MVP — TallyPrime Clone

Electron + React/TypeScript frontend, SQLite + Drizzle ORM backend, IPC via `preload.js`.
Repo: darshankochar22/MVP. Replicates TallyPrime UX (voucher types, reports, navigation).

## Repo structure
- Frontend: React/TS components, routed via `routes.tsx`
- Reports: `src/components/reports/` — layouts live here, dispatched by `src/components/reports/ReportRunner.tsx`
- Backend: SQLite via Drizzle ORM, exposed to frontend through Electron IPC handlers in `preload.js`
- Pattern reference: follow existing report layouts already in `src/components/reports/` for structure/style consistency — do not invent a new pattern

## Output rules
- Minimum words in responses to the user. No recaps of what was just read.
- Don't paste full file contents back unless asked — confirm with one line + filename.
- Don't re-read files already read this session unless they changed.