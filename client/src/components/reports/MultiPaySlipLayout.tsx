import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup from "@/pages/reports/inventory/SelectionPopup";

const fmtAmount = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

interface PaySlipRow {
  id: number;
  employee_id: number;
  particulars: string;
  emp_number: string;
  account_no: string;
  bank_name: string;
  branch: string;
  amount: number;
  email_id: string;
}

interface PayHeadLine { pay_head: string; amount: number; }
interface PaySlipDetail {
  employee: {
    employee_id: number;
    name: string;
    emp_number: string;
    designation: string;
    department: string;
    date_of_joining: string;
    account_no: string;
    bank_name: string;
    branch: string;
    ifsc_code: string;
    pan: string;
    uan: string;
    email: string;
  };
  earnings: PayHeadLine[];
  deductions: PayHeadLine[];
  total_earnings: number;
  total_deductions: number;
  net_amount: number;
  attendance: { present: number; absent: number; leave: number };
}

const ALL_ID = -1; // sentinel: "All Items" => Multi Pay Slip for every employee

type Level =
  | { step: "select" }
  | { step: "all" }
  | { step: "detail"; employeeId: number; name: string };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
    {children}
  </div>
);

export default function MultiPaySlipLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  // ── Employee list / Multi Pay Slip data ──────────────────────────────────
  const [rows, setRows] = React.useState<PaySlipRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // ── Flow state ───────────────────────────────────────────────────────────
  const [level, setLevel] = React.useState<Level>({ step: "select" });
  const [search, setSearch] = React.useState("");
  const [selectIdx, setSelectIdx] = React.useState(0);
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  // ── Individual slip data ─────────────────────────────────────────────────
  const [detail, setDetail] = React.useState<PaySlipDetail | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .paySlip(companyId, fyId)
      .then((res: any) => {
        if (res.success) setRows(res.rows || []);
        else setError(res.error || "Failed to load Pay Slip");
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId]);

  // Selection list: "All Items" + each employee, filtered by the search box.
  const selectItems = React.useMemo(() => {
    const all = { id: ALL_ID, name: "All Items" };
    const emps = rows.map((r) => ({ id: r.employee_id, name: r.particulars }));
    const list = [all, ...emps];
    const q = search.trim().toLowerCase();
    return q ? list.filter((it) => it.name.toLowerCase().includes(q)) : list;
  }, [rows, search]);

  const loadDetail = React.useCallback((employeeId: number, name: string) => {
    setLevel({ step: "detail", employeeId, name });
    setFocusedIdx(0);
    if (!companyId || !fyId) return;
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    (window as any).api.report
      .paySlipDetail(companyId, fyId, employeeId)
      .then((res: any) => {
        if (res.success) setDetail(res as PaySlipDetail);
        else setDetailError(res.error || "Failed to load Pay Slip");
      })
      .catch((err: any) => setDetailError(err.message))
      .finally(() => setDetailLoading(false));
  }, [companyId, fyId]);

  const accept = React.useCallback((item: { id: number; name: string }) => {
    if (item.id === ALL_ID) { setLevel({ step: "all" }); setFocusedIdx(0); }
    else loadDetail(item.id, item.name);
  }, [loadDetail]);

  const backToSelect = React.useCallback(() => {
    setLevel({ step: "select" });
    setSearch("");
    setDetail(null);
    setDetailError(null);
  }, []);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const inField = !!el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA");
      if (level.step === "select") {
        // The search input stays focused; arrows/Enter/Esc still drive the list.
        if (e.key === "ArrowDown") { e.preventDefault(); setSelectIdx(p => Math.min(selectItems.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setSelectIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const it = selectItems[selectIdx]; if (it) accept(it); }
        else if (e.key === "Escape") { e.preventDefault(); navigate(-1); }
      } else if (level.step === "all") {
        if (inField) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx(p => Math.min(rows.length - 1, p + 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx(p => Math.max(0, p - 1)); }
        else if (e.key === "Enter") { e.preventDefault(); const r = rows[focusedIdx]; if (r) loadDetail(r.employee_id, r.particulars); }
        else if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      } else {
        if (inField) return;
        if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToSelect(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [level, selectItems, selectIdx, rows, focusedIdx, accept, loadDetail, backToSelect, navigate]);

  React.useEffect(() => { setSelectIdx(0); }, [search]);

  // ── Select Employee / Group ──────────────────────────────────────────────
  if (level.step === "select") {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Pay Slip</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Employee" fieldLabel="Name of Employee / Group" listLabel="List of Employees / Group"
          companyName={selectedCompany?.name}
          items={selectItems}
          index={selectIdx} loading={loading} search={search}
          emptyText={error || "No employees found."}
          onSearchChange={setSearch} onIndexChange={setSelectIdx}
          onAccept={(i) => { const it = selectItems[i]; if (it) accept(it); }}
          onCancel={() => navigate(-1)}
        />
      </div>
    );
  }

  // ── Individual Pay Slip ──────────────────────────────────────────────────
  if (level.step === "detail") {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden text-zinc-900">
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {detailLoading ? (
            <div className="flex items-center justify-center h-full text-zinc-400 text-xs">Loading Pay Slip…</div>
          ) : detailError ? (
            <div className="flex items-center justify-center h-full text-zinc-600 text-xs text-center px-8">{detailError}</div>
          ) : detail ? (
            <div className="max-w-3xl mx-auto border border-zinc-300">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 px-4 py-2 text-center">
                <div className="font-bold text-sm">{selectedCompany?.name || "Company"}</div>
                <div className="text-[11px] text-zinc-600">Pay Slip for the period {periodLabel}</div>
              </div>

              {/* Employee particulars */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 px-4 py-2 text-[11px] border-b border-zinc-300">
                <Field label="Employee Name" value={detail.employee.name} bold />
                <Field label="Employee Number" value={detail.employee.emp_number} />
                <Field label="Designation" value={detail.employee.designation} />
                <Field label="Department" value={detail.employee.department} />
                <Field label="Date of Joining" value={detail.employee.date_of_joining} />
                <Field label="PAN" value={detail.employee.pan} />
                <Field label="Bank Name" value={detail.employee.bank_name} />
                <Field label="Account No." value={detail.employee.account_no} />
                <Field label="Branch / IFSC" value={`${detail.employee.branch} / ${detail.employee.ifsc_code}`} />
                <Field label="UAN" value={detail.employee.uan} />
                <Field label="Present" value={String(detail.attendance.present)} />
                <Field label="Absent / Leave" value={`${detail.attendance.absent} / ${detail.attendance.leave}`} />
              </div>

              {/* Earnings | Deductions */}
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-zinc-400">
                    <th className="px-3 py-1.5 text-left font-bold w-1/2 border-r border-zinc-300">Earnings</th>
                    <th className="px-3 py-1.5 text-right font-bold w-24 border-r-2 border-zinc-400">Amount</th>
                    <th className="px-3 py-1.5 text-left font-bold w-1/2 border-r border-zinc-300">Deductions</th>
                    <th className="px-3 py-1.5 text-right font-bold w-24">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(detail.earnings.length, detail.deductions.length, 1) }).map((_, i) => {
                    const e = detail.earnings[i];
                    const d = detail.deductions[i];
                    return (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="px-3 py-1 border-r border-zinc-300">{e?.pay_head ?? ""}</td>
                        <td className="px-3 py-1 text-right border-r-2 border-zinc-400">{e ? fmtAmount(e.amount) : ""}</td>
                        <td className="px-3 py-1 border-r border-zinc-300">{d?.pay_head ?? ""}</td>
                        <td className="px-3 py-1 text-right">{d ? fmtAmount(d.amount) : ""}</td>
                      </tr>
                    );
                  })}
                  {/* Totals */}
                  <tr className="border-t-2 border-zinc-400 font-bold">
                    <td className="px-3 py-1.5 border-r border-zinc-300">Total Earnings</td>
                    <td className="px-3 py-1.5 text-right border-r-2 border-zinc-400">{fmtAmount(detail.total_earnings)}</td>
                    <td className="px-3 py-1.5 border-r border-zinc-300">Total Deductions</td>
                    <td className="px-3 py-1.5 text-right">{fmtAmount(detail.total_deductions)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Net pay */}
              <div className="border-t-2 border-zinc-900 px-4 py-2 flex items-center justify-between font-bold text-xs">
                <span>Net Amount</span>
                <span>{fmtAmount(detail.net_amount)}</span>
              </div>
            </div>
          ) : null}
        </div>
        <FooterBar>
          <button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Employee Selection</button>
        </FooterBar>
      </div>
    );
  }

  // ── Multi Pay Slip (All Items) ───────────────────────────────────────────
  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading Pay Slip...</div>;
  }
  if (error) {
    return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">{error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-900">
            {/* Report sub-title row */}
            <tr className="bg-[#f4f4f5]">
              <th colSpan={6} className="px-3 py-0.5 text-left font-normal italic text-zinc-500">
                For all employees
              </th>
              <th className="px-3 py-0.5 text-right font-normal text-zinc-500">
                {periodLabel}
              </th>
            </tr>
            {/* Column headers */}
            <tr className="border-t border-zinc-200">
              <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Employee Number</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Account No.</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Bank Name</th>
              <th className="px-3 py-1.5 text-left font-bold w-28">Branch</th>
              <th className="px-3 py-1.5 text-right font-bold w-32">Amount</th>
              <th className="px-3 py-1.5 text-left font-bold w-44">E-Mail ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === focusedIdx;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setFocusedIdx(idx)}
                    onDoubleClick={() => loadDetail(row.employee_id, row.particulars)}
                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                      isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    <td className="px-3 py-1.5">{row.particulars}</td>
                    <td className="px-3 py-1.5">{row.emp_number}</td>
                    <td className="px-3 py-1.5">{row.account_no}</td>
                    <td className="px-3 py-1.5">{row.bank_name}</td>
                    <td className="px-3 py-1.5">{row.branch}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtAmount(Number(row.amount) || 0)}</td>
                    <td className="px-3 py-1.5">{row.email_id}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total */}
      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] shrink-0 select-none">
        <table className="w-full text-[11px] font-mono">
          <tbody>
            <tr className="font-bold text-zinc-900">
              <td className="px-3 py-1.5">Grand Total</td>
              <td className="w-32" />
              <td className="w-32" />
              <td className="w-32" />
              <td className="w-28" />
              <td className="px-3 py-1.5 text-right w-32 font-mono">{fmtAmount(grandTotal)}</td>
              <td className="w-44" />
            </tr>
          </tbody>
        </table>
      </div>

      <FooterBar>
        <button onClick={backToSelect} className="hover:underline hover:text-zinc-900">Q: Back to Employee Selection</button>
        <span className="text-zinc-400">Enter / double-click: open individual Pay Slip</span>
      </FooterBar>
    </div>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-zinc-500 w-32 shrink-0">{label}</span>
      <span className="text-zinc-500">:</span>
      <span className={`truncate ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
