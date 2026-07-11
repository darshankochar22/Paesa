import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel } from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockGroup {
  sg_id: number;
  name: string;
}
interface StockItem {
  item_id: number;
  name: string;
}

interface PriceListLine {
  line_id?: number;
  particulars: string;
  item_id: number | null;
  qty_from: string;
  qty_less_than: string;
  rate: string;
  disc_percent: string;
}

interface PriceListRecord {
  price_list_id: number;
  stock_group: string;
  price_level: string;
  applicable_from: string;
  lines?: any[];
}

const emptyLine = (): PriceListLine => ({
  particulars: '',
  item_id: null,
  qty_from: '',
  qty_less_than: '',
  rate: '',
  disc_percent: '',
});

const cellCls =
  'bg-transparent outline-none text-[11px] font-mono text-zinc-900 w-full px-1 py-0.5 border border-transparent focus:bg-zinc-100 focus:border-zinc-300 rounded';

// ─── Right-side selection list (Tally-style, full height, never clipped) ────────

interface PanelEntry {
  key: string;
  label: string;
  selected: boolean;
  prefix?: string;
}

function RightSelectPanel({
  title,
  createLabel,
  onCreate,
  entries,
  onPick,
  onClose,
}: {
  title: string;
  createLabel?: string;
  onCreate?: () => void;
  entries: PanelEntry[];
  onPick: (key: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-0 right-0 h-full w-72 bg-white border-l border-zinc-300 shadow-xl z-[60] flex flex-col"
    >
      <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">{title}</span>
        {createLabel && onCreate && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onCreate();
            }}
            className="text-[11px] font-bold text-zinc-900 underline hover:text-black"
          >
            {createLabel}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-400 font-sans">No items found.</div>
        ) : (
          entries.map((en) => (
            <div
              key={en.key}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(en.key);
              }}
              className={`px-3 py-1.5 text-xs font-mono cursor-pointer border-b border-zinc-50 ${
                en.selected ? 'bg-zinc-100 text-black font-bold' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {en.prefix ? <span className="text-zinc-400 mr-1">{en.prefix}</span> : null}
              {en.label}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceListSGAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // ── Flow
  const [step, setStep] = useState<'select' | 'edit'>('select');
  const [records, setRecords] = useState<PriceListRecord[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  // ── Masters
  const [stockGroups, setStockGroups] = useState<StockGroup[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [priceLevels, setPriceLevels] = useState<string[]>([]);

  // ── Header fields
  const [selectedGroup, setSelectedGroup] = useState<string>('All Items');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [applicableFrom, setApplicableFrom] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // ── Table lines
  const [lines, setLines] = useState<PriceListLine[]>([emptyLine()]);

  // ── UI state
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Right-panel selection state
  const [showGroupList, setShowGroupList] = useState(false);
  const [showLevelList, setShowLevelList] = useState(false);
  const [activeItemDropdown, setActiveItemDropdown] = useState<number | null>(null);

  const particularRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyFromRefs = useRef<(HTMLInputElement | null)[]>([]);
  const qtyUpToRefs = useRef<(HTMLInputElement | null)[]>([]);
  const rateRefs = useRef<(HTMLInputElement | null)[]>([]);
  const discRefs = useRef<(HTMLInputElement | null)[]>([]);

  const DEFAULT_LEVELS = ['Retailer', 'Wholesaler'];
  const mergedLevels = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const l of [...priceLevels, ...DEFAULT_LEVELS]) {
      const key = l.trim().toLowerCase();
      if (l.trim() && !seen.has(key)) {
        seen.add(key);
        out.push(l.trim());
      }
    }
    return out;
  }, [priceLevels]);

  // ── Load masters + saved price lists
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      try {
        if (window.api?.stockGroup) {
          const sg = await window.api.stockGroup.getAll(companyId);
          if (sg?.success) setStockGroups(sg.stockGroups ?? []);
        }
        if (window.api?.stockItem) {
          const si = await window.api.stockItem.getAll(companyId);
          if (si?.success) setStockItems(si.stockItems ?? []);
        }
        if (window.api?.priceLevels) {
          const pl = await window.api.priceLevels.get(companyId);
          if (pl?.success && pl?.data)
            setPriceLevels((pl.data as string[]).filter((n) => n.trim() !== ''));
        }
        if (window.api?.priceList) {
          const pls = await window.api.priceList.getAll(companyId);
          if (pls?.success) setRecords(((pls as any).data ?? []) as PriceListRecord[]);
        }
      } catch (err) {
        console.error('Failed to load:', err);
        setError('Failed to load price lists.');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [companyId]);

  // ── Open a record for editing
  const openRecord = (rec: PriceListRecord) => {
    setEditingId(rec.price_list_id);
    setSelectedGroup(rec.stock_group ?? 'All Items');
    setSelectedLevel(rec.price_level ?? '');
    setApplicableFrom(
      rec.applicable_from
        ? rec.applicable_from.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    );
    const fetched: PriceListLine[] = (rec.lines ?? []).map((l: any) => ({
      line_id: l.line_id,
      particulars: l.particulars ?? '',
      item_id: l.item_id ?? null,
      qty_from: String(l.qty_from ?? ''),
      qty_less_than: String(l.qty_less_than ?? ''),
      rate: String(l.rate ?? ''),
      disc_percent: String(l.disc_percent ?? ''),
    }));
    setLines([...fetched, emptyLine()]);
    setError(null);
    setSuccess(null);
    setStep('edit');
  };

  const backToSelect = () => {
    setStep('select');
    setEditingId(null);
    setLines([emptyLine()]);
    setShowGroupList(false);
    setShowLevelList(false);
    setActiveItemDropdown(null);
  };

  // ── Line helpers
  const setLineField = (
    index: number,
    field: keyof PriceListLine,
    value: string | number | null,
  ) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (index === next.length - 1 && field === 'particulars' && String(value).trim() !== '') {
        next.push(emptyLine());
      }
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) return [emptyLine()];
      return next;
    });
    setTimeout(() => particularRefs.current[Math.max(0, index - 1)]?.focus(), 0);
  };

  const pickItem = (index: number, item: StockItem) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], particulars: item.name, item_id: item.item_id };
      if (index === next.length - 1) next.push(emptyLine());
      return next;
    });
    setActiveItemDropdown(null);
    setTimeout(() => qtyFromRefs.current[index]?.focus(), 0);
  };

  // ── Submit (update)
  const handleSubmit = useCallback(async () => {
    if (!companyId) {
      setError('No company selected.');
      return;
    }
    if (!editingId) {
      setError('No price list selected.');
      return;
    }
    if (!selectedLevel) {
      setError('Select a price level.');
      return;
    }
    if (!applicableFrom) {
      setError('Enter applicable from date.');
      return;
    }

    const filledLines = lines.filter((l) => l.particulars.trim() !== '');
    if (filledLines.length === 0) {
      setError('Add at least one item.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (window.api?.priceList) {
        const result = await window.api.priceList.update({
          id: editingId,
          company_id: companyId,
          stock_group: selectedGroup,
          price_level: selectedLevel,
          applicable_from: applicableFrom,
          lines: filledLines.map((l) => ({
            line_id: l.line_id,
            item_id: l.item_id,
            particulars: l.particulars.trim(),
            qty_from: parseFloat(l.qty_from) || 0,
            qty_less_than: parseFloat(l.qty_less_than) || 0,
            rate: parseFloat(l.rate) || 0,
            disc_percent: parseFloat(l.disc_percent) || 0,
          })),
        });
        if (!result.success) throw new Error(result.error || 'Update failed.');
      }
      setSuccess('Price list updated successfully.');
      if (window.api?.priceList) {
        const pls = await window.api.priceList.getAll(companyId);
        if (pls?.success) setRecords(((pls as any).data ?? []) as PriceListRecord[]);
      }
      setTimeout(() => {
        setSuccess(null);
        backToSelect();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update price list.');
    } finally {
      setLoading(false);
    }
  }, [companyId, editingId, selectedGroup, selectedLevel, applicableFrom, lines]);

  const handleDelete = useCallback(async () => {
    if (!editingId) return;
    if (!window.confirm('Delete this price list? This cannot be undone.')) return;
    setLoading(true);
    setError(null);
    try {
      if (window.api?.priceList) {
        const r = await window.api.priceList.delete(editingId);
        if (!r.success) throw new Error(r.error || 'Delete failed.');
        const pls = await window.api.priceList.getAll(companyId!);
        if (pls?.success) setRecords(((pls as any).data ?? []) as PriceListRecord[]);
      }
      backToSelect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete price list.');
    } finally {
      setLoading(false);
    }
  }, [editingId, companyId]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGroupList || showLevelList || activeItemDropdown !== null) {
          setShowGroupList(false);
          setShowLevelList(false);
          setActiveItemDropdown(null);
          return;
        }
        e.preventDefault();
        if (step === 'edit') {
          backToSelect();
          return;
        }
        navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (step === 'edit') handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (step === 'edit') handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    handleSubmit,
    handleDelete,
    navigate,
    showGroupList,
    showLevelList,
    activeItemDropdown,
    step,
  ]);

  // ── Row keyboard nav
  const handleParticularKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (lines[i].particulars.trim() !== '') {
        setActiveItemDropdown(null);
        qtyFromRefs.current[i]?.focus();
      }
    }
    if (e.key === 'Backspace' && lines[i].particulars === '' && lines.length > 1) {
      e.preventDefault();
      removeLine(i);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    nextRef: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      nextRef.current[rowIndex]?.focus();
    }
  };

  const handleDiscKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      particularRefs.current[rowIndex + 1]?.focus();
    }
  };

  const formatDateDisplay = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d
      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
      .replace(/ /g, '-');
  };

  const filledCount = lines.filter((l) => l.particulars.trim() !== '').length;

  // Notification banner — strict grayscale (no red/green)
  const Banner = ({ text, onDismiss }: { text: string; onDismiss: () => void }) => (
    <div className="px-4 py-2 border-b border-zinc-200 border-l-2 border-l-black bg-zinc-100 text-zinc-900 text-xs flex justify-between items-center shrink-0 font-sans">
      <span className="font-semibold">{text}</span>
      <button onClick={onDismiss} className="text-zinc-500 hover:text-black font-bold">
        &times;
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // STEP 1 — Select a saved price list to alter
  // ════════════════════════════════════════════════════════════
  if (step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
        <PageTitleBar title="Price List — Alter" subtitle={selectedCompany?.name} />

        {error && <Banner text={error} onDismiss={() => setError(null)} />}

        <div className="flex-1 overflow-y-auto min-h-0">
          {fetching ? (
            <div className="p-6 text-sm text-zinc-400 font-mono">Loading price lists…</div>
          ) : records.length === 0 ? (
            <div className="p-6 text-sm text-zinc-400 font-sans">
              No saved price lists found.{' '}
              <button
                onClick={() => navigate('/master/create/price-lists-sg')}
                className="text-zinc-900 underline font-bold"
              >
                Create one
              </button>
            </div>
          ) : (
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-100 border-b border-zinc-300 text-left">
                  <th className="px-4 py-2 font-bold text-zinc-600 w-12">#</th>
                  <th className="px-4 py-2 font-bold text-zinc-600">Price Level</th>
                  <th className="px-4 py-2 font-bold text-zinc-600">Under Group</th>
                  <th className="px-4 py-2 font-bold text-zinc-600">Applicable From</th>
                  <th className="px-4 py-2 font-bold text-zinc-600 text-right">Items</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, i) => (
                  <tr
                    key={rec.price_list_id}
                    className="border-b border-zinc-100 cursor-pointer hover:bg-zinc-100"
                    onClick={() => openRecord(rec)}
                  >
                    <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-4 py-2 font-bold text-zinc-900">{rec.price_level || '—'}</td>
                    <td className="px-4 py-2 text-zinc-700">◆ {rec.stock_group || 'All Items'}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {formatDateDisplay(rec.applicable_from)}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500">
                      {(rec.lines ?? []).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-zinc-200 p-3 flex justify-end bg-white shrink-0 font-sans">
          <button
            onClick={() => navigate('/master/alter')}
            className="text-xs px-4 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
          >
            Quit
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2 — Edit the selected price list
  // ════════════════════════════════════════════════════════════
  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: backToSelect },
  ];

  const activeRow = activeItemDropdown;
  const itemEntries: PanelEntry[] =
    activeRow == null
      ? []
      : (lines[activeRow]?.particulars.trim()
          ? stockItems.filter((it) =>
              it.name.toLowerCase().includes(lines[activeRow].particulars.toLowerCase()),
            )
          : stockItems
        ).map((it) => ({
          key: String(it.item_id),
          label: it.name,
          selected: lines[activeRow]?.item_id === it.item_id,
        }));

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950" data-enter-nav>
      <PageTitleBar title="Price List — Alter" subtitle={selectedCompany?.name} />

      {error && <Banner text={error} onDismiss={() => setError(null)} />}
      {success && <Banner text={success} onDismiss={() => setSuccess(null)} />}

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Inline header ── */}
          <div className="border-b border-zinc-200 px-6 py-3 shrink-0 font-mono text-[11px] space-y-2">
            {/* Under Group */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 w-28">Under Group</span>
              <span className="text-zinc-300">:</span>
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-0.5 border border-transparent hover:border-zinc-400 rounded font-bold text-zinc-900"
                onClick={() => {
                  setShowGroupList((p) => !p);
                  setShowLevelList(false);
                }}
              >
                <span className="text-zinc-400">◆</span>
                {selectedGroup}
              </button>
            </div>

            {/* Price Level + Applicable From */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 w-28">Price Level</span>
                <span className="text-zinc-300">:</span>
                <button
                  type="button"
                  className="px-2 py-0.5 border border-transparent hover:border-zinc-400 rounded font-bold text-zinc-900"
                  onClick={() => {
                    setShowLevelList((p) => !p);
                    setShowGroupList(false);
                  }}
                >
                  {selectedLevel || 'Select…'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-500">Applicable From</span>
                <span className="text-zinc-300">:</span>
                <input
                  type="date"
                  value={applicableFrom}
                  onChange={(e) => setApplicableFrom(e.target.value)}
                  className="border border-zinc-300 rounded px-2 py-0.5 text-[11px] font-mono font-bold text-zinc-900 bg-white focus:outline-none focus:border-zinc-500"
                />
                {applicableFrom && (
                  <span className="text-zinc-400">{formatDateDisplay(applicableFrom)}</span>
                )}
                <span className="ml-6 text-zinc-400">
                  {filledCount} {filledCount === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-zinc-100 border-b border-zinc-300">
                  <th className="text-left px-3 py-2 font-bold text-zinc-600 w-12">S.No.</th>
                  <th className="text-left px-3 py-2 font-bold text-zinc-600 w-64">Particulars</th>
                  <th className="text-center px-2 py-2 font-bold text-zinc-600 w-48" colSpan={2}>
                    Quantities
                    <div className="flex justify-between mt-0.5 text-[10px] font-normal text-zinc-400">
                      <span className="w-1/2 text-center">From</span>
                      <span className="w-1/2 text-center">Less than</span>
                    </div>
                  </th>
                  <th className="text-right px-3 py-2 font-bold text-zinc-600 w-28">Rate</th>
                  <th className="text-center px-3 py-2 font-bold text-zinc-600 w-28">
                    Disc. % <div className="text-[10px] font-normal text-zinc-400">(if any)</div>
                  </th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const isLastEmpty = i === lines.length - 1 && line.particulars.trim() === '';

                  return (
                    <tr
                      key={i}
                      className={`border-b border-zinc-100 group ${isLastEmpty ? 'bg-zinc-50' : 'hover:bg-zinc-50'} ${activeItemDropdown === i ? 'bg-zinc-100' : ''}`}
                    >
                      <td className="px-3 py-1 text-zinc-400 text-center align-middle">
                        {isLastEmpty ? '' : i + 1}
                      </td>

                      <td className="px-2 py-1 align-middle">
                        <input
                          ref={(el) => {
                            particularRefs.current[i] = el;
                          }}
                          className={cellCls + ' font-bold'}
                          value={line.particulars}
                          placeholder={isLastEmpty ? 'Select item…' : ''}
                          onChange={(e) => {
                            setLineField(i, 'particulars', e.target.value);
                            setLineField(i, 'item_id', null);
                            setActiveItemDropdown(i);
                          }}
                          onFocus={() => setActiveItemDropdown(i)}
                          onKeyDown={(e) => handleParticularKeyDown(e, i)}
                        />
                      </td>

                      <td className="px-2 py-1 align-middle w-24">
                        <input
                          ref={(el) => {
                            qtyFromRefs.current[i] = el;
                          }}
                          className={cellCls + ' text-right'}
                          value={line.qty_from}
                          placeholder="0"
                          onChange={(e) => setLineField(i, 'qty_from', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, qtyUpToRefs)}
                        />
                      </td>
                      <td className="px-2 py-1 align-middle w-24">
                        <input
                          ref={(el) => {
                            qtyUpToRefs.current[i] = el;
                          }}
                          className={cellCls + ' text-right'}
                          value={line.qty_less_than}
                          placeholder="0"
                          onChange={(e) => setLineField(i, 'qty_less_than', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, rateRefs)}
                        />
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <input
                          ref={(el) => {
                            rateRefs.current[i] = el;
                          }}
                          className={cellCls + ' text-right'}
                          value={line.rate}
                          placeholder="0.00"
                          onChange={(e) => setLineField(i, 'rate', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, i, discRefs)}
                        />
                      </td>
                      <td className="px-2 py-1 align-middle">
                        <input
                          ref={(el) => {
                            discRefs.current[i] = el;
                          }}
                          className={cellCls + ' text-right'}
                          value={line.disc_percent}
                          placeholder="0"
                          onChange={(e) => setLineField(i, 'disc_percent', e.target.value)}
                          onKeyDown={(e) => handleDiscKeyDown(e, i)}
                        />
                      </td>
                      <td className="px-1 align-middle">
                        {!isLastEmpty && (
                          <button
                            onClick={() => removeLine(i)}
                            className="text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                            tabIndex={-1}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <RightActionPanel actions={actions} />

        {showGroupList && (
          <RightSelectPanel
            title="List of Stock Groups"
            entries={[{ sg_id: 0, name: 'All Items' }, ...stockGroups].map((sg) => ({
              key: sg.name,
              label: sg.name,
              selected: selectedGroup === sg.name,
              prefix: sg.name === 'All Items' ? '◆' : undefined,
            }))}
            onPick={(key) => {
              setSelectedGroup(key);
              setShowGroupList(false);
            }}
            onClose={() => setShowGroupList(false)}
          />
        )}

        {showLevelList && (
          <RightSelectPanel
            title="List of Price Levels"
            entries={mergedLevels.map((pl) => ({
              key: pl,
              label: pl,
              selected: selectedLevel === pl,
            }))}
            onPick={(key) => {
              setSelectedLevel(key);
              setShowLevelList(false);
            }}
            onClose={() => setShowLevelList(false)}
          />
        )}

        {activeItemDropdown !== null && (
          <RightSelectPanel
            title="List of Items"
            createLabel="Create"
            onCreate={() => navigate('/master/create/stock-item')}
            entries={itemEntries}
            onPick={(key) => {
              const it = stockItems.find((s) => String(s.item_id) === key);
              if (it && activeItemDropdown !== null) pickItem(activeItemDropdown, it);
            }}
            onClose={() => setActiveItemDropdown(null)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-white shrink-0 font-sans">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors font-medium"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={backToSelect}
            className="text-xs px-4 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Updating…' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
