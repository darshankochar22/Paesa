const { db } = require('../db/index');
const auditTrailService = require('../auditTrail/auditTrailService');
const { sql, eq } = require('drizzle-orm');
const {
  vouchers,
  voucherEntries,
  voucherStockEntries,
  voucherBatches,
  voucherItemExcise,
  voucherBillReferences,
  voucherBankDetails,
  voucherCostCentres,
  voucherCashDenominations,
  voucherReceiptDetails,
  voucherPartyDetails,
  voucherDispatchDetails,
  voucherCreditNoteDetails,
  voucherDebitNoteDetails,
  voucherVatDetails,
  voucherExciseDetails,
  voucherOrderDetails,
  voucherPayrollEntries,
  ledgers,
  ledgerStatutoryDetails,
  payHeads,
  companies,
  voucherTypes,
  voucherTypeConfigs,
} = require('../db/schema');

// Non-accounting inventory-only voucher types never post a voucher_entries row
// for the party ledger, so a bill reference against them would be orphaned
// (no accounting entry to settle) and corrupts bill-wise outstanding reports.
const NON_ACCOUNTING_INVENTORY_TYPES = ['Delivery Note', 'Receipt Note', 'Rejection In', 'Rejection Out', 'Material In', 'Material Out'];

const { generateVoucherNumber, getNextVoucherNumber } = require('./voucherNumbering');
const {
  nullify,
  getLedgerBalance,
  searchLedgers,
  getPendingBills,
  recalculateLedgerBalances,
  getOrCreatePayHeadLedger,
  validateDoubleEntry,
} = require('./voucherLedgerHelpers');

// Attendance vouchers live in their own table (attendance_vouchers), so the regular
// voucher queries never return them. This maps them into the shared Day Book / Voucher
// Register row shape so they show up alongside normal vouchers. voucher_id is negated
// to avoid colliding with real voucher ids (the UI skips navigation for negatives).
// Pass a from/to range to filter by date (Day Book); omit it for the full list.
async function fetchAttendanceVoucherRows(company_id, fy_id, from = null, to = null) {
  let rows = [];
  try {
    const dateCond = (from && to) ? sql` AND av.date >= ${from} AND av.date <= ${to}` : sql``;
    rows = await db.all(
      sql`SELECT av.attendance_voucher_id AS aid, av.voucher_number, av.date, av.narration,
            (SELECT emp.name FROM attendance_voucher_entries e
             LEFT JOIN employees emp ON emp.employee_id = e.employee_id
             WHERE e.attendance_voucher_id = av.attendance_voucher_id
             ORDER BY e.entry_id ASC LIMIT 1) AS first_employee,
            (SELECT COUNT(*) FROM attendance_voucher_entries e
             WHERE e.attendance_voucher_id = av.attendance_voucher_id) AS entry_count
          FROM attendance_vouchers av
          WHERE av.company_id = ${company_id}${dateCond}`
    );
  } catch (_) { return []; }
  return rows.map((a) => {
    const cnt = Number(a.entry_count) || 0;
    const particulars = a.first_employee
      ? (cnt > 1 ? `${a.first_employee} + ${cnt - 1} more` : a.first_employee)
      : (a.narration || null);
    return {
      voucher_id: -Number(a.aid),
      company_id,
      fy_id,
      voucher_type: 'Attendance',
      voucher_number: a.voucher_number,
      date: a.date,
      narration: a.narration,
      party_name: particulars,
      ledger_names: particulars,
      is_cancelled: 0,
      is_optional: 0,
      debit_amount: 0,
      credit_amount: 0,
      inwards_qty: 0,
      outwards_qty: 0,
      stock_item_name: null,
      stock_unit: null,
    };
  });
}

// Maps the label the Ledger Create/Alter screen stores in ledger_statutory_details.gst_tax_type
// (see LedgerTaxPanel.tsx) to the override key gstTaxEngine's resolveOrOverride() looks up.
const GST_TAX_TYPE_TO_OVERRIDE_KEY = {
  'CGST': 'cgst_ledger_id',
  'SGST/UTGST': 'sgst_ledger_id',
  'IGST': 'igst_ledger_id',
  'Cess': 'cess_ledger_id',
};

// Resolves a Voucher Type Class's mapped GST ledgers ("Name of Class" →
// "Use Class for GST Details" = Yes). The class just lists ledgers directly
// (gst_ledger_ids) — each ledger's own gst_tax_type (set on Ledger Create) decides whether
// it overrides CGST/SGST/IGST/Cess, so there's no separate per-slot naming step. Returns
// null when no class is selected, the class can't be found, or GST-details use is off for
// it — the gstTaxEngine then falls through to its normal auto-resolve/auto-create behavior,
// so vouchers without a class are unaffected.
const resolveVoucherClassGstLedgers = async (company_id, voucher_type, class_name) => {
  if (!class_name) return null;
  try {
    const vtRows = await db.all(
      sql`SELECT vt_id FROM ${voucherTypes}
          WHERE ${voucherTypes.companyId} = ${company_id} AND LOWER(${voucherTypes.name}) = LOWER(${voucher_type})
          LIMIT 1`
    );
    if (vtRows.length === 0) return null;

    const configRows = await db.all(
      sql`SELECT voucher_classes FROM ${voucherTypeConfigs}
          WHERE ${voucherTypeConfigs.voucherTypeId} = ${vtRows[0].vt_id} LIMIT 1`
    );
    if (configRows.length === 0) return null;

    let classes = [];
    try { classes = JSON.parse(configRows[0].voucher_classes || '[]'); } catch (_) { classes = []; }
    const cls = Array.isArray(classes) ? classes.find((c) => c.name === class_name) : null;
    if (!cls || cls.use_for_gst_details !== 'Yes') return null;

    // Back-compat: classes saved before this rework store the 3 fixed fields directly.
    const ledgerIds = Array.isArray(cls.gst_ledger_ids)
      ? cls.gst_ledger_ids
      : [cls.cgst_ledger_id, cls.sgst_ledger_id, cls.igst_ledger_id].filter(Boolean);
    if (ledgerIds.length === 0) return null;

    const rows = await db.all(
      sql`SELECT l.ledger_id, sd.gst_tax_type FROM ${ledgers} l
          JOIN ${ledgerStatutoryDetails} sd ON sd.ledger_id = l.ledger_id
          WHERE l.ledger_id IN (${sql.join(ledgerIds.map((id) => sql`${id}`), sql`, `)})`
    );

    const result = {};
    for (const row of rows) {
      const key = GST_TAX_TYPE_TO_OVERRIDE_KEY[row.gst_tax_type];
      if (key) result[key] = row.ledger_id;
    }
    return Object.keys(result).length > 0 ? result : null;
  } catch (_) {
    return null;
  }
};

