import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "./SelectionPopup";
import StockAgeingTable, { type AgeRow } from "./StockAgeingTable";
import StockItemMonthlyTable, { type MonthRow } from "./StockItemMonthlyTable";
import StockItemVouchersTable, { type StockVoucherRow } from "./StockItemVouchersTable";

interface GroupRef { group_id: number; group_name: string; }
interface RawRow {
  item_id: number; item_name: string; unit_name: string; expiry_date: string;
  total_qty: number; total_value: number;
  buckets: { qty: number; value: number }[];
  neg_qty: number; neg_value: number;
}

const PRIMARY_ID = -1; // sentinel: "Primary" => age every stock item

type Level =
  | { step: "select" }
  | { step: "report"; group: GroupRef }
  | { step: "monthly"; group: GroupRef; item: RawRow }
  | { step: "vouchers"; group: GroupRef; item: RawRow; period: string; from: string; to: string };

// Month index (0 = April … 11 = March) → [from, to] ISO date range within the FY.
const MONTH_RANGE = (startYear: number, idx: number): { from: string; to: string } => {
  let m = idx + 4, y = startYear;
  if (m > 12) { m -= 12; y += 1; }
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

export default function AgeingAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const asAt = activeFY?.end_date;
  const fyStart = activeFY?.start_date;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "select" });

  // ── Select Stock Group popup ──────────────────────────────────────────────
  const [groupList, setGroupList] = React.useState<GroupRef[]>([]);
  const [groupListLoading, setGroupListLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) { setGroupListLoading(false); return; }
    setGroupListLoading(true);
    (window as any).api.stockGroup.getAll(companyId)
      .then((res: any) => {
        const list: GroupRef[] = [...(res.stockGroups ?? [])]
          .map((g: any) => ({ group_id: g.sg_id, group_name: g.name }))
          .sort((a: GroupRef, b: GroupRef) => a.group_name.localeCompare(b.group_name));
        setGroupList([{ group_id: PRIMARY_ID, group_name: "Primary" }, ...list]);
        setGroupListLoading(false);
      })
      .catch(() => setGroupListLoading(false));
  }, [companyId]);

  const filtered = React.useMemo(() =>
    search.trim() === "" ? groupList : groupList.filter(g => g.group_name.toLowerCase().includes(search.toLowerCase())),
    [groupList, search]
  );
  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Ageing report ─────────────────────────────────────────────────────────
  const [rows, setRows] = React.useState<RawRow[]>([]);
  const [bands, setBands] = React.useState<number[]>([30, 60, 90]);
  const [reportAsAt, setReportAsAt] = React.useState<string | undefined>(asAt);
  const [loadingReport, setLoadingReport] = React.useState(false);
  const [reportErr, setReportErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  // Sync reportAsAt when activeFY loads asynchronously
  React.useEffect(() => {
    if (asAt && !reportAsAt) setReportAsAt(asAt);
  }, [asAt]);

  const loadReport = React.useCallback((group: GroupRef) => {
    if (!companyId || !fyId || !asAt) return;
    setLevel({ step: "report", group });
    setLoadingReport(true); setReportErr(null); setRowIdx(0);
    (window as any).api.report.stockAgeingAnalysis(companyId, fyId, group.group_id, asAt, fyStart).then((res: any) => {
      if (res.success) {
        setRows(res.rows ?? []);
        if (Array.isArray(res.bands)) setBands(res.bands);
        setReportAsAt(res.as_at ?? asAt);
      } else setReportErr(res.error || "Failed to load");
      setLoadingReport(false);
    });
  }, [companyId, fyId, asAt, fyStart]);

  // ── Stock Item Monthly Summary drill-down ─────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [opening, setOpening] = React.useState({ qty: 0, value: 0 });
  const [loadingMonthly, setLoadingMonthly] = React.useState(false);
  const [monthlyErr, setMonthlyErr] = React.useState<string | null>(null);
  const [monthIdx, setMonthIdx] = React.useState(-1);

  const loadMonthly = React.useCallback((group: GroupRef, item: RawRow) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "monthly", group, item });
    setLoadingMonthly(true); setMonthlyErr(null); setMonthIdx(-1);
    (window as any).api.report.stockItemMonthly(companyId, fyId, item.item_id).then((res: any) => {
      if (res.success) {
        setMonths(res.months ?? []);
        setOpening({ qty: res.opening_qty ?? 0, value: res.opening_value ?? 0 });
      } else setMonthlyErr(res.error || "Failed to load monthly summary");
      setLoadingMonthly(false);
    });
  }, [companyId, fyId]);

  // ── Stock Item Vouchers drill-down (scoped to one month) ──────────────────
  const [vouchers, setVouchers] = React.useState<StockVoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherErr, setVoucherErr] = React.useState<string | null>(null);
  const [voucherIdx, setVoucherIdx] = React.useState(0);

  const loadVouchers = React.useCallback((group: GroupRef, item: RawRow, mIdx: number) => {
    if (!companyId || !fyId) return;
    const startYear = fyStart ? Number(fyStart.slice(0, 4)) : new Date().getFullYear();
    const { from, to } = MONTH_RANGE(startYear, mIdx);
    const period = `${dmy(from)} to ${dmy(to)}`;
    setLevel({ step: "vouchers", group, item, period, from, to });
    setLoadingVouchers(true); setVoucherErr(null); setVoucherIdx(0);
    (window as any).api.report.stockItemVouchers(companyId, fyId, item.item_id, from, to).then((res: any) => {
      if (res.success) setVouchers(res.rows ?? []);
      else setVoucherErr(res.error || "Failed to load vouchers");
      setLoadingVouchers(false);
    });
  }, [companyId, fyId, fyStart, months]);

  const backToSelect = React.useCallback(() => { setLevel({ step: "select" }); setRows([]); setSearch(""); }, []);
  const backToMonthly = React.useCallback((group: GroupRef, item: RawRow) => { setLevel({ step: "monthly", group, item }); setVouchers([]); }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === "select") {
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(filtered.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const g = filtered[selectIdx]; if (g) loadReport(g); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else if (level.step === "report") {
        if (e.key === "ArrowDown") { e.preventDefault(); setRowIdx(p => Math.min(rows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setRowIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const it = rows[rowIdx]; if (it) loadMonthly(level.group, it); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      } else if (level.step === "monthly") {
        if (e.key === "ArrowDown") { e.preventDefault(); setMonthIdx(p => Math.min(months.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setMonthIdx(p => Math.max(-1, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); if (monthIdx >= 0) loadVouchers(level.group, level.item, monthIdx); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); loadReport(level.group); }
      } else {
        if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIdx(p => Math.min(vouchers.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = vouchers[voucherIdx]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToMonthly(level.group, level.item); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, filtered, selectIdx, rows, rowIdx, months, monthIdx, vouchers, voucherIdx, loadReport, loadMonthly, loadVouchers, backToSelect, backToMonthly, navigate]);

  // ── Select Stock Group ────────────────────────────────────────────────────
  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Stock Ageing Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Group" fieldLabel="Name of Group" listLabel="List of Stock Groups"
          companyName={selectedCompany?.name}
          items={filtered.map(g => ({ id: g.group_id, name: g.group_name }))}
          index={selectIdx} loading={groupListLoading} search={search}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const g = filtered[i]; if (g) loadReport(g); }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate("/master/create/stock-group")}
        />
      </div>
    );
  }

  // ── Ageing report ─────────────────────────────────────────────────────────
  if (level.step === "report") {
    const ageRows: AgeRow[] = rows.map(r => ({
      id: r.item_id, name: r.item_name, unit: r.unit_name, expiry: r.expiry_date,
      total: { qty: r.total_qty, value: r.total_value },
      buckets: r.buckets,
      neg: { qty: r.neg_qty, value: r.neg_value },
    }));
    return (
      <StockAgeingTable
        companyName={selectedCompany?.name} groupLabel={level.group.group_name}
        asAt={reportAsAt} bands={bands} rows={ageRows}
        loading={loadingReport} error={reportErr}
        selectedIndex={rowIdx} onSelectIndex={setRowIdx}
        onActivate={(_r, i) => { const it = rows[i]; if (it) loadMonthly(level.group, it); }}
        footer={<FooterBar><button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Group Selection</button><span className="text-zinc-400">Enter: Stock item monthly summary</span></FooterBar>}
      />
    );
  }

  // ── Stock Item Monthly Summary ────────────────────────────────────────────
  if (level.step === "monthly") {
    return (
      <StockItemMonthlyTable
        itemName={level.item.item_name} companyName={selectedCompany?.name} periodLabel={periodLabel}
        unit={level.item.unit_name} openingQty={opening.qty} openingValue={opening.value}
        months={months} loading={loadingMonthly} error={monthlyErr}
        selectedIndex={monthIdx} onSelectIndex={setMonthIdx}
        onActivate={(i) => loadVouchers(level.group, level.item, i)}
        footer={<FooterBar><button onClick={() => loadReport(level.group)} className="hover:underline hover:text-zinc-900">Q: Back to Ageing</button><span className="text-zinc-400">Enter: Stock item vouchers</span></FooterBar>}
      />
    );
  }

  const { group, item, period } = level;
  return (
    <StockItemVouchersTable
      itemName={item.item_name} companyName={selectedCompany?.name} periodLabel={period} unit={item.unit_name}
      rows={vouchers} loading={loadingVouchers} error={voucherErr}
      selectedIndex={voucherIdx} onSelectIndex={setVoucherIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={<FooterBar><button onClick={() => backToMonthly(group, item)} className="hover:underline hover:text-zinc-900">Q: Back to Monthly Summary</button><span className="text-zinc-400">Enter: Open voucher</span></FooterBar>}
    />
  );
}
