import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';

const fmtAmount = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtQty = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface StockItemRow {
  item_id: number;
  name: string;
  alias?: string;
}

interface BatchRow {
  name: string;
  mfg_date: string | null;
  expiry_date: string | null;
}

interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number | null;
  inwards_value: number | null;
  outwards_qty: number | null;
  outwards_value: number | null;
  closing_qty: number;
  closing_value: number;
}

type Level =
  | { step: 'item' }
  | { step: 'batch'; item: StockItemRow }
  | {
      step: 'vouchers';
      item: StockItemRow;
      batch: string;
      mfgDate: string | null;
      expiryDate: string | null;
    };

export default function BatchVouchers() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'item' });

  // ── Level 1: Stock Item picker ──────────────────────────────────────────
  const [items, setItems] = React.useState<StockItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(true);
  const [itemSearch, setItemSearch] = React.useState('');
  const [itemIndex, setItemIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setLoadingItems(false);
      return;
    }
    setLoadingItems(true);
    // Only items that maintain batches / have batch data (matches TallyPrime).
    (window as any).api.report.batchItems(companyId).then((res: any) => {
      if (res.success) setItems(res.items ?? []);
      setLoadingItems(false);
    });
  }, [companyId]);

  const filteredItems = React.useMemo(() => {
    const list = [...items].sort((a, b) => a.name.localeCompare(b.name));
    if (!itemSearch.trim()) return list;
    const q = itemSearch.toLowerCase();
    return list.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, itemSearch]);

  React.useEffect(() => {
    setItemIndex(0);
  }, [itemSearch]);

  // ── Level 2: Batch picker (for selected item) ───────────────────────────
  const [batches, setBatches] = React.useState<BatchRow[]>([]);
  const [loadingBatches, setLoadingBatches] = React.useState(false);
  const [batchError, setBatchError] = React.useState<string | null>(null);
  const [batchIndex, setBatchIndex] = React.useState(0);

  const loadBatches = React.useCallback(
    (item: StockItemRow) => {
      if (!companyId) return;
      setLevel({ step: 'batch', item });
      setLoadingBatches(true);
      setBatchError(null);
      setBatchIndex(0);
      (window as any).api.report.batchesForItem(companyId, item.item_id).then((res: any) => {
        if (res.success) {
          setBatches(res.batches ?? []);
        } else {
          setBatchError(res.error || 'Failed to load batches');
        }
        setLoadingBatches(false);
      });
    },
    [companyId],
  );

  // ── Level 3: Voucher register (for selected item + batch) ───────────────
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const loadVouchers = React.useCallback(
    (item: StockItemRow, batch: BatchRow) => {
      if (!companyId || !fyId) return;
      setLevel({
        step: 'vouchers',
        item,
        batch: batch.name,
        mfgDate: batch.mfg_date,
        expiryDate: batch.expiry_date,
      });
      setLoadingVouchers(true);
      setVoucherError(null);
      setVoucherIndex(0);
      (window as any).api.report
        .batchVouchers(
          companyId,
          fyId,
          item.item_id,
          batch.name,
          activeFY?.start_date,
          activeFY?.end_date,
        )
        .then((res: any) => {
          if (res.success) {
            setVoucherRows(res.rows ?? []);
          } else {
            setVoucherError(res.error || 'Failed to load batch vouchers');
          }
          setLoadingVouchers(false);
        });
    },
    [companyId, fyId, activeFY],
  );

  const backToItems = React.useCallback(() => {
    setLevel({ step: 'item' });
    setBatches([]);
  }, []);

  const backToBatches = React.useCallback((item: StockItemRow) => {
    setLevel({ step: 'batch', item });
    setVoucherRows([]);
  }, []);

  // ── Keyboard nav: item level ─────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'item') return;
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setItemIndex((p) => Math.min(filteredItems.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setItemIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[itemIndex];
        if (item) loadBatches(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level.step, filteredItems, itemIndex, navigate, loadBatches]);

  // ── Keyboard nav: batch level ────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'batch') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBatchIndex((p) => Math.min(batches.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBatchIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const batch = batches[batchIndex];
        if (batch) loadVouchers(level.item, batch);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToItems();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, batches, batchIndex, loadVouchers, backToItems]);

  // ── Keyboard nav: voucher level ──────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'vouchers') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVoucherIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const row = voucherRows[voucherIndex];
        if (row?.voucher_id) navigate(`/transactions/voucher/${row.voucher_id}`);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToBatches(level.item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, voucherRows, voucherIndex, navigate, backToBatches]);

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 1 — Name of Item / Name of Batch picker (matches screenshot 1-2)
  // ─────────────────────────────────────────────────────────────────────────
  if (level.step === 'item') {
    return (
      <SelectionPopup
        title="Batch Items"
        fieldLabel="Name of Item"
        listLabel="List of Items"
        companyName={selectedCompany?.name}
        items={filteredItems.map((it) => ({ id: it.item_id, name: it.name }))}
        index={itemIndex}
        loading={loadingItems}
        emptyText="No stock items found."
        search={itemSearch}
        onSearchChange={setItemSearch}
        onIndexChange={setItemIndex}
        onAccept={(i) => {
          const it = filteredItems[i];
          if (it) loadBatches(it);
        }}
        onCancel={() => navigate(-1)}
        onCreate={() => navigate('/master/create/stock-item')}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 2 — Name of Batch picker, item already chosen (matches screenshot 3)
  // ─────────────────────────────────────────────────────────────────────────
  if (level.step === 'batch') {
    return (
      <SelectionPopup
        title="Batch Items"
        fieldLabel="Name of Batch"
        listLabel="List of Batches"
        companyName={selectedCompany?.name}
        subtitle={
          <>
            Name of Item: <span className="font-bold">{level.item.name}</span>
          </>
        }
        width={460}
        nameColLabel="Name"
        columns={[
          { label: 'Mfg Date', width: 'w-24', align: 'left' },
          { label: 'Expiry Date', width: 'w-24', align: 'left' },
        ]}
        items={batches.map((b) => ({
          id: b.name,
          name: b.name,
          cols: [formatDate(b.mfg_date ?? undefined), formatDate(b.expiry_date ?? undefined)],
        }))}
        index={batchIndex}
        loading={loadingBatches}
        emptyText={batchError ?? 'No batches found for this item.'}
        onIndexChange={setBatchIndex}
        onAccept={(i) => {
          const b = batches[i];
          if (b) loadVouchers(level.item, b);
        }}
        onCancel={() => backToItems()}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEVEL 3 — Batch Vouchers register (matches screenshot 4)
  // ─────────────────────────────────────────────────────────────────────────
  const totalInQty = voucherRows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalInValue = voucherRows.reduce((s, r) => s + (Number(r.inwards_value) || 0), 0);
  const totalOutQty = voucherRows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);
  const totalOutValue = voucherRows.reduce((s, r) => s + (Number(r.outwards_value) || 0), 0);
  const finalClosingQty = voucherRows.length ? voucherRows[voucherRows.length - 1].closing_qty : 0;
  const finalClosingValue = voucherRows.length
    ? voucherRows[voucherRows.length - 1].closing_value
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      {/* Tally Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Batch Vouchers</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>

      {/* Item / Batch / Period subtitle bar */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <div className="flex flex-col gap-0.5">
          <span>
            Stock Item: <span className="font-bold">{level.item.name}</span>
          </span>
          <span className="flex gap-8">
            <span>
              Batch Name: <span className="font-bold">{level.batch}</span>
            </span>
            {level.mfgDate && (
              <span>
                Mfg Date: <span className="font-bold">{formatDate(level.mfgDate)}</span>
              </span>
            )}
            {level.expiryDate && (
              <span>
                Expiry Date: <span className="font-bold">{formatDate(level.expiryDate)}</span>
              </span>
            )}
          </span>
        </div>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-20 border-b border-gray-200 align-bottom"
              >
                Date
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold border-b border-gray-200 align-bottom"
              >
                Particulars
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-28 border-b border-gray-200 align-bottom"
              >
                Vch Type
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-right font-bold w-20 border-b border-gray-200 align-bottom"
              >
                Vch No.
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Inwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Outwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Closing
              </th>
            </tr>
            <tr>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  Loading vouchers...
                </td>
              </tr>
            ) : voucherError ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black">
                  {voucherError}
                </td>
              </tr>
            ) : voucherRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              voucherRows.map((row, idx) => {
                const isFocused = idx === voucherIndex;
                return (
                  <tr
                    key={row.voucher_id}
                    onClick={() => setVoucherIndex(idx)}
                    onDoubleClick={() => navigate(`/transactions/voucher/${row.voucher_id}`)}
                    className={`border-b border-gray-200 cursor-pointer transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black'
                    }`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number ?? '—'}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.inwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.inwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.outwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.outwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.closing_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Totals as per 'Default' valuation */}
      <div className="border-t border-gray-200 px-3 py-1 text-center text-[10px] italic text-black">
        Totals as per 'Default' valuation :
      </div>
      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        <span className="w-20 text-right pr-2 border-l border-gray-200">{fmtQty(totalInQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalInValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-gray-200">{fmtQty(totalOutQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalOutValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-gray-200">
          {fmtQty(finalClosingQty)}
        </span>
        <span className="w-24 text-right pr-2">{fmtAmount(finalClosingValue)}</span>
      </div>

      {/* Footer keys — F4:Batch, F8:Batch-wise etc, matching TallyPrime screenshot */}
      <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button
          onClick={() => backToBatches(level.item)}
          className="hover:underline hover:text-black"
        >
          F4: Batch
        </button>
        <span>F8: Batch-wise</span>
      </div>
    </div>
  );
}