module.exports = {
  fetchAttendanceVoucherRows,

  create: async (data) => {
    try {
      if (data.voucher_type === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;

        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            const phRows = await db.all(
              sql`SELECT name, pay_head_type FROM ${payHeads} WHERE ${payHeads.payHeadId} = ${entry.pay_head_id}`
            );
            if (phRows.length > 0) {
              const ph = phRows[0];
              const ledgerId = await getOrCreatePayHeadLedger(data.company_id, ph.name);
              const isDeduction = ph.pay_head_type && (
                ph.pay_head_type.toLowerCase().includes('deduction') ||
                ph.pay_head_type.toLowerCase().includes('pf') ||
                ph.pay_head_type.toLowerCase().includes('esi')
              );

              const amount = Number(entry.amount) || 0;
              if (amount > 0) {
                if (isDeduction) {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Cr',
                    amount: amount,
                  });
                  totalNetDrCr -= amount;
                } else {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Dr',
                    amount: amount,
                  });
                  totalNetDrCr += amount;
                }
              }
            }
          }
        }

        if (totalNetDrCr !== 0 && data.party_ledger_id) {
          const bankLedgerId = Number(data.party_ledger_id);
          const bankLedgerRows = await db.all(
            sql`SELECT name FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${bankLedgerId}`
          );
          const bankName = bankLedgerRows.length > 0 ? bankLedgerRows[0].name : 'Cash/Bank Account';

          if (totalNetDrCr > 0) {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Cr',
              amount: totalNetDrCr,
            });
          } else {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Dr',
              amount: Math.abs(totalNetDrCr),
            });
          }
        }
        data.entries = entries;
        data.is_accounting_voucher = 1;
      }

      if (data.is_accounting_voucher && ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(data.voucher_type)) {
        const gstTaxEngine = require('../gst/gstTaxEngine');
        const gstValidation = require('../gst/gstValidation');

        if (data.entries && !validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }

        data.voucher_class_gst_ledgers = await resolveVoucherClassGstLedgers(data.company_id, data.voucher_type, data.voucher_class);

        if (data.voucher_class_gst_ledgers) {
          // OPT-IN: a Voucher Type Class with GST-details mapping still auto-injects its
          // explicitly mapped ledgers (existing feature — not the silent default flow).
          try {
            const computed = await gstTaxEngine.computeVoucherTaxLines(db, data);
            if (gstValidation.isComposition(computed.company_registration_type) &&
                (computed.total_cgst || computed.total_sgst || computed.total_igst || computed.total_cess)) {
              return { success: false, error: 'Composition registration cannot apply any GST tax ledgers.' };
            }
            data.entries = computed.entries;
            data.stock_entries = computed.stock_entries;
            data.computedGST = computed;
          } catch (gstErr) {
            console.error('GST class calculation failed:', gstErr);
          }
        } else {
          // DEFAULT MANUAL FLOW: keep the user's own tax-ledger selection, validate it at
          // save (bugs 2/3/4/8), compute amounts per item (bug 7). No auto-inject (bug 1).
          const result = await gstTaxEngine.validateAndComputeVoucherGst(db, data);
          if (result.errors && result.errors.length > 0) {
            return { success: false, error: result.errors[0] };
          }
          data.entries = result.entries;
          data.stock_entries = result.stock_entries;
          data.computedGST = result;
          data.manualGST = result;
        }
      }

      if (data.is_accounting_voucher && data.entries && data.entries.length > 0) {
        if (!validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }
      }

      const voucher_number = data.voucher_number ||
        await generateVoucherNumber(data.company_id, data.fy_id, data.voucher_type);

      // Use a transaction so partial failures roll back cleanly
      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });

      try {
        const insertedVoucher = await db
          .insert(vouchers)
          .values({
            companyId: data.company_id,
            fyId: data.fy_id,
            voucherType: data.voucher_type,
            voucherNumber: voucher_number,
            date: data.date,
            status: nullify(data.status) || 'Regular',
            supplierInvoiceNo: nullify(data.supplier_invoice_no) || null,
            supplierInvoiceDate: nullify(data.supplier_invoice_date) || null,
            referenceNumber: nullify(data.reference_number) || null,
            referenceDate: nullify(data.reference_date) || null,
            narration: nullify(data.narration) || null,
            partyLedgerId: nullify(data.party_ledger_id) || null,
            partyName: nullify(data.party_name) || null,
            placeOfSupply: nullify(data.place_of_supply) || null,
            isInvoice: data.is_invoice ? 1 : 0,
            isAccountingVoucher: data.is_accounting_voucher != null ? (data.is_accounting_voucher ? 1 : 0) : 1,
            isInventoryVoucher: data.is_inventory_voucher ? 1 : 0,
            isOrderVoucher: data.is_order_voucher ? 1 : 0,
            isCancelled: 0,
            isOptional: data.is_optional ? 1 : 0,
            isPostDated: data.is_post_dated ? 1 : 0,
            applicableUpto: nullify(data.applicable_upto) || null,
            voucherClass: nullify(data.voucher_class) || null,
            salesPurchaseLedgerId: nullify(data.sales_purchase_ledger_id) || null,
            // GST snapshot captured at first save (immutable thereafter).
            gstRegistrationId: data.computedGST ? (data.computedGST.gst_registration_id ?? null) : null,
            companyState: data.computedGST ? (data.computedGST.company_state || null) : null,
            isInterstate: data.computedGST ? (data.computedGST.is_inter_state ? 1 : 0) : 0,
          })
          .returning({ id: vouchers.voucherId });

        const voucher_id = Number(insertedVoucher[0].id);

        if (data.entries && data.entries.length > 0) {
          for (const entry of data.entries) {
            const insertedEntry = await db
              .insert(voucherEntries)
              .values({
                voucherId: voucher_id,
                ledgerId: nullify(entry.ledger_id),
                ledgerName: nullify(entry.ledger_name) || null,
                type: entry.type,
                amount: entry.amount,
                amountForex: nullify(entry.amount_forex) || entry.amount,
                currency: nullify(entry.currency) || 'INR',
                narration: nullify(entry.narration) || null,
              })
              .returning({ id: voucherEntries.entryId });

            const entry_id = Number(insertedEntry[0].id);

            if (entry.cost_centres && entry.cost_centres.length > 0) {
              for (const cc of entry.cost_centres) {
                await db.insert(voucherCostCentres).values({
                  voucherId: voucher_id,
                  entryId: entry_id,
                  costCentreId: cc.cost_centre_id,
                  costCategoryId: nullify(cc.cost_category_id) || null,
                  amount: cc.amount,
                });
              }
            }
          }
        }

        if (data.stock_entries && data.stock_entries.length > 0) {
          for (const item of data.stock_entries) {
            const insertedStock = await db
              .insert(voucherStockEntries)
              .values({
                voucherId: voucher_id,
                stockItemId: nullify(item.stock_item_id),
                itemName: nullify(item.item_name) || null,
                godownId: nullify(item.godown_id) || null,
                unitId: nullify(item.unit_id) || null,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.quantity * item.rate,
                additionalAmount: nullify(item.additional_amount) || 0,
                discountAmount: nullify(item.discount_amount) || 0,
                hsnCode: nullify(item.hsn_code) || null,
                gstRate: nullify(item.gst_rate) || 0,
                cgstAmount: nullify(item.cgst_amount) || 0,
                sgstAmount: nullify(item.sgst_amount) || 0,
                igstAmount: nullify(item.igst_amount) || 0,
                isSource: item.is_source ? 1 : 0,
              })
              .returning({ id: voucherStockEntries.stockEntryId });

            // Batch allocations: accept a single `item.batch` (legacy) or an
            // `item.batches` array (one stock line split across many batches —
            // matches the TallyPrime Stock Item Allocations sub-screen).
            const batchList = Array.isArray(item.batches)
              ? item.batches
              : (item.batch ? [item.batch] : []);
            for (const b of batchList) {
              // Keep rows with a batch number OR a godown (non-batch items
              // allocate by godown only, leaving the batch number empty).
              if (!b || (!b.batch_number && !b.godown)) continue;
              await db.insert(voucherBatches).values({
                voucherId: voucher_id,
                stockEntryId: Number(insertedStock[0].id),
                batchNumber: nullify(b.batch_number) || null,
                trackingNo: nullify(b.tracking_no) || null,
                mfgDate: nullify(b.mfg_date) || null,
                expiryDate: nullify(b.expiry_date) || null,
                quantity: b.quantity || item.quantity,
                rate: b.rate || item.rate,
                godown: nullify(b.godown) || null,
                actualQuantity: b.actual_quantity ?? b.quantity ?? 0,
                discPercent: b.disc_percent ?? 0,
                orderNo: nullify(b.order_no) || null,
                dueOn: nullify(b.due_on) || null,
                componentOf: nullify(b.component_of) || null,
                considerAsScrap: nullify(b.consider_as_scrap) || null,
                dueOnDate: nullify(b.due_on_date) || null,
                trackComponents: nullify(b.track_components) || null,
              });
            }

            // Per-item excise details (Credit Note excise-applicable items —
            // matches the TallyPrime "Excise Details for <item>" sub-screen).
            const ie = item.excise_item_details;
            if (ie) {
              await db.insert(voucherItemExcise).values({
                voucherId: voucher_id,
                stockEntryId: Number(insertedStock[0].id),
                salesInvoiceNumber: nullify(ie.sales_invoice_number) || null,
                salesInvoiceDate: nullify(ie.sales_invoice_date) || null,
                exciseSalesInvoice: nullify(ie.excise_sales_invoice) || null,
                rateOfDuty: nullify(ie.rate_of_duty) || null,
                ratePerUnit: nullify(ie.rate_per_unit) || null,
                supplierDutyAmount: nullify(ie.supplier_duty_amount) || null,
                mfgrImporterDutyAmount: nullify(ie.mfgr_importer_duty_amount) || null,
              });
            }
          }
        }

        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            await db.insert(voucherPayrollEntries).values({
              voucherId: voucher_id,
              employeeId: nullify(entry.employee_id),
              payHeadId: nullify(entry.pay_head_id),
              amount: Number(entry.amount) || 0,
            });
          }
        }

        if (data.bill_references && data.bill_references.length > 0 && !NON_ACCOUNTING_INVENTORY_TYPES.includes(data.voucher_type)) {
          for (const bill of data.bill_references) {
            await db.insert(voucherBillReferences).values({
              voucherId: voucher_id,
              ledgerId: bill.ledger_id,
              billName: bill.bill_name,
              billType: bill.bill_type,
              amount: bill.amount,
              creditPeriod: nullify(bill.credit_period) || null,
              dueDate: nullify(bill.due_date) || null,
            });
          }
        }

        if (data.bank_details) {
          await db.insert(voucherBankDetails).values({
            voucherId: voucher_id,
            ledgerId: nullify(data.bank_details.ledger_id),
            transactionType: nullify(data.bank_details.transaction_type) || 'Cheque',
            chequeRange: nullify(data.bank_details.cheque_range) || null,
            instrumentNumber: nullify(data.bank_details.instrument_number) || null,
            instrumentDate: nullify(data.bank_details.instrument_date) || null,
            bankName: nullify(data.bank_details.bank_name) || null,
            branch: nullify(data.bank_details.branch) || null,
            accountNumber: nullify(data.bank_details.account_number) || null,
            ifscCode: nullify(data.bank_details.ifsc_code) || null,
            paymentGateway: nullify(data.bank_details.payment_gateway) || null,
            amount: nullify(data.bank_details.amount) || 0,
            favouringName: nullify(data.bank_details.favouring_name) || null,
            transferMode: nullify(data.bank_details.transfer_mode) || null,
            allocationsJson: Array.isArray(data.bank_details.allocations)
              ? JSON.stringify(data.bank_details.allocations)
              : null,
          });
        }

        if (data.cash_denominations) {
          const cd = data.cash_denominations;
          const ledgerId = cd.ledger_id || (cd.entries && cd.entries[0]?.ledger_id) || null;
          if (cd.entries && cd.entries.length > 0) {
            for (const entry of cd.entries) {
              await db.insert(voucherCashDenominations).values({
                voucherId: voucher_id,
                ledgerId: ledgerId,
                denomination: String(entry.denomination),
                quantity: entry.quantity || 0,
                amount: entry.amount || 0,
              });
            }
          }
          if (cd.others && cd.others > 0) {
            await db.insert(voucherCashDenominations).values({
              voucherId: voucher_id,
              ledgerId: ledgerId,
              denomination: 'Others',
              quantity: 0,
              amount: cd.others,
            });
          }
        }

        if (data.receipt_details) {
          const rd = data.receipt_details;
          await db.insert(voucherReceiptDetails).values({
            voucherId: voucher_id,
            receiptNoteNo: nullify(rd.receipt_note_no) || null,
            receiptDocNo: nullify(rd.receipt_doc_no) || null,
            receiptDocDate: nullify(rd.receipt_doc_date) || null,
            dispatchedThrough: nullify(rd.dispatched_through) || null,
            destination: nullify(rd.destination) || null,
            carrierName: nullify(rd.carrier_name) || null,
            billOfLadingNo: nullify(rd.bill_of_lading_no) || null,
            billOfLadingDate: nullify(rd.bill_of_lading_date) || null,
            motorVehicleNo: nullify(rd.motor_vehicle_no) || null,
          });
        }

        if (data.party_details) {
          const pd = data.party_details;
          await db.insert(voucherPartyDetails).values({
            voucherId: voucher_id,
            supplierName: nullify(pd.supplier_name) || null,
            mailingName: nullify(pd.mailing_name) || null,
            address: nullify(pd.address) || null,
            state: nullify(pd.state) || null,
            country: nullify(pd.country) || null,
          });
        }

        if (data.dispatch_details) {
          const dd = data.dispatch_details;
          await db.insert(voucherDispatchDetails).values({
            voucherId: voucher_id,
            deliveryNoteNos: nullify(dd.delivery_note_nos) || null,
            dispatchDocNo: nullify(dd.dispatch_doc_no) || null,
            dispatchedThrough: nullify(dd.dispatched_through) || null,
            destination: nullify(dd.destination) || null,
            carrierName: nullify(dd.carrier_name) || null,
            billOfLadingNo: nullify(dd.bill_of_lading_no) || null,
            billOfLadingDate: nullify(dd.bill_of_lading_date) || null,
            motorVehicleNo: nullify(dd.motor_vehicle_no) || null,
          });
        }

        if (data.credit_note_details) {
          const cn = data.credit_note_details;
          await db.insert(voucherCreditNoteDetails).values({
            voucherId: voucher_id,
            trackingNo: nullify(cn.tracking_no) || null,
            dispatchDocNo: nullify(cn.dispatch_doc_no) || null,
            dispatchedThrough: nullify(cn.dispatched_through) || null,
            destination: nullify(cn.destination) || null,
            carrierName: nullify(cn.carrier_name) || null,
            billOfLadingNo: nullify(cn.bill_of_lading_no) || null,
            billOfLadingDate: nullify(cn.bill_of_lading_date) || null,
            motorVehicleNo: nullify(cn.motor_vehicle_no) || null,
            originalInvoiceNo: nullify(cn.original_invoice_no) || null,
            originalInvoiceDate: nullify(cn.original_invoice_date) || null,
            reasonForIssuingNote: nullify(cn.reason_for_issuing_note) || null,
            supplierNoteNo: nullify(cn.supplier_note_no) || null,
            supplierNoteDate: nullify(cn.supplier_note_date) || null,
            natureOfReturn: nullify(cn.nature_of_return) || null,
          });
        }

        if (data.debit_note_details) {
          const dn = data.debit_note_details;
          await db.insert(voucherDebitNoteDetails).values({
            voucherId: voucher_id,
            trackingNo: nullify(dn.tracking_no) || null,
            dispatchDocNo: nullify(dn.dispatch_doc_no) || null,
            dispatchedThrough: nullify(dn.dispatched_through) || null,
            destination: nullify(dn.destination) || null,
            carrierName: nullify(dn.carrier_name) || null,
            billOfLadingNo: nullify(dn.bill_of_lading_no) || null,
            billOfLadingDate: nullify(dn.bill_of_lading_date) || null,
            motorVehicleNo: nullify(dn.motor_vehicle_no) || null,
            originalInvoiceNo: nullify(dn.original_invoice_no) || null,
            originalInvoiceDate: nullify(dn.original_invoice_date) || null,
            dateTimeOfInvoice: nullify(dn.date_time_of_invoice) || null,
            dateTimeOfRemoval: nullify(dn.date_time_of_removal) || null,
            reasonForIssuingNote: nullify(dn.reason_for_issuing_note) || null,
            supplierNoteNo: nullify(dn.supplier_note_no) || null,
            supplierNoteDate: nullify(dn.supplier_note_date) || null,
            natureOfReturn: nullify(dn.nature_of_return) || null,
          });
        }

        if (data.vat_details) {
          const vd = data.vat_details;
          await db.insert(voucherVatDetails).values({
            voucherId: voucher_id,
            dateTime: nullify(vd.date_time) || null,
            pointOfSale: nullify(vd.point_of_sale) || null,
          });
        }

        if (data.excise_details) {
          const ed = data.excise_details;
          await db.insert(voucherExciseDetails).values({
            voucherId: voucher_id,
            inspectionDocumentNo: nullify(ed.inspection_document_no) || null,
            inspectionDocumentDate: nullify(ed.inspection_document_date) || null,
          });
        }

        if (data.order_details) {
          const od = data.order_details;
          await db.insert(voucherOrderDetails).values({
            voucherId: voucher_id,
            orderNos: nullify(od.order_nos) || null,
            orderDate: nullify(od.order_date) || null,
            modeTermsOfPayment: nullify(od.mode_terms_of_payment) || null,
            otherReferences: nullify(od.other_references) || null,
            termsOfDelivery: nullify(od.terms_of_delivery) || null,
            challanNos: nullify(od.challan_nos) || null,
            dispatchedThrough: nullify(od.dispatched_through) || null,
            destination: nullify(od.destination) || null,
            carrierName: nullify(od.carrier_name) || null,
            billOfLadingNo: nullify(od.bill_of_lading_no) || null,
            billOfLadingDate: nullify(od.bill_of_lading_date) || null,
            motorVehicleNo: nullify(od.motor_vehicle_no) || null,
            sourceGodownId: nullify(od.source_godown_id) || null,
            sourceGodownName: nullify(od.source_godown_name) || null,
          });
        }

        if (data.manualGST) {
          const gstTaxEngine = require('../gst/gstTaxEngine');
          await gstTaxEngine.saveManualVoucherTaxLines(db, voucher_id, data.manualGST);
        } else if (data.computedGST) {
          const gstTaxEngine = require('../gst/gstTaxEngine');
          await gstTaxEngine.saveVoucherTaxLines(db, voucher_id, data.computedGST);
        }

        // Transactional audit (MCA Rule 11(g)): inserted on the same connection INSIDE this
        // transaction, so it commits or rolls back atomically with the voucher.
        await auditTrailService.recordInTx({
          company_id: data.company_id,
          entity_type: 'voucher',
          entity_id: voucher_id,
          action: 'create',
          after: {
            voucher_id,
            company_id: data.company_id,
            fy_id: data.fy_id,
            voucher_type: data.voucher_type,
            date: data.date,
            voucher_number: data.voucher_number ?? null,
            narration: data.narration ?? null,
            party_name: data.party_name ?? null,
            entries: data.entries || [],
          },
        });

        await db.execute({ sql: 'COMMIT', args: [] });

        // Bug 5: persist the voucher's chosen GST registration as the company's current
        // default, so subsequent NEW vouchers prefill with it ("fixed until changed").
        if (data.gst_registration_id && data.company_id) {
          try {
            await db.update(companies)
              .set({ currentDefaultGstRegistrationId: Number(data.gst_registration_id) })
              .where(eq(companies.companyId, data.company_id));
          } catch (e) {
            console.error('Failed to persist default GST registration:', e);
          }
        }

