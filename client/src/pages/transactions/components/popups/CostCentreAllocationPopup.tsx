import { useState, useEffect, useRef } from 'react';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { useEscape } from '@/hooks/useEscape';
import LedgerListPanel from '../LedgerListPanel';
import type { CostCentreType, CostCategoryType } from '@/types/api';

interface CostCentreAllocation {
  cost_centre_id: number;
  amount: number;
  /**
   * Additive dimension (Tally cost categories). Only set when the company has
   * cost categories — legacy payloads without it keep working unchanged.
   */
  cost_category_id?: number;
}

interface Props {
  companyId: number;
  ledgerName: string;
  totalAmount: number;
  dcType?: 'Dr' | 'Cr';
  initialAllocations?: CostCentreAllocation[];
  onClose: () => void;
  onSave: (allocations: CostCentreAllocation[]) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });

// Working row — ids may be undefined while the user is still picking from a list,
// mirroring Tally where a blank allocation line waits for Category → Centre → Amount.
interface Row {
  key: string;
  cost_category_id?: number;
  cost_centre_id?: number;
  amount: number;
}

// A field the right-hand pick-list is currently open for.
type ActivePanel = { rowKey: string; kind: 'cat' | 'centre' } | null;

// Focus a specific cell by its data-cc address ("<rowKey>:<field>").
function focusCell(rowKey: string, field: 'cat' | 'centre' | 'amt') {
  setTimeout(() => {
    const el = document.querySelector(`[data-cc="${rowKey}:${field}"]`) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    try {
      el.select();
    } catch {
      /* ignore */
    }
  }, 0);
}

