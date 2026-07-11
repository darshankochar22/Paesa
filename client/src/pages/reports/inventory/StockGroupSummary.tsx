import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import StockBarChart, { type ChartBar } from './StockBarChart';

/** Compute ISO date range for the Nth month of a financial year. */
function fyMonthRange(fyStart: string, idx: number): { from: string; to: string } {
  const d = new Date(fyStart + 'T00:00:00');
  const year = d.getFullYear() + Math.floor((d.getMonth() + idx) / 12);
  const month = (d.getMonth() + idx) % 12;
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

const fmtAmount = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const num = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${num} ${unit}` : num;
};

const formatDate = (dateStr?: string | null) => {
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

interface GroupRow {
  sg_id: number;
  name: string;
}
interface ItemRow {
  item_id: number;
  item_name: string;
  unit_name?: string;
  closing_qty: number;
  rate: number;
  closing_value: number;
}
interface MonthRow {
  month: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}
interface VoucherRow {
  voucher_id: number | null;
  date: string | null;
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
  | { step: 'group' }
  | { step: 'summary'; group: GroupRow }
  | { step: 'monthly'; group: GroupRow; item: ItemRow }
  | { step: 'vouchers'; group: GroupRow; item: ItemRow };

export default function StockGroupSummary() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dmy = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
  };
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'group' });

  // ── Level 1: Stock Group picker ──────────────────────────────────────────
  const [groups, setGroups] = React.useState<GroupRow[]>([]);
  const [loadingGroups, setLoadingGroups] = React.useState(true);
  const [groupIndex, setGroupIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setLoadingGroups(false);
      return;
    }
    setLoadingGroups(true);
    (window as any).api.stockGroup
      .getAll(companyId)
      .then((res: any) => {
        if (res.success) {
          const list = [...(res.stockGroups ?? [])].sort((a, b) => a.name.localeCompare(b.name));
          setGroups(list);
        }
        setLoadingGroups(false);
      })
      .catch(() => setLoadingGroups(false));
  }, [companyId]);

  // ── Level 2: Group Summary (items) ───────────────────────────────────────
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loadingItems, setLoadingItems] = React.useState(false);
  const [itemsError, setItemsError] = React.useState<string | null>(null);
  const [itemIndex, setItemIndex] = React.useState(0);

  const loadItems = React.useCallback(
    (group: GroupRow) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'summary', group });
      setLoadingItems(true);
      setItemsError(null);
      setItemIndex(0);
      (window as any).api.report.stockGroupItems(companyId, fyId, group.sg_id).then((res: any) => {
        if (res.success) setItems(res.items ?? []);
        else setItemsError(res.error || 'Failed to load group summary');
        setLoadingItems(false);
      });
    },
    [companyId, fyId],
  );

  // ── Level 3: Item Monthly Summary ────────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [monthsOpening, setMonthsOpening] = React.useState<{ qty: number; value: number }>({
    qty: 0,
    value: 0,
  });
  const [loadingMonths, setLoadingMonths] = React.useState(false);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

  const loadMonths = React.useCallback(
    (group: GroupRow, item: ItemRow) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'monthly', group, item });
      setLoadingMonths(true);
      setMonthsError(null);
      setMonthIndex(0);
      (window as any).api.report
        .stockItemMonthly(companyId, fyId, item.item_id)
        .then((res: any) => {
          if (res.success) {
            setMonths(res.months ?? []);
            setMonthsOpening({ qty: res.opening_qty ?? 0, value: res.opening_value ?? 0 });
          } else setMonthsError(res.error || 'Failed to load monthly summary');
          setLoadingMonths(false);
        });
    },
    [companyId, fyId],
  );

  // ── Level 4: Item Vouchers ───────────────────────────────────────────────
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const loadVouchers = React.useCallback(
    (group: GroupRow, item: ItemRow, fromDate?: string, toDate?: string) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', group, item });
      setLoadingVouchers(true);
      setVoucherError(null);
      setVoucherIndex(0);
      (window as any).api.report
        .stockItemVouchers(
          companyId,
          fyId,
          item.item_id,
          fromDate ?? activeFY?.start_date,
          toDate ?? activeFY?.end_date,
        )
        .then((res: any) => {
          if (res.success) setVoucherRows(res.rows ?? []);
          else setVoucherError(res.error || 'Failed to load item vouchers');
          setLoadingVouchers(false);
        });
    },
    [companyId, fyId, activeFY],
  );

  const backToGroups = React.useCallback(() => {
    setLevel({ step: 'group' });
    setItems([]);
  }, []);
  const backToSummary = React.useCallback((group: GroupRow) => {
    setLevel({ step: 'summary', group });
    setMonths([]);
  }, []);
  const backToMonthly = React.useCallback((group: GroupRow, item: ItemRow) => {
    setLevel({ step: 'monthly', group, item });
    setVoucherRows([]);
  }, []);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'group') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setGroupIndex((p) => Math.min(groups.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setGroupIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const g = groups[groupIndex];
        if (g) loadItems(g);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level.step, groups, groupIndex, navigate, loadItems]);

  React.useEffect(() => {
    if (level.step !== 'summary') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setItemIndex((p) => Math.min(items.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setItemIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const it = items[itemIndex];
        if (it) loadMonths(level.group, it);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToGroups();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, items, itemIndex, loadMonths, backToGroups]);

  React.useEffect(() => {
    if (level.step !== 'monthly') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMonthIndex((p) => Math.min(months.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMonthIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeFY?.start_date) {
          const { from, to } = fyMonthRange(activeFY.start_date, monthIndex);
          loadVouchers(level.group, level.item, from, to);
        } else loadVouchers(level.group, level.item);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToSummary(level.group);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, months, monthIndex, loadVouchers, backToSummary]);

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
        const r = voucherRows[voucherIndex];
        if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToMonthly(level.group, level.item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, voucherRows, voucherIndex, navigate, backToMonthly]);

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 1 — Select Stock Group (matches screenshot 2)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === 'group') {
    return (
      <SelectionPopup
        title="Select Stock Group"
        fieldLabel="Name of Group"
        listLabel="List of Stock Groups"
        companyName={selectedCompany?.name}
        items={groups.map((g) => ({ id: g.sg_id, name: g.name }))}
        index={groupIndex}
        loading={loadingGroups}
        emptyText="No stock groups found."
        onIndexChange={setGroupIndex}
        onAccept={(i) => {
          const g = groups[i];
          if (g) loadItems(g);
        }}
        onCancel={() => navigate(-1)}
        onCreate={() => navigate('/master/create/stock-group')}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 2 — Stock Group Summary: items in group (matches screenshot 4)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === 'summary') {
    const grandQty = items.reduce((s, r) => s + (Number(r.closing_qty) || 0), 0);
    const grandValue = items.reduce((s, r) => s + (Number(r.closing_value) || 0), 0);
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Stock Group Summary</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
          <span>
            Stock Group: <span className="font-bold">{level.group.name}</span>
          </span>
          <span>Closing Balance &nbsp; {periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th className="px-3 py-1 text-left font-bold">Particulars</th>
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">
                  Quantity
                </th>
                <th className="px-3 py-1 text-right font-bold w-28 border-l border-zinc-200">
                  Rate
                </th>
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">
                    Loading...
                  </td>
                </tr>
              ) : itemsError ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-600">
                    {itemsError}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">
                    No records found.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const isFocused = idx === itemIndex;
                  return (
                    <tr
                      key={row.item_id}
                      onClick={() => setItemIndex(idx)}
                      onDoubleClick={() => loadMonths(level.group, row)}
                      className={`border-b border-zinc-100 cursor-pointer ${isFocused ? 'bg-[#e4e4e7] text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'}`}
                    >
                      <td className="px-3 py-1">{row.item_name}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">
                        {fmtQty(row.closing_qty, row.unit_name)}
                      </td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">
                        {fmtAmount(row.rate)}
                      </td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">
                        {fmtAmount(row.closing_value)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-32 text-right border-l border-zinc-300 pr-2">{fmtQty(grandQty)}</span>
          <span className="w-28 border-l border-zinc-300" />
          <span className="w-32 text-right border-l border-zinc-300 pr-2">
            {fmtAmount(grandValue)}
          </span>
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={backToGroups} className="hover:underline hover:text-zinc-900">
            F4: Stock Group
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 3 — Stock Item Monthly Summary (matches screenshot 5)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === 'monthly') {
    const totIn = months.reduce((s, r) => s + (Number(r.in_qty) || 0), 0);
    const totInVal = months.reduce((s, r) => s + (Number(r.in_value) || 0), 0);
    const totOut = months.reduce((s, r) => s + (Number(r.out_qty) || 0), 0);
    const totOutVal = months.reduce((s, r) => s + (Number(r.out_value) || 0), 0);
    const lastClosingQty = months.length ? months[months.length - 1].closing_qty : 0;
    const lastClosingVal = months.length ? months[months.length - 1].closing_value : 0;
    const monthChartBars: ChartBar[] = months.map((r) => ({
      label: r.month.length > 4 ? r.month.slice(0, 3) : r.month,
      value: r.closing_qty,
    }));

    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Stock Item Monthly Summary</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
          <span>
            Stock Item: <span className="font-bold">{level.item.item_name}</span>
          </span>
          <span>{periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom">
                  Particulars
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
                >
                  Inwards
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
                >
                  Outwards
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
                >
                  Closing Balance
                </th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                  Quantity
                </th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                  Quantity
                </th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
                <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                  Quantity
                </th>
                <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonths ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">
                    Loading...
                  </td>
                </tr>
              ) : monthsError ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                    {monthsError}
                  </td>
                </tr>
              ) : (
                <>
                  <tr className="border-b border-zinc-100 italic text-zinc-700">
                    <td className="px-3 py-1">Opening Balance</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100" />
                    <td className="px-3 py-1 text-right" />
                    <td className="px-3 py-1 text-right border-l border-zinc-100" />
                    <td className="px-3 py-1 text-right" />
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
                      {fmtQty(monthsOpening.qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(monthsOpening.value)}</td>
                  </tr>
                  {months.map((row, idx) => {
                    const isFocused = idx === monthIndex;
                    return (
                      <tr
                        key={row.month}
                        onClick={() => setMonthIndex(idx)}
                        onDoubleClick={() => {
                          if (activeFY?.start_date) {
                            const { from, to } = fyMonthRange(activeFY.start_date, idx);
                            loadVouchers(level.group, level.item, from, to);
                          } else loadVouchers(level.group, level.item);
                        }}
                        className={`border-b border-zinc-100 cursor-pointer ${isFocused ? 'bg-[#e4e4e7] text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'}`}
                      >
                        <td className="px-3 py-1">{row.month}</td>
                        <td className="px-3 py-1 text-right border-l border-zinc-100">
                          {fmtQty(row.in_qty)}
                        </td>
                        <td className="px-3 py-1 text-right">{fmtAmount(row.in_value)}</td>
                        <td className="px-3 py-1 text-right border-l border-zinc-100">
                          {fmtQty(row.out_qty)}
                        </td>
                        <td className="px-3 py-1 text-right">{fmtAmount(row.out_value)}</td>
                        <td className="px-3 py-1 text-right border-l border-zinc-100">
                          {fmtQty(row.closing_qty)}
                        </td>
                        <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>

        {monthChartBars.length > 0 && (
          <StockBarChart bars={monthChartBars} selectedIndex={monthIndex} />
        )}

        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">{fmtQty(totIn)}</span>
          <span className="w-24 text-right pr-2">{fmtAmount(totInVal)}</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">{fmtQty(totOut)}</span>
          <span className="w-24 text-right pr-2">{fmtAmount(totOutVal)}</span>
          <span className="w-20 text-right border-l border-zinc-300 pr-2">
            {fmtQty(lastClosingQty)}
          </span>
          <span className="w-24 text-right pr-2">{fmtAmount(lastClosingVal)}</span>
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button
            onClick={() => {
              if (activeFY?.start_date) {
                const { from, to } = fyMonthRange(activeFY.start_date, monthIndex);
                loadVouchers(level.group, level.item, from, to);
              } else loadVouchers(level.group, level.item);
            }}
            className="hover:underline hover:text-zinc-900"
          >
            Enter: Vouchers
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 4 — Stock Item Vouchers (matches screenshot 6)
  // ═══════════════════════════════════════════════════════════════════════
  const totalInQty = voucherRows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalInValue = voucherRows.reduce((s, r) => s + (Number(r.inwards_value) || 0), 0);
  const totalOutQty = voucherRows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);
  const totalOutValue = voucherRows.reduce((s, r) => s + (Number(r.outwards_value) || 0), 0);
  const finalClosingQty = voucherRows.length ? voucherRows[voucherRows.length - 1].closing_qty : 0;
  const finalClosingValue = voucherRows.length
    ? voucherRows[voucherRows.length - 1].closing_value
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Stock Item Vouchers</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <span>
          Stock Item: <span className="font-bold">{level.item.item_name}</span>
        </span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-20 border-b border-zinc-300 align-bottom"
              >
                Date
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold border-b border-zinc-300 align-bottom"
              >
                Particulars
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-28 border-b border-zinc-300 align-bottom"
              >
                Vch Type
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-right font-bold w-20 border-b border-zinc-300 align-bottom"
              >
                Vch No.
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
              >
                Inwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
              >
                Outwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200"
              >
                Closing
              </th>
            </tr>
            <tr>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-zinc-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">
                  Loading vouchers...
                </td>
              </tr>
            ) : voucherError ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-600">
                  {voucherError}
                </td>
              </tr>
            ) : voucherRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              voucherRows.map((row, idx) => {
                const isFocused = idx === voucherIndex;
                return (
                  <tr
                    key={row.voucher_id ?? `open-${idx}`}
                    onClick={() => setVoucherIndex(idx)}
                    onDoubleClick={() =>
                      row.voucher_id && navigate(`/transactions/voucher/${row.voucher_id}`)
                    }
                    className={`border-b border-zinc-100 cursor-pointer ${isFocused ? 'bg-[#e4e4e7] text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number || ''}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
                      {fmtQty(row.inwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.inwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
                      {fmtQty(row.outwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.outwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
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

      <div className="border-t border-zinc-300 px-3 py-1 text-center text-[10px] italic text-zinc-500">
        Totals as per 'Default' valuation :
      </div>
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        <span className="w-20 text-right pr-2 border-l border-zinc-300">{fmtQty(totalInQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalInValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-zinc-300">{fmtQty(totalOutQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalOutValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-zinc-300">
          {fmtQty(finalClosingQty)}
        </span>
        <span className="w-24 text-right pr-2">{fmtAmount(finalClosingValue)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button
          onClick={() => backToMonthly(level.group, level.item)}
          className="hover:underline hover:text-zinc-900"
        >
          F4: Stock Group
        </button>
      </div>
    </div>
  );
}
