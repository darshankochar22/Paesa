import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import VoucherDisplay from './VoucherDisplay';

// Issue #156 — Statements of Inventory · Stock Query.
// Flow: SelectionPopup (List of Stock Items) → single-item snapshot report.
// Layout mirrors TallyPrime: two-column header + four quadrants
// (Purchases, Sales, Godown/Batch Details, Items of Same Category).
// Enter / double-click on a purchase or sales row drills to that voucher.

interface StockItem {
  item_id: number;
  name: string;
}

interface ItemHeader {
  item_id: number;
  name: string;
  group_name: string;
  category_name: string;
  unit_name: string;
  closing_qty: number;
  closing_value: number;
  last_sale_rate: number | null;
  cost_rate: number;
  costing_method: string;
  standard_cost: number;
  part_no: string;
  std_selling_price: number | null;
  market_valuation_method: string;
}
interface TxRow {
  voucher_id: number | null;
  date: string;
  party_name: string;
  quantity: number;
  rate: number;
  disc_amount: number | null;
  amount: number;
}
interface GodownRow {
  godown_id: number | null;
  godown_name: string;
  batch: string;
  qty: number;
}
interface CatItemRow {
  item_id: number;
  item_name: string;
  closing_qty: number;
  closing_value: number;
  last_sale_rate: number;
}

interface QueryResult {
  item: ItemHeader;
  purchases: TxRow[];
  sales: TxRow[];
  godownDetails: GodownRow[];
  categoryItems: CatItemRow[];
}

// ── Formatters ───────────────────────────────────────────────────────────
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const fmtNum = (v: number | null | undefined) =>
  v == null || v === 0
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v,
      );
const fmtQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};
const perUnit = (v: number | null | undefined, unit?: string) => {
  if (v == null || v === 0) return '';
  const s = fmtNum(v);
  return unit ? `${s}/${unit}` : s;
};
const fmtDisc = (disc: number | null | undefined, rate: number, qty: number) => {
  const gross = (rate || 0) * (qty || 0);
  if (!disc || gross <= 0) return '';
  return `${((disc / gross) * 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;
};

const TH = 'px-2 py-1 text-[10px] font-bold text-zinc-700 bg-zinc-100 border-b border-zinc-300';
const TD = 'px-2 py-0.5 text-[11px] border-b border-zinc-100';
const TDR = `${TD} text-right`;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-bold text-[11px] border-b border-zinc-400 pb-0.5 mb-1 uppercase tracking-wide">
      {children}
    </div>
  );
}

// Two-column header row: "label : value"
function HRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-[11px] leading-5">
      <span className="w-40 shrink-0 text-zinc-500">{label}</span>
      <span className="mr-2 text-zinc-400">:</span>
      <span className="font-semibold text-zinc-900">{value || ' '}</span>
    </div>
  );
}

/** Purchases / Sales panel — Last-on summary, table, drill to voucher. */
function TxPanel({
  title,
  verb,
  rows,
  unit,
  onOpen,
  focusIdx,
  onFocusRow,
}: {
  title: string;
  verb: string;
  rows: TxRow[];
  unit?: string;
  onOpen: (voucherId: number) => void;
  focusIdx: number;
  onFocusRow: (i: number) => void;
}) {
  const last = rows[0];
  return (
    <div className="flex-1 min-w-0 px-2">
      <SectionTitle>{title}</SectionTitle>
      <div className="text-[10px] text-zinc-600 font-mono mb-1 truncate">
        {last
          ? `Last ${verb} on: ${dmy(last.date)}   ${last.party_name || '—'}   ${fmtQty(last.quantity, unit)} @ ${perUnit(last.rate, unit)}`
          : `Last ${verb} on: —`}
      </div>
      <table className="w-full border-collapse text-[11px] font-mono">
        <thead>
          <tr>
            <th className={`${TH} text-left w-[16%]`}>Date</th>
            <th className={`${TH} text-left w-[30%]`}>Party Name</th>
            <th className={`${TH} text-right w-[14%]`}>Quantity</th>
            <th className={`${TH} text-right w-[12%]`}>Rate</th>
            <th className={`${TH} text-right w-[10%]`}>Disc %</th>
            <th className={`${TH} text-right w-[18%]`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-2 py-2 text-zinc-400 italic text-[10px]">
                No {title.toLowerCase()}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                onClick={() => onFocusRow(i)}
                onDoubleClick={() => r.voucher_id && onOpen(r.voucher_id)}
                className={`${i === focusIdx ? 'bg-zinc-200 font-bold' : 'hover:bg-zinc-50'} ${r.voucher_id ? 'cursor-pointer' : ''}`}
                title={r.voucher_id ? 'Enter / double-click: display voucher' : undefined}
              >
                <td className={TD}>{dmy(r.date)}</td>
                <td className={`${TD} truncate max-w-0`}>{r.party_name || '—'}</td>
                <td className={TDR}>{fmtQty(r.quantity, unit)}</td>
                <td className={TDR}>{fmtNum(r.rate)}</td>
                <td className={TDR}>{fmtDisc(r.disc_amount, r.rate, r.quantity)}</td>
                <td className={TDR}>{fmtNum(r.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

type Level = { step: 'select' } | { step: 'detail'; item: StockItem };

export default function StockQuery() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [level, setLevel] = React.useState<Level>({ step: 'select' });

  // ── Selection popup state ──────────────────────────────────────────────
  const [allItems, setAllItems] = React.useState<StockItem[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setListLoading(false);
      return;
    }
    (window as any).api.stockItem.getAll(companyId).then((res: any) => {
      const list: StockItem[] = ((res.stockItems ?? []) as any[])
        .map((r) => ({ item_id: r.item_id, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAllItems(list);
      setListLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? allItems
        : allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [allItems, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // ── Query detail state ─────────────────────────────────────────────────
  const [data, setData] = React.useState<QueryResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // Keyboard cursor over the transaction rows: purchases first, then sales.
  const [txIdx, setTxIdx] = React.useState(0);
  // Voucher currently open in the item-invoice "Voucher Display" overlay (#156).
  const [displayVoucherId, setDisplayVoucherId] = React.useState<number | null>(null);

  const openDetail = React.useCallback(
    (item: StockItem) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'detail', item });
      setData(null);
      setTxIdx(0);
      setLoading(true);
      setErr(null);
      (window as any).api.report
        .stockQuery(companyId, fyId, item.item_id)
        .then((res: any) => {
          if (res?.success) setData(res);
          else setErr(res?.error ?? 'Failed to load stock query.');
          setLoading(false);
        })
        .catch((e: any) => {
          setErr(e.message);
          setLoading(false);
        });
    },
    [companyId, fyId],
  );

  // ── Keyboard — selection ───────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'select') return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectIdx((p) => Math.min(filtered.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[selectIdx];
        if (it) openDetail(it);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level.step, filtered, selectIdx, openDetail, navigate]);

  // ── Keyboard — detail (↑↓ over purchases+sales, Enter: Display Vch) ────
  React.useEffect(() => {
    if (level.step !== 'detail') return;
    if (displayVoucherId !== null) return; // Voucher Display overlay owns the keyboard
    const txCount = (data?.purchases.length ?? 0) + (data?.sales.length ?? 0);
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLevel({ step: 'select' });
        setData(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setTxIdx((p) => Math.min(Math.max(0, txCount - 1), p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setTxIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!data) return;
        const flat = [...data.purchases, ...data.sales];
        const r = flat[txIdx];
        if (r?.voucher_id) setDisplayVoucherId(r.voucher_id); // open Voucher Display
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level.step, data, txIdx, displayVoucherId]);

  // ── Render — Voucher Display (#156), inside the app layout (keeps Navbar/Footer) ──
  if (displayVoucherId !== null) {
    return (
      <VoucherDisplay voucherId={displayVoucherId} onClose={() => setDisplayVoucherId(null)} />
    );
  }

  // ── Render — selection popup ───────────────────────────────────────────
  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Stock Query</span>
          <span className="font-bold text-sm">{selectedCompany?.name ?? ''}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Item"
          fieldLabel="Name of Item"
          listLabel="List of Stock Items"
          companyName={selectedCompany?.name}
          items={filtered.map((i) => ({ id: i.item_id, name: i.name }))}
          index={selectIdx}
          loading={listLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            const it = filtered[i];
            if (it) openDetail(it);
          }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate('/master/create/stock-item')}
        />
      </div>
    );
  }

  // ── Render — detail report ─────────────────────────────────────────────
  const it = data?.item;
  const unit = it?.unit_name;
  const godownTotal = (data?.godownDetails ?? []).reduce((s, g) => s + (g.qty || 0), 0);
  const openVoucher = (id: number) => setDisplayVoucherId(id);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Stock Query</span>
        <span className="font-bold text-sm">{selectedCompany?.name ?? ''}</span>
        <span />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-8 text-center text-zinc-400 italic">Loading…</div>
        ) : err ? (
          <div className="py-8 text-center text-zinc-600">{err}</div>
        ) : !data || !it ? null : (
          <>
            {/* ── Two-column header ── */}
            <div className="grid grid-cols-2 border-b-2 border-zinc-900">
              <div className="border-r border-zinc-300 px-4 py-3 font-mono">
                <HRow label="Name" value={it.name} />
                <HRow label="Group" value={it.group_name} />
                <HRow label="Closing Balance" value={fmtQty(it.closing_qty, unit) || '0'} />
                <HRow label="Cost price" value={perUnit(it.cost_rate, unit)} />
                <HRow label="Costing method" value={it.costing_method} />
                <HRow label="Standard cost" value={perUnit(it.standard_cost, unit)} />
              </div>
              <div className="px-4 py-3 font-mono">
                <HRow label="Part No." value={it.part_no || 'Not Applicable'} />
                <HRow label="Category" value={it.category_name} />
                <HRow label="Closing value" value={fmtNum(it.closing_value) || '0.00'} />
                <HRow label="Standard selling price" value={perUnit(it.std_selling_price, unit)} />
                <HRow label="Market valuation method" value={it.market_valuation_method} />
              </div>
            </div>

            {/* ── Purchases + Sales ── */}
            <div className="flex border-b-2 border-zinc-900 py-2">
              <TxPanel
                title="Purchases"
                verb="purchased"
                rows={data.purchases}
                unit={unit}
                focusIdx={txIdx}
                onFocusRow={setTxIdx}
                onOpen={openVoucher}
              />
              <div className="w-px bg-zinc-300" />
              <TxPanel
                title="Sales"
                verb="sold"
                rows={data.sales}
                unit={unit}
                focusIdx={txIdx - data.purchases.length}
                onFocusRow={(i) => setTxIdx(i + data.purchases.length)}
                onOpen={openVoucher}
              />
            </div>

            {/* ── Godown/Batch + Items of Same Category ── */}
            <div className="flex py-2">
              {/* Godown / Batch */}
              <div className="flex-1 px-2 border-r border-zinc-300">
                <SectionTitle>Godown / Batch Details</SectionTitle>
                <table className="w-full border-collapse text-[11px] font-mono">
                  <thead>
                    <tr>
                      <th className={`${TH} text-left`}>Godown</th>
                      <th className={`${TH} text-left`}>Batch</th>
                      <th className={`${TH} text-right`}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.godownDetails.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-2 text-zinc-400 italic text-[10px]">
                          No godown allocations
                        </td>
                      </tr>
                    ) : (
                      <>
                        {data.godownDetails.map((r, i) => (
                          <tr key={i} className="hover:bg-zinc-50">
                            <td className={TD}>{r.godown_name || 'Main Location'}</td>
                            <td className={TD}>{r.batch || '—'}</td>
                            <td className={TDR}>{fmtQty(r.qty, unit)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-zinc-900">
                          <td className={TD}>Total</td>
                          <td className={TD} />
                          <td className={TDR}>{fmtQty(godownTotal, unit)}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Items of Same Category */}
              <div className="flex-1 px-2">
                <SectionTitle>Items of Same Category</SectionTitle>
                <table className="w-full border-collapse text-[11px] font-mono">
                  <thead>
                    <tr>
                      <th className={`${TH} text-left`}>Item Name</th>
                      <th className={`${TH} text-right`}>Quantity</th>
                      <th className={`${TH} text-right`}>Cost</th>
                      <th className={`${TH} text-right`}>Sale Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const others = data.categoryItems.filter((r) => r.item_id !== it.item_id);
                      if (others.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} className="px-2 py-2 text-zinc-400 italic text-[10px]">
                              {it.category_name === 'Not Applicable'
                                ? 'No category assigned'
                                : 'No other items in this category'}
                            </td>
                          </tr>
                        );
                      }
                      return others.map((r) => (
                        <tr
                          key={r.item_id}
                          onClick={() => openDetail({ item_id: r.item_id, name: r.item_name })}
                          className="hover:bg-zinc-100 cursor-pointer"
                          title="Open Stock Query for this item"
                        >
                          <td className={TD}>{r.item_name}</td>
                          <td className={TDR}>{fmtQty(r.closing_qty, unit)}</td>
                          <td className={TDR}>{fmtNum(r.closing_value)}</td>
                          <td className={TDR}>
                            {r.last_sale_rate ? fmtNum(r.last_sale_rate) : ''}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-6 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
        <span className="text-zinc-400">↑↓: Move</span>
        <span className="text-zinc-400">Enter: Display Vch</span>
        <span className="text-zinc-400">Esc: Back to Selection</span>
      </div>
    </div>
  );
}
