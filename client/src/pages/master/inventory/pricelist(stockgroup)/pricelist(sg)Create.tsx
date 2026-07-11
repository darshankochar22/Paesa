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
  opening_rate?: number;
}

// Most recent prior price (per item, per price level) shown read-only as
// "Historical Details" alongside the rate being entered — matches TallyPrime.
interface HistRate {
  rate: number;
  disc: number;
}

interface PriceListLine {
  particulars: string;
  item_id: number | null;
  qty_from: string;
  qty_less_than: string;
  rate: string;
  disc_percent: string;
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

export default function PriceListSGCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // ── Page state (1 = header form, 2 = item table)
  const [page, setPage] = useState<1 | 2>(1);

  // ── Header fields
  const [stockGroups, setStockGroups] = useState<StockGroup[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [priceLevels, setPriceLevels] = useState<string[]>([]);
  // Historical prices keyed by `${level}|${item_id}` (most recent prior list).
  const [histByItem, setHistByItem] = useState<Record<string, HistRate>>({});

  const [selectedGroup, setSelectedGroup] = useState<string>('All Items');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [applicableFrom, setApplicableFrom] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // ── Table lines
  const [lines, setLines] = useState<PriceListLine[]>([emptyLine()]);

  // ── UI state
  const [loading, setLoading] = useState(false);
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

  // ── Load masters
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
          if (pl?.success && pl?.data) {
            const named = (pl.data as string[]).filter((n) => n.trim() !== '');
            setPriceLevels(named);
            if (named.length > 0) setSelectedLevel(named[0]);
          }
        }
        // Build the historical-price lookup from existing price lists. getAll is
        // ordered newest-first, so the first hit per (level,item) is the latest.
        if (window.api?.priceList) {
          const plAll = await window.api.priceList.getAll(companyId);
          if (plAll?.success && Array.isArray(plAll.data)) {
            const hist: Record<string, HistRate> = {};
            for (const rec of plAll.data as any[]) {
              for (const ln of rec.lines || []) {
                if (ln.item_id == null) continue;
                const key = `${rec.price_level}|${ln.item_id}`;
                if (!hist[key])
                  hist[key] = { rate: Number(ln.rate) || 0, disc: Number(ln.disc_percent) || 0 };
              }
            }
            setHistByItem(hist);
          }
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      }
    };
    load();
  }, [companyId]);

  // ── Page 1 validation → go to page 2
  const handlePage1Accept = () => {
    if (!selectedLevel) {
      setError('Select a price level.');
      return;
    }
    if (!applicableFrom) {
      setError('Enter applicable from date.');
      return;
    }
    setError(null);
    setPage(2);
    setTimeout(() => particularRefs.current[0]?.focus(), 50);
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

  // ── Submit
  const handleSubmit = useCallback(async () => {
    if (!companyId) {
      setError('No company selected.');
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
        const result = await window.api.priceList.create({
          company_id: companyId,
          stock_group: selectedGroup,
          stock_category: null,
          price_level: selectedLevel,
          applicable_from: applicableFrom,
          lines: filledLines.map((l) => ({
            item_id: l.item_id,
            particulars: l.particulars.trim(),
            qty_from: parseFloat(l.qty_from) || 0,
            qty_less_than: parseFloat(l.qty_less_than) || 0,
            rate: parseFloat(l.rate) || 0,
            disc_percent: parseFloat(l.disc_percent) || 0,
          })),
        });
        if (!result.success) throw new Error(result.error || 'Save failed.');
      }
      setSuccess('Price list saved successfully.');
      setTimeout(() => {
        setSuccess(null);
        navigate('/master/create');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save price list.');
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedGroup, selectedLevel, applicableFrom, lines, navigate]);

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
        if (page === 2) {
          setPage(1);
        } else {
          navigate('/master/create');
        }
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (page === 1) handlePage1Accept();
        else handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page, handleSubmit, navigate, showGroupList, showLevelList, activeItemDropdown]);

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
      const next = particularRefs.current[rowIndex + 1];
      if (next) next.focus();
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

  // Cost price (item opening rate) keyed by item_id, for the read-only column.
  const costByItem = useMemo(() => {
    const m: Record<number, number> = {};
    stockItems.forEach((s) => {
      if (s.opening_rate != null) m[s.item_id] = Number(s.opening_rate) || 0;
    });
    return m;
  }, [stockItems]);

  const fmtRate = (n?: number) =>
    n == null || n === 0
      ? ''
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Notification banner — strict grayscale (no red/green)
  const Banner = ({ text, onDismiss }: { text: string; onDismiss: () => void }) => (
    <div className="px-4 py-2 border-b border-zinc-200 border-l-2 border-l-black bg-zinc-100 text-zinc-900 text-xs flex justify-between items-center shrink-0 font-sans">
      <span className="font-semibold">{text}</span>
      <button onClick={onDismiss} className="text-zinc-500 hover:text-black font-bold">
        &times;
      </button>
    </div>
  );

  const page1Actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handlePage1Accept },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  const page2Actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Esc', label: 'Back', onClick: () => setPage(1) },
  ];

  // ════════════════════════════════════════════════════════════
  // PAGE 1 — Header form
  // ════════════════════════════════════════════════════════════
  if (page === 1) {
    return (
      <div
        className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950"
        data-enter-nav
      >
        <PageTitleBar title="Price List (Stock Group)" subtitle={selectedCompany?.name} />

        {error && <Banner text={error} onDismiss={() => setError(null)} />}

        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex items-start justify-start px-6 py-6">
              <div className="w-full max-w-lg bg-white border border-zinc-200 rounded overflow-hidden">
                {/* Panel header */}
                <div className="text-center font-bold text-xs py-3 border-b border-zinc-200 tracking-wide text-zinc-900 uppercase font-mono">
                  Price List Details
                </div>

                <div className="p-5 space-y-4 font-mono">
                  {/* Stock Group */}
                  <div className="grid grid-cols-[180px_1fr] gap-x-4 items-center text-xs">
                    <span className="text-zinc-500">Stock Group Name</span>
                    <button
                      type="button"
                      className="flex items-center gap-1 border border-zinc-300 rounded px-2 py-1 bg-white cursor-pointer hover:border-zinc-500 text-[11px] font-mono font-bold text-left"
                      onClick={() => {
                        setShowGroupList((p) => !p);
                        setShowLevelList(false);
                      }}
                    >
                      <span className="text-zinc-400 mr-1">◆</span>
                      <span className="text-zinc-900">{selectedGroup}</span>
                    </button>
                  </div>

                  {/* Price Level */}
                  <div className="grid grid-cols-[180px_1fr] gap-x-4 items-center text-xs">
                    <span className="text-zinc-500">Price Level</span>
                    <button
                      type="button"
                      className="flex items-center border border-zinc-300 rounded px-2 py-1 bg-white cursor-pointer hover:border-zinc-500 text-[11px] font-mono font-bold text-left"
                      onClick={() => {
                        setShowLevelList((p) => !p);
                        setShowGroupList(false);
                      }}
                    >
                      <span className="text-zinc-900">{selectedLevel || 'Select…'}</span>
                    </button>
                  </div>

                  {/* Applicable From */}
                  <div className="grid grid-cols-[180px_1fr] gap-x-4 items-center text-xs">
                    <span className="text-zinc-500">Applicable From</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={applicableFrom}
                        onChange={(e) => setApplicableFrom(e.target.value)}
                        className="border border-zinc-300 rounded px-2 py-1 text-[11px] font-mono font-bold text-zinc-900 bg-white focus:outline-none focus:border-zinc-500 w-36"
                      />
                      {applicableFrom && (
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {formatDateDisplay(applicableFrom)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hint */}
                <div className="px-5 pb-4 text-[10px] text-zinc-400 font-sans">
                  Press <kbd className="bg-zinc-100 border border-zinc-200 rounded px-1">Alt+A</kbd>{' '}
                  or click Accept to proceed to item entry
                </div>
              </div>
            </div>
          </div>

          <RightActionPanel actions={page1Actions} />

          {showGroupList && (
            <RightSelectPanel
              title="List of Stock Groups"
              createLabel="Create"
              onCreate={() => navigate('/master/create/stock-group')}
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
              createLabel="Create"
              onCreate={() => navigate('/master/create/price-levels')}
              entries={priceLevels.map((pl) => ({
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
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 flex justify-end bg-white shrink-0 font-sans">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/master/create')}
              className="text-xs px-4 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
            >
              Quit
            </button>
            <button
              onClick={handlePage1Accept}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PAGE 2 — Item entry table
  // ════════════════════════════════════════════════════════════
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
      <PageTitleBar title="Price List (Stock Group)" subtitle={selectedCompany?.name} />

      {error && <Banner text={error} onDismiss={() => setError(null)} />}
      {success && <Banner text={success} onDismiss={() => setSuccess(null)} />}

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── Sub-header showing selected values from page 1 ── */}
          <div className="border-b border-zinc-200 px-6 py-1.5 flex items-center gap-8 text-[11px] font-mono shrink-0">
            <span>
              <span className="text-zinc-400">Under Group</span>
              <span className="mx-2 text-zinc-300">:</span>
              <span className="text-zinc-400">◆</span>
              <span className="font-bold text-zinc-800 ml-1">{selectedGroup}</span>
            </span>
            <span>
              <span className="text-zinc-400">Price Level</span>
              <span className="mx-2 text-zinc-300">:</span>
              <span className="font-bold text-zinc-800">{selectedLevel}</span>
            </span>
            <span>
              <span className="text-zinc-400">Applicable From</span>
              <span className="mx-2 text-zinc-300">:</span>
              <span className="font-bold text-zinc-800">{formatDateDisplay(applicableFrom)}</span>
            </span>
            <span className="ml-auto text-zinc-400">
              {filledCount} {filledCount === 1 ? 'item' : 'items'}
            </span>
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
                    Disc. %<div className="text-[10px] font-normal text-zinc-400">(if any)</div>
                  </th>
                  <th
                    className="text-center px-2 py-2 font-bold text-zinc-500 w-40 border-l border-zinc-200"
                    colSpan={2}
                  >
                    Historical Details
                    <div className="flex justify-between mt-0.5 text-[10px] font-normal text-zinc-400">
                      <span className="w-1/2 text-center">Rate</span>
                      <span className="w-1/2 text-center">Disc. %</span>
                    </div>
                  </th>
                  <th className="text-right px-3 py-2 font-bold text-zinc-500 w-28 border-l border-zinc-200">
                    Cost Price
                  </th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const isLastEmpty = i === lines.length - 1 && line.particulars.trim() === '';
                  const hist =
                    line.item_id != null
                      ? histByItem[`${selectedLevel}|${line.item_id}`]
                      : undefined;
                  const cost = line.item_id != null ? costByItem[line.item_id] : undefined;

                  return (
                    <tr
                      key={i}
                      className={`border-b border-zinc-100 group ${
                        isLastEmpty ? 'bg-zinc-50' : 'hover:bg-zinc-50'
                      } ${activeItemDropdown === i ? 'bg-zinc-100' : ''}`}
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

                      {/* Historical Details (read-only) — last saved price for this item + level */}
                      <td className="px-2 py-1 align-middle text-right text-[11px] font-mono text-zinc-400 border-l border-zinc-100">
                        {fmtRate(hist?.rate)}
                      </td>
                      <td className="px-2 py-1 align-middle text-center text-[11px] font-mono text-zinc-400">
                        {hist?.disc ? `${fmtRate(hist.disc)}%` : ''}
                      </td>

                      {/* Cost Price (read-only) — item opening rate */}
                      <td className="px-3 py-1 align-middle text-right text-[11px] font-mono text-zinc-400 border-l border-zinc-100">
                        {fmtRate(cost)}
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

        <RightActionPanel actions={page2Actions} />

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
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-white shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => setPage(1)}
            className="text-xs px-4 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 transition-colors font-medium"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving…' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
