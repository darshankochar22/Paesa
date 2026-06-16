import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { AlertBanner } from "../../components/ui";
import { Button } from "@/components/shadcn/button";
import { Badge } from "@/components/shadcn/badge";
import { cn } from "@/lib/utils";

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

const formatAmount = (n: number | null | undefined) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQty = (n: number | null | undefined) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function DrCrBadge({ type }: { type: "Dr" | "Cr" }) {
  const cls = type === "Dr" ? "bg-black text-white" : "bg-zinc-600 text-white";
  return (
    <Badge className={cn("h-auto text-[10px] font-bold px-1.5 py-0.5 rounded", cls)}>
      {type}
    </Badge>
  );
}

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
            {/* Batches */}
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
        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
          <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
        {/* Subtotal */}
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

function ReadOnlyDoubleEntryTable({ entries }: { entries: VoucherEntry[] }) {
  const drTotal = entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal = entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;
  return (
    <>
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="w-10 text-center text-sm font-semibold text-black">Dr/Cr</div>
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((entry) => (
          <div key={entry.entry_id} className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
            <div className="w-10 text-center"><DrCrBadge type={entry.type} /></div>
            <div className="flex-1 text-sm text-black font-semibold">{entry.ledger_name || `Ledger #${entry.ledger_id}`}</div>
            <div className="w-40 text-right text-sm font-bold text-black">{formatAmount(entry.amount)}</div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 8 - entries.length) }).map((_, i) => (
          <div key={`de-${i}`} className="flex border-b border-gray-50 min-h-[22px]">
            <div className="w-10" />
            <div className="flex-1 px-3" />
            <div className="w-40 pr-3" />
          </div>
        ))}
      </div>
      <div className={`flex border-t border-black shrink-0 px-3 py-0.5 bg-white`}>
        <div className="flex-1 text-xs text-gray-600">
          {balanced ? "✓ Balanced" : `Difference: ${formatAmount(Math.abs(drTotal - crTotal))}`}
        </div>
        <div className="w-40 text-right text-sm font-bold text-black pr-0">
          {drTotal > 0 ? formatAmount(drTotal) : ""}
        </div>
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

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-300 px-3 py-1 shrink-0">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{title}</div>
      <div className="grid grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-zinc-100 border border-zinc-100 rounded">
        {children}
      </div>
    </div>
  );
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-1">
      <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">{label}</div>
      <div className="text-xs text-zinc-800 font-semibold truncate" title={value}>{value || "—"}</div>
    </div>
  );
}

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const drTotal = voucher.entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal = voucher.entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
  const stockTotal = voucher.stock_entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalAmount = stockTotal || drTotal || crTotal;

  const hasEntries = voucher.entries.length > 0;
  const hasStock = voucher.stock_entries.length > 0;
  const isSalesPurchase = ["Sales", "Purchase", "Credit Note", "Debit Note"].includes(voucher.voucher_type);
  const isSingleEntry = ["Receipt", "Payment", "Contra", "Journal"].includes(voucher.voucher_type);
  const isInventoryOnly = ["Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out", "Physical Stock", "Stock Journal", "Manufacturing Journal"].includes(voucher.voucher_type);
  const isPayrollVoucher = voucher.voucher_type === "Payroll";
  const isAttendanceVoucher = voucher.voucher_type === "Attendance";

  const getTitle = () => {
    if (isAttendanceVoucher) return "Attendance Voucher View";
    if (isPayrollVoucher) return "Payroll Voucher View";
    if (isInventoryOnly) return "Inventory Voucher View";
    return "Accounting Voucher View";
  };

  // Determine main sales/purchase ledger from entries
  const mainLedger = isSalesPurchase ? voucher.entries.find(e =>
    voucher.voucher_type === "Sales" ? e.type === "Cr" : e.type === "Dr"
  ) : null;

  // Account ledger for single-entry
  const accountLedger = isSingleEntry ? voucher.entries.find(e => e.type === "Dr") || voucher.entries[0] : null;

  // Particulars (non-account entries) for single-entry
  const particulars = isSingleEntry && voucher.entries.length > 1
    ? voucher.entries.filter(e => e.ledger_name !== accountLedger?.ledger_name)
    : [];

  // Additional entries (tax, freight, etc) for sales/purchase
  const additionalEntries = mainLedger
    ? voucher.entries.filter(e => e.ledger_name !== mainLedger.ledger_name && e.ledger_name !== voucher.party_name)
    : [];

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Title bar — matches create page */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-black bg-white shrink-0">
        <span className="text-sm font-semibold text-black">{getTitle()}</span>
        <span className="text-sm text-black">
          {selectedCompany?.name ?? ""}
          {voucher.is_cancelled ? " · CANCELLED" : ""}
          {voucher.is_post_dated ? " · POST-DATED" : ""}
        </span>
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 text-black text-sm font-bold hover:opacity-60 hover:bg-transparent leading-none"
        >
          ✕
        </Button>
      </div>

      {/* Voucher type / number / date bar — matches create page */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {voucher.voucher_type}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{voucher.voucher_number}</span>
        <div className="flex-1" />
        <span className="text-sm font-semibold text-black">{formatDate(voucher.date)}</span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Supplier invoice fields (Purchase) */}
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

          {/* Party A/c name */}
          {voucher.party_name && (
            <ReadOnlyFieldRow label="Party A/c name" value={voucher.party_name} />
          )}

          {/* Sales / Purchase ledger */}
          {isSalesPurchase && mainLedger && (
            <ReadOnlyFieldRow
              label={voucher.voucher_type === "Sales" ? "Sales ledger" : "Purchase ledger"}
              value={mainLedger.ledger_name}
            />
          )}

          {/* Account field (single-entry) */}
          {isSingleEntry && accountLedger && (
            <ReadOnlyFieldRow label="Account" value={accountLedger.ledger_name} />
          )}

          {/* Separator */}
          {(hasStock || hasEntries) && <div className="border-b border-black shrink-0" />}

          {/* Stock entries table */}
          {hasStock && <ReadOnlyStockTable entries={voucher.stock_entries} />}

          {/* Additional ledger entries (tax, freight, discount) */}
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

          {/* Particulars table (single-entry) */}
          {isSingleEntry && particulars.length > 0 && (
            <ReadOnlyParticularsTable
              entries={particulars.map(e => ({ ledger_name: e.ledger_name, amount: e.amount }))}
            />
          )}

          {/* Double entry table (for vouchers with 2+ entries not already rendered as single-entry) */}
          {!isSingleEntry && !isSalesPurchase && hasEntries && (
            <ReadOnlyDoubleEntryTable entries={voucher.entries} />
          )}

          {/* Also render double entry if single-entry has more than 1+1 entries */}
          {isSingleEntry && voucher.entries.length <= 2 && hasEntries && (
            <ReadOnlyDoubleEntryTable entries={voucher.entries} />
          )}

          {/* Payroll entries */}
          {voucher.payroll_entries?.length > 0 && (
            <ReadOnlyPayrollTable entries={voucher.payroll_entries} />
          )}

          {/* Detail sections — shown below the main content in the scrollable area */}

          {/* Reference info */}
          {(voucher.reference_number || voucher.reference_date) && (
            <DetailCard title="Reference">
              <DetailCell label="Ref No." value={voucher.reference_number || ""} />
              <DetailCell label="Ref Date" value={formatDate(voucher.reference_date)} />
            </DetailCard>
          )}

          {/* Place of supply */}
          {voucher.place_of_supply && (
            <DetailCard title="Supply">
              <DetailCell label="Place of Supply" value={voucher.place_of_supply} />
            </DetailCard>
          )}

          {/* Bank details */}
          {voucher.bank_details && (
            <DetailCard title="Bank Details">
              <DetailCell label="Transaction Type" value={voucher.bank_details.transaction_type || ""} />
              <DetailCell label="Instrument No." value={voucher.bank_details.instrument_number || ""} />
              <DetailCell label="Instrument Date" value={formatDate(voucher.bank_details.instrument_date)} />
              <DetailCell label="Bank Name" value={voucher.bank_details.bank_name || ""} />
              <DetailCell label="Branch" value={voucher.bank_details.branch || ""} />
              <DetailCell label="Amount" value={formatAmount(voucher.bank_details.amount)} />
              <DetailCell label="Cheque Range" value={voucher.bank_details.cheque_range || ""} />
            </DetailCard>
          )}

          {/* Bill-wise allocations */}
          {voucher.bill_references?.length > 0 && (
            <DetailCard title="Bill-wise Allocations">
              {voucher.bill_references.map((b, i) => (
                <DetailCell key={b.bill_id} label={`Bill ${i + 1}`} value={`${b.bill_name || ""} (${b.bill_type || ""}) ${formatAmount(b.amount)}`} />
              ))}
            </DetailCard>
          )}

          {/* Cost centres */}
          {voucher.cost_centres?.length > 0 && (
            <DetailCard title="Cost Centre Allocations">
              {voucher.cost_centres.map((c, i) => (
                <DetailCell key={i} label={`CC ${i + 1}`} value={`ID: ${c.cost_centre_id || ""} | Amount: ${formatAmount(c.amount)}`} />
              ))}
            </DetailCard>
          )}

          {/* Cash denominations */}
          {voucher.cash_denominations?.length > 0 && (
            <DetailCard title="Cash Denominations">
              {voucher.cash_denominations.map((c, i) => (
                <DetailCell key={i} label={c.denomination || `#${i + 1}`} value={`Qty: ${c.quantity || 0} | Amount: ${formatAmount(c.amount)}`} />
              ))}
            </DetailCard>
          )}

          {/* Receipt details */}
          {voucher.receipt_details && (
            <DetailCard title="Receipt Details">
              <DetailCell label="Receipt Note No." value={voucher.receipt_details.receipt_note_no || ""} />
              <DetailCell label="Receipt Doc No." value={voucher.receipt_details.receipt_doc_no || ""} />
              <DetailCell label="Dispatched Through" value={voucher.receipt_details.dispatched_through || ""} />
              <DetailCell label="Destination" value={voucher.receipt_details.destination || ""} />
              <DetailCell label="Carrier Name" value={voucher.receipt_details.carrier_name || ""} />
              <DetailCell label="Bill of Lading No." value={voucher.receipt_details.bill_of_lading_no || ""} />
              <DetailCell label="Bill of Lading Date" value={formatDate(voucher.receipt_details.bill_of_lading_date)} />
              <DetailCell label="Motor Vehicle No." value={voucher.receipt_details.motor_vehicle_no || ""} />
            </DetailCard>
          )}

          {/* Party details */}
          {voucher.party_details && (
            <DetailCard title="Party / Supplier Details">
              <DetailCell label="Supplier Name" value={voucher.party_details.supplier_name || ""} />
              <DetailCell label="Mailing Name" value={voucher.party_details.mailing_name || ""} />
              <DetailCell label="Address" value={voucher.party_details.address || ""} />
              <DetailCell label="State" value={voucher.party_details.state || ""} />
              <DetailCell label="Country" value={voucher.party_details.country || ""} />
            </DetailCard>
          )}

          {/* Dispatch details */}
          {voucher.dispatch_details && (
            <DetailCard title="Dispatch Details">
              <DetailCell label="Delivery Note Nos." value={voucher.dispatch_details.delivery_note_nos || ""} />
              <DetailCell label="Dispatch Doc No." value={voucher.dispatch_details.dispatch_doc_no || ""} />
              <DetailCell label="Dispatched Through" value={voucher.dispatch_details.dispatched_through || ""} />
              <DetailCell label="Destination" value={voucher.dispatch_details.destination || ""} />
              <DetailCell label="Carrier Name" value={voucher.dispatch_details.carrier_name || ""} />
              <DetailCell label="Bill of Lading No." value={voucher.dispatch_details.bill_of_lading_no || ""} />
              <DetailCell label="Bill of Lading Date" value={formatDate(voucher.dispatch_details.bill_of_lading_date)} />
              <DetailCell label="Motor Vehicle No." value={voucher.dispatch_details.motor_vehicle_no || ""} />
            </DetailCard>
          )}

          {/* Credit / Debit note details */}
          {(voucher.credit_note_details || voucher.debit_note_details) && (
            <DetailCard title={`${voucher.voucher_type === "Credit Note" ? "Credit" : "Debit"} Note Details`}>
              <DetailCell label="Tracking No." value={(voucher.credit_note_details || voucher.debit_note_details).tracking_no || ""} />
              <DetailCell label="Dispatch Doc No." value={(voucher.credit_note_details || voucher.debit_note_details).dispatch_doc_no || ""} />
              <DetailCell label="Dispatched Through" value={(voucher.credit_note_details || voucher.debit_note_details).dispatched_through || ""} />
              <DetailCell label="Destination" value={(voucher.credit_note_details || voucher.debit_note_details).destination || ""} />
              <DetailCell label="Carrier Name" value={(voucher.credit_note_details || voucher.debit_note_details).carrier_name || ""} />
              <DetailCell label="Bill of Lading No." value={(voucher.credit_note_details || voucher.debit_note_details).bill_of_lading_no || ""} />
              <DetailCell label="Bill of Lading Date" value={formatDate((voucher.credit_note_details || voucher.debit_note_details).bill_of_lading_date)} />
              <DetailCell label="Motor Vehicle No." value={(voucher.credit_note_details || voucher.debit_note_details).motor_vehicle_no || ""} />
              <DetailCell label="Original Invoice No." value={(voucher.credit_note_details || voucher.debit_note_details).original_invoice_no || ""} />
              <DetailCell label="Original Invoice Date" value={formatDate((voucher.credit_note_details || voucher.debit_note_details).original_invoice_date)} />
            </DetailCard>
          )}

          {/* HSN / GST summary on stock entries */}
          {hasStock && voucher.stock_entries.some(s => s.hsn_code || s.gst_rate) && (
            <DetailCard title="Stock GST Summary">
              {voucher.stock_entries.map(s => (
                <DetailCell key={s.stock_entry_id} label={s.item_name || `Item #${s.stock_entry_id}`}
                  value={[
                    s.hsn_code ? `HSN: ${s.hsn_code}` : "",
                    s.gst_rate ? `GST: ${s.gst_rate}%` : "",
                    s.cgst_amount ? `CGST: ${formatAmount(s.cgst_amount)}` : "",
                    s.sgst_amount ? `SGST: ${formatAmount(s.sgst_amount)}` : "",
                    s.igst_amount ? `IGST: ${formatAmount(s.igst_amount)}` : "",
                  ].filter(Boolean).join(" | ")}
                />
              ))}
            </DetailCard>
          )}

          {/* Voucher flags */}
          <DetailCard title="Voucher Info">
            <DetailCell label="Voucher ID" value={String(voucher.voucher_id)} />
            <DetailCell label="Created At" value={formatDate(voucher.created_at)} />
            <DetailCell label="Updated At" value={formatDate(voucher.updated_at)} />
            <DetailCell label="Flags" value={[
              voucher.is_invoice ? "Invoice" : "",
              voucher.is_accounting_voucher ? "Accounting" : "",
              voucher.is_inventory_voucher ? "Inventory" : "",
              voucher.is_order_voucher ? "Order" : "",
            ].filter(Boolean).join(", ") || "None"} />
            <DetailCell label="Optional" value={voucher.is_optional ? "Yes" : "No"} />
            <DetailCell label="Post-Dated" value={voucher.is_post_dated ? "Yes" : "No"} />
          </DetailCard>

          {/* Narration + grand total — matches create page */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
            <span className="flex-1 text-sm text-black">{voucher.narration || "—"}</span>
            {totalAmount > 0 && (
              <span className="text-sm font-bold text-black ml-4 shrink-0 tabular-nums">
                {formatAmount(totalAmount)}
              </span>
            )}
          </div>

          {/* Quit / Cancel / Delete — matches create page layout */}
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
                onClick={handleDelete}
                size="xs"
                className="h-auto rounded-none text-sm px-3 py-0.5 bg-red-700 text-white hover:bg-red-800"
              >
                Delete
              </Button>
            </div>
          </div>

      </div>
    </div>
  );
}
