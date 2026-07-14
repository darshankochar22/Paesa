// Hydrates a useVoucherForm instance from a saved voucher (window.api.voucher.getById)
// so the SAME entry interface can edit it. The mapping is intentionally lossless: the
// form re-sends its full payload on save and voucher.update replaces every child table,
// so anything not hydrated here would be dropped. getById carries entry_id on entries
// AND on cost-centre rows (so per-entry cost centres map back), batches + excise per
// stock line, and detail objects in the snake_case shape voucher.update consumes.

import { nextId } from '../utils/rowFactories';

// Voucher types this editor supports (everything that round-trips through
// voucher.create/update). Physical Stock & Attendance use separate create APIs and
// are intentionally excluded.
export const EDITABLE_VOUCHER_TYPES = new Set([
  'Receipt',
  'Payment',
  'Contra',
  'Journal',
  'Reversing Journal',
  'Sales',
  'Purchase',
  'Credit Note',
  'Debit Note',
  'Delivery Note',
  'Receipt Note',
  'Rejection In',
  'Rejection Out',
  'Material In',
  'Material Out',
  'Stock Journal',
  'Manufacturing Journal',
  'Payroll',
  'Purchase Order',
  'Sales Order',
  'Job Work In Order',
  'Job Work Out Order',
]);

const ACCOUNTING = new Set(['Receipt', 'Payment', 'Contra', 'Journal', 'Reversing Journal']);
const SALES_LIKE = new Set(['Sales', 'Purchase', 'Credit Note', 'Debit Note']);
const INVENTORY_ONLY = new Set([
  'Delivery Note',
  'Receipt Note',
  'Rejection In',
  'Rejection Out',
  'Material In',
  'Material Out',
]);
const TRANSFER = new Set(['Stock Journal', 'Manufacturing Journal']);
const ORDER_VOUCHERS = new Set([
  'Purchase Order',
  'Sales Order',
  'Job Work In Order',
  'Job Work Out Order',
]);
const JW_TYPES = new Set(['Job Work In Order', 'Job Work Out Order']);

