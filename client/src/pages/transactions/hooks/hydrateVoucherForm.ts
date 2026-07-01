// Hydrates a useVoucherForm instance from a saved voucher (window.api.voucher.getById)
// so the SAME entry interface can edit it. The mapping is intentionally lossless: the
// form re-sends its full payload on save and voucher.update replaces every child table,
// so anything not hydrated here would be dropped. getById carries entry_id on entries
// AND on cost-centre rows (so per-entry cost centres map back), batches + excise per
// stock line, and detail objects in the snake_case shape voucher.update consumes.

import { nextId } from "../utils/rowFactories";

// Voucher types this editor supports (everything that round-trips through
// voucher.create/update). Physical Stock & Attendance use separate create APIs and
// are intentionally excluded.
export const EDITABLE_VOUCHER_TYPES = new Set([
  "Receipt", "Payment", "Contra", "Journal", "Reversing Journal",
  "Sales", "Purchase", "Credit Note", "Debit Note",
  "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out",
  "Material In", "Material Out", "Stock Journal", "Manufacturing Journal",
  "Payroll",
]);

const ACCOUNTING = new Set(["Receipt", "Payment", "Contra", "Journal", "Reversing Journal"]);
const SALES_LIKE = new Set(["Sales", "Purchase", "Credit Note", "Debit Note"]);
const INVENTORY_ONLY = new Set(["Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out"]);
const TRANSFER = new Set(["Stock Journal", "Manufacturing Journal"]);

