// Shared field styles for master/voucher forms.
// Canonical source of the input / select / row classes that were copy-pasted
// into ~100 screens. Import these instead of redefining a local `inputCls`.
// Matches the Ledger master (the reference look): subtle box, hover/focus border.

/** Full-width text input inside a FormRow value slot. */
export const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

/** Select dropdown inside a FormRow value slot. */
export const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded cursor-pointer';

/** Right-aligned numeric input (compose with a width utility, e.g. `${numCls} w-24`). */
export const numCls =
  'bg-transparent text-sm text-right outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

/** Standard FormRow line height. */
export const rowCls = 'flex items-center min-h-[26px]';
