import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// One shared "Change View" popup for every GST report (issue #246, matches Tally's
// H: Change View → "List of Views"). A report passes its own view modes (Return View /
// Nature View / …) and its own related-report jump targets — the popup renders the two
// grouped sections, keyboard-navigates across the combined list, and calls back. It owns
// no report data, so the same component drives GSTR-1, GSTR-3B, and any future GST report.

export interface ChangeViewOption {
  /** Stable id for view modes; omitted/ignored for related-report jumps. */
  id?: string;
  label: string;
  /** Marks the currently-active view (bold, no highlight until focused). */
  active?: boolean;
  /** What to do when picked — toggle a view, or navigate to a related report. */
  onSelect: () => void;
}

interface Props {
  /** View modes for THIS report, e.g. Return View / Nature View. */
  views: ChangeViewOption[];
  /** Jump targets, e.g. Track GST Return Activities, Annual Computation, Reconciliation. */
  relatedReports?: ChangeViewOption[];
  onClose: () => void;
  title?: string;
}

export default function ChangeViewPopup({
  views,
  relatedReports = [],
  onClose,
  title = 'Change View',
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [search, setSearch] = useState('');

  // Flat, index-addressable option list (views first, then related) so arrow-nav
  // walks straight across both sections. Section headers are non-selectable labels.
  const flat = useMemo(() => {
    const match = (o: ChangeViewOption) =>
      !search || o.label.toLowerCase().includes(search.toLowerCase());
    return [...views.filter(match), ...relatedReports.filter(match)];
  }, [views, relatedReports, search]);

  const initial = Math.max(
    0,
    flat.findIndex((o) => o.active),
  );
  const [focused, setFocused] = useState(initial);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);
  useEffect(() => {
    setFocused((p) => Math.min(p, Math.max(0, flat.length - 1)));
  }, [flat.length]);
  useEffect(() => {
    itemRefs.current[focused]?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  const pick = (idx: number) => {
    const opt = flat[idx];
    if (!opt) return;
    onClose();
    opt.onSelect();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault();
      setFocused((p) => (p + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault();
      setFocused((p) => (p - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(focused);
    }
  };

  const viewsShown = flat.filter((_, i) => i < views.filter(sMatch(search)).length);
  const relatedShown = flat.slice(viewsShown.length);

  const renderRow = (opt: ChangeViewOption, flatIdx: number) => (
    <div
      key={`${opt.label}-${flatIdx}`}
      ref={(el) => {
        itemRefs.current[flatIdx] = el;
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        pick(flatIdx);
      }}
      onMouseEnter={() => setFocused(flatIdx)}
      className={`px-3 py-1 text-[11px] cursor-pointer ${
        focused === flatIdx
          ? 'bg-black text-white'
          : opt.active
            ? 'text-black font-bold bg-white'
            : 'text-black hover:bg-black/[0.03]'
      }`}
    >
      {opt.label}
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/10"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="mt-24 w-72 bg-white border border-gray-200 shadow-xl flex flex-col outline-none"
      >
        <div className="px-3 py-1.5 text-center text-[11px] font-bold border-b border-gray-200">
          {title}
        </div>
        <input
          ref={searchRef}
          className="px-3 py-1 text-[11px] outline-none border-b border-gray-200 placeholder-black/40"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex-1 overflow-y-auto max-h-80">
          {viewsShown.length > 0 && (
            <>
              <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-black/50">
                Views
              </div>
              {viewsShown.map((opt, i) => renderRow(opt, i))}
            </>
          )}
          {relatedShown.length > 0 && (
            <>
              <div className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-black/50">
                Related Reports
              </div>
              {relatedShown.map((opt, i) => renderRow(opt, viewsShown.length + i))}
            </>
          )}
          {flat.length === 0 && (
            <div className="px-3 py-2 text-[11px] italic text-black/50">No views found</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Same case-insensitive label filter the flat list uses — kept as a tiny helper so the
// section split (which slice belongs to Views vs Related) stays consistent with `flat`.
function sMatch(search: string) {
  return (o: ChangeViewOption) => !search || o.label.toLowerCase().includes(search.toLowerCase());
}
