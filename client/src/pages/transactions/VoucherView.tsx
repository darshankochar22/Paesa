import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { AlertBanner } from "../../components/ui";
import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/utils";
import { exportElementToPdf } from "@/lib/exportDomPdf";

interface VoucherEntry {
  entry_id: number;
  ledger_id: number;
  ledger_name: string;
  type: "Dr" | "Cr";
  amount: number;
  amount_forex: number;
  currency: string;
  narration: string | null;
}

interface StockBatch {
  batch_id: number;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  rate: number;
}

interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
  additional_amount: number;
  discount_amount: number;
  hsn_code: string;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  is_source: number;
  batches: StockBatch[];
}

interface PayrollEntry {
  payroll_entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_number: string;
  pay_head_id: number;
  pay_head_name: string;
  amount: number;
}

interface BillReference {
  bill_id: number;
  ledger_id: number;
  bill_name: string;
  bill_type: string;
  amount: number;
  credit_period: string;
  due_date: string;
}

interface BankDetails {
  transaction_type: string;
  cheque_range: string;
  instrument_number: string;
  instrument_date: string;
  bank_name: string;
  branch: string;
  amount: number;
}

interface CostCentreEntry {
  cost_centre_id: number;
  amount: number;
}

interface CashDenomination {
  denomination: string;
  quantity: number;
  amount: number;
}

interface ReceiptDetails {
  receipt_note_no: string;
  receipt_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

interface PartyDetails {
  supplier_name: string;
  mailing_name: string;
  address: string;
  state: string;
  country: string;
}

interface DispatchDetails {
  delivery_note_nos: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

interface NoteDetails {
  tracking_no: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
  original_invoice_no: string;
  original_invoice_date: string;
}

interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  status: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  place_of_supply: string | null;
  is_invoice: number;
  is_accounting_voucher: number;
  is_inventory_voucher: number;
  is_order_voucher: number;
  is_cancelled: number;
  is_optional: number;
  is_post_dated: number;
  created_at: string;
  updated_at: string;
  entries: VoucherEntry[];
  stock_entries: StockEntry[];
  payroll_entries: PayrollEntry[];
  bill_references: BillReference[];
  bank_details: BankDetails | null;
  cost_centres: CostCentreEntry[];
  cash_denominations: CashDenomination[];
  receipt_details: ReceiptDetails | null;
  party_details: PartyDetails | null;
  dispatch_details: DispatchDetails | null;
  credit_note_details: NoteDetails | null;
  debit_note_details: NoteDetails | null;
}

const formatDate = (d: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateBox = (d: string | null) => {
  if (!d) return { date: "—", day: "" };
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { date: d, day: "" };
  return {
    date: dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }),
    day: dt.toLocaleDateString("en-IN", { weekday: "long" }),
  };
};

const formatAmount = (n: number | null | undefined) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQty = (n: number | null | undefined) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function ReadOnlyFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-gray-300 shrink-0 py-1 px-3 flex items-center">
      <span className="text-sm text-black shrink-0 w-40">{label}</span>
      <span className="text-sm text-black shrink-0 mr-2">:</span>
      <span className="text-sm font-semibold text-black flex-1">{value || "—"}</span>
    </div>
  );
}

