# Project: MVP — TallyPrime Clone
# UI Guide — MVP (TallyPrime Clone)

Stack: React/TS + Tailwind CSS. Shared components already exist — reuse and extend them, never duplicate.

## Step 0 — Self-discovery (do this once, don't re-scan later)
Before touching any UI:
1. Find the shared components folder (likely `src/components/ui/` or `src/components/common/`) and list what exists.
2. Find `tailwind.config.*` — check if a custom grayscale palette/theme is already defined. If not, you'll define one (see Theme below) and add it there, not inline.
3. Skim 2–3 existing screens to see current patterns (spacing scale, font sizes, table style). Note inconsistencies here, don't fix yet.
Output a short list: components found, theme file found Y/N, inconsistencies seen. Then stop scanning — start fixing.

## Important: don't copy TallyPrime's visual style
TallyPrime is the functional/UX reference only (panel behavior, navigation, report structure, what data goes where). Never copy its actual colors, gradients, borders, or visual skin. This project's look is our own strict black/white/gray theme below — apply it everywhere, including screens that visually mimic Tally's layout.

## Theme — strict black/white/gray
- No color. Not even a "subtle" blue or green. Status/errors/totals are shown via weight, size, border, or icon — never hue.
- Define a fixed gray scale once in `tailwind.config` (e.g. `gray-50` through `gray-900`, plus pure `black`/`white`) and reference only those tokens. Never use arbitrary hex in components.
- Emphasis hierarchy without color:
  - Primary action → solid black bg, white text
  - Secondary action → white bg, black border, black text
  - Disabled → gray-300 text, gray-100 bg, no border
  - Negative/error values → bold + slightly larger, optionally a thin black border-left on the row — not red
  - Totals/subtotals rows → bold + top border (1px black), never a fill color
- Dark mode, if it exists, is true invert (black↔white swap), not a separate palette.

## Reusable-component rule (non-negotiable)
- Before writing any new UI, check the shared components folder first. If a `Table`, `Button`, `Input`, `Card`, etc. already exists — use and extend it via props, never copy-paste its JSX into a new file.
- If a pattern repeats 2+ times across screens (a report header, a totals row, a filter bar) and has no shared component yet — extract one now, don't wait for a 3rd repetition.
- New components go in the existing shared folder, matching its existing naming/prop conventions — don't introduce a second styling pattern.

## What "good UI" looks like here (apply when reviewing/fixing)
- Consistent spacing scale (pick 4/8/12/16/24 — not arbitrary px)
- Tables: fixed-width numeric columns, right-aligned numbers, left-aligned text, consistent row height
- One typographic scale across the whole app — no screen invents its own font size
- Clear visual hierarchy via weight/size/whitespace, not decoration
- Generous whitespace over borders/boxes — borders only where they separate data (table rows, totals)
- No drop shadows, no gradients, no rounded-pill buttons — sharp/minimal, matches Tally's utilitarian feel

## What "bad UI" looks like (flag and fix on sight)
- Any color used for anything other than the strict gray scale
- Inline hex/rgb values instead of theme tokens
- Copy-pasted JSX blocks that should be one shared component with props
- Inconsistent padding/margin between visually similar elements (e.g. two report headers with different spacing)
- Mixed font sizes for the same semantic role (e.g. table headers sized differently across reports)
- Buttons/inputs styled differently per screen

## Never touch / ignore (update this list after Step 0 confirms real paths)
- `node_modules/`, `dist/`, `build/`, `.electron/` build output
- Drizzle migration files (`drizzle/` or `migrations/`) — schema, not UI
- `preload.js` and other IPC bridge files — logic, not UI, unless explicitly asked
- Any `*.config.*` except `tailwind.config.*` when doing a theme task
- Auto-generated files (lockfiles, `.d.ts` type output)

## Workflow when given a UI task
1. Identify which existing shared component(s) apply — state which, don't re-derive from scratch.
2. Make the change using theme tokens and shared components only.
3. Check 1 other screen using the same component to confirm the fix doesn't break it.
4. Report in one line: what changed, which file. No before/after prose recap.

