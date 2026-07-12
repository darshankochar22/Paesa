// Single source of truth for the app's visual language — the "TallyPrime-clone"
// look: sharp corners, strict black & white (no hue, no grey), mono for tabular
// data, tight type scale. Every local component and screen composes from these
// tokens so the look is changed in ONE place, never copy-pasted per screen.
//
// Strict black/white rule (UI guide): no colour and no grey fills/borders/text.
// Emphasis comes from weight / size / border. Row separators are solid black
// hairlines; hover/focus use a barely-there whitish tint, never grey.

/** Dark top bar on every master/transaction page. */
export const PAGE_TITLE_BAR =
  'px-3 py-1.5 text-xs font-semibold bg-black text-white flex justify-between items-center select-none';

/** Report/section header strip (title + period). */
export const PANEL_HEADER =
  'bg-white border-b border-gray-300 px-3 py-1.5 flex justify-between items-center select-none';

/** Column-header row of a table/register. */
export const TABLE_HEADER =
  'bg-white border-b border-gray-300 text-black font-bold uppercase tracking-wider select-none text-[10px]';

/** A standard data row — light hairline separator (Voucher-View style). */
export const TABLE_ROW = 'border-b border-gray-200 text-black transition-colors';

/** Hover affordance for clickable rows — whitish, close to white. */
export const TABLE_ROW_HOVER = 'hover:bg-black/[0.03] cursor-pointer';

/** Zebra striping removed — solid black row separators carry the structure. */
export const rowStripe = (_idx: number) => 'bg-white';

/** Keyboard-focused row — whitish highlight (no grey/colour). */
export const TABLE_ROW_FOCUSED = 'bg-black/[0.06] text-black font-semibold';

/** Selected row. */
export const TABLE_ROW_SELECTED = 'bg-black/[0.06] font-semibold';

/** Totals / subtotals — bold + top border, never a fill colour. */
export const TOTALS_ROW = 'border-t-2 border-black font-bold text-black';

/** Group/section header row inside a register. */
export const GROUP_ROW = 'font-bold text-black border-t border-gray-300';

/** Secondary text — no grey; hierarchy comes from size/weight, not hue. */
export const TEXT_MUTED = 'text-black';
export const TEXT_SECONDARY = 'text-black';

/** Numeric cell: right-aligned mono, tabular figures. */
export const NUM_CELL = 'text-right font-mono tabular-nums';

/** Empty / loading placeholder block. */
export const PLACEHOLDER = 'px-3 py-8 text-center text-black italic text-xs';

/** Type scale (semantic roles → one size each, never re-invented per screen). */
export const TEXT = {
  label: 'text-[10px]',
  rowData: 'text-[11px]',
  form: 'text-xs',
  heading: 'text-sm',
} as const;

/** Consistent vertical row padding. */
export const ROW_PAD = 'px-3 py-1.5';
