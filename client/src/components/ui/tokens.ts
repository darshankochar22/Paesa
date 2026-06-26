// Single source of truth for the app's visual language — the "TallyPrime-clone"
// look: sharp corners, zinc grayscale only (no hue), mono for tabular data,
// tight type scale. Every local component and screen composes from these tokens
// so the look is changed in ONE place, never copy-pasted per screen.
//
// Strict gray rule (UI guide): no color utilities anywhere. Emphasis comes from
// weight / size / border / fill on the zinc scale, never hue.

/** Dark top bar on every master/transaction page. */
export const PAGE_TITLE_BAR =
  "px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white flex justify-between items-center select-none";

/** Report/section header strip (title + period). */
export const PANEL_HEADER =
  "bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 flex justify-between items-center select-none";

/** Column-header row of a table/register. */
export const TABLE_HEADER =
  "bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold uppercase tracking-wider select-none text-[10px]";

/** A standard data row. */
export const TABLE_ROW =
  "border-b border-zinc-100 text-zinc-900 transition-colors";

/** Hover affordance for clickable rows. */
export const TABLE_ROW_HOVER = "hover:bg-zinc-50 cursor-pointer";

/** Zebra striping (apply by index). */
export const rowStripe = (idx: number) => (idx % 2 === 0 ? "bg-white" : "bg-zinc-50/40");

/** Keyboard-focused row (replaces the old yellow #ffcc00 highlight). */
export const TABLE_ROW_FOCUSED = "bg-zinc-200 text-zinc-950 font-semibold";

/** Selected row. */
export const TABLE_ROW_SELECTED = "bg-zinc-100 font-semibold";

/** Totals / subtotals — bold + top border, never a fill colour. */
export const TOTALS_ROW =
  "border-t-2 border-zinc-300 bg-zinc-50 font-bold text-zinc-900";

/** Group/section header row inside a register. */
export const GROUP_ROW =
  "bg-zinc-50 font-bold text-zinc-800 border-t border-zinc-300";

/** Muted secondary text. */
export const TEXT_MUTED = "text-zinc-400";
export const TEXT_SECONDARY = "text-zinc-500";

/** Numeric cell: right-aligned mono, tabular figures. */
export const NUM_CELL = "text-right font-mono tabular-nums";

/** Empty / loading placeholder block. */
export const PLACEHOLDER = "px-3 py-8 text-center text-zinc-400 italic text-xs";

/** Type scale (semantic roles → one size each, never re-invented per screen). */
export const TEXT = {
  label: "text-[10px]",
  rowData: "text-[11px]",
  form: "text-xs",
  heading: "text-sm",
} as const;

/** Consistent vertical row padding. */
export const ROW_PAD = "px-3 py-1.5";