export function hydrateVoucherForm(form: any, v: any) {
  const byId = <T>(arr: T[], key: string, id: any): T | null =>
    id == null ? null : (arr || []).find((x: any) => x[key] === id) || null;
  const findLedger = (id: any) => byId(form.allLedgers, 'ledger_id', id);
  const findItem = (id: any) => byId(form.allStockItems, 'item_id', id);
  const findGodown = (id: any) => byId(form.allGodowns, 'godown_id', id);
  const findUnit = (id: any) => byId(form.allUnits, 'unit_id', id);

  const type = v.voucher_type;

  // ── Meta (all types) ──────────────────────────────────────────────────────
  form.setVoucherType(type);
  form.setDate?.(v.date);
  form.setVoucherNumber?.(v.voucher_number || '');
  form.setNarration?.(v.narration || '');
  form.setReferenceNumber?.(v.reference_number || '');
  form.setReferenceDate?.(v.reference_date || '');
  form.setSupplierInvoiceNo?.(v.supplier_invoice_no || '');
  form.setSupplierInvoiceDate?.(v.supplier_invoice_date || '');
  if (v.place_of_supply) form.setPlaceOfSupply?.(v.place_of_supply);
  // Bug 5: restore the voucher's own GST registration on reopen (marks the field as
  // explicitly set so the new-voucher default seeding never overrides it).
  if (v.gst_registration_id != null) {
    const reg = byId(form.allGstRegistrations, 'gst_id', v.gst_registration_id);
    if (reg) form.setGstRegistration?.(reg);
  }
  form.setVoucherClass?.(v.voucher_class || '');
  form.setStatus?.(v.is_post_dated ? 'Post-Dated' : 'Regular');
  form.setIsOptional?.(!!v.is_optional);

  // Detail sub-screens round-trip in their stored (snake_case) shape.
  if (v.bank_details) form.setBankDetails?.(v.bank_details);
  if (v.receipt_details) form.setReceiptDetails?.(v.receipt_details);
  if (v.party_details) form.setPartyDetails?.(v.party_details);
  if (v.dispatch_details) form.setDispatchDetails?.(v.dispatch_details);
  if (v.credit_note_details) form.setCreditNoteDetails?.(v.credit_note_details);
  if (v.debit_note_details) form.setDebitNoteDetails?.(v.debit_note_details);
  if (v.vat_details) form.setVatDetails?.(v.vat_details);
  if (v.gst_eway_details) form.setGstEwayDetails?.(v.gst_eway_details);
  if (v.manufacturer_importer_details)
    form.setManufacturerImporterDetails?.(v.manufacturer_importer_details);
  if (v.order_details) form.setOrderDetails?.(v.order_details);
  if (v.excise_details) form.setExciseDetails?.(v.excise_details);
  if (Array.isArray(v.cash_denominations) && v.cash_denominations.length > 0) {
    const others = v.cash_denominations.find((d: any) => d.denomination === 'Others');
    form.setCashDenominations?.({
      ledger_id: v.cash_denominations[0]?.ledger_id ?? null,
      entries: v.cash_denominations
        .filter((d: any) => d.denomination !== 'Others')
        .map((d: any) => ({
          denomination: Number(d.denomination),
          quantity: d.quantity,
          amount: d.amount,
        })),
      others: others ? others.amount : 0,
    });
  }

  // bill-wise refs grouped by their ledger; cost centres grouped by entry_id.
  const billsByLedger: Record<number, any[]> = {};
  for (const b of v.bill_references || []) {
    (billsByLedger[b.ledger_id] ||= []).push({
      bill_name: b.bill_name,
      bill_type: b.bill_type,
      amount: b.amount,
      credit_period: b.credit_period ?? undefined,
      due_date: b.due_date ?? undefined,
    });
  }
  const ccByEntry: Record<number, any[]> = {};
  for (const cc of v.cost_centres || []) {
    (ccByEntry[cc.entry_id] ||= []).push({ cost_centre_id: cc.cost_centre_id, amount: cc.amount });
  }

  const mkEntryRow = (e: any) => ({
    id: nextId(),
    type: e.type,
    ledger: findLedger(e.ledger_id),
    ledgerBalance: '',
    amountRaw: String(e.amount ?? ''),
    billReferences: billsByLedger[e.ledger_id]?.length ? billsByLedger[e.ledger_id] : undefined,
    costCentres: ccByEntry[e.entry_id]?.length ? ccByEntry[e.entry_id] : undefined,
  });

  const mkStockRow = (s: any) => ({
    id: nextId(),
    stockItem: findItem(s.stock_item_id),
    godown: findGodown(s.godown_id),
    unit: findUnit(s.unit_id),
    descriptionRaw: s.description ?? undefined,
    quantityRaw: String(s.quantity ?? ''),
    rateRaw: String(s.rate ?? ''),
    amountRaw: String(s.amount ?? ''),
    batchAllocations: (s.batches || []).map((b: any) => ({
      batch_number: b.batch_number,
      godown: b.godown ?? undefined,
      mfg_date: b.mfg_date ?? undefined,
      expiry_date: b.expiry_date ?? undefined,
      quantity: b.quantity,
      actual_quantity: b.actual_quantity ?? b.quantity,
      rate: b.rate,
      disc_percent: b.disc_percent ?? undefined,
      tracking_no: b.tracking_no ?? undefined,
      order_no: b.order_no ?? undefined,
      due_on: b.due_on ?? undefined,
      due_on_date: b.due_on_date ?? undefined,
      component_of: b.component_of ?? undefined,
      consider_as_scrap: b.consider_as_scrap ?? undefined,
      track_components: b.track_components ?? undefined,
    })),
    exciseItemDetails: s.excise_item_details || undefined,
  });

  const entries = v.entries || [];

  // ── Per-type row hydration ─────────────────────────────────────────────────
  if (ACCOUNTING.has(type)) {
    const rows = entries.map(mkEntryRow);
    // Edit always uses double-entry mode — it can represent any balanced entry set.
    if (type === 'Receipt') {
      form.setReceiptEntryMode?.('double');
      form.setReceiptDoubleRows?.(rows);
    } else if (type === 'Payment') {
      form.setPaymentEntryMode?.('double');
      form.setPaymentDoubleRows?.(rows);
    } else if (type === 'Contra') {
      form.setContraEntryMode?.('double');
      form.setContraDoubleRows?.(rows);
    } else {
      form.setJournalEntryMode?.('double');
      form.setJournalRows?.(rows);
    }
  } else if (SALES_LIKE.has(type)) {
    form.setPartyLedger?.(findLedger(v.party_ledger_id));
    const stockRows = v.stock_entries || [];
    const nonParty = entries.filter((e: any) => e.ledger_id !== v.party_ledger_id);
    if (stockRows.length === 0) {
      // Accounting Invoice (no stock): every non-party entry is a particulars ledger.
      form.setInvoiceMode?.('accounting');
      const particulars = nonParty.map(mkEntryRow);
      if (particulars.length) form.setParticulars?.(particulars);
      form.setPartyBillReferences?.(billsByLedger[v.party_ledger_id] || []);
    } else {
      form.setInvoiceMode?.('item');
      const stockSubtotal = stockRows.reduce((s: number, x: any) => s + (Number(x.amount) || 0), 0);
      // The sales/purchase ledger carries the stock subtotal; the rest are tax/charges.
      let mainIdx = nonParty.findIndex(
        (e: any) => Math.abs((Number(e.amount) || 0) - stockSubtotal) < 0.01,
      );
      if (mainIdx < 0) mainIdx = 0;
      const main = nonParty[mainIdx];
      form.setSalesPurchaseLedger?.(findLedger(main?.ledger_id));
      form.setStockEntries?.(stockRows.map(mkStockRow));
      const additional = nonParty.filter((_: any, i: number) => i !== mainIdx).map(mkEntryRow);
      if (additional.length) form.setAdditionalEntries?.(additional);
      form.setPartyBillReferences?.(billsByLedger[v.party_ledger_id] || []);
    }
  } else if (INVENTORY_ONLY.has(type)) {
    form.setPartyLedger?.(findLedger(v.party_ledger_id));
    form.setSalesPurchaseLedger?.(findLedger(v.sales_purchase_ledger_id));
    form.setStockEntries?.((v.stock_entries || []).map(mkStockRow));
  } else if (TRANSFER.has(type)) {
    form.setSourceStockEntries?.(
      (v.stock_entries || []).filter((s: any) => s.is_source).map(mkStockRow),
    );
    form.setDestinationStockEntries?.(
      (v.stock_entries || []).filter((s: any) => !s.is_source).map(mkStockRow),
    );
  } else if (ORDER_VOUCHERS.has(type)) {
    form.setPartyLedger?.(findLedger(v.party_ledger_id));
    form.setSalesPurchaseLedger?.(findLedger(v.sales_purchase_ledger_id));
    const isJW = JW_TYPES.has(type);
    form.setStockEntries?.(
      (v.stock_entries || []).map((s: any) => {
        const base = mkStockRow(s);
        if (!isJW) return base; // Purchase/Sales Order: batchAllocations already set by mkStockRow
        // Job Work In/Out Order: reconstruct jobWorkAllocations from JW-encoded batches.
        const allBatches: any[] = s.batches || [];
        const mainBatches = allBatches
          .filter((b: any) => /^JW:\d+$/.test(b.batch_number ?? ''))
          .sort(
            (a: any, b: any) =>
              Number(a.batch_number.split(':')[1]) - Number(b.batch_number.split(':')[1]),
          );
        if (!mainBatches.length) return base; // no JW allocations saved → keep base
        const compBatches = allBatches.filter(
          (b: any) =>
            b.component_of && b.consider_as_scrap && b.consider_as_scrap.startsWith('JW:'),
        );
        const jobWorkAllocations = mainBatches.map((b: any) => ({
          due_on: b.due_on ?? '',
          godown: b.godown ?? '',
          quantity: b.quantity ?? 0,
          rate: b.rate ?? 0,
          unit_symbol: (findUnit(s.unit_id) as any)?.symbol,
          amount: (b.quantity ?? 0) * (b.rate ?? 0),
          components: compBatches
            .filter((c: any) => c.consider_as_scrap === b.batch_number)
            .map((c: any) => ({
              item_name: c.component_of ?? '',
              track:
                c.tracking_no === 'Pending to Issue' || c.tracking_no === 'Pending to Receive'
                  ? (c.tracking_no as 'Pending to Issue' | 'Pending to Receive')
                  : ('Pending to Issue' as const),
              due_on: c.due_on ?? '',
              godown: c.godown ?? '',
              batch_lot:
                c.batch_number && !/^JW:/.test(c.batch_number) ? c.batch_number : undefined,
              actual_qty: c.quantity ?? 0,
              as_per_bom: c.actual_quantity ?? c.quantity ?? 0,
              rate: c.rate ?? 0,
              unit_symbol: undefined,
              amount: (c.quantity ?? 0) * (c.rate ?? 0),
            })),
        }));
        return { ...base, jobWorkAllocations, batchAllocations: [] };
      }),
    );
  } else if (type === 'Payroll') {
    form.setAccountLedger?.(findLedger(v.party_ledger_id));
    // Group saved entries by employee for display (no category stored in backend)
    const entries: any[] = v.payroll_entries || [];
    const empMap = new Map<number, any[]>();
    for (const p of entries) {
      if (!empMap.has(p.employee_id)) empMap.set(p.employee_id, []);
      empMap.get(p.employee_id)!.push(p);
    }
    const groups =
      empMap.size === 0
        ? [
            {
              id: nextId(),
              category: null,
              employeeRows: [
                {
                  id: nextId(),
                  employee: null,
                  payHeadRows: [{ id: nextId(), payHead: null, amountRaw: '' }],
                },
              ],
            },
          ]
        : [
            {
              id: nextId(),
              category: null,
              employeeRows: Array.from(empMap.entries()).map(([empId, phs]) => ({
                id: nextId(),
                employee: byId(form.allEmployees, 'employee_id', empId),
                payHeadRows: phs.map((p: any) => ({
                  id: nextId(),
                  payHead: byId(form.allPayHeads, 'pay_head_id', p.pay_head_id),
                  amountRaw: String(p.amount ?? ''),
                })),
              })),
            },
          ];
    form.setPayrollGroups?.(groups);
  }
}