export function hydrateVoucherForm(form: any, v: any) {
  const byId = <T,>(arr: T[], key: string, id: any): T | null =>
    id == null ? null : (arr || []).find((x: any) => x[key] === id) || null;
  const findLedger = (id: any) => byId(form.allLedgers, "ledger_id", id);
  const findItem = (id: any) => byId(form.allStockItems, "item_id", id);
  const findGodown = (id: any) => byId(form.allGodowns, "godown_id", id);
  const findUnit = (id: any) => byId(form.allUnits, "unit_id", id);
  const findEmployee = (id: any) => byId(form.allEmployees, "employee_id", id);
  const findPayHead = (id: any) => byId(form.allPayHeads, "pay_head_id", id);

  const type = v.voucher_type;

  // ── Meta (all types) ──────────────────────────────────────────────────────
  form.setVoucherType(type);
  form.setDate?.(v.date);
  form.setVoucherNumber?.(v.voucher_number || "");
  form.setNarration?.(v.narration || "");
  form.setReferenceNumber?.(v.reference_number || "");
  form.setReferenceDate?.(v.reference_date || "");
  form.setSupplierInvoiceNo?.(v.supplier_invoice_no || "");
  form.setSupplierInvoiceDate?.(v.supplier_invoice_date || "");
  if (v.place_of_supply) form.setPlaceOfSupply?.(v.place_of_supply);
  form.setVoucherClass?.(v.voucher_class || "");
  form.setStatus?.(v.is_post_dated ? "Post-Dated" : "Regular");

  // Detail sub-screens round-trip in their stored (snake_case) shape.
  if (v.bank_details) form.setBankDetails?.(v.bank_details);
  if (v.receipt_details) form.setReceiptDetails?.(v.receipt_details);
  if (v.party_details) form.setPartyDetails?.(v.party_details);
  if (v.dispatch_details) form.setDispatchDetails?.(v.dispatch_details);
  if (v.credit_note_details) form.setCreditNoteDetails?.(v.credit_note_details);
  if (v.debit_note_details) form.setDebitNoteDetails?.(v.debit_note_details);
  if (v.vat_details) form.setVatDetails?.(v.vat_details);
  if (v.order_details) form.setOrderDetails?.(v.order_details);
  if (Array.isArray(v.cash_denominations) && v.cash_denominations.length > 0) {
    const others = v.cash_denominations.find((d: any) => d.denomination === "Others");
    form.setCashDenominations?.({
      ledger_id: v.cash_denominations[0]?.ledger_id ?? null,
      entries: v.cash_denominations
        .filter((d: any) => d.denomination !== "Others")
        .map((d: any) => ({ denomination: Number(d.denomination), quantity: d.quantity, amount: d.amount })),
      others: others ? others.amount : 0,
    });
  }

  // bill-wise refs grouped by their ledger; cost centres grouped by entry_id.
  const billsByLedger: Record<number, any[]> = {};
  for (const b of (v.bill_references || [])) {
    (billsByLedger[b.ledger_id] ||= []).push({
      bill_name: b.bill_name, bill_type: b.bill_type, amount: b.amount,
      credit_period: b.credit_period ?? undefined, due_date: b.due_date ?? undefined,
    });
  }
  const ccByEntry: Record<number, any[]> = {};
  for (const cc of (v.cost_centres || [])) {
    (ccByEntry[cc.entry_id] ||= []).push({ cost_centre_id: cc.cost_centre_id, amount: cc.amount });
  }

  const mkEntryRow = (e: any) => ({
    id: nextId(),
    type: e.type,
    ledger: findLedger(e.ledger_id),
    ledgerBalance: "",
    amountRaw: String(e.amount ?? ""),
    billReferences: billsByLedger[e.ledger_id]?.length ? billsByLedger[e.ledger_id] : undefined,
    costCentres: ccByEntry[e.entry_id]?.length ? ccByEntry[e.entry_id] : undefined,
  });

  const mkStockRow = (s: any) => ({
    id: nextId(),
    stockItem: findItem(s.stock_item_id),
    godown: findGodown(s.godown_id),
    unit: findUnit(s.unit_id),
    quantityRaw: String(s.quantity ?? ""),
    rateRaw: String(s.rate ?? ""),
    amountRaw: String(s.amount ?? ""),
    batchAllocations: (s.batches || []).map((b: any) => ({
      batch_number: b.batch_number, godown: b.godown ?? undefined,
      mfg_date: b.mfg_date ?? undefined, expiry_date: b.expiry_date ?? undefined,
      quantity: b.quantity, actual_quantity: b.actual_quantity ?? b.quantity,
      rate: b.rate, disc_percent: b.disc_percent ?? undefined,
    })),
    exciseItemDetails: s.excise_item_details || undefined,
  });

  const entries = v.entries || [];

  // ── Per-type row hydration ─────────────────────────────────────────────────
  if (ACCOUNTING.has(type)) {
    const rows = entries.map(mkEntryRow);
    // Edit always uses double-entry mode — it can represent any balanced entry set.
    if (type === "Receipt") { form.setReceiptEntryMode?.("double"); form.setReceiptDoubleRows?.(rows); }
    else if (type === "Payment") { form.setPaymentEntryMode?.("double"); form.setPaymentDoubleRows?.(rows); }
    else if (type === "Contra") { form.setContraEntryMode?.("double"); form.setContraDoubleRows?.(rows); }
    else { form.setJournalEntryMode?.("double"); form.setJournalRows?.(rows); }
  } else if (SALES_LIKE.has(type)) {
    form.setPartyLedger?.(findLedger(v.party_ledger_id));
    const stockSubtotal = (v.stock_entries || []).reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
    const nonParty = entries.filter((e: any) => e.ledger_id !== v.party_ledger_id);
    // The sales/purchase ledger carries the stock subtotal; the rest are tax/charges.
    let mainIdx = nonParty.findIndex((e: any) => Math.abs((Number(e.amount) || 0) - stockSubtotal) < 0.01);
    if (mainIdx < 0) mainIdx = 0;
    const main = nonParty[mainIdx];
    form.setSalesPurchaseLedger?.(findLedger(main?.ledger_id));
    form.setStockEntries?.((v.stock_entries || []).map(mkStockRow));
    const additional = nonParty.filter((_: any, i: number) => i !== mainIdx).map(mkEntryRow);
    if (additional.length) form.setAdditionalEntries?.(additional);
    form.setPartyBillReferences?.(billsByLedger[v.party_ledger_id] || []);
  } else if (INVENTORY_ONLY.has(type)) {
    form.setPartyLedger?.(findLedger(v.party_ledger_id));
    form.setStockEntries?.((v.stock_entries || []).map(mkStockRow));
  } else if (TRANSFER.has(type)) {
    form.setSourceStockEntries?.((v.stock_entries || []).filter((s: any) => s.is_source).map(mkStockRow));
    form.setDestinationStockEntries?.((v.stock_entries || []).filter((s: any) => !s.is_source).map(mkStockRow));
  } else if (type === "Payroll") {
    form.setAccountLedger?.(findLedger(v.party_ledger_id));
    form.setPayrollEntries?.((v.payroll_entries || []).map((p: any) => ({
      id: nextId(), employee: findEmployee(p.employee_id), payHead: findPayHead(p.pay_head_id),
      amountRaw: String(p.amount ?? ""),
    })));
  }
}
