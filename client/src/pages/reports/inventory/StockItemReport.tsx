import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import RightActionPanel from '@/components/ui/RightActionPanel';
import SelectionPopup from './SelectionPopup';
import StockItemMonthlyTable, { type MonthRow } from './StockItemMonthlyTable';
import StockItemVouchersTable, { type StockVoucherRow } from './StockItemVouchersTable';
import StockBarChart, { type ChartBar } from './StockBarChart';
import ChangeViewPopup, { type ViewKey, type ChangeViewSelection } from './ChangeViewPopup';
import ScaleFactorPopup, { type ScaleFactor, SCALE_FACTORS } from './ScaleFactorPopup';
import SaveViewDialog, { type SavedView } from './SaveViewDialog';

// Issue #107 — Inventory Books → Stock Item.
//   SelectionPopup → Stock Item Summary (Monthly default) → Stock Item Vouchers
// Summary supports: F7 Show Profit, Basis of Values (scale), Change View
// (period granularity + related-report navigation), bar chart, Save View.

interface StockItem {
  item_id: number;
  name: string;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const pad = (n: number) => String(n).padStart(2, '0');
const parseIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const addDays = (iso: string, n: number) => {
  const dt = parseIso(iso);
  dt.setDate(dt.getDate() + n);
  return toIso(dt);
};

interface Bucket {
  label: string;
  from: string;
  to: string;
}

/** Build period buckets for a given granularity within [fyStart, fyEnd]. */
function makeBuckets(fyStart: string, fyEnd: string, gran: ViewKey): Bucket[] {
  const out: Bucket[] = [];
  const end = fyEnd;
  const monLabel = (iso: string) => MON[parseIso(iso).getMonth()];

  if (gran === 'daily' || gran === 'weekly' || gran === 'fortnightly' || gran === 'fourweek') {
    const step = gran === 'daily' ? 1 : gran === 'weekly' ? 7 : gran === 'fortnightly' ? 14 : 28;
    let cur = fyStart;
    while (cur <= end) {
      const last = addDays(cur, step - 1);
      const to = last > end ? end : last;
      out.push({ label: `${parseIso(cur).getDate()}-${monLabel(cur)}`, from: cur, to });
      cur = addDays(to, 1);
    }
    return out;
  }

  // quarterly (3 months) / halfyearly (6 months) — calendar month blocks from FY start
  const span = gran === 'quarterly' ? 3 : 6;
  let cur = fyStart;
  while (cur <= end) {
    const start = parseIso(cur);
    const blockEnd = new Date(start.getFullYear(), start.getMonth() + span, 0); // last day of block
    const toIsoStr = toIso(blockEnd);
    const to = toIsoStr > end ? end : toIsoStr;
    out.push({ label: `${monLabel(cur)}-${monLabel(to)}`, from: cur, to });
    cur = addDays(to, 1);
  }
  return out;
}

/** Aggregate full-period voucher rows into period buckets with a running closing. */
function bucketize(
  rows: StockVoucherRow[],
  buckets: Bucket[],
  openQty: number,
  openVal: number,
): MonthRow[] {
  let runQ = openQty,
    runV = openVal;
  const movement = rows.filter((r) => r.voucher_id); // drop opening row
  return buckets.map((b) => {
    const inB = movement.filter((r) => r.date && r.date >= b.from && r.date <= b.to);
    const in_qty = inB.reduce((s, r) => s + (r.inwards_qty ?? 0), 0);
    const in_value = inB.reduce((s, r) => s + (r.inwards_value ?? 0), 0);
    const out_qty = inB.reduce((s, r) => s + (r.outwards_qty ?? 0), 0);
    const out_value = inB.reduce((s, r) => s + (r.outwards_value ?? 0), 0);
    runQ += in_qty - out_qty;
    runV += in_value - out_value;
    return {
      month: b.label,
      in_qty,
      in_value,
      out_qty,
      out_value,
      closing_qty: runQ,
      closing_value: runV,
    };
  });
}

const MONTH_BUCKET_LABELS = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];
function monthlyRanges(fyStart: string): Bucket[] {
  const startYear = parseIso(fyStart).getFullYear();
  return MONTH_BUCKET_LABELS.map((label, idx) => {
    const raw = idx + 4;
    const y = raw > 12 ? startYear + 1 : startYear;
    const m = raw > 12 ? raw - 12 : raw;
    const lastDay = new Date(y, m, 0).getDate();
    return { label, from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
  });
}

const VIEW_TITLE: Record<ViewKey, string> = {
  daily: 'Stock Item Daily Summary',
  weekly: 'Stock Item Weekly Summary',
  fortnightly: 'Stock Item Fortnightly Summary',
  fourweek: 'Stock Item 4-Week Summary',
  monthly: 'Stock Item Monthly Summary',
  quarterly: 'Stock Item Quarterly Summary',
  halfyearly: 'Stock Item Half-Yearly Summary',
};

type Level =
  | { step: 'select' }
  | { step: 'summary'; item: StockItem }
  | { step: 'vouchers'; item: StockItem; from: string; to: string; periodLabel: string };

type Overlay = null | 'changeview' | 'basis' | 'save';

export default function StockItemReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const fyStart = activeFY?.start_date ?? '';
  const fyEnd = activeFY?.end_date ?? '';
  const periodLabel = fyStart && fyEnd ? `${dmy(fyStart)} to ${dmy(fyEnd)}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'select' });
  const [overlay, setOverlay] = React.useState<Overlay>(null);
  const [showProfit, setShowProfit] = React.useState(false);
  const [scale, setScale] = React.useState<ScaleFactor>(SCALE_FACTORS[0]);
  const [gran, setGran] = React.useState<ViewKey>('monthly');

  // ── Level 1 — selection popup ──────────────────────────────────────────
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

  // ── Level 2 — summary (any granularity) ────────────────────────────────
  const [sumData, setSumData] = React.useState<{
    opening_qty: number;
    opening_value: number;
    rows: MonthRow[];
    ranges: Bucket[];
  } | null>(null);
  const [sumLoading, setSumLoading] = React.useState(false);
  const [sumErr, setSumErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(-1); // -1 = Opening Balance

  const loadSummary = React.useCallback(
    (item: StockItem, g: ViewKey) => {
      if (!companyId || !fyId || !fyStart) return;
      setSumData(null);
      setSumLoading(true);
      setSumErr(null);
      setRowIdx(-1);
      const api = (window as any).api.report;

      if (g === 'monthly') {
        api
          .stockItemMonthly(companyId, fyId, item.item_id)
          .then((res: any) => {
            if (res?.success) {
              setSumData({
                opening_qty: res.opening_qty ?? 0,
                opening_value: res.opening_value ?? 0,
                rows: res.months ?? [],
                ranges: monthlyRanges(fyStart),
              });
            } else setSumErr(res?.error ?? 'Failed to load summary.');
            setSumLoading(false);
          })
          .catch((e: any) => {
            setSumErr(e.message);
            setSumLoading(false);
          });
      } else {
        // Re-bucket full-period vouchers into the chosen granularity
        api
          .stockItemVouchers(companyId, fyId, item.item_id, fyStart, fyEnd)
          .then((res: any) => {
            if (res?.success) {
              const rows: StockVoucherRow[] = res.rows ?? [];
              const opening = rows.find((r) => !r.voucher_id);
              const openQ = opening?.closing_qty ?? 0;
              const openV = opening?.closing_value ?? 0;
              const buckets = makeBuckets(fyStart, fyEnd, g);
              setSumData({
                opening_qty: openQ,
                opening_value: openV,
                rows: bucketize(rows, buckets, openQ, openV),
                ranges: buckets,
              });
            } else setSumErr(res?.error ?? 'Failed to load summary.');
            setSumLoading(false);
          })
          .catch((e: any) => {
            setSumErr(e.message);
            setSumLoading(false);
          });
      }
    },
    [companyId, fyId, fyStart, fyEnd],
  );

  const openSummary = React.useCallback(
    (item: StockItem) => {
      setGran('monthly');
      setLevel({ step: 'summary', item });
      loadSummary(item, 'monthly');
    },
    [loadSummary],
  );

  // Drill-in from another report (e.g. Negative Stock) — jump straight to the
  // item's Monthly Summary instead of the selection popup. Runs once per nav.
  const preselectDone = React.useRef(false);
  React.useEffect(() => {
    const st = location.state as { item_id?: number; item_name?: string } | null;
    if (preselectDone.current || !st?.item_id || !companyId || !fyId || !fyStart) return;
    preselectDone.current = true;
    openSummary({ item_id: st.item_id, name: st.item_name ?? '' });
  }, [location.state, companyId, fyId, fyStart, openSummary]);

  // ── Level 3 — vouchers (per-period or full-period) ─────────────────────
  const [vRows, setVRows] = React.useState<StockVoucherRow[]>([]);
  const [vLoading, setVLoading] = React.useState(false);
  const [vErr, setVErr] = React.useState<string | null>(null);
  const [vIdx, setVIdx] = React.useState(0);

  const openVouchers = React.useCallback(
    (item: StockItem, from: string, to: string, label: string) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', item, from, to, periodLabel: label });
      setVRows([]);
      setVLoading(true);
      setVErr(null);
      setVIdx(0);
      (window as any).api.report
        .stockItemVouchers(companyId, fyId, item.item_id, from, to)
        .then((res: any) => {
          if (res?.success) setVRows(res.rows ?? []);
          else setVErr(res?.error ?? 'Failed to load vouchers.');
          setVLoading(false);
        })
        .catch((e: any) => {
          setVErr(e.message);
          setVLoading(false);
        });
    },
    [companyId, fyId],
  );

  const drillPeriod = React.useCallback(
    (item: StockItem, idx: number) => {
      const b = sumData?.ranges[idx];
      if (b) openVouchers(item, b.from, b.to, `${dmy(b.from)} to ${dmy(b.to)}`);
    },
    [sumData, openVouchers],
  );

  // ── Change View handler ────────────────────────────────────────────────
  const handleChangeView = React.useCallback(
    (sel: ChangeViewSelection) => {
      setOverlay(null);
      if (level.step !== 'summary') return;
      if (sel.kind === 'view') {
        setGran(sel.key);
        loadSummary(level.item, sel.key);
      } else {
        switch (sel.key) {
          case 'stockquery':
            navigate('/reports/inventory/stock-query');
            break;
          case 'movement':
            navigate('/reports/inventory/movement-analysis');
            break;
          case 'costanalysis':
            navigate('/reports/statements-of-inventory/item-cost-analysis/stock-item');
            break;
          case 'vouchers':
            openVouchers(level.item, fyStart, fyEnd, periodLabel);
            break;
        }
      }
    },
    [level, loadSummary, navigate, openVouchers, fyStart, fyEnd, periodLabel],
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
        if (it) openSummary(it);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level.step, filtered, selectIdx, openSummary, navigate]);

  // ── Keyboard — summary (disabled while an overlay is open) ─────────────
  React.useEffect(() => {
    if (level.step !== 'summary' || overlay) return;
    const total = sumData?.rows.length ?? 0;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIdx((p) => Math.min(total - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIdx((p) => Math.max(-1, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rowIdx >= 0) drillPeriod(level.item, rowIdx);
      } else if (e.key === 'F7') {
        e.preventDefault();
        setShowProfit((p) => !p);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLevel({ step: 'select' });
        setSumData(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level, overlay, sumData, rowIdx, drillPeriod]);

  // ── Keyboard — vouchers ────────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'vouchers') return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVIdx((p) => Math.min(vRows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = vRows[vIdx];
        if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLevel({ step: 'summary', item: level.item });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level, vRows, vIdx, navigate]);

  // ── Render — selection popup ───────────────────────────────────────────
  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">Stock Item</span>
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
            if (it) openSummary(it);
          }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate('/master/create/stock-item')}
        />
      </div>
    );
  }

  // ── Render — vouchers ──────────────────────────────────────────────────
  if (level.step === 'vouchers') {
    return (
      <StockItemVouchersTable
        itemName={level.item.name}
        companyName={selectedCompany?.name}
        periodLabel={level.periodLabel}
        rows={vRows}
        loading={vLoading}
        error={vErr}
        selectedIndex={vIdx}
        onSelectIndex={setVIdx}
        onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
        footer={
          <div className="flex items-center gap-6 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
            <span className="text-black">Enter: Open Voucher · ↑↓: Navigate · Esc: Back</span>
          </div>
        }
      />
    );
  }

  // ── Render — summary (Monthly / Daily / Weekly / …) ───────────────────
  // Plot the closing balance only for months that actually had movement
  // (an inward or outward) — carried-forward balances get no bar, matching
  // Tally where a period's bar reflects that period's activity.
  const chartBars: ChartBar[] = (sumData?.rows ?? []).map((r) => {
    const hasMovement = r.in_qty !== 0 || r.out_qty !== 0 || r.in_value !== 0 || r.out_value !== 0;
    return {
      label: r.month.length > 4 ? r.month.slice(0, 3) : r.month,
      value: hasMovement ? r.closing_qty : 0,
    };
  });

  const sidebar = (
    <RightActionPanel
      title="Stock Item"
      actions={[
        {
          key: 'F4',
          label: 'Stock Item',
          onClick: () => {
            setLevel({ step: 'select' });
            setSumData(null);
          },
        },
        {
          key: 'F7',
          label: showProfit ? 'Hide Profit' : 'Show Profit',
          active: showProfit,
          onClick: () => setShowProfit((p) => !p),
        },
        { key: 'Ctrl+H', label: 'Change View', onClick: () => setOverlay('changeview') },
        { key: 'B', label: 'Basis of Values', onClick: () => setOverlay('basis') },
        { key: 'Ctrl+S', label: 'Save View', onClick: () => setOverlay('save') },
        {
          key: 'Esc',
          label: 'Quit',
          onClick: () => {
            setLevel({ step: 'select' });
            setSumData(null);
          },
        },
      ]}
    />
  );

  return (
    <>
      <StockItemMonthlyTable
        title={VIEW_TITLE[gran]}
        particularsLabel={gran === 'monthly' ? 'Particulars' : 'Period'}
        itemName={level.item.name}
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
        openingQty={sumData?.opening_qty ?? 0}
        openingValue={sumData?.opening_value ?? 0}
        months={sumData?.rows ?? []}
        loading={sumLoading}
        error={sumErr}
        selectedIndex={rowIdx}
        onSelectIndex={setRowIdx}
        onActivate={(idx) => drillPeriod(level.item, idx)}
        showProfit={showProfit}
        scale={scale}
        chart={chartBars.length ? <StockBarChart bars={chartBars} selectedIndex={rowIdx} /> : null}
        sidebar={sidebar}
        footer={
          <div className="flex items-center gap-6 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
            <span className="text-black">
              Enter: Show Vouchers · F7: {showProfit ? 'Hide' : 'Show'} Profit · ↑↓: Navigate
            </span>
          </div>
        }
      />

      {overlay === 'changeview' && (
        <ChangeViewPopup
          currentView={gran}
          onSelect={handleChangeView}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'basis' && (
        <ScaleFactorPopup
          current={scale}
          onSelect={(sf) => {
            setScale(sf);
            setOverlay(null);
          }}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'save' && (
        <SaveViewDialog
          defaultName={`${VIEW_TITLE[gran]} — ${level.item.name}`}
          onClose={() => setOverlay(null)}
          onSave={(v: SavedView) => {
            try {
              const key = 'stockItemSavedViews';
              const prev = JSON.parse(localStorage.getItem(key) || '[]');
              localStorage.setItem(
                key,
                JSON.stringify([...prev, { ...v, gran, scale: scale.label, showProfit }]),
              );
            } catch {
              /* ignore quota / parse errors */
            }
            setOverlay(null);
          }}
        />
      )}
    </>
  );
}
