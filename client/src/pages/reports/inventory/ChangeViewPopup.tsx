import * as React from 'react';
import { useEscape } from '@/hooks/useEscape';

export type ViewKey =
  'daily' | 'weekly' | 'fortnightly' | 'fourweek' | 'monthly' | 'quarterly' | 'halfyearly';
export type RelatedKey = 'stockquery' | 'movement' | 'vouchers' | 'costanalysis';

export type ChangeViewSelection =
  { kind: 'view'; key: ViewKey } | { kind: 'related'; key: RelatedKey };

interface Entry {
  label: string;
  sel: ChangeViewSelection;
  more?: boolean; // only shown after "Show More"
}

const VIEWS: Entry[] = [
  { label: 'Daily', sel: { kind: 'view', key: 'daily' } },
  { label: 'Weekly', sel: { kind: 'view', key: 'weekly' } },
  { label: 'Fortnightly', sel: { kind: 'view', key: 'fortnightly' } },
  { label: '4 Week Month', sel: { kind: 'view', key: 'fourweek' }, more: true },
  { label: 'Monthly', sel: { kind: 'view', key: 'monthly' } },
  { label: 'Quarterly', sel: { kind: 'view', key: 'quarterly' } },
  { label: 'Half Yearly', sel: { kind: 'view', key: 'halfyearly' } },
];

const RELATED: Entry[] = [
  { label: 'Stock Query', sel: { kind: 'related', key: 'stockquery' } },
  { label: 'Movement Analysis', sel: { kind: 'related', key: 'movement' } },
  { label: 'Vouchers Details', sel: { kind: 'related', key: 'vouchers' } },
  { label: 'Cost Analysis', sel: { kind: 'related', key: 'costanalysis' }, more: true },
];

interface Props {
  currentView: ViewKey;
  onSelect: (sel: ChangeViewSelection) => void;
  onClose: () => void;
}

/**
 * TallyPrime "Change View" overlay — small centered popup, NOT full-screen.
 * Two groups (Views / Related Reports) with a Show More toggle that reveals
 * extra rows. Keyboard: ↑↓ to move across both groups, Enter to pick, Esc closes.
 */
export default function ChangeViewPopup({ currentView, onSelect, onClose }: Props) {
  const [showMore, setShowMore] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const views = VIEWS.filter((e) => showMore || !e.more);
  const related = RELATED.filter((e) => showMore || !e.more);

  // Flatten to a single navigable list (views then related), filtered by search
  const flat = React.useMemo(() => {
    const all = [...views, ...related];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((e) => e.label.toLowerCase().includes(q));
  }, [views, related, search]);

  const initialIdx = Math.max(
    0,
    flat.findIndex((e) => e.sel.kind === 'view' && e.sel.key === currentView),
  );
  const [idx, setIdx] = React.useState(initialIdx);

  React.useEffect(() => {
    setIdx(0);
  }, [search, showMore]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((p) => Math.min(flat.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const en = flat[idx];
        if (en) onSelect(en.sel);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [flat, idx, onSelect]);

  useEscape(onClose);

  const renderGroup = (label: string, entries: Entry[]) => (
    <>
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 bg-zinc-50 border-y border-zinc-200">
        {label}
      </div>
      {entries.map((e) => {
        const fi = flat.indexOf(e);
        if (fi === -1) return null;
        const active = fi === idx;
        const isCurrent = e.sel.kind === 'view' && e.sel.key === currentView;
        return (
          <button
            key={e.label}
            onClick={() => onSelect(e.sel)}
            onMouseEnter={() => setIdx(fi)}
            className={`w-full text-left px-4 py-1 text-[11px] flex items-center justify-between ${
              active ? 'bg-zinc-200 text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'
            }`}
          >
            <span>{e.label}</span>
            {isCurrent && <span className="text-[9px] text-zinc-500">(current)</span>}
          </button>
        );
      })}
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="mt-24 w-72 bg-white border border-zinc-900 shadow-lg flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 bg-white border-b-2 border-zinc-900 flex items-center justify-between">
          <span className="font-bold text-xs tracking-wide">Change View</span>
          <button
            onClick={() => setShowMore((m) => !m)}
            className="text-[10px] font-semibold text-zinc-600 hover:text-zinc-900 underline"
          >
            {showMore ? 'Show Less' : 'Show More'}
          </button>
        </div>
        <div className="px-3 py-1.5 border-b border-zinc-200">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search views…"
            className="w-full px-2 py-1 text-[11px] border border-zinc-300 focus:border-zinc-900 outline-none font-mono"
          />
        </div>
        <div className="max-h-80 overflow-y-auto">
          {flat.length === 0 ? (
            <div className="px-4 py-3 text-[11px] text-zinc-400 italic">No matching views</div>
          ) : (
            <>
              {views.some((v) => flat.includes(v)) && renderGroup('Views', views)}
              {related.some((r) => flat.includes(r)) && renderGroup('Related Reports', related)}
            </>
          )}
        </div>
        <div className="px-3 py-1 border-t border-zinc-200 flex justify-end gap-3 text-[10px] font-semibold text-zinc-600">
          <button onClick={onClose} className="hover:text-zinc-900">
            Esc: Quit
          </button>
          <span className="text-zinc-400">Enter: Accept</span>
        </div>
      </div>
    </div>
  );
}