## Token discipline
- Don't re-run Step 0 discovery in future sessions — once components/theme are known, just use them.
- When fixing UI across many screens, batch by shared component (fix the component once) rather than touching each screen file individually.
- Don't paste full component code back in chat — name file + line range changed.
Electron + React/TypeScript frontend, SQLite + Drizzle ORM backend, IPC via `preload.js`.
Repo: darshankochar22/MVP.

For all UI/visual rules → read `UI.md` first. This file is about structure, components, and task tracking.

## Step 0 — Discover before building (once per fresh session only)
1. List the existing shared components folder (`src/components/...`) — what already exists.
2. List current report/voucher/daybook screens and how each currently opens (modal? inline? route change?).
3. Note which of the 108–112 inventory report screens already have UI, and whether each one currently has:
   - a working backend query (Drizzle)
   - a working IPC handler in `preload.js`
   - a frontend component actually calling that handler (not mock/dummy data)
4. Report findings in a short list. Then stop scanning — do not re-discover in future sessions, trust this file's notes instead.

## Core principle
Less code, more reuse. Every screen should compose from shared components, not invent its own markup. No copy-pasted JSX blocks. If two screens look similar, they should share a component, not similar-looking duplicate code.

## Reusable components — build what's needed now + near-term, not speculative
Create/extend a common components folder (e.g. `src/components/common/`) for things actually used across 108–112 + ledger + vouchers + daybook + reports. Do not scaffold components for hypothetical future features with no current screen needing them.

Likely real candidates (confirm against Step 0 findings before creating):
- `FullScreenPanel` — the TallyPrime-style panel: opens full-screen over the current view (not a small popup/modal), with its own header (title + close), body, and optional footer actions. This is the single shared pattern for opening any report, voucher entry, or ledger detail.
- `DataTable` — shared table for reports/registers: consistent column alignment (numbers right, text left), consistent row height, totals row styling.
- `ReportHeader` — shared header block used at the top of every report panel (title, date range, filters).
- `Button`, `Input`, `Select` — base form primitives, if not already existing.

Before creating any new shared component, check if something close already exists and extend it via props instead of creating a near-duplicate.

## Full-screen panel pattern (applies to ALL panels — reports, vouchers, ledger, daybook)
Every report, voucher entry screen, and ledger view must open as a full-screen panel replacing the current view — matching TallyPrime's actual interaction pattern, not a small centered modal/popup. One shared `FullScreenPanel` component handles this everywhere. No screen should implement its own panel-opening logic.

## Inventory Books — issues #108–#112 verification + completion
Treat existing 108–112 work as unverified, not done. For each issue, in order, one at a time:
1. Re-read the issue via `gh issue view <N> --repo darshankochar22/MVP` only if this file has no notes on it yet — otherwise trust this file's last status.
2. Check three things explicitly and report pass/fail for each:
   - DB: does the Drizzle query/schema needed for this report actually exist and return correct data?
   - Backend/IPC: does `preload.js` (or related handler file) expose a working handler for it?
   - Frontend: does the component call that handler (real data), and does it open via `FullScreenPanel`, not a half-built popup?
3. Fix whichever of the three is missing or fake/mocked.
4. Confirm the report renders correctly inside the full-screen panel pattern.
5. Once all three checks pass — delete this issue's block from this file. Don't mark done, remove the text.

## Anti-loop / token discipline (important)
- Don't re-read files already opened this session unless they changed.
- Don't re-run Step 0 discovery after the first time — rely on this file's running notes.
- If stuck fixing the same thing 2+ times without progress, stop and report the blocker in plain text instead of retrying variations.
- After finishing a task (an issue, a component, a UI fix), summarize in 1–2 lines, then clear unnecessary context — start the next task fresh rather than carrying the full diff history forward.
- When in doubt about structure, components, or rules — re-read this file (and `UI.md` for style) instead of guessing or asking the user to repeat themselves.

## Never touch
- `node_modules/`, `dist/`, `build/`, `.electron/` build output
- Drizzle migration files (`drizzle/` or `migrations/`)
- `preload.js` IPC bridge structure itself — only add handlers, don't restructure it without being asked
- Lockfiles, generated `.d.ts` files, `*.config.*` except `tailwind.config.*` for theme work

## Output rules
- Minimum words. No recap of what was just read or already discussed.
- State file + line range changed, not full pasted code, unless asked.
- One line per completed task: what changed, where.