function ReadOnlyStockTable({ entries }: { entries: StockEntry[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
        <div className="w-24 text-right text-sm font-semibold text-black">Quantity</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Rate per</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((item) => (
          <div key={item.stock_entry_id}>
            <div className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
              <div className="flex-1 text-sm text-black font-semibold">{item.item_name || "—"}</div>
              <div className="w-24 text-right text-sm text-black">{formatQty(item.quantity)}</div>
              <div className="w-32 text-right text-sm text-black">{formatAmount(item.rate)}</div>
              <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(item.amount)}</div>
            </div>
            {item.batches?.length > 0 && (
              <div className="px-6 py-1 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 flex gap-4">
                {item.batches.map(b => (
                  <span key={b.batch_id}>
                    Batch: <strong>{b.batch_number}</strong>
                    {b.expiry_date && <> | Expiry: {formatDate(b.expiry_date)}</>}
                    {b.quantity ? <> | Qty: {formatQty(b.quantity)}</> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
          <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
        {total > 0 && (
          <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
            <div className="flex-1 text-xs text-gray-700">Subtotal</div>
            <div className="w-24 text-right pr-1" />
            <div className="w-32 text-right pr-1" />
            <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(total)}</div>
          </div>
        )}
      </div>
    </>
  );
}

function ReadOnlyParticularsTable({ entries }: { entries: { ledger_name: string; amount: number }[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((row, idx) => (
          <div key={idx} className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
            <div className="flex-1 text-sm text-black">{row.ledger_name || "—"}</div>
            <div className="w-40 text-right text-sm font-semibold text-black">{formatAmount(row.amount)}</div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 10 - entries.length) }).map((_, i) => (
          <div key={`ep-${i}`} className="flex border-b border-gray-50 min-h-[22px]">
            <div className="flex-1 px-3" />
            <div className="w-40 pr-3" />
          </div>
        ))}
      </div>
      <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-xs text-gray-600">
          {Math.abs(total) < 0.01 ? "" : "Total:"}
        </div>
        <div className="w-40 text-right text-sm font-bold text-black pr-0">
          {total > 0 ? formatAmount(total) : ""}
        </div>
      </div>
    </>
  );
}

function ReadOnlyBillReferences({
  bills,
  ledgerNames,
}: {
  bills: BillReference[];
  ledgerNames: Record<number, string>;
}) {
  // Group bill-wise allocations under their party ledger (Sundry Debtors/Creditors).
  const byLedger = bills.reduce<Record<number, BillReference[]>>((acc, b) => {
    (acc[b.ledger_id] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="border-b border-gray-300 shrink-0 bg-gray-50">
      <div className="px-3 py-0.5 border-b border-gray-200 text-xs font-semibold text-gray-700">
        Bill-wise Details
      </div>
      {Object.entries(byLedger).map(([lid, rows]) => (
        <div key={lid} className="px-3 py-1">
          <div className="text-xs font-semibold text-black">
            {ledgerNames[Number(lid)] || `Ledger #${lid}`}
          </div>
          {rows.map((b) => (
            <div key={b.bill_id} className="flex items-center min-h-[20px] pl-4 text-xs text-black">
              <div className="w-28 text-gray-600">{b.bill_type || "—"}</div>
              <div className="flex-1 font-medium">{b.bill_name || "—"}</div>
              {b.due_date && <div className="w-32 text-gray-600">Due: {formatDate(b.due_date)}</div>}
              <div className="w-32 text-right font-bold">{formatAmount(b.amount)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReadOnlyDoubleEntryTable({
  entries,
  balances,
}: {
  entries: VoucherEntry[];
  balances: Record<number, string>;
}) {
  const drTotal = entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal = entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-1 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-36 text-right text-sm font-semibold text-black">Debit</div>
        <div className="w-36 text-right text-sm font-semibold text-black">Credit</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((entry) => {
          const bal = balances[entry.ledger_id];
          return (
            <div key={entry.entry_id} className="border-b border-gray-100 px-3 py-1.5">
              <div className="flex items-start">
                <div className="w-6 text-sm font-semibold text-black shrink-0">{entry.type}</div>
                <div className="flex-1 text-sm font-bold text-black">{entry.ledger_name || `Ledger #${entry.ledger_id}`}</div>
                <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
                  {entry.type === "Dr" ? formatAmount(entry.amount) : ""}
                </div>
                <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
                  {entry.type === "Cr" ? formatAmount(entry.amount) : ""}
                </div>
              </div>
              {bal && (
                <div className="pl-6 text-xs italic">
                  Cur Bal:{" "}
                  <span className={bal.includes("Cr") ? "text-red-600 font-semibold" : "text-zinc-500 font-semibold"}>
                    {bal}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
          <div key={`de-${i}`} className="flex border-b border-gray-50 min-h-[28px]">
            <div className="w-6" />
            <div className="flex-1 px-3" />
            <div className="w-36 pr-3" />
            <div className="w-36 pr-3" />
          </div>
        ))}
      </div>
      <div className="flex border-t-2 border-double border-black shrink-0 px-3 py-1 bg-white">
        <div className="flex-1" />
        <div className="w-36 text-right text-sm font-bold text-black tabular-nums">{formatAmount(drTotal)}</div>
        <div className="w-36 text-right text-sm font-bold text-black tabular-nums">{formatAmount(crTotal)}</div>
      </div>
    </>
  );
}

function ReadOnlyPayrollTable({ entries }: { entries: PayrollEntry[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="w-20 text-sm font-semibold text-black">Emp. Code</div>
        <div className="flex-1 text-sm font-semibold text-black">Employee Name</div>
        <div className="flex-1 text-sm font-semibold text-black">Pay Head</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((p) => (
          <div key={p.payroll_entry_id} className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
            <div className="w-20 text-sm text-black">{p.employee_number || "—"}</div>
            <div className="flex-1 text-sm text-black font-semibold">{p.employee_name || "—"}</div>
            <div className="flex-1 text-sm text-black">{p.pay_head_name || "—"}</div>
            <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(p.amount)}</div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
          <div key={`pe-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
      </div>
      {total > 0 && (
        <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1" />
          <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(total)}</div>
        </div>
      )}
    </>
  );
}

function FKeyPanel({ voucherType }: { voucherType: string }) {
  const top = [
    ["F2", "Date"],
    ["F3", "Company/Tax Registration"],
    ["F4", "Contra"],
    ["F5", "Payment"],
    ["F6", "Receipt"],
    ["F7", "Journal"],
    ["F8", "Sales"],
    ["F9", "Purchase"],
    ["F10", "Other Vouchers"],
  ];
  const bottom = [
    ["F", "Autofill"],
    ["H", "Change Mode"],
    ["I", "More Details"],
    ["O", "Related Reports"],
  ];
  const tail = [
    ["L", "Optional"],
    ["T", "Post-Dated"],
  ];

  const renderRow = ([key, label]: string[]) => {
    const active = label.toLowerCase() === voucherType.toLowerCase();
    return (
      <div
        key={key}
        className={cn(
          "flex items-center justify-between px-2 py-1.5 border-b border-zinc-100 text-xs",
          active ? "bg-[#ffcc00] text-zinc-950 font-bold" : "text-zinc-700"
        )}
      >
        <span><span className="underline">{key[0]}</span>{key.slice(1)}: {label}</span>
        <span className="text-zinc-400">‹</span>
      </div>
    );
  };

  return (
    <div className="w-56 shrink-0 border-l border-zinc-300 bg-[#e5eff5] overflow-y-auto">
      <div className="py-1">{top.map(renderRow)}</div>
      <div className="py-1 border-t border-zinc-300">{bottom.map(renderRow)}</div>
      <div className="py-1 border-t border-zinc-300">{tail.map(renderRow)}</div>
    </div>
  );
}

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [balances, setBalances] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.voucher.getById(Number(id));
        if (res.success) setVoucher(res.voucher as Voucher);
        else setError(res.error || "Voucher not found");
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!voucher || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    const uniqueLedgerIds = Array.from(
      new Set(voucher.entries.map(e => e.ledger_id).filter(Boolean))
    );
    if (uniqueLedgerIds.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          uniqueLedgerIds.map(lid =>
            window.api.voucher
              .getLedgerBalance(lid, selectedCompany.company_id, activeFY.fy_id)
              .then((r: any) => [lid, r?.success ? r.balance : null] as const)
              .catch(() => [lid, null] as const)
          )
        );
        const map: Record<number, string> = {};
        for (const [lid, bal] of results) if (bal) map[lid] = bal;
        setBalances(map);
      } catch {
        // Non-critical — balances are a nice-to-have, don't block the view.
      }
    })();
  }, [voucher, selectedCompany?.company_id, activeFY?.fy_id]);

  const handleDelete = async () => {
    if (!voucher) return;
    if (!window.confirm(`Permanently delete voucher ${voucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.delete(voucher.voucher_id);
      if (res.success) navigate(-1);
      else setError(res.error || "Failed to delete");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCancel = async () => {
    if (!voucher) return;
    if (!window.confirm(`Cancel voucher ${voucher.voucher_number}? This cannot be undone.`)) return;
    try {
      const res = await window.api.voucher.cancel(voucher.voucher_id);
      if (res.success) {
        setVoucher({ ...voucher, is_cancelled: 1 });
      } else {
        setError(res.error || "Failed to cancel");
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleExportPdf = async () => {
    if (!voucher) return;
    const el = document.getElementById("voucher-print-area");
    if (!el) return;
    setExporting(true);
    setError(null);
    try {
      const name = `${voucher.voucher_type}_${voucher.voucher_number || voucher.voucher_id}`;
      const res = await exportElementToPdf(el as HTMLElement, name);
      if (!res.success && !res.canceled) setError(res.error || "Failed to export PDF");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
        Loading voucher…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
        <span className="text-red-600">{error}</span>
        <Button
          onClick={() => navigate(-1)}
          variant="link"
          size="xs"
          className="h-auto p-0 text-xs text-zinc-500 underline hover:text-zinc-900"
        >
          ← Go Back
        </Button>
      </div>
    );
  }

  if (!voucher) return null;



  const hasEntries = voucher.entries.length > 0;
  const hasStock = voucher.stock_entries.length > 0;
  const isSalesPurchase = ["Sales", "Purchase", "Credit Note", "Debit Note"].includes(voucher.voucher_type);
  const isSingleEntry = ["Receipt", "Payment", "Contra", "Journal"].includes(voucher.voucher_type);
  const isInventoryOnly = ["Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out", "Physical Stock", "Stock Journal", "Manufacturing Journal"].includes(voucher.voucher_type);
  const isPayrollVoucher = voucher.voucher_type === "Payroll";
  const isAttendanceVoucher = voucher.voucher_type === "Attendance";

  const getTitle = () => {
    if (isAttendanceVoucher) return "Attendance Voucher Alteration (Secondary)";
    if (isPayrollVoucher) return "Payroll Voucher Alteration (Secondary)";
    if (isInventoryOnly) return "Inventory Voucher Alteration (Secondary)";
    return "Accounting Voucher Alteration (Secondary)";
  };

  // Credit Note is treated exactly like Sales (Party Dr, ledger Cr, "Sales ledger" label)
  // Debit Note is treated exactly like Purchase (ledger Dr, Party Cr, "Purchase ledger" label)
  const isSalesLike = ["Sales", "Credit Note"].includes(voucher.voucher_type);
  const mainLedger = isSalesPurchase ? voucher.entries.find(e =>
    isSalesLike ? e.type === "Cr" : e.type === "Dr"
  ) : null;

  const accountLedger = isSingleEntry ? voucher.entries.find(e => e.type === "Dr") || voucher.entries[0] : null;

  const particulars = isSingleEntry && voucher.entries.length > 1
    ? voucher.entries.filter(e => e.ledger_name !== accountLedger?.ledger_name)
    : [];

  const additionalEntries = mainLedger
    ? voucher.entries.filter(e => e.ledger_name !== mainLedger.ledger_name && e.ledger_name !== voucher.party_name)
    : [];

  const ledgerNames = voucher.entries.reduce<Record<number, string>>((acc, e) => {
    if (e.ledger_id) acc[e.ledger_id] = e.ledger_name;
    return acc;
  }, {});

  const { date: dateStr, day: dayStr } = formatDateBox(voucher.date);
  const showDoubleEntryTable = (!isSingleEntry && !isSalesPurchase && hasEntries) ||
    (isSingleEntry && voucher.entries.length <= 2 && hasEntries);

  return (
    <div className="flex-1 flex flex-col bg-white text-black text-sm select-none overflow-hidden min-h-0">
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-300 bg-[#bfe1f0] shrink-0">
        <span className="text-sm font-bold text-zinc-900">{getTitle()}</span>
        <span className="text-sm font-bold text-zinc-900">
          {selectedCompany?.name ?? ""}
          {voucher.is_cancelled ? " · CANCELLED" : ""}
          {voucher.is_post_dated ? " · POST-DATED" : ""}
        </span>
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-700 text-sm font-bold hover:opacity-60 leading-none"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          id="voucher-print-area"
          data-filename={`${voucher.voucher_type}_${voucher.voucher_number || voucher.voucher_id}`}
          className="flex-1 flex flex-col min-h-0 overflow-y-auto"
        >
          <div className="flex items-center px-3 py-1.5 border-b border-black bg-white shrink-0">
            <div className="text-sm font-bold text-white bg-[#2f7ab8] px-3 py-0.5 min-w-[90px] text-center">
              {voucher.voucher_type}
            </div>
            <span className="text-sm text-black ml-3">No.</span>
            <span className="text-sm font-bold text-black ml-2 mr-6">{voucher.voucher_number}</span>
            <div className="flex-1" />
            <div className="bg-[#ffcc00] px-3 py-0.5 text-right">
              <div className="text-sm font-bold text-zinc-900">{dateStr}</div>
              {dayStr && <div className="text-[10px] text-zinc-700">{dayStr}</div>}
            </div>
          </div>

          {voucher.voucher_type === "Purchase" && (voucher.supplier_invoice_no || voucher.supplier_invoice_date) && (
            <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
              {voucher.supplier_invoice_no && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black shrink-0">Supplier Invoice No.</span>
                  <span className="text-sm text-black shrink-0">:</span>
                  <span className="text-sm font-semibold text-black">{voucher.supplier_invoice_no}</span>
                </div>
              )}
              {voucher.supplier_invoice_date && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black shrink-0">Date</span>
                  <span className="text-sm text-black shrink-0">:</span>
                  <span className="text-sm font-semibold text-black">{formatDate(voucher.supplier_invoice_date)}</span>
                </div>
              )}
            </div>
          )}

          {voucher.party_name && (
            <ReadOnlyFieldRow label="Party A/c name" value={voucher.party_name} />
          )}

          {isSalesPurchase && mainLedger && (
            <ReadOnlyFieldRow
              label={isSalesLike ? "Sales ledger" : "Purchase ledger"}
              value={mainLedger.ledger_name}
            />
          )}

          {(hasStock || hasEntries) && <div className="border-b border-black shrink-0" />}

          {hasStock && <ReadOnlyStockTable entries={voucher.stock_entries} />}

          {isSalesPurchase && additionalEntries.length > 0 && (
            <div className="border-b border-gray-300 shrink-0">
              {additionalEntries.map((row, idx) => (
                <div key={idx} className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
                  <div className="w-10 text-center">
                    <Badge
                      variant="outline"
                      className="h-auto rounded border-0 bg-transparent px-0 py-0 text-xs font-semibold text-black"
                    >
                      {row.type}
                    </Badge>
                  </div>
                  <div className="flex-1 text-sm text-black pl-2">{row.ledger_name || "—"}</div>
                  <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(row.amount)}</div>
                </div>
              ))}
            </div>
          )}

          {isSingleEntry && particulars.length > 0 && !showDoubleEntryTable && (
            <ReadOnlyParticularsTable
              entries={particulars.map(e => ({ ledger_name: e.ledger_name, amount: e.amount }))}
            />
          )}

          {showDoubleEntryTable && (
            <ReadOnlyDoubleEntryTable entries={voucher.entries} balances={balances} />
          )}

          {voucher.bill_references?.length > 0 && (
            <ReadOnlyBillReferences bills={voucher.bill_references} ledgerNames={ledgerNames} />
          )}

          {voucher.payroll_entries?.length > 0 && (
            <ReadOnlyPayrollTable entries={voucher.payroll_entries} />
          )}

          {/* Narration — only thing left at the bottom now */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1.5 bg-white">
            <span className="text-sm text-black shrink-0">Narration:</span>
            <span className="flex-1 text-sm text-black ml-2">{voucher.narration || "—"}</span>
          </div>
        </div>

        <FKeyPanel voucherType={voucher.voucher_type} />
      </div>

      <div className="flex items-center justify-between border-t border-black shrink-0 px-3 py-1.5 bg-white">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 text-sm text-black hover:underline hover:bg-transparent"
        >
          <span className="underline">Q</span>: Quit
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleExportPdf}
            disabled={exporting}
            variant="outline"
            size="xs"
            className="h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100"
          >
            <span className="underline">P</span>: {exporting ? "Exporting…" : "Export PDF"}
          </Button>
          {!voucher.is_cancelled && (
            <Button
              onClick={handleCancel}
              variant="outline"
              size="xs"
              className="h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100"
            >
              <span className="underline">X</span>: Cancel Vch
            </Button>
          )}
          <Button
            onClick={handleDelete}
            size="xs"
            className="h-auto rounded-none text-sm px-3 py-0.5 bg-red-700 text-white hover:bg-red-800"
          >
            <span className="underline">D</span>: Delete
          </Button>
        </div>
      </div>
    </div>
  );
}