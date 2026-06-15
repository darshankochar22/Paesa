import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertBanner } from "../../components/ui";
import { PageFooterBar } from "./ui";

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
  stock_item_id: number;
  item_name: string;
  godown_id: number;
  unit_id: number;
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
  bank_detail_id: number;
  ledger_id: number;
  transaction_type: string;
  cheque_range: string;
  instrument_number: string;
  instrument_date: string;
  bank_name: string;
  branch: string;
  amount: number;
}

interface CostCentreEntry {
  cc_entry_id: number;
  entry_id: number;
  cost_centre_id: number;
  amount: number;
}

interface CashDenomination {
  id: number;
  ledger_id: number;
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
  company_id: number;
  fy_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  status: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_ledger_id: number | null;
  party_name: string | null;
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded">
      <div className="bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200">
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline px-3 py-1.5 border-b border-gray-100 last:border-b-0">
      <span className="text-xs text-gray-500 w-44 shrink-0">{label}</span>
      <span className={`text-xs ${highlight ? "font-bold text-black" : "text-gray-800"}`}>{value || "—"}</span>
    </div>
  );
}

function DrCrBadge({ type }: { type: "Dr" | "Cr" }) {
  const cls = type === "Dr" ? "bg-black text-white" : "bg-gray-600 text-white";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cls}`}>{type}</span>;
}

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

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

  const handleCancel = async () => {
    if (!voucher) return;
    if (!window.confirm(`Cancel voucher ${voucher.voucher_number}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      const res = await window.api.voucher.cancel(voucher.voucher_id);
      if (res.success) setVoucher(prev => prev ? { ...prev, is_cancelled: 1 } : prev);
      else setError(res.error || "Failed to cancel");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!voucher) return;
    if (!window.confirm(`Permanently delete voucher ${voucher.voucher_number}?`)) return;
    try {
      const res = await window.api.voucher.delete(voucher.voucher_id);
      if (res.success) navigate("/transactions/voucher-list");
      else setError(res.error || "Failed to delete");
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
        Loading voucher…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-500 text-xs">
        <span className="text-red-600">{error}</span>
        <button onClick={() => navigate(-1)} className="underline hover:text-gray-900">← Go Back</button>
      </div>
    );
  }

  if (!voucher) return null;

  const drTotal = voucher.entries.filter(e => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
  const crTotal = voucher.entries.filter(e => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
  const stockTotal = voucher.stock_entries.reduce((s, e) => s + e.amount, 0);
  const balanced = Math.abs(drTotal - crTotal) < 0.01;

  const hasEntries = voucher.entries.length > 0;
  const hasStock = voucher.stock_entries.length > 0;
  const hasPayroll = voucher.payroll_entries?.length > 0;
  const hasBills = voucher.bill_references?.length > 0;
  const hasCostCentres = voucher.cost_centres?.length > 0;
  const hasCashDenoms = voucher.cash_denominations?.length > 0;
  const hasBank = voucher.bank_details;
  const hasReceipt = voucher.receipt_details;
  const hasPartyDetails = voucher.party_details;
  const hasDispatch = voucher.dispatch_details;
  const hasCreditNote = voucher.credit_note_details;
  const hasDebitNote = voucher.debit_note_details;

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none overflow-hidden">
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white text-sm">←</button>
          <div>
            <div className="text-sm font-bold tracking-wide uppercase">
              {voucher.voucher_type} Voucher — {voucher.voucher_number}
            </div>
            <div className="text-[10px] text-white/60">
              {formatDate(voucher.date)}
              {voucher.is_cancelled ? " · CANCELLED" : ""}
              {voucher.is_post_dated ? " · POST-DATED" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!voucher.is_cancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              Cancel Voucher
            </button>
          )}
          <button
            onClick={handleDelete}
            className="text-[10px] bg-red-700 hover:bg-red-800 text-white px-2 py-1 rounded uppercase tracking-wider transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 space-y-4">

          {/* Voucher Header Section */}
          <Section title="Voucher Header">
            <div className="grid grid-cols-2 lg:grid-cols-3">
              <FieldRow label="Voucher ID" value={String(voucher.voucher_id)} highlight />
              <FieldRow label="Voucher Type" value={voucher.voucher_type} highlight />
              <FieldRow label="Voucher Number" value={voucher.voucher_number} highlight />
              <FieldRow label="Date" value={formatDate(voucher.date)} highlight />
              <FieldRow label="Status" value={voucher.status || "Regular"} />
              <FieldRow label="Party Name" value={voucher.party_name || ""} highlight={!!voucher.party_name} />
              <FieldRow label="Party Ledger ID" value={voucher.party_ledger_id ? String(voucher.party_ledger_id) : ""} />
              <FieldRow label="Place of Supply" value={voucher.place_of_supply || ""} />
              <FieldRow label="Reference No." value={voucher.reference_number || ""} />
              <FieldRow label="Reference Date" value={formatDate(voucher.reference_date)} />
              <FieldRow label="Narration" value={voucher.narration || ""} />
              <FieldRow label="Flags" value={[
                voucher.is_invoice ? "Invoice" : "",
                voucher.is_accounting_voucher ? "Accounting" : "",
                voucher.is_inventory_voucher ? "Inventory" : "",
                voucher.is_order_voucher ? "Order" : "",
                voucher.is_optional ? "Optional" : "",
                voucher.is_post_dated ? "Post-Dated" : "",
                voucher.is_cancelled ? "Cancelled" : "",
              ].filter(Boolean).join(", ") || "—"} />
              <FieldRow label="Supplier Invoice No." value={voucher.supplier_invoice_no || ""} />
              <FieldRow label="Supplier Invoice Date" value={formatDate(voucher.supplier_invoice_date)} />
              <FieldRow label="Created At" value={formatDate(voucher.created_at)} />
              <FieldRow label="Updated At" value={formatDate(voucher.updated_at)} />
            </div>
          </Section>

          {/* Supplier Invoice Fields */}
          {voucher.voucher_type === "Purchase" && (voucher.supplier_invoice_no || voucher.supplier_invoice_date) && (
            <Section title="Supplier Invoice">
              <div className="grid grid-cols-2">
                <FieldRow label="Invoice No." value={voucher.supplier_invoice_no || ""} highlight />
                <FieldRow label="Invoice Date" value={formatDate(voucher.supplier_invoice_date)} />
              </div>
            </Section>
          )}

          {/* Accounting Entries */}
          {hasEntries && (
            <Section title={`Accounting Entries (Dr: ${formatAmount(drTotal)} | Cr: ${formatAmount(crTotal)})`}>
              {/* Table header */}
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-12 text-center">Dr/Cr</div>
                <div className="flex-1">Ledger Account</div>
                <div className="w-28 text-right">Amount</div>
                <div className="w-28 text-right">Forex</div>
                <div className="w-24 text-center">Currency</div>
                <div className="w-40">Narration</div>
              </div>
              {voucher.entries.map(e => (
                <div key={e.entry_id} className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                  <div className="w-12 text-center"><DrCrBadge type={e.type} /></div>
                  <div className="flex-1 font-semibold text-gray-900">{e.ledger_name || `Ledger #${e.ledger_id}`}</div>
                  <div className="w-28 text-right font-bold text-gray-900">{formatAmount(e.amount)}</div>
                  <div className="w-28 text-right text-gray-500">{e.amount_forex ? formatAmount(e.amount_forex) : ""}</div>
                  <div className="w-24 text-center text-gray-500">{e.currency || "INR"}</div>
                  <div className="w-40 text-gray-500 truncate" title={e.narration || ""}>{e.narration || ""}</div>
                </div>
              ))}
              {/* Balance row */}
              <div className={`flex items-center px-3 py-1.5 text-[10px] font-bold ${balanced ? "bg-gray-50 text-gray-700" : "bg-red-100 text-red-700"}`}>
                <div className="flex-1 text-right">{balanced ? "✓ Balanced" : `Difference: ${formatAmount(Math.abs(drTotal - crTotal))}`}</div>
              </div>
            </Section>
          )}

          {/* Stock Entries */}
          {hasStock && (
            <Section title={`Inventory / Stock Entries (Total: ${formatAmount(stockTotal)})`}>
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="flex-1">Item Name</div>
                <div className="w-16 text-right">Qty</div>
                <div className="w-20 text-right">Rate</div>
                <div className="w-24 text-right">Amount</div>
                <div className="w-20 text-right">Addl.</div>
                <div className="w-20 text-right">Disc.</div>
                <div className="w-20 text-center">HSN</div>
                <div className="w-14 text-center">GST%</div>
                <div className="w-20 text-right">CGST</div>
                <div className="w-20 text-right">SGST</div>
                <div className="w-20 text-right">IGST</div>
              </div>
              {voucher.stock_entries.map(s => (
                <div key={s.stock_entry_id}>
                  <div className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                    <div className="flex-1 font-semibold text-gray-900">{s.item_name || "—"}</div>
                    <div className="w-16 text-right text-gray-800">{formatQty(s.quantity)}</div>
                    <div className="w-20 text-right text-gray-800">{formatAmount(s.rate)}</div>
                    <div className="w-24 text-right font-bold text-gray-900">{formatAmount(s.amount)}</div>
                    <div className="w-20 text-right text-gray-500">{s.additional_amount ? formatAmount(s.additional_amount) : ""}</div>
                    <div className="w-20 text-right text-gray-500">{s.discount_amount ? formatAmount(s.discount_amount) : ""}</div>
                    <div className="w-20 text-center text-gray-500">{s.hsn_code || ""}</div>
                    <div className="w-14 text-center text-gray-500">{s.gst_rate ? `${s.gst_rate}%` : ""}</div>
                    <div className="w-20 text-right text-gray-500">{s.cgst_amount ? formatAmount(s.cgst_amount) : ""}</div>
                    <div className="w-20 text-right text-gray-500">{s.sgst_amount ? formatAmount(s.sgst_amount) : ""}</div>
                    <div className="w-20 text-right text-gray-500">{s.igst_amount ? formatAmount(s.igst_amount) : ""}</div>
                  </div>
                  {/* Batches */}
                  {s.batches && s.batches.length > 0 && (
                    <div className="px-6 py-1.5 bg-gray-50/50 border-b border-gray-100">
                      {s.batches.map(b => (
                        <div key={b.batch_id} className="flex items-center gap-4 text-[10px] text-gray-500">
                          <span>Batch: <strong>{b.batch_number}</strong></span>
                          {b.expiry_date && <span>Expiry: {formatDate(b.expiry_date)}</span>}
                          {b.quantity ? <span>Qty: {formatQty(b.quantity)}</span> : null}
                          {b.rate ? <span>Rate: {formatAmount(b.rate)}</span> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </Section>
          )}

          {/* Payroll Entries */}
          {hasPayroll && (
            <Section title="Payroll Entries">
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-20">Emp. Code</div>
                <div className="flex-1">Employee Name</div>
                <div className="flex-1">Pay Head</div>
                <div className="w-28 text-right">Amount</div>
              </div>
              {voucher.payroll_entries.map(p => (
                <div key={p.payroll_entry_id} className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                  <div className="w-20 text-gray-700">{p.employee_number || "—"}</div>
                  <div className="flex-1 font-semibold text-gray-900">{p.employee_name || "—"}</div>
                  <div className="flex-1 text-gray-700">{p.pay_head_name || "—"}</div>
                  <div className="w-28 text-right font-bold text-gray-900">{formatAmount(p.amount)}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Bill-wise Allocations */}
          {hasBills && (
            <Section title="Bill-wise Allocations">
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="flex-1">Bill Name</div>
                <div className="w-24">Type</div>
                <div className="w-28 text-right">Amount</div>
                <div className="w-24">Credit Period</div>
                <div className="w-28">Due Date</div>
              </div>
              {voucher.bill_references.map(b => (
                <div key={b.bill_id} className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                  <div className="flex-1 font-semibold text-gray-900">{b.bill_name || "—"}</div>
                  <div className="w-24 text-gray-600">{b.bill_type || "—"}</div>
                  <div className="w-28 text-right font-bold text-gray-900">{formatAmount(b.amount)}</div>
                  <div className="w-24 text-gray-600">{b.credit_period || "—"}</div>
                  <div className="w-28 text-gray-600">{formatDate(b.due_date)}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Bank Details */}
          {hasBank && (
            <Section title="Bank Details">
              <div className="grid grid-cols-2 lg:grid-cols-3">
                <FieldRow label="Transaction Type" value={hasBank.transaction_type || "—"} highlight />
                <FieldRow label="Cheque Range" value={hasBank.cheque_range || ""} />
                <FieldRow label="Instrument No." value={hasBank.instrument_number || ""} />
                <FieldRow label="Instrument Date" value={formatDate(hasBank.instrument_date)} />
                <FieldRow label="Bank Name" value={hasBank.bank_name || ""} />
                <FieldRow label="Branch" value={hasBank.branch || ""} />
                <FieldRow label="Amount" value={formatAmount(hasBank.amount)} highlight />
              </div>
            </Section>
          )}

          {/* Cost Centre Allocations */}
          {hasCostCentres && (
            <Section title="Cost Centre Allocations">
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="w-28">Cost Centre ID</div>
                <div className="w-28 text-right">Amount</div>
              </div>
              {voucher.cost_centres.map(c => (
                <div key={c.cc_entry_id} className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                  <div className="w-28 text-gray-700">{c.cost_centre_id || "—"}</div>
                  <div className="w-28 text-right font-semibold text-gray-900">{formatAmount(c.amount)}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Cash Denominations */}
          {hasCashDenoms && (
            <Section title="Cash Denominations">
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <div className="flex-1">Denomination</div>
                <div className="w-28 text-right">Quantity</div>
                <div className="w-28 text-right">Amount</div>
              </div>
              {voucher.cash_denominations.map(c => (
                <div key={c.id} className="flex items-center px-3 py-2 border-b border-gray-100 text-xs hover:bg-gray-50/50">
                  <div className="flex-1 text-gray-700">{c.denomination || "—"}</div>
                  <div className="w-28 text-right text-gray-800">{c.quantity || 0}</div>
                  <div className="w-28 text-right font-semibold text-gray-900">{formatAmount(c.amount)}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Receipt Details (Receipt Note) */}
          {hasReceipt && (
            <Section title="Receipt Details">
              <div className="grid grid-cols-2 lg:grid-cols-3">
                <FieldRow label="Receipt Note No." value={hasReceipt.receipt_note_no || ""} />
                <FieldRow label="Receipt Doc No." value={hasReceipt.receipt_doc_no || ""} />
                <FieldRow label="Dispatched Through" value={hasReceipt.dispatched_through || ""} />
                <FieldRow label="Destination" value={hasReceipt.destination || ""} />
                <FieldRow label="Carrier Name" value={hasReceipt.carrier_name || ""} />
                <FieldRow label="Bill of Lading No." value={hasReceipt.bill_of_lading_no || ""} />
                <FieldRow label="Bill of Lading Date" value={formatDate(hasReceipt.bill_of_lading_date)} />
                <FieldRow label="Motor Vehicle No." value={hasReceipt.motor_vehicle_no || ""} />
              </div>
            </Section>
          )}

          {/* Party Details */}
          {hasPartyDetails && (
            <Section title="Party / Supplier Details">
              <div className="grid grid-cols-2 lg:grid-cols-3">
                <FieldRow label="Supplier Name" value={hasPartyDetails.supplier_name || ""} highlight />
                <FieldRow label="Mailing Name" value={hasPartyDetails.mailing_name || ""} />
                <FieldRow label="Address" value={hasPartyDetails.address || ""} />
                <FieldRow label="State" value={hasPartyDetails.state || ""} />
                <FieldRow label="Country" value={hasPartyDetails.country || ""} />
              </div>
            </Section>
          )}

          {/* Dispatch Details */}
          {hasDispatch && (
            <Section title="Dispatch Details">
              <div className="grid grid-cols-2 lg:grid-cols-3">
                <FieldRow label="Delivery Note Nos." value={hasDispatch.delivery_note_nos || ""} />
                <FieldRow label="Dispatch Doc No." value={hasDispatch.dispatch_doc_no || ""} />
                <FieldRow label="Dispatched Through" value={hasDispatch.dispatched_through || ""} />
                <FieldRow label="Destination" value={hasDispatch.destination || ""} />
                <FieldRow label="Carrier Name" value={hasDispatch.carrier_name || ""} />
                <FieldRow label="Bill of Lading No." value={hasDispatch.bill_of_lading_no || ""} />
                <FieldRow label="Bill of Lading Date" value={formatDate(hasDispatch.bill_of_lading_date)} />
                <FieldRow label="Motor Vehicle No." value={hasDispatch.motor_vehicle_no || ""} />
              </div>
            </Section>
          )}

          {/* Credit Note / Debit Note Details */}
          {(hasCreditNote || hasDebitNote) && (
            <Section title={`${voucher.voucher_type === "Credit Note" ? "Credit" : "Debit"} Note Details`}>
              <div className="grid grid-cols-2 lg:grid-cols-3">
                <FieldRow label="Tracking No." value={(hasCreditNote || hasDebitNote).tracking_no || ""} />
                <FieldRow label="Dispatch Doc No." value={(hasCreditNote || hasDebitNote).dispatch_doc_no || ""} />
                <FieldRow label="Dispatched Through" value={(hasCreditNote || hasDebitNote).dispatched_through || ""} />
                <FieldRow label="Destination" value={(hasCreditNote || hasDebitNote).destination || ""} />
                <FieldRow label="Carrier Name" value={(hasCreditNote || hasDebitNote).carrier_name || ""} />
                <FieldRow label="Bill of Lading No." value={(hasCreditNote || hasDebitNote).bill_of_lading_no || ""} />
                <FieldRow label="Bill of Lading Date" value={formatDate((hasCreditNote || hasDebitNote).bill_of_lading_date)} />
                <FieldRow label="Motor Vehicle No." value={(hasCreditNote || hasDebitNote).motor_vehicle_no || ""} />
                <FieldRow label="Original Invoice No." value={(hasCreditNote || hasDebitNote).original_invoice_no || ""} highlight />
                <FieldRow label="Original Invoice Date" value={formatDate((hasCreditNote || hasDebitNote).original_invoice_date)} />
              </div>
            </Section>
          )}

          {/* Narration */}
          {voucher.narration && (
            <div className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
              Narration: {voucher.narration}
            </div>
          )}
        </div>
      </div>

      <PageFooterBar
        countLabel={`Voucher #${voucher.voucher_id}`}
        backLabel="← Back to List"
        onBack={() => navigate("/transactions/voucher-list")}
      />
    </div>
  );
}
