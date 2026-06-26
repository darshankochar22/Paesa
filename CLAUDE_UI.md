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