export default function CostCentreAllocationPopup({
  companyId,
  ledgerName,
  totalAmount,
  dcType = 'Dr',
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const keySeq = useRef(0);
  const newKey = () => `r${keySeq.current++}`;

  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [costCategories, setCostCategories] = useState<CostCategoryType[]>([]);
  // Seed at mount (masters aren't needed for a blank line): hydrate existing
  // allocations, else ONE blank row. Doing this here — not in a post-load effect
  // — means the editable line exists in the very first paint, so the popup never
  // shows column headers with no row beneath them (Tally opens ready to type).
  const [rows, setRows] = useState<Row[]>(() =>
    initialAllocations.length > 0
      ? initialAllocations.map((a) => ({
          key: newKey(),
          cost_centre_id: a.cost_centre_id,
          amount: a.amount,
          cost_category_id: a.cost_category_id,
        }))
      : [{ key: newKey(), amount: 0 }],
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reconciledRef = useRef(false);

  // Right-hand "List of Categories" / "List of Cost Centres" panel state.
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [panelSearch, setPanelSearch] = useState('');
  // While the pick-list is open it becomes the topmost Escape layer, so Esc
  // closes just the list (not the whole allocation popup) — Tally behaviour.
  useEscape(() => setActivePanel(null), !!activePanel);

  // Load cost centres + cost categories.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ccRes, catRes] = await Promise.all([
          window.api.costCentre.getAll(companyId),
          window.api.costCategory.getAll(companyId),
        ]);
        if (!active) return;
        if (ccRes.success) setCostCentres(ccRes.costCentres ?? []);
        else setError(ccRes.error || 'Failed to load cost centres.');
        if (catRes.success) setCostCategories(catRes.costCategories ?? []);
      } catch {
        if (active) setError('Error loading cost centres.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  const validCentres = costCentres.filter(
    (cc): cc is CostCentreType & { cc_id: number } => typeof cc.cc_id === 'number',
  );
  const validCategories = costCategories.filter(
    (c): c is CostCategoryType & { cc_cat_id: number } =>
      typeof c.cc_cat_id === 'number' && c.is_active !== 0,
  );
  const hasCategories = validCategories.length > 0;

  const categoryName = (id?: number) =>
    id == null ? '' : (validCategories.find((c) => c.cc_cat_id === id)?.name ?? '');
  const centreName = (id?: number) =>
    id == null ? '' : (validCentres.find((c) => c.cc_id === id)?.name ?? '');

  // Cost centres shown for a category (Tally scopes the centre list to the chosen
  // category); with no categories, or none matching, show all.
  const centresForCategory = (catId?: number) => {
    const matched =
      hasCategories && catId != null
        ? validCentres.filter((c) => c.cost_category_id === catId)
        : validCentres;
    return matched.length > 0 ? matched : validCentres;
  };

  // After masters load, backfill the category on any hydrated row that has a
  // centre but no category (older payloads stored centre-only). Runs once.
  useEffect(() => {
    if (loading || reconciledRef.current) return;
    reconciledRef.current = true;
    if (!hasCategories) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!r.cost_centre_id || r.cost_category_id != null) return r;
        const centre = validCentres.find((c) => c.cc_id === r.cost_centre_id);
        const catId = centre?.cost_category_id;
        return catId != null && validCategories.some((c) => c.cc_cat_id === catId)
          ? { ...r, cost_category_id: catId }
          : r;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const filledRows = rows.filter((r) => r.cost_centre_id);
  const allocated = filledRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const remaining = round2(totalAmount - allocated);

  const patchRow = (key: string, patch: Partial<Row>) => {
    setError(null);
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    setError(null);
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const openPanel = (rowKey: string, kind: 'cat' | 'centre') => {
    setPanelSearch('');
    setActivePanel({ rowKey, kind });
  };

  // Selecting from the right-hand list writes the id onto the row and advances:
  // Category → Cost Centre → Amount, then a fresh line — Tally's entry loop.
  const handlePick = (item: any) => {
    if (!activePanel) return;
    const { rowKey, kind } = activePanel;
    setActivePanel(null);
    if (kind === 'cat') {
      // Changing category clears a now-mismatched centre.
      patchRow(rowKey, { cost_category_id: item.cc_cat_id, cost_centre_id: undefined });
      focusCell(rowKey, 'centre');
    } else {
      patchRow(rowKey, { cost_centre_id: item.cc_id });
      focusCell(rowKey, 'amt');
    }
  };

  // After an amount is confirmed: if fully allocated, accept; otherwise drop a
  // fresh blank line and open its first pick-list (Category, or Cost Centre when
  // there are no categories) — Tally's "back to a new line" loop.
  const confirmAmount = (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (!row?.cost_centre_id) {
      setError('Select a cost centre for this line.');
      return;
    }
    if (remaining <= 0.01) {
      handleSave();
      return;
    }
    const nk = newKey();
    setRows((prev) => [...prev, { key: nk, amount: remaining > 0 ? remaining : 0 }]);
    focusCell(nk, hasCategories ? 'cat' : 'centre');
  };

  const handleSave = () => {
    if (!validCentres.length) {
      setError('No valid cost centres available. Create one under Master Creation first.');
      return;
    }
    const picked = rows.filter(
      (r) => r.cost_centre_id && validCentres.some((c) => c.cc_id === r.cost_centre_id),
    );
    if (picked.length === 0) {
      setError('Add at least one cost centre allocation.');
      return;
    }
    // Merge duplicate centre (+category) lines — Tally sums rather than rejects.
    const merged: CostCentreAllocation[] = [];
    for (const r of picked) {
      const alloc: CostCentreAllocation = {
        cost_centre_id: r.cost_centre_id!,
        amount: round2(Number(r.amount) || 0),
        ...(hasCategories && r.cost_category_id != null
          ? { cost_category_id: r.cost_category_id }
          : {}),
      };
      const dup = merged.find(
        (m) =>
          m.cost_centre_id === alloc.cost_centre_id &&
          m.cost_category_id === alloc.cost_category_id,
      );
      if (dup) dup.amount = round2(dup.amount + alloc.amount);
      else merged.push(alloc);
    }
    if (hasCategories) {
      // Each cost category is a parallel dimension: every category that has rows
      // must allocate the full amount.
      for (const cat of validCategories) {
        const catRows = merged.filter((m) => m.cost_category_id === cat.cc_cat_id);
        if (catRows.length === 0) continue;
        const rem = round2(totalAmount - catRows.reduce((s, r) => s + r.amount, 0));
        if (Math.abs(rem) >= 0.01) {
          setError(`Category "${cat.name}": remaining ₹${rem.toFixed(2)} must be zero.`);
          return;
        }
      }
    } else if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ₹${remaining.toFixed(2)} must be zero.`);
      return;
    }
    onSave(merged);
  };

  const colClass = hasCategories
    ? 'grid grid-cols-[1fr_1fr_140px_28px] gap-2 items-center'
    : 'grid grid-cols-[1fr_140px_28px] gap-2 items-center';

  const triggerCls =
    'text-sm px-2 py-1 border border-gray-400 outline-none focus:border-black bg-white w-full cursor-pointer';

  // Items + title for the currently-open pick-list.
  const panelRow = activePanel ? rows.find((r) => r.key === activePanel.rowKey) : undefined;
  const panelItems =
    activePanel?.kind === 'cat'
      ? validCategories
      : activePanel
        ? centresForCategory(panelRow?.cost_category_id)
        : [];

  return (
    <>
      <VoucherPopupShell
        size="tally"
        headerVariant="stacked"
        title={`Cost Allocations for : ${ledgerName}`}
        headerRight={
          <span>
            Up to:{' '}
            <span className="font-bold text-black">
              ₹{fmt(totalAmount)} {dcType}
            </span>
          </span>
        }
        onClose={onClose}
        onAccept={handleSave}
        hint={
          !loading && validCentres.length === 0
            ? 'No valid cost centres — cannot allocate'
            : undefined
        }
      >
        <div className="max-w-3xl">
          {error && (
            <div className="border border-gray-400 border-l-2 border-l-black text-black text-sm font-semibold px-3 py-2 mb-3 flex justify-between items-center">
              <span>&bull; {error}</span>
              <button onClick={() => setError(null)} className="font-bold px-1">
                &times;
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-gray-500 text-sm italic">
              Loading cost centres…
            </div>
          ) : validCentres.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-sm border border-gray-300">
              No valid cost centres found. Create one under Master Creation first.
            </div>
          ) : (
            <>
              {/* Column headers — mirrors Tally's Cost Category / Name of Cost Centre / Amount */}
              <div
                className={`${colClass} border-b border-black px-1 py-1.5 text-sm font-bold text-black`}
              >
                {hasCategories && <div>Cost Category</div>}
                <div>Name of Cost Centre</div>
                <div className="text-right">Amount</div>
                <div />
              </div>

              <div className="divide-y divide-gray-200">
                {rows.map((row) => {
                  const catActive = activePanel?.rowKey === row.key && activePanel.kind === 'cat';
                  const centreActive =
                    activePanel?.rowKey === row.key && activePanel.kind === 'centre';
                  return (
                    <div key={row.key} className={`${colClass} px-1 py-1.5 bg-white`}>
                      {hasCategories && (
                        <input
                          data-cc={`${row.key}:cat`}
                          type="text"
                          readOnly
                          value={categoryName(row.cost_category_id)}
                          placeholder="Select Category…"
                          onFocus={() => openPanel(row.key, 'cat')}
                          onMouseDown={() => openPanel(row.key, 'cat')}
                          className={`${triggerCls} ${catActive ? 'border-black bg-black/[0.04]' : ''}`}
                        />
                      )}
                      <input
                        data-cc={`${row.key}:centre`}
                        type="text"
                        readOnly
                        value={centreName(row.cost_centre_id)}
                        placeholder="Select Cost Centre…"
                        onFocus={() => openPanel(row.key, 'centre')}
                        onMouseDown={() => openPanel(row.key, 'centre')}
                        className={`${triggerCls} ${centreActive ? 'border-black bg-black/[0.04]' : ''}`}
                      />
                      <input
                        data-cc={`${row.key}:amt`}
                        type="number"
                        step="0.01"
                        value={row.amount || ''}
                        onChange={(e) => patchRow(row.key, { amount: Number(e.target.value) || 0 })}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          e.stopPropagation();
                          confirmAmount(row.key);
                        }}
                        className="text-sm px-2 py-1 border border-gray-400 outline-none focus:border-black bg-white text-right w-full font-mono"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => removeRow(row.key)}
                        className="text-gray-400 hover:text-black text-sm font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Totals — Allocated / Remaining shown without hue (weight only) */}
              <div className="flex justify-end gap-8 border-t border-black px-1 py-2 mt-1 text-sm text-black">
                <span>
                  Allocated: <span className="font-mono font-bold">₹{fmt(allocated)}</span>
                </span>
                <span>
                  Remaining:{' '}
                  <span className={`font-mono ${Math.abs(remaining) < 0.01 ? '' : 'font-bold'}`}>
                    ₹{fmt(remaining)}
                  </span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { key: newKey(), amount: 0 }])}
                className="mt-3 text-xs font-bold text-black border border-black px-3 py-1 bg-white hover:bg-gray-100 select-none"
              >
                + Add Line
              </button>
            </>
          )}
        </div>
      </VoucherPopupShell>

      {/* Right-edge pick-list — same docked "List of …" panel the voucher uses for
          ledgers/items, so the look and keyboard flow match the rest of the app. */}
      {activePanel && (
        <div className="fixed top-0 right-0 bottom-0 z-[60] flex">
          <LedgerListPanel
            title={activePanel.kind === 'cat' ? 'List of Categories' : 'List of Cost Centres'}
            items={panelItems}
            searchTerm={panelSearch}
            onSearchChange={setPanelSearch}
            onSelect={handlePick}
            onClose={() => setActivePanel(null)}
            onCreateNew={() =>
              setError(
                `Create ${activePanel.kind === 'cat' ? 'cost categories' : 'cost centres'} from Gateway → Masters first.`,
              )
            }
            createLabel="Create"
          />
        </div>
      )}
    </>
  );
}
