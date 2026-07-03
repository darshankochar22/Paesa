/* ── Tally-style right action panel for the Outstandings reports ───────────
 * Strict black/white (no colour). Each item is an F-key label. Items without
 * an `onClick` render greyed/disabled — mirroring how TallyPrime itself greys
 * out actions that aren't available in the current context. A `spacer` item
 * draws the small gap Tally puts between key groups.
 */
export interface PanelItem {
  key: string;
  label: string;
  onClick?: () => void;
  spacer?: boolean;
}

export function OutstandingsRightPanel({ items }: { items: PanelItem[] }) {
  return (
    <div className="w-32 bg-white border-l border-black flex flex-col gap-px p-1 select-none h-full shrink-0 overflow-y-auto">
      {items.map((it, i) =>
        it.spacer ? (
          <div key={`sp-${i}`} className="h-2 shrink-0" />
        ) : (
          <button
            key={`${it.key}-${i}`}
            onClick={it.onClick}
            disabled={!it.onClick}
            className="w-full text-left px-1.5 py-1 border border-black/20 bg-white hover:bg-black/[0.06] active:bg-black/10 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shrink-0"
          >
            <span className="block font-bold text-[8px] leading-tight text-black/50">{it.key}</span>
            <span className="block font-semibold text-[9px] leading-tight mt-0.5 text-black line-clamp-1">
              {it.label}
            </span>
          </button>
        )
      )}
    </div>
  );
}