// ── E-Invoice auto-trigger ────────────────────────────────────────────────────
if (data.voucher_type === 'Sales' && data.is_invoice) {
  try {
    const eInvoiceService = require('../eInvoice/eInvoiceService');

    // Credentials check
    const credsRes = await eInvoiceService.getCredentials(data.company_id);
    if (credsRes.success) {

      // Party GSTIN check
      const partyLedgerRows = data.party_ledger_id
        ? await db.all(
            sql`SELECT * FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${data.party_ledger_id}`
          )
        : null;

      const partyGSTIN = partyLedgerRows?.[0]?.gstin || null;

      // Total invoice value check (> 50,000)
      const totalValue = data.entries
        ? data.entries
            .filter(e => e.type === 'Cr')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        : 0;

      if (partyGSTIN && totalValue >= 50000) {

        // Build NIC payload
        const companyRows = await db.all(
          sql`SELECT * FROM ${companies} WHERE ${companies.companyId} = ${data.company_id}`
        );
        const company = companyRows[0];

        const invoiceDate = new Date(data.date);
        const formattedDate = `${String(invoiceDate.getDate()).padStart(2,'0')}/${String(invoiceDate.getMonth()+1).padStart(2,'0')}/${invoiceDate.getFullYear()}`;

        // Seller state code from GSTIN (first 2 digits)
        const sellerStateCode = credsRes.credentials.gstin?.substring(0, 2) || '27';
        const buyerStateCode  = partyGSTIN?.substring(0, 2) || '27';

        // IGST if interstate, else CGST+SGST
        const isInterstate = sellerStateCode !== buyerStateCode;

        const itemList = (data.stock_entries || []).map((item, idx) => {
          const assessable = item.quantity * item.rate;
          const gstRate    = item.gst_rate || 0;
          const igstAmt    = isInterstate ? (assessable * gstRate / 100) : 0;
          const cgstAmt    = !isInterstate ? (assessable * gstRate / 2 / 100) : 0;
          const sgstAmt    = !isInterstate ? (assessable * gstRate / 2 / 100) : 0;

          return {
            SlNo:       String(idx + 1),
            PrdDesc:    item.item_name || 'Item',
            IsServc:    'N',
            HsnCd:      item.hsn_code || '',
            Qty:        item.quantity,
            Unit:       'NOS',
            UnitPrice:  item.rate,
            TotAmt:     assessable,
            Discount:   item.discount_amount || 0,
            AssAmt:     assessable - (item.discount_amount || 0),
            GstRt:      gstRate,
            IgstAmt:    igstAmt,
            CgstAmt:    cgstAmt,
            SgstAmt:    sgstAmt,
            CesRt:      0,
            CesAmt:     0,
            TotItemVal: assessable + igstAmt + cgstAmt + sgstAmt,
          };
        });

        const totalAssessable = itemList.reduce((s, i) => s + i.AssAmt, 0);
        const totalIGST       = itemList.reduce((s, i) => s + i.IgstAmt, 0);
        const totalCGST       = itemList.reduce((s, i) => s + i.CgstAmt, 0);
        const totalSGST       = itemList.reduce((s, i) => s + i.SgstAmt, 0);

        const nicPayload = {
          Version: '1.1',
          TranDtls: {
            TaxSch:     'GST',
            SupTyp:     'B2B',
            RegRev:     'N',
            IgstOnIntra: 'N',
          },
          DocDtls: {
            Typ: 'INV',
            No:  voucher_number,
            Dt:  formattedDate,
          },
          SellerDtls: {
            Gstin: credsRes.credentials.gstin,
            LglNm: company?.name || '',
            Addr1: company?.address || 'N/A',
            Loc:   company?.city   || 'N/A',
            Pin:   Number(company?.pincode) || 100001,
            Stcd:  sellerStateCode,
          },
          BuyerDtls: {
            Gstin: partyGSTIN,
            LglNm: partyLedgerRows[0].name,
            Pos:   data.place_of_supply || buyerStateCode,
            Addr1: partyLedgerRows[0].address1 || 'N/A',
            Loc:   partyLedgerRows[0].city    || 'N/A',
            Pin:   Number(partyLedgerRows[0].pincode) || 100001,
            Stcd:  buyerStateCode,
          },
          ItemList: itemList,
          ValDtls: {
            AssVal:    totalAssessable,
            IgstVal:   totalIGST,
            CgstVal:   totalCGST,
            SgstVal:   totalSGST,
            CesVal:    0,
            TotInvVal: totalValue,
          },
        };

        // Fire and forget — don't block voucher save
        eInvoiceService.generateIRN(
          data.company_id,
          voucher_id,
          nicPayload,
          credsRes.credentials
        ).then((irnRes) => {
          if (irnRes.success) {
            console.log(`[eInvoice] IRN generated: ${irnRes.data.Irn}`);
          } else {
            console.warn(`[eInvoice] IRN failed: ${irnRes.error}`);
          }
        }).catch((e) => {
          console.warn('[eInvoice] IRN error:', e.message);
        });
      }
    }
  } catch (eInvErr) {
    // Never block voucher save because of e-invoice failure
    console.warn('[eInvoice] Auto-trigger error:', eInvErr.message);
  }
}

        // Update closing_balance for all ledgers involved in this voucher
        await recalculateLedgerBalances(voucher_id, data.company_id, data.fy_id);

        const voucherRows = await db.all(
          sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${voucher_id}`
        );
        return { success: true, voucher: voucherRows[0] };

      } catch (innerErr) {
        await db.execute({ sql: 'ROLLBACK', args: [] });
        throw innerErr;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id, fy_id) => {
    try {
      const rows = await db.all(
        sql`SELECT v.*,
              COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Dr'), 0) AS debit_amount,
              COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Cr'), 0) AS credit_amount,
              (SELECT COALESCE(e.ledger_name, l.name)
               FROM ${voucherEntries} e
               LEFT JOIN ${ledgers} l ON l.ledger_id = e.ledger_id
               WHERE e.voucher_id = v.voucher_id
               ORDER BY e.entry_id ASC
               LIMIT 1) AS ledger_names,
              CASE
                WHEN v.voucher_type IN ('Purchase','Receipt Note','Rejection In','Material In')
                THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
                ELSE 0
              END AS inwards_qty,
              CASE
                WHEN v.voucher_type IN ('Sales','Delivery Note','Rejection Out','Material Out')
                THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
                ELSE 0
              END AS outwards_qty
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            ORDER BY v.date DESC, v.voucher_id DESC`
      );
      // Attendance vouchers live in their own table — merge them into the register.
      const attMapped = await fetchAttendanceVoucherRows(company_id, fy_id);
      const merged = [...rows, ...attMapped].sort(
        (a, b) => String(b.date).localeCompare(String(a.date))
      );
      return { success: true, vouchers: merged };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      // Attendance vouchers live in attendance_vouchers, not the main vouchers
      // table — Day Book / Statistics Voucher Register expose them with a
      // negated id (see fetchAttendanceVoucherRows) so a normal `vouchers`
      // lookup never matches. Route those to attendanceService and reshape the
      // result into the same envelope VoucherView expects.
      if (Number(id) < 0) {
        const attendanceService = require('../attendance/attendanceService');
        const res = await attendanceService.getById(-Number(id));
        if (!res.success) return res;
        const v = res.voucher;
        return {
          success: true,
          voucher: {
            voucher_id: -Number(v.attendance_voucher_id),
            company_id: v.company_id,
            voucher_type: 'Attendance',
            voucher_number: v.voucher_number,
            date: v.date,
            status: 'Regular',
            supplier_invoice_no: null,
            supplier_invoice_date: null,
            reference_number: null,
            reference_date: null,
            narration: v.narration,
            party_name: null,
            party_ledger_id: null,
            place_of_supply: null,
            is_invoice: 0,
            is_accounting_voucher: 0,
            is_inventory_voucher: 0,
            is_order_voucher: 0,
            is_cancelled: 0,
            is_optional: 0,
            is_post_dated: 0,
            created_at: v.created_at,
            updated_at: v.updated_at,
            entries: [],
            stock_entries: [],
            payroll_entries: [],
            attendance_entries: v.entries,
            bill_references: [],
            bank_details: null,
            cost_centres: [],
            cash_denominations: [],
            receipt_details: null,
            party_details: null,
            dispatch_details: null,
            credit_note_details: null,
            debit_note_details: null,
            vat_details: null,
            order_details: null,
          },
        };
      }

      const voucherRows = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`
      );
      if (voucherRows.length === 0) return { success: false, error: 'Voucher not found' };
      const voucher = voucherRows[0];

      // Enrich each entry with its GST tax tagging (LEFT JOIN ledger_statutory_details,
      // 1:1) so the voucher view can show a tax ledger's rate % next to it, Tally-style.
      const entries = await db.all(
        sql`SELECT ve.*, sd.gst_tax_type AS gst_tax_type, sd.gst_rate AS gst_tax_rate,
                   sd.type_of_duty_tax AS type_of_duty_tax
            FROM ${voucherEntries} ve
            LEFT JOIN ${ledgerStatutoryDetails} sd ON sd.ledger_id = ve.ledger_id
            WHERE ve.voucher_id = ${id}`
      );
      // Joined so VoucherView can show Godown/per (unit) columns the way each
      // Create form does — vse.* alone only carries the bare godown_id/unit_id.
      const stockItems = await db.all(
        sql`SELECT vse.*, g.name AS godown_name, u.symbol AS unit_symbol
            FROM ${voucherStockEntries} vse
            LEFT JOIN godowns g ON g.godown_id = vse.godown_id
            LEFT JOIN units u ON u.unit_id = vse.unit_id
            WHERE vse.voucher_id = ${id}`
      );
      const bills = await db.all(
        sql`SELECT * FROM ${voucherBillReferences} WHERE ${voucherBillReferences.voucherId} = ${id}`
      );
      const bank = await db.all(
        sql`SELECT * FROM ${voucherBankDetails} WHERE ${voucherBankDetails.voucherId} = ${id}`
      );
      // Multi-row bank allocations round-trip as JSON alongside the flat legacy columns.
      if (bank[0]?.allocations_json) {
        try { bank[0].allocations = JSON.parse(bank[0].allocations_json); } catch (_) {}
      }
      const costCentres = await db.all(
        sql`SELECT * FROM ${voucherCostCentres} WHERE ${voucherCostCentres.voucherId} = ${id}`
      );
      const cashDenoms = await db.all(
        sql`SELECT * FROM ${voucherCashDenominations} WHERE ${voucherCashDenominations.voucherId} = ${id}`
      );

      const stockWithBatches = await Promise.all(
        stockItems.map(async (s) => {
          const batches = await db.all(
            sql`SELECT * FROM ${voucherBatches} WHERE ${voucherBatches.stockEntryId} = ${s.stock_entry_id}`
          );
          const excise = await db.all(
            sql`SELECT * FROM ${voucherItemExcise} WHERE ${voucherItemExcise.stockEntryId} = ${s.stock_entry_id}`
          );
          return { ...s, batches: batches, excise_item_details: excise[0] || null };
        })
      );

      const receiptDetails = await db.all(
        sql`SELECT * FROM ${voucherReceiptDetails} WHERE ${voucherReceiptDetails.voucherId} = ${id}`
      );
      const partyDetails = await db.all(
        sql`SELECT * FROM ${voucherPartyDetails} WHERE ${voucherPartyDetails.voucherId} = ${id}`
      );
      const dispatchDetails = await db.all(
        sql`SELECT * FROM ${voucherDispatchDetails} WHERE ${voucherDispatchDetails.voucherId} = ${id}`
      );
      const creditNoteDetails = await db.all(
        sql`SELECT * FROM ${voucherCreditNoteDetails} WHERE ${voucherCreditNoteDetails.voucherId} = ${id}`
      );
      const debitNoteDetails = await db.all(
        sql`SELECT * FROM ${voucherDebitNoteDetails} WHERE ${voucherDebitNoteDetails.voucherId} = ${id}`
      );
      const vatDetails = await db.all(
        sql`SELECT * FROM ${voucherVatDetails} WHERE ${voucherVatDetails.voucherId} = ${id}`
      );
      const exciseDetails = await db.all(
        sql`SELECT * FROM ${voucherExciseDetails} WHERE ${voucherExciseDetails.voucherId} = ${id}`
      );
      const orderDetails = await db.all(
        sql`SELECT * FROM ${voucherOrderDetails} WHERE ${voucherOrderDetails.voucherId} = ${id}`
      );
      let payrollEntries = [];
      try {
        payrollEntries = await db.all(
          sql`SELECT pe.*, emp.name as employee_name, emp.employee_code AS employee_number, ph.name as pay_head_name
              FROM ${voucherPayrollEntries} pe
              LEFT JOIN employees emp ON emp.employee_id = pe.employee_id
              LEFT JOIN ${payHeads} ph ON ph.pay_head_id = pe.pay_head_id
              WHERE pe.voucher_id = ${id}`
        );
      } catch (_) {
        try {
          payrollEntries = await db.all(
            sql`SELECT pe.*, emp.name as employee_name, emp.employee_code AS employee_number
                FROM ${voucherPayrollEntries} pe
                LEFT JOIN employees emp ON emp.employee_id = pe.employee_id
                WHERE pe.voucher_id = ${id}`
          );
        } catch (_) {
          payrollEntries = [];
        }
      }

      return {
        success: true,
        voucher: {
          ...voucher,
          entries: entries,
          stock_entries: stockWithBatches,
          bill_references: bills,
          bank_details: bank[0] || null,
          cost_centres: costCentres,
          cash_denominations: cashDenoms,
          receipt_details: receiptDetails[0] || null,
          party_details: partyDetails[0] || null,
          dispatch_details: dispatchDetails[0] || null,
          credit_note_details: creditNoteDetails[0] || null,
          debit_note_details: debitNoteDetails[0] || null,
          vat_details: vatDetails[0] || null,
          excise_details: exciseDetails[0] || null,
          order_details: orderDetails[0] || null,
          payroll_entries: payrollEntries,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getDaybook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const from = from_date || today;
      const to = to_date || today;
      const rows = await db.all(
  sql`SELECT v.*,
        COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Dr'), 0) AS debit_amount,
        COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Cr'), 0) AS credit_amount,
        (SELECT COALESCE(e.ledger_name, l.name)
         FROM ${voucherEntries} e
         LEFT JOIN ${ledgers} l ON l.ledger_id = e.ledger_id
         WHERE e.voucher_id = v.voucher_id
         ORDER BY e.entry_id ASC
         LIMIT 1) AS ledger_names,
        (SELECT vse.item_name FROM ${voucherStockEntries} vse
         WHERE vse.voucher_id = v.voucher_id
         ORDER BY vse.stock_entry_id ASC LIMIT 1) AS stock_item_name,
        (SELECT u.symbol FROM ${voucherStockEntries} vse
         LEFT JOIN units u ON u.unit_id = vse.unit_id
         WHERE vse.voucher_id = v.voucher_id
         ORDER BY vse.stock_entry_id ASC LIMIT 1) AS stock_unit,
        CASE WHEN v.voucher_type IN ('Purchase','Receipt Note','Rejection In','Material In')
          THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
          ELSE 0
        END AS inwards_qty,
        CASE WHEN v.voucher_type IN ('Sales','Delivery Note','Rejection Out','Material Out')
          THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
          ELSE 0
        END AS outwards_qty
      FROM ${vouchers} v
      WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
      AND v.date >= ${from} AND v.date <= ${to}
      ORDER BY v.date ASC, v.voucher_id ASC`
);

      // Attendance vouchers live in their own table — merge them in (date-filtered).
      const attMapped = await fetchAttendanceVoucherRows(company_id, fy_id, from, to);
      const merged = [...rows, ...attMapped].sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
      );
      return { success: true, vouchers: merged };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByType: async (company_id, fy_id, voucher_type) => {
    try {
      const rows = await db.all(
        sql`SELECT v.*,
              COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Dr'), 0) AS debit_amount,
              COALESCE((SELECT SUM(amount) FROM ${voucherEntries} WHERE voucher_id = v.voucher_id AND type = 'Cr'), 0) AS credit_amount,
              (SELECT COALESCE(e.ledger_name, l.name)
               FROM ${voucherEntries} e
               LEFT JOIN ${ledgers} l ON l.ledger_id = e.ledger_id
               WHERE e.voucher_id = v.voucher_id
               ORDER BY e.entry_id ASC
               LIMIT 1) AS ledger_names,
              CASE
                WHEN v.voucher_type IN ('Purchase','Receipt Note','Rejection In','Material In')
                THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
                ELSE 0
              END AS inwards_qty,
              CASE
                WHEN v.voucher_type IN ('Sales','Delivery Note','Rejection Out','Material Out')
                THEN COALESCE((SELECT SUM(quantity) FROM ${voucherStockEntries} WHERE voucher_id = v.voucher_id), 0)
                ELSE 0
              END AS outwards_qty
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = ${voucher_type} AND v.is_cancelled = 0
            ORDER BY v.date DESC, v.voucher_id DESC`
      );
      // Attendance is stored separately — when that filter is chosen, return those rows.
      if (voucher_type === 'Attendance') {
        const attMapped = await fetchAttendanceVoucherRows(company_id, fy_id);
        return { success: true, vouchers: attMapped };
      }
      return { success: true, vouchers: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByLedger: async (company_id, fy_id, ledger_id) => {
    try {
      const rows = await db.all(
        sql`SELECT DISTINCT v.* FROM ${vouchers} v
            INNER JOIN ${voucherEntries} e ON e.voucher_id = v.voucher_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND e.ledger_id = ${ledger_id} AND v.is_cancelled = 0
            ORDER BY v.date DESC`
      );
      return { success: true, vouchers: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${data.voucher_id}`
      );
      if (existing.length === 0) return { success: false, error: 'Voucher not found' };
      if (existing[0].is_cancelled) return { success: false, error: 'Cannot edit cancelled voucher' };

      const current = existing[0];
      const voucherType = data.voucher_type || current.voucher_type;

      if (voucherType === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;

        let pEntries = data.payroll_entries;
        if (pEntries === undefined) {
          const existingPEntries = await db.all(
            sql`SELECT * FROM ${voucherPayrollEntries} WHERE ${voucherPayrollEntries.voucherId} = ${data.voucher_id}`
          );
          pEntries = existingPEntries;
        }

        if (pEntries && pEntries.length > 0) {
          const companyId = data.company_id || current.company_id;
          for (const entry of pEntries) {
            const phRows = await db.all(
              sql`SELECT name, pay_head_type FROM ${payHeads} WHERE ${payHeads.payHeadId} = ${entry.pay_head_id}`
            );
            if (phRows.length > 0) {
              const ph = phRows[0];
              const ledgerId = await getOrCreatePayHeadLedger(companyId, ph.name);
              const isDeduction = ph.pay_head_type && (
                ph.pay_head_type.toLowerCase().includes('deduction') ||
                ph.pay_head_type.toLowerCase().includes('pf') ||
                ph.pay_head_type.toLowerCase().includes('esi')
              );

              const amount = Number(entry.amount) || 0;
              if (amount > 0) {
                if (isDeduction) {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Cr',
                    amount: amount,
                  });
                  totalNetDrCr -= amount;
                } else {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Dr',
                    amount: amount,
                  });
                  totalNetDrCr += amount;
                }
              }
            }
          }
        }

        const bankLedgerId = data.party_ledger_id !== undefined ? data.party_ledger_id : current.party_ledger_id;
        if (totalNetDrCr !== 0 && bankLedgerId) {
          const bankLedgerRows = await db.all(
            sql`SELECT name FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${bankLedgerId}`
          );
          const bankName = bankLedgerRows.length > 0 ? bankLedgerRows[0].name : 'Cash/Bank Account';

          if (totalNetDrCr > 0) {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Cr',
              amount: totalNetDrCr,
            });
          } else {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Dr',
              amount: Math.abs(totalNetDrCr),
            });
          }
        }
        data.entries = entries;
      }

      if (data.entries && data.entries.length > 0 && !validateDoubleEntry(data.entries)) {
        return { success: false, error: 'Debit and Credit amounts must be equal' };
      }

      // Recompute GST the same way create() does — altering item quantity/rate
      // (or the party/place of supply) must re-derive CGST/SGST/IGST, not keep
      // stale amounts from when the voucher was first saved. Only runs when the
      // caller resent both entries and stock_entries (a full alter-form save).
      if (
        data.is_accounting_voucher &&
        ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(voucherType) &&
        data.entries !== undefined &&
        data.stock_entries !== undefined
      ) {
        const gstTaxEngine = require('../gst/gstTaxEngine');
        const gstValidation = require('../gst/gstValidation');
        const companyId = data.company_id || current.company_id;
        const voucherClass = data.voucher_class !== undefined ? data.voucher_class : current.voucher_class;
        // Freeze GST identity to the voucher's own snapshot (STEP 7): amounts still
        // recompute from changed stock lines, but registration/state/interstate never
        // re-derive from the company's current default. Legacy rows (no snapshot yet)
        // pass null → derived fresh, backfilling on this save.
        const gstSnapshot = current.gst_registration_id != null
          ? {
              gst_registration_id: current.gst_registration_id,
              company_state: current.company_state,
              is_interstate: current.is_interstate,
            }
          : null;
        const gstPayload = {
          company_id: companyId,
          date: data.date || current.date,
          party_ledger_id: data.party_ledger_id !== undefined ? data.party_ledger_id : current.party_ledger_id,
          place_of_supply: data.place_of_supply !== undefined ? data.place_of_supply : current.place_of_supply,
          stock_entries: data.stock_entries,
          entries: data.entries,
          voucher_type: voucherType,
          gst_snapshot: gstSnapshot,
        };
        const classGstLedgers = await resolveVoucherClassGstLedgers(companyId, voucherType, voucherClass);

        if (classGstLedgers) {
          // OPT-IN Voucher-Class GST mapping → auto-inject (legacy behavior).
          try {
            const computed = await gstTaxEngine.computeVoucherTaxLines(db, { ...gstPayload, voucher_class_gst_ledgers: classGstLedgers });
            if (gstValidation.isComposition(computed.company_registration_type) &&
                (computed.total_cgst || computed.total_sgst || computed.total_igst || computed.total_cess)) {
              return { success: false, error: 'Composition registration cannot apply any GST tax ledgers.' };
            }
            data.entries = computed.entries;
            data.stock_entries = computed.stock_entries;
            data.computedGST = computed;
          } catch (gstErr) {
            console.error('GST class recalculation failed:', gstErr);
          }
        } else {
          // DEFAULT MANUAL FLOW — validate the user's own tax ledgers, per-item amounts.
          const result = await gstTaxEngine.validateAndComputeVoucherGst(db, gstPayload);
          if (result.errors && result.errors.length > 0) {
            return { success: false, error: result.errors[0] };
          }
          data.entries = result.entries;
          data.stock_entries = result.stock_entries;
          data.computedGST = result;
          data.manualGST = result;
        }

        if (data.entries && data.entries.length > 0 && !validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }
      }

      // All edits below are atomic with the audit row (single shared connection).
      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });

      await db
        .update(vouchers)
        .set({
          voucherNumber: nullify(data.voucher_number) ?? current.voucher_number,
          date: data.date ?? current.date,
          status: nullify(data.status) ?? current.status,
          supplierInvoiceNo: nullify(data.supplier_invoice_no) ?? nullify(current.supplier_invoice_no),
          supplierInvoiceDate: nullify(data.supplier_invoice_date) ?? nullify(current.supplier_invoice_date),
          referenceNumber: nullify(data.reference_number) ?? nullify(current.reference_number),
          referenceDate: nullify(data.reference_date) ?? nullify(current.reference_date),
          narration: nullify(data.narration) ?? nullify(current.narration),
          partyLedgerId: nullify(data.party_ledger_id) ?? nullify(current.party_ledger_id),
          partyName: nullify(data.party_name) ?? nullify(current.party_name),
          placeOfSupply: nullify(data.place_of_supply) ?? nullify(current.place_of_supply),
          isPostDated: data.is_post_dated !== undefined ? (data.is_post_dated ? 1 : 0) : current.is_post_dated,
          applicableUpto: nullify(data.applicable_upto) ?? nullify(current.applicable_upto),
          voucherClass: nullify(data.voucher_class) ?? nullify(current.voucher_class),
          salesPurchaseLedgerId: nullify(data.sales_purchase_ledger_id) ?? nullify(current.sales_purchase_ledger_id),
          // GST snapshot: keep the existing one if present (immutable); otherwise backfill
          // from this save's computation for legacy rows created before the snapshot existed.
          gstRegistrationId: current.gst_registration_id != null
            ? current.gst_registration_id
            : (data.computedGST ? (data.computedGST.gst_registration_id ?? null) : null),
          companyState: current.gst_registration_id != null
            ? current.company_state
            : (data.computedGST ? (data.computedGST.company_state || null) : nullify(current.company_state)),
          isInterstate: current.gst_registration_id != null
            ? current.is_interstate
            : (data.computedGST ? (data.computedGST.is_inter_state ? 1 : 0) : (current.is_interstate ?? 0)),
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(vouchers.voucherId, data.voucher_id));

      if (data.entries) {
        // Cost-centre splits FK-reference voucher_entries(entry_id), so they must be
        // removed BEFORE the parent entries are deleted, otherwise the entry delete
        // violates the FK (a voucher created WITH cost centres could never be edited).
        await db.delete(voucherCostCentres).where(eq(voucherCostCentres.voucherId, data.voucher_id));
        await db.delete(voucherEntries).where(eq(voucherEntries.voucherId, data.voucher_id));
        for (const entry of data.entries) {
          const insertedEntry = await db
            .insert(voucherEntries)
            .values({
              voucherId: data.voucher_id,
              ledgerId: nullify(entry.ledger_id),
              ledgerName: nullify(entry.ledger_name) || null,
              type: entry.type,
              amount: entry.amount,
              amountForex: nullify(entry.amount_forex) || entry.amount,
              currency: nullify(entry.currency) || 'INR',
              narration: nullify(entry.narration) || null,
            })
            .returning({ id: voucherEntries.entryId });

          // Re-insert the entry's cost-centre splits (the form re-sends them on edit,
          // mirroring create()).
          if (entry.cost_centres && entry.cost_centres.length > 0) {
            const entry_id = Number(insertedEntry[0].id);
            for (const cc of entry.cost_centres) {
              await db.insert(voucherCostCentres).values({
                voucherId: data.voucher_id,
                entryId: entry_id,
                costCentreId: cc.cost_centre_id,
                costCategoryId: nullify(cc.cost_category_id) || null,
                amount: cc.amount,
              });
            }
          }
        }
      }

      if (data.bill_references !== undefined) {
        await db.delete(voucherBillReferences).where(eq(voucherBillReferences.voucherId, data.voucher_id));
        if (data.bill_references && data.bill_references.length > 0 && !NON_ACCOUNTING_INVENTORY_TYPES.includes(voucherType)) {
          for (const bill of data.bill_references) {
            await db.insert(voucherBillReferences).values({
              voucherId: data.voucher_id,
              ledgerId: bill.ledger_id,
              billName: bill.bill_name,
              billType: bill.bill_type,
              amount: bill.amount,
              creditPeriod: nullify(bill.credit_period) || null,
              dueDate: nullify(bill.due_date) || null,
            });
          }
        }
      }

      if (data.receipt_details !== undefined) {
        await db.delete(voucherReceiptDetails).where(eq(voucherReceiptDetails.voucherId, data.voucher_id));
        if (data.receipt_details) {
          const rd = data.receipt_details;
          await db.insert(voucherReceiptDetails).values({
            voucherId: data.voucher_id,
            receiptNoteNo: nullify(rd.receipt_note_no) || null,
            receiptDocNo: nullify(rd.receipt_doc_no) || null,
            receiptDocDate: nullify(rd.receipt_doc_date) || null,
            dispatchedThrough: nullify(rd.dispatched_through) || null,
            destination: nullify(rd.destination) || null,
            carrierName: nullify(rd.carrier_name) || null,
            billOfLadingNo: nullify(rd.bill_of_lading_no) || null,
            billOfLadingDate: nullify(rd.bill_of_lading_date) || null,
            motorVehicleNo: nullify(rd.motor_vehicle_no) || null,
          });
        }
      }

      if (data.party_details !== undefined) {
        await db.delete(voucherPartyDetails).where(eq(voucherPartyDetails.voucherId, data.voucher_id));
        if (data.party_details) {
          const pd = data.party_details;
          await db.insert(voucherPartyDetails).values({
            voucherId: data.voucher_id,
            supplierName: nullify(pd.supplier_name) || null,
            mailingName: nullify(pd.mailing_name) || null,
            address: nullify(pd.address) || null,
            state: nullify(pd.state) || null,
            country: nullify(pd.country) || null,
          });
        }
      }

      if (data.dispatch_details !== undefined) {
        await db.delete(voucherDispatchDetails).where(eq(voucherDispatchDetails.voucherId, data.voucher_id));
        if (data.dispatch_details) {
          const dd = data.dispatch_details;
          await db.insert(voucherDispatchDetails).values({
            voucherId: data.voucher_id,
            deliveryNoteNos: nullify(dd.delivery_note_nos) || null,
            dispatchDocNo: nullify(dd.dispatch_doc_no) || null,
            dispatchedThrough: nullify(dd.dispatched_through) || null,
            destination: nullify(dd.destination) || null,
            carrierName: nullify(dd.carrier_name) || null,
            billOfLadingNo: nullify(dd.bill_of_lading_no) || null,
            billOfLadingDate: nullify(dd.bill_of_lading_date) || null,
            motorVehicleNo: nullify(dd.motor_vehicle_no) || null,
          });
        }
      }

      if (data.payroll_entries !== undefined) {
        await db.delete(voucherPayrollEntries).where(eq(voucherPayrollEntries.voucherId, data.voucher_id));
        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            await db.insert(voucherPayrollEntries).values({
              voucherId: data.voucher_id,
              employeeId: nullify(entry.employee_id),
              payHeadId: nullify(entry.pay_head_id),
              amount: Number(entry.amount) || 0,
            });
          }
        }
      }

      // ── Inventory + remaining detail sub-tables (mirror create()) ──────────
      // These were previously NOT updated, so editing stock lines / bank / tax
      // details silently dropped them. Each is replace-on-send (delete then
      // re-insert) and guarded by `!== undefined` so a partial update preserves
      // anything the caller omitted.
      if (data.stock_entries !== undefined) {
        // Batch + per-item excise rows FK-reference stock_entry_id, so clear them first.
        await db.delete(voucherBatches).where(eq(voucherBatches.voucherId, data.voucher_id));
        await db.delete(voucherItemExcise).where(eq(voucherItemExcise.voucherId, data.voucher_id));
        await db.delete(voucherStockEntries).where(eq(voucherStockEntries.voucherId, data.voucher_id));
        if (data.stock_entries && data.stock_entries.length > 0) {
          for (const item of data.stock_entries) {
            const insertedStock = await db
              .insert(voucherStockEntries)
              .values({
                voucherId: data.voucher_id,
                stockItemId: nullify(item.stock_item_id),
                itemName: nullify(item.item_name) || null,
                godownId: nullify(item.godown_id) || null,
                unitId: nullify(item.unit_id) || null,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.quantity * item.rate,
                additionalAmount: nullify(item.additional_amount) || 0,
                discountAmount: nullify(item.discount_amount) || 0,
                hsnCode: nullify(item.hsn_code) || null,
                gstRate: nullify(item.gst_rate) || 0,
                cgstAmount: nullify(item.cgst_amount) || 0,
                sgstAmount: nullify(item.sgst_amount) || 0,
                igstAmount: nullify(item.igst_amount) || 0,
                isSource: item.is_source ? 1 : 0,
              })
              .returning({ id: voucherStockEntries.stockEntryId });

            const batchList = Array.isArray(item.batches) ? item.batches : (item.batch ? [item.batch] : []);
            for (const b of batchList) {
              if (!b || (!b.batch_number && !b.godown)) continue;
              await db.insert(voucherBatches).values({
                voucherId: data.voucher_id,
                stockEntryId: Number(insertedStock[0].id),
                batchNumber: nullify(b.batch_number) || null,
                trackingNo: nullify(b.tracking_no) || null,
                mfgDate: nullify(b.mfg_date) || null,
                expiryDate: nullify(b.expiry_date) || null,
                quantity: b.quantity || item.quantity,
                rate: b.rate || item.rate,
                godown: nullify(b.godown) || null,
                actualQuantity: b.actual_quantity ?? b.quantity ?? 0,
                discPercent: b.disc_percent ?? 0,
                orderNo: nullify(b.order_no) || null,
                dueOn: nullify(b.due_on) || null,
                componentOf: nullify(b.component_of) || null,
                considerAsScrap: nullify(b.consider_as_scrap) || null,
                dueOnDate: nullify(b.due_on_date) || null,
                trackComponents: nullify(b.track_components) || null,
              });
            }

            const ie = item.excise_item_details;
            if (ie) {
              await db.insert(voucherItemExcise).values({
                voucherId: data.voucher_id,
                stockEntryId: Number(insertedStock[0].id),
                salesInvoiceNumber: nullify(ie.sales_invoice_number) || null,
                salesInvoiceDate: nullify(ie.sales_invoice_date) || null,
                exciseSalesInvoice: nullify(ie.excise_sales_invoice) || null,
                rateOfDuty: nullify(ie.rate_of_duty) || null,
                ratePerUnit: nullify(ie.rate_per_unit) || null,
                supplierDutyAmount: nullify(ie.supplier_duty_amount) || null,
                mfgrImporterDutyAmount: nullify(ie.mfgr_importer_duty_amount) || null,
              });
            }
          }
        }
      }

      if (data.bank_details !== undefined) {
        await db.delete(voucherBankDetails).where(eq(voucherBankDetails.voucherId, data.voucher_id));
        if (data.bank_details) {
          await db.insert(voucherBankDetails).values({
            voucherId: data.voucher_id,
            ledgerId: nullify(data.bank_details.ledger_id),
            transactionType: nullify(data.bank_details.transaction_type) || 'Cheque',
            chequeRange: nullify(data.bank_details.cheque_range) || null,
            instrumentNumber: nullify(data.bank_details.instrument_number) || null,
            instrumentDate: nullify(data.bank_details.instrument_date) || null,
            bankName: nullify(data.bank_details.bank_name) || null,
            branch: nullify(data.bank_details.branch) || null,
            accountNumber: nullify(data.bank_details.account_number) || null,
            ifscCode: nullify(data.bank_details.ifsc_code) || null,
            paymentGateway: nullify(data.bank_details.payment_gateway) || null,
            amount: nullify(data.bank_details.amount) || 0,
            favouringName: nullify(data.bank_details.favouring_name) || null,
            transferMode: nullify(data.bank_details.transfer_mode) || null,
            allocationsJson: Array.isArray(data.bank_details.allocations)
              ? JSON.stringify(data.bank_details.allocations)
              : null,
          });
        }
      }

      if (data.cash_denominations !== undefined) {
        await db.delete(voucherCashDenominations).where(eq(voucherCashDenominations.voucherId, data.voucher_id));
        const cd = data.cash_denominations;
        if (cd) {
          const ledgerId = cd.ledger_id || (cd.entries && cd.entries[0]?.ledger_id) || null;
          for (const entry of (cd.entries || [])) {
            await db.insert(voucherCashDenominations).values({
              voucherId: data.voucher_id,
              ledgerId,
              denomination: String(entry.denomination),
              quantity: entry.quantity || 0,
              amount: entry.amount || 0,
            });
          }
          if (cd.others && cd.others > 0) {
            await db.insert(voucherCashDenominations).values({
              voucherId: data.voucher_id,
              ledgerId,
              denomination: 'Others',
              quantity: 0,
              amount: cd.others,
            });
          }
        }
      }

      if (data.credit_note_details !== undefined) {
        await db.delete(voucherCreditNoteDetails).where(eq(voucherCreditNoteDetails.voucherId, data.voucher_id));
        if (data.credit_note_details) {
          const cn = data.credit_note_details;
          await db.insert(voucherCreditNoteDetails).values({
            voucherId: data.voucher_id,
            trackingNo: nullify(cn.tracking_no) || null,
            dispatchDocNo: nullify(cn.dispatch_doc_no) || null,
            dispatchedThrough: nullify(cn.dispatched_through) || null,
            destination: nullify(cn.destination) || null,
            carrierName: nullify(cn.carrier_name) || null,
            billOfLadingNo: nullify(cn.bill_of_lading_no) || null,
            billOfLadingDate: nullify(cn.bill_of_lading_date) || null,
            motorVehicleNo: nullify(cn.motor_vehicle_no) || null,
            originalInvoiceNo: nullify(cn.original_invoice_no) || null,
            originalInvoiceDate: nullify(cn.original_invoice_date) || null,
            reasonForIssuingNote: nullify(cn.reason_for_issuing_note) || null,
            supplierNoteNo: nullify(cn.supplier_note_no) || null,
            supplierNoteDate: nullify(cn.supplier_note_date) || null,
            natureOfReturn: nullify(cn.nature_of_return) || null,
          });
        }
      }

      if (data.debit_note_details !== undefined) {
        await db.delete(voucherDebitNoteDetails).where(eq(voucherDebitNoteDetails.voucherId, data.voucher_id));
        if (data.debit_note_details) {
          const dn = data.debit_note_details;
          await db.insert(voucherDebitNoteDetails).values({
            voucherId: data.voucher_id,
            trackingNo: nullify(dn.tracking_no) || null,
            dispatchDocNo: nullify(dn.dispatch_doc_no) || null,
            dispatchedThrough: nullify(dn.dispatched_through) || null,
            destination: nullify(dn.destination) || null,
            carrierName: nullify(dn.carrier_name) || null,
            billOfLadingNo: nullify(dn.bill_of_lading_no) || null,
            billOfLadingDate: nullify(dn.bill_of_lading_date) || null,
            motorVehicleNo: nullify(dn.motor_vehicle_no) || null,
            originalInvoiceNo: nullify(dn.original_invoice_no) || null,
            originalInvoiceDate: nullify(dn.original_invoice_date) || null,
            dateTimeOfInvoice: nullify(dn.date_time_of_invoice) || null,
            dateTimeOfRemoval: nullify(dn.date_time_of_removal) || null,
            reasonForIssuingNote: nullify(dn.reason_for_issuing_note) || null,
            supplierNoteNo: nullify(dn.supplier_note_no) || null,
            supplierNoteDate: nullify(dn.supplier_note_date) || null,
            natureOfReturn: nullify(dn.nature_of_return) || null,
          });
        }
      }

      if (data.vat_details !== undefined) {
        await db.delete(voucherVatDetails).where(eq(voucherVatDetails.voucherId, data.voucher_id));
        if (data.vat_details) {
          await db.insert(voucherVatDetails).values({
            voucherId: data.voucher_id,
            dateTime: nullify(data.vat_details.date_time) || null,
            pointOfSale: nullify(data.vat_details.point_of_sale) || null,
          });
        }
      }

      if (data.excise_details !== undefined) {
        await db.delete(voucherExciseDetails).where(eq(voucherExciseDetails.voucherId, data.voucher_id));
        if (data.excise_details) {
          await db.insert(voucherExciseDetails).values({
            voucherId: data.voucher_id,
            inspectionDocumentNo: nullify(data.excise_details.inspection_document_no) || null,
            inspectionDocumentDate: nullify(data.excise_details.inspection_document_date) || null,
          });
        }
      }

      if (data.order_details !== undefined) {
        await db.delete(voucherOrderDetails).where(eq(voucherOrderDetails.voucherId, data.voucher_id));
        if (data.order_details) {
          const od = data.order_details;
          await db.insert(voucherOrderDetails).values({
            voucherId: data.voucher_id,
            orderNos: nullify(od.order_nos) || null,
            orderDate: nullify(od.order_date) || null,
            modeTermsOfPayment: nullify(od.mode_terms_of_payment) || null,
            otherReferences: nullify(od.other_references) || null,
            termsOfDelivery: nullify(od.terms_of_delivery) || null,
            challanNos: nullify(od.challan_nos) || null,
            dispatchedThrough: nullify(od.dispatched_through) || null,
            destination: nullify(od.destination) || null,
            carrierName: nullify(od.carrier_name) || null,
            billOfLadingNo: nullify(od.bill_of_lading_no) || null,
            billOfLadingDate: nullify(od.bill_of_lading_date) || null,
            motorVehicleNo: nullify(od.motor_vehicle_no) || null,
            sourceGodownId: nullify(od.source_godown_id) || null,
          });
        }
      }

      if (data.manualGST) {
        const gstTaxEngine = require('../gst/gstTaxEngine');
        await gstTaxEngine.saveManualVoucherTaxLines(db, data.voucher_id, data.manualGST);
      } else if (data.computedGST) {
        const gstTaxEngine = require('../gst/gstTaxEngine');
        await gstTaxEngine.saveVoucherTaxLines(db, data.voucher_id, data.computedGST);
      }

      // Entry amounts / ledgers may have changed — refresh stored ledger closing
      // balances exactly as create() and cancel() do (was previously missing).
      await recalculateLedgerBalances(data.voucher_id, current.company_id, current.fy_id);

      const updated = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${data.voucher_id}`
      );
      await auditTrailService.recordInTx({
        company_id: current.company_id,
        entity_type: 'voucher',
        entity_id: data.voucher_id,
        action: 'update',
        before: current,
        after: updated[0],
      });
      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true, voucher: updated[0] };
    } catch (err) {
      try { await db.execute({ sql: 'ROLLBACK', args: [] }); } catch (_) { /* no open txn */ }
      return { success: false, error: err.message };
    }
  },

  cancel: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Voucher not found' };

      const voucher = existing[0];
      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
      await db
        .update(vouchers)
        .set({ isCancelled: 1, updatedAt: sql`datetime('now')` })
        .where(eq(vouchers.voucherId, id));
      await recalculateLedgerBalances(id, voucher.company_id, voucher.fy_id);
      await auditTrailService.recordInTx({
        company_id: voucher.company_id,
        entity_type: 'voucher',
        entity_id: id,
        action: 'cancel',
        before: voucher,
        after: { ...voucher, is_cancelled: 1 },
      });
      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true };
    } catch (err) {
      try { await db.execute({ sql: 'ROLLBACK', args: [] }); } catch (_) { /* no open txn */ }
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Voucher not found' };

      const voucher = existing[0];
      // Fetch affected ledger IDs before cascade delete removes entries
      const affected = await db.all(
        sql`SELECT DISTINCT ledger_id FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${id} AND ${voucherEntries.ledgerId} IS NOT NULL`
      );
      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
      await db.delete(vouchers).where(eq(vouchers.voucherId, id));

      // Recalculate balances for all affected ledgers
      for (const row of affected) {
        try {
          const balRes = await getLedgerBalance(row.ledger_id, voucher.company_id, voucher.fy_id);
          if (balRes.success && balRes.rawBalance != null) {
            await db
              .update(ledgers)
              .set({ closingBalance: balRes.rawBalance })
              .where(eq(ledgers.ledgerId, row.ledger_id));
          }
        } catch (_e) { /* ignore individual errors */ }
      }
      await auditTrailService.recordInTx({
        company_id: voucher.company_id,
        entity_type: 'voucher',
        entity_id: id,
        action: 'delete',
        before: voucher,
      });
      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true };
    } catch (err) {
      try { await db.execute({ sql: 'ROLLBACK', args: [] }); } catch (_) { /* no open txn */ }
      return { success: false, error: err.message };
    }
  },

  getNextNumber: async (company_id, fy_id, voucher_type) => {
    return await getNextVoucherNumber(company_id, fy_id, voucher_type);
  },

  getLedgerBalance: async (ledger_id, company_id, fy_id) => {
    return await getLedgerBalance(ledger_id, company_id, fy_id);
  },

  searchLedgers: async (company_id, searchTerm) => {
    return await searchLedgers(company_id, searchTerm);
  },

  getPendingBills: async (ledger_id, company_id, fy_id) => {
    return await getPendingBills(ledger_id, company_id, fy_id);
  },
};
