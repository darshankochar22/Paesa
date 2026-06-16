import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";

const inr = (n: number) =>
  `₹${(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type BankLedger = { ledger_id: number; name: string; group_name?: string };
type StatementRow = {
  entry_id: number;
  voucher_id: number;
  voucher_number?: string;
  date: string;
  type: string;
  amount: number;
  is_reconciled: boolean;
  bank_reference?: string | null;
  balance: number;
};
type Summary = {
  ledger_name?: string;
  book_balance: number;
  reconciled_amount: number;
  unreconciled_amount: number;
  total_reconciled_count: number;
};

const menuSections = [
  {
    label: "Reconciliation",
    items: [
      { name: "Banking Activities", shortcut: "F7", desc: "Bank Reconciliation Statement (BRS)" },
      { name: "Imported Bank Data", shortcut: "F8", desc: "Awaiting e-Statement parsing" },
    ],
  },
  {
    label: "Cheque Management",
    items: [
      { name: "Cheque Printing", shortcut: "F2", desc: "Multi-cheque layout alignment" },
      { name: "Cheque Register", shortcut: "F3", desc: "Clearing status & void registers" },
      { name: "Post Dated Summary", shortcut: "F4", desc: "Future liquidity & PDC items" },
    ],
  },
  {
    label: "Other Slip Reports",
    items: [
      { name: "Deposit Slip", shortcut: "F5", desc: "Cash & cheque physical deposit books" },
      { name: "Payment Advice", shortcut: "F6", desc: "Email/print payment instructions" },
    ],
  },
];

const UTILITY_DETAILS: Record<
  string,
  {
    title: string;
    description: string;
    actionLabel: string;
    stats: { label: string; value: string; detail?: string }[];
  }
> = {
  "Banking Activities": {
    title: "Bank Reconciliation Statement (BRS)",
    description: "Verify and reconcile general bank account ledger entries against statement feeds.",
    actionLabel: "Start Reconciling",
    stats: [
      { label: "BRS Status", value: "Out of Date", detail: "Last reconciled: 30-Apr-2026" },
      { label: "SBI Current A/c Ledger", value: "₹12,45,210.50", detail: "Books balance" },
      { label: "Bank Statement Balance", value: "₹12,38,100.50", detail: "Live e-Statement feed" },
      { label: "Difference to Match", value: "₹7,110.00", detail: "3 outstanding transaction items" },
    ],
  },
  "Imported Bank Data": {
    title: "Imported Bank Feed Data",
    description: "Ingest CSV, MT940, or OFX statement files to automate match generation.",
    actionLabel: "Import Statement",
    stats: [
      { label: "Awaiting Import", value: "1 Feed Ready", detail: "Parsed from API webhook" },
      { label: "Last Ingested", value: "15-May-2026", detail: "148 transactions processed" },
      { label: "Auto-Match Rate", value: "92.4%", detail: "High-confidence ledger pairing" },
    ],
  },
  "Cheque Printing": {
    title: "Cheque Printing Utility",
    description: "Calibrate alignment dimensions and batch print physical bank cheques.",
    actionLabel: "Calibrate Alignment",
    stats: [
      { label: "Preferred Bank", value: "State Bank of India Current Account" },
      { label: "Pending Queue", value: "8 Cheques", detail: "Awaiting batch layout rendering" },
      { label: "Last Printed Slip", value: "Chq No. 109842", detail: "₹85,000 to Sigma Logistics" },
      { label: "Printer Source", value: "Bypass Tray (A4)", detail: "Ready to print" },
    ],
  },
  "Cheque Register": {
    title: "Clearing Cheque Register",
    description: "Consolidated book tracking clearance timelines of issued instruments.",
    actionLabel: "Export Register",
    stats: [
      { label: "Total Cheques Issued", value: "42 Instruments", detail: "FY 2026-27" },
      { label: "Cleared & Matched", value: "31", detail: "Matched via statement feeds" },
      { label: "Outstanding Items", value: "9", detail: "Awaiting bank clearing house" },
      { label: "Voided / Cancelled", value: "2", detail: "Spelled/voided with reversed ledger impact" },
    ],
  },
  "Post Dated Summary": {
    title: "Post Dated Cheques (PDC) Summary",
    description: "Overview of receipts and payments scheduled to execute in the future.",
    actionLabel: "View Future Cashflow",
    stats: [
      { label: "PDC Receipts", value: "3 Cheques", detail: "Cumulative: ₹4,50,000" },
      { label: "PDC Payments", value: "1 Cheque", detail: "Cumulative: ₹1,20,000" },
      { label: "Projected Liquidity", value: "+ ₹3,30,000", detail: "Scheduled before 15-Jun-2026" },
    ],
  },
  "Deposit Slip": {
    title: "Bank Deposit Slip Generator",
    description: "Generate and output cash or cheque deposit advice slips for physical dispatch.",
    actionLabel: "Print Deposit Slip",
    stats: [
      { label: "Pending Cash Deposits", value: "3 Entries", detail: "Value: ₹75,000" },
      { label: "Pending Cheque Slips", value: "2 Slips", detail: "Value: ₹1,10,000" },
      { label: "Total Deposit Queue", value: "₹1,85,000", detail: "Ready for bank submission" },
    ],
  },
  "Payment Advice": {
    title: "Payment Advice Notes",
    description: "Email confirmation slips detailing vendor invoices settled in bank transfers.",
    actionLabel: "Batch Email Advices",
    stats: [
      { label: "Generated Advices", value: "15 Notes", detail: "FY 2026-27" },
      { label: "Successfully Sent", value: "12 Sent", detail: "Delivered to vendor invoice desks" },
      { label: "Awaiting Email Setup", value: "3 Pending", detail: "Missing vendor email configs" },
    ],
  },
};

function BrsPanel({ companyId, fyId }: { companyId?: number; fyId?: number }) {
  const [ledgers, setLedgers] = useState<BankLedger[]>([]);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load this company's bank ledgers (groups whose name contains "Bank").
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const res = await window.api.ledger.getAll(companyId);
      if (cancelled) return;
      const all = (res.success ? res.ledgers : []) as BankLedger[];
      const banks = all.filter((l) => (l.group_name ?? "").toLowerCase().includes("bank"));
      setLedgers(banks);
      setLedgerId((prev) => prev ?? banks[0]?.ledger_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const reload = useCallback(async () => {
    if (!companyId || !fyId || !ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const [sumRes, stmtRes] = await Promise.all([
        window.api.banking.getSummary(companyId, fyId, ledgerId),
        window.api.banking.getStatement(companyId, fyId, ledgerId),
      ]);
      if (sumRes.success) setSummary(sumRes); else setError(sumRes.error || "Failed to load summary");
      setRows(stmtRes.success ? stmtRes.rows : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, ledgerId]);

  useEffect(() => { reload(); }, [reload]);

  const reconcile = async (r: StatementRow) => {
    if (!ledgerId) return;
    const bank_reference = window.prompt("Bank reference (cheque / UTR / NEFT no.):", r.bank_reference || "");
    if (bank_reference === null) return;
    const bank_date = window.prompt("Bank date (YYYY-MM-DD):", r.date) || undefined;
    const res = await window.api.banking.reconcile({
      entry_id: r.entry_id,
      voucher_id: r.voucher_id,
      ledger_id: ledgerId,
      bank_reference: bank_reference || undefined,
      bank_date,
      reconciled_date: new Date().toISOString().slice(0, 10),
    });
    if (!res.success) { setError(res.error || "Reconcile failed"); return; }
    reload();
  };

  const unreconcile = async (r: StatementRow) => {
    const res = await window.api.banking.unreconcile(r.entry_id);
    if (!res.success) { setError(res.error || "Unreconcile failed"); return; }
    reload();
  };

  if (!companyId || !fyId) {
    return <div className="text-[11px] text-zinc-500 p-4">Select a company and financial year to begin reconciliation.</div>;
  }

  const stat = (label: string, value: string, detail?: string) => (
    <div className="grid grid-cols-12 items-center px-4 py-3">
      <span className="col-span-5 font-semibold text-zinc-400">{label}</span>
      <span className="col-span-1 text-zinc-300">:</span>
      <div className="col-span-6 flex flex-col">
        <span className="font-bold text-zinc-900 text-xs">{value}</span>
        {detail && <span className="text-[10px] text-zinc-500 font-sans mt-0.5">{detail}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      {/* Header + ledger picker */}
      <div className="border border-zinc-200 bg-white rounded-lg p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">Bank Reconciliation Statement (BRS)</h2>
        <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
          Reconcile bank ledger entries against your bank statement.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Bank Ledger</span>
          {ledgers.length === 0 ? (
            <span className="text-[11px] text-amber-600">No bank ledgers found (create a ledger under a Bank group).</span>
          ) : (
            <select
              value={ledgerId ?? ""}
              onChange={(e) => setLedgerId(Number(e.target.value))}
              className="text-[11px] border border-zinc-300 rounded px-2 py-1 bg-white"
            >
              {ledgers.map((l) => (
                <option key={l.ledger_id} value={l.ledger_id}>{l.name}</option>
              ))}
            </select>
          )}
          <button onClick={reload} className="ml-auto text-[10px] px-2 py-1 font-bold border border-zinc-300 rounded hover:bg-zinc-50">
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="text-[11px] text-red-600 border border-red-200 bg-red-50 rounded p-2">{error}</div>}

      {/* Summary */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">BRS Summary{summary?.ledger_name ? ` — ${summary.ledger_name}` : ""}</span>
          <span className={`w-2.5 h-2.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
        </div>
        <div className="divide-y divide-zinc-100">
          {stat("Book Balance", summary ? inr(summary.book_balance) : "—", "Bank ledger balance in books")}
          {stat("Reconciled", summary ? inr(summary.reconciled_amount) : "—", summary ? `${summary.total_reconciled_count} entries matched` : undefined)}
          {stat("Unreconciled", summary ? inr(summary.unreconciled_amount) : "—", "Difference still to match")}
        </div>
      </div>

      {/* Statement / entries */}
      <div className="border border-zinc-200 bg-white rounded-lg overflow-hidden shadow-sm">
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Ledger Entries</span>
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-zinc-50/80 text-zinc-400 sticky top-0">
              <tr className="text-left">
                <th className="px-3 py-1.5 font-bold">Date</th>
                <th className="px-3 py-1.5 font-bold">Vch No.</th>
                <th className="px-3 py-1.5 font-bold text-right">Amount</th>
                <th className="px-3 py-1.5 font-bold text-right">Balance</th>
                <th className="px-3 py-1.5 font-bold text-center">Status</th>
                <th className="px-3 py-1.5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-400">{loading ? "Loading…" : "No entries for this ledger."}</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.entry_id} className="hover:bg-zinc-50/40">
                  <td className="px-3 py-1.5 text-zinc-600">{r.date}</td>
                  <td className="px-3 py-1.5 text-zinc-600">{r.voucher_number || `#${r.voucher_id}`}</td>
                  <td className="px-3 py-1.5 text-right font-semibold text-zinc-900">
                    {r.type === "Dr" ? "" : "-"}{inr(r.amount)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-500">{inr(r.balance)}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.is_reconciled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.is_reconciled ? `Reconciled${r.bank_reference ? ` · ${r.bank_reference}` : ""}` : "Pending"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {r.is_reconciled ? (
                      <button onClick={() => unreconcile(r)} className="text-[10px] font-bold text-zinc-500 hover:text-red-600">Unreconcile</button>
                    ) : (
                      <button onClick={() => reconcile(r)} className="text-[10px] font-bold text-zinc-900 hover:text-emerald-700">Reconcile</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Banking() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [activeItem, setActiveItem] = useState<string>("Banking Activities");

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
      if (e.key === "F2") {
        e.preventDefault();
        setActiveItem("Cheque Printing");
      }
      if (e.key === "F3") {
        e.preventDefault();
        setActiveItem("Cheque Register");
      }
      if (e.key === "F4") {
        e.preventDefault();
        setActiveItem("Post Dated Summary");
      }
      if (e.key === "F5") {
        e.preventDefault();
        setActiveItem("Deposit Slip");
      }
      if (e.key === "F6") {
        e.preventDefault();
        setActiveItem("Payment Advice");
      }
      if (e.key === "F7") {
        e.preventDefault();
        setActiveItem("Banking Activities");
      }
      if (e.key === "F8") {
        e.preventDefault();
        setActiveItem("Imported Bank Data");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const bankingActions = [
    { key: "F7", label: "BRS View", onClick: () => setActiveItem("Banking Activities") },
    { key: "F8", label: "Bank Feed", onClick: () => setActiveItem("Imported Bank Data") },
    { key: "F2", label: "Chq Print", onClick: () => setActiveItem("Cheque Printing") },
    { key: "F3", label: "Chq Register", onClick: () => setActiveItem("Cheque Register") },
    { key: "F4", label: "PDC Summary", onClick: () => setActiveItem("Post Dated Summary") },
    { key: "F5", label: "Deposit Slip", onClick: () => setActiveItem("Deposit Slip") },
    { key: "F6", label: "Payment Advice", onClick: () => setActiveItem("Payment Advice") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  const currentDetails = UTILITY_DETAILS[activeItem] || UTILITY_DETAILS["Banking Activities"];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 text-xs select-none relative overflow-hidden">
      
      {/* Title Bar */}
      <PageTitleBar title="Banking Utilities" subtitle={selectedCompany?.name} />

      {/* Main Body Layout */}
      <div className="flex-1 flex min-h-0">
        
        {/* Left Side: Option Selection Panels */}
        <div className="w-[340px] border-r border-zinc-200 flex flex-col shrink-0 bg-white p-4 overflow-y-auto">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-4">
            Select Banking Utility
          </div>

          <div className="space-y-5">
            {menuSections.map((section) => (
              <div key={section.label} className="space-y-1.5">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                  {section.label}
                </div>
                <div className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const isSelected = activeItem === item.name;
                    return (
                      <div
                        key={item.name}
                        onClick={() => setActiveItem(item.name)}
                        className={`flex flex-col p-2.5 rounded border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-zinc-950 border-zinc-950 text-white shadow-sm"
                            : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold">{item.name}</span>
                          <span
                            className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                              isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {item.shortcut}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] mt-1 ${
                            isSelected ? "text-zinc-400" : "text-zinc-500"
                          }`}
                        >
                          {item.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>


        <div className="flex-1 flex flex-col p-6 min-w-0 overflow-y-auto bg-zinc-50/50">
          {activeItem === "Banking Activities" ? (
            <BrsPanel companyId={selectedCompany?.company_id} fyId={activeFY?.fy_id} />
          ) : (
          <div className="max-w-xl w-full mx-auto space-y-6">

            <div className="border border-zinc-200 bg-white rounded-lg p-5 shadow-sm space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                {currentDetails.title}
              </h2>
              <p className="text-[11px] text-zinc-500 font-sans leading-relaxed">
                {currentDetails.description}
              </p>
            </div>

            <div className="border border-zinc-200 bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Live Ledger & Process Monitor</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="System feeds operational" />
              </div>
              
              <div className="divide-y divide-zinc-100">
                {currentDetails.stats.map((stat, idx) => (
                  <div key={idx} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-zinc-50/30">
                    <span className="col-span-4 font-semibold text-zinc-400">{stat.label}</span>
                    <span className="col-span-1 text-zinc-300">:</span>
                    <div className="col-span-7 flex flex-col">
                      <span className="font-bold text-zinc-900 text-xs">{stat.value}</span>
                      {stat.detail && (
                        <span className="text-[10px] text-zinc-500 font-sans mt-0.5">{stat.detail}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>


            <div className="flex gap-3 justify-end">
              <button
                onClick={() => alert(`${currentDetails.title} action triggered.`)}
                className="text-xs px-5 py-2 font-bold bg-zinc-950 text-white hover:bg-zinc-800 rounded transition-all shadow-sm active:scale-95 duration-100 uppercase tracking-wide"
              >
                {currentDetails.actionLabel}
              </button>
            </div>

          </div>
          )}
        </div>

        <RightActionPanel actions={bankingActions} />

      </div>

    </div>
  );
}