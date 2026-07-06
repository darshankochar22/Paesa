// Voucher write path — update / cancel / delete. Extracted verbatim from
// voucherCRUD.js, which re-exports these so its public API is unchanged.
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
  voucherGstEwayDetails,
  voucherManufacturerImporterDetails,
  voucherPayrollEntries,
  ledgers,
  ledgerStatutoryDetails,
  payHeads,
  companies,
  voucherTypes,
  voucherTypeConfigs,
} = require('../db/schema');
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
const {
  NON_ACCOUNTING_INVENTORY_TYPES,
  resolveVoucherClassGstLedgers,
} = require('./voucherCommon');

module.exports = {
  update: async (data) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${data.voucher_id}`,
      );
      if (existing.length === 0) return { success: false, error: 'Voucher not found' };
      if (existing[0].is_cancelled)
        return { success: false, error: 'Cannot edit cancelled voucher' };

      const current = existing[0];
      const voucherType = data.voucher_type || current.voucher_type;

      if (voucherType === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;

        let pEntries = data.payroll_entries;
        if (pEntries === undefined) {
          const existingPEntries = await db.all(
            sql`SELECT * FROM ${voucherPayrollEntries} WHERE ${voucherPayrollEntries.voucherId} = ${data.voucher_id}`,
          );
          pEntries = existingPEntries;
        }

        if (pEntries && pEntries.length > 0) {
          const companyId = data.company_id || current.company_id;
          for (const entry of pEntries) {
            const phRows = await db.all(
              sql`SELECT name, pay_head_type FROM ${payHeads} WHERE ${payHeads.payHeadId} = ${entry.pay_head_id}`,
            );
            if (phRows.length > 0) {
              const ph = phRows[0];
              const ledgerId = await getOrCreatePayHeadLedger(companyId, ph.name);
              const isDeduction =
                ph.pay_head_type &&
                (ph.pay_head_type.toLowerCase().includes('deduction') ||
                  ph.pay_head_type.toLowerCase().includes('pf') ||
                  ph.pay_head_type.toLowerCase().includes('esi'));

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

        const bankLedgerId =
          data.party_ledger_id !== undefined ? data.party_ledger_id : current.party_ledger_id;
        if (totalNetDrCr !== 0 && bankLedgerId) {
          const bankLedgerRows = await db.all(
            sql`SELECT name FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${bankLedgerId}`,
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
        const voucherClass =
          data.voucher_class !== undefined ? data.voucher_class : current.voucher_class;
        // Freeze GST identity to the voucher's own snapshot (STEP 7): amounts still
        // recompute from changed stock lines, but registration/state/interstate never
        // re-derive from the company's current default. Legacy rows (no snapshot yet)
        // pass null → derived fresh, backfilling on this save.
        const gstSnapshot =
          current.gst_registration_id != null
            ? {
                gst_registration_id: current.gst_registration_id,
                company_state: current.company_state,
                is_interstate: current.is_interstate,
              }
            : null;
        const gstPayload = {
          company_id: companyId,
          date: data.date || current.date,
          party_ledger_id:
            data.party_ledger_id !== undefined ? data.party_ledger_id : current.party_ledger_id,
          place_of_supply:
            data.place_of_supply !== undefined ? data.place_of_supply : current.place_of_supply,
          stock_entries: data.stock_entries,
          entries: data.entries,
          voucher_type: voucherType,
          gst_snapshot: gstSnapshot,
        };
        const classGstLedgers = await resolveVoucherClassGstLedgers(
          companyId,
          voucherType,
          voucherClass,
        );

        if (classGstLedgers) {
          // OPT-IN Voucher-Class GST mapping → auto-inject (legacy behavior).
          try {
            const computed = await gstTaxEngine.computeVoucherTaxLines(db, {
              ...gstPayload,
              voucher_class_gst_ledgers: classGstLedgers,
            });
            if (
              gstValidation.isComposition(computed.company_registration_type) &&
              (computed.total_cgst ||
                computed.total_sgst ||
                computed.total_igst ||
                computed.total_cess)
            ) {
              return {
                success: false,
                error: 'Composition registration cannot apply any GST tax ledgers.',
              };
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
          supplierInvoiceNo:
            nullify(data.supplier_invoice_no) ?? nullify(current.supplier_invoice_no),
          supplierInvoiceDate:
            nullify(data.supplier_invoice_date) ?? nullify(current.supplier_invoice_date),
          referenceNumber: nullify(data.reference_number) ?? nullify(current.reference_number),
          referenceDate: nullify(data.reference_date) ?? nullify(current.reference_date),
          narration: nullify(data.narration) ?? nullify(current.narration),
          partyLedgerId: nullify(data.party_ledger_id) ?? nullify(current.party_ledger_id),
          partyName: nullify(data.party_name) ?? nullify(current.party_name),
          placeOfSupply: nullify(data.place_of_supply) ?? nullify(current.place_of_supply),
          isPostDated:
            data.is_post_dated !== undefined ? (data.is_post_dated ? 1 : 0) : current.is_post_dated,
          applicableUpto: nullify(data.applicable_upto) ?? nullify(current.applicable_upto),
          voucherClass: nullify(data.voucher_class) ?? nullify(current.voucher_class),
          salesPurchaseLedgerId:
            nullify(data.sales_purchase_ledger_id) ?? nullify(current.sales_purchase_ledger_id),
          // GST snapshot: keep the existing one if present (immutable); otherwise backfill
          // from this save's computation for legacy rows created before the snapshot existed.
          gstRegistrationId:
            current.gst_registration_id != null
              ? current.gst_registration_id
              : data.computedGST
                ? (data.computedGST.gst_registration_id ?? null)
                : null,
          companyState:
            current.gst_registration_id != null
              ? current.company_state
              : data.computedGST
                ? data.computedGST.company_state || null
                : nullify(current.company_state),
          isInterstate:
            current.gst_registration_id != null
              ? current.is_interstate
              : data.computedGST
                ? data.computedGST.is_inter_state
                  ? 1
                  : 0
                : (current.is_interstate ?? 0),
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(vouchers.voucherId, data.voucher_id));

      if (data.entries) {
        // Cost-centre splits FK-reference voucher_entries(entry_id), so they must be
        // removed BEFORE the parent entries are deleted, otherwise the entry delete
        // violates the FK (a voucher created WITH cost centres could never be edited).
        await db
          .delete(voucherCostCentres)
          .where(eq(voucherCostCentres.voucherId, data.voucher_id));
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
        await db
          .delete(voucherBillReferences)
          .where(eq(voucherBillReferences.voucherId, data.voucher_id));
        if (
          data.bill_references &&
          data.bill_references.length > 0 &&
          !NON_ACCOUNTING_INVENTORY_TYPES.includes(voucherType)
        ) {
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
        await db
          .delete(voucherReceiptDetails)
          .where(eq(voucherReceiptDetails.voucherId, data.voucher_id));
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
        await db
          .delete(voucherPartyDetails)
          .where(eq(voucherPartyDetails.voucherId, data.voucher_id));
        if (data.party_details) {
          const pd = data.party_details;
          await db.insert(voucherPartyDetails).values({
            voucherId: data.voucher_id,
            supplierName: nullify(pd.supplier_name) || null,
            mailingName: nullify(pd.mailing_name) || null,
            address: nullify(pd.address) || null,
            addressType: nullify(pd.address_type) || null,
            state: nullify(pd.state) || null,
            country: nullify(pd.country) || null,
            gstRegistrationType: nullify(pd.gst_registration_type) || null,
            gstin: nullify(pd.gstin) || null,
            consigneeName: nullify(pd.consignee_name) || null,
            consigneeMailingName: nullify(pd.consignee_mailing_name) || null,
            consigneeAddress: nullify(pd.consignee_address) || null,
            consigneeState: nullify(pd.consignee_state) || null,
            consigneeCountry: nullify(pd.consignee_country) || null,
            consigneeGstRegistrationType: nullify(pd.consignee_gst_registration_type) || null,
            consigneeGstin: nullify(pd.consignee_gstin) || null,
          });
        }
      }

      if (data.dispatch_details !== undefined) {
        await db
          .delete(voucherDispatchDetails)
          .where(eq(voucherDispatchDetails.voucherId, data.voucher_id));
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
        await db
          .delete(voucherPayrollEntries)
          .where(eq(voucherPayrollEntries.voucherId, data.voucher_id));
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
        await db
          .delete(voucherStockEntries)
          .where(eq(voucherStockEntries.voucherId, data.voucher_id));
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

            const batchList = Array.isArray(item.batches)
              ? item.batches
              : item.batch
                ? [item.batch]
                : [];
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
        await db
          .delete(voucherBankDetails)
          .where(eq(voucherBankDetails.voucherId, data.voucher_id));
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
        await db
          .delete(voucherCashDenominations)
          .where(eq(voucherCashDenominations.voucherId, data.voucher_id));
        const cd = data.cash_denominations;
        if (cd) {
          const ledgerId = cd.ledger_id || (cd.entries && cd.entries[0]?.ledger_id) || null;
          for (const entry of cd.entries || []) {
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
        await db
          .delete(voucherCreditNoteDetails)
          .where(eq(voucherCreditNoteDetails.voucherId, data.voucher_id));
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
        await db
          .delete(voucherDebitNoteDetails)
          .where(eq(voucherDebitNoteDetails.voucherId, data.voucher_id));
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

      if (data.gst_eway_details !== undefined) {
        await db
          .delete(voucherGstEwayDetails)
          .where(eq(voucherGstEwayDetails.voucherId, data.voucher_id));
        if (data.gst_eway_details) {
          const ge = data.gst_eway_details;
          await db.insert(voucherGstEwayDetails).values({
            voucherId: data.voucher_id,
            reasonForIssuingNote: nullify(ge.reason_for_issuing_note) || null,
            buyersNoteNo: nullify(ge.buyers_note_no) || null,
            buyersNoteDate: nullify(ge.buyers_note_date) || null,
            ewayBillNo: nullify(ge.eway_bill_no) || null,
            ewayBillDate: nullify(ge.eway_bill_date) || null,
            dispatchFrom: nullify(ge.dispatch_from) || null,
            shipTo: nullify(ge.ship_to) || null,
            transporterName: nullify(ge.transporter_name) || null,
            transporterId: nullify(ge.transporter_id) || null,
            mode: nullify(ge.mode) || null,
            docLadingNo: nullify(ge.doc_lading_no) || null,
            docLadingDate: nullify(ge.doc_lading_date) || null,
            vehicleNumber: nullify(ge.vehicle_number) || null,
            vehicleType: nullify(ge.vehicle_type) || null,
          });
        }
      }

      if (data.excise_details !== undefined) {
        await db
          .delete(voucherExciseDetails)
          .where(eq(voucherExciseDetails.voucherId, data.voucher_id));
        if (data.excise_details) {
          await db.insert(voucherExciseDetails).values({
            voucherId: data.voucher_id,
            inspectionDocumentNo: nullify(data.excise_details.inspection_document_no) || null,
            inspectionDocumentDate: nullify(data.excise_details.inspection_document_date) || null,
          });
        }
      }

      if (data.manufacturer_importer_details !== undefined) {
        await db
          .delete(voucherManufacturerImporterDetails)
          .where(eq(voucherManufacturerImporterDetails.voucherId, data.voucher_id));
        if (data.manufacturer_importer_details) {
          const mi = data.manufacturer_importer_details;
          await db.insert(voucherManufacturerImporterDetails).values({
            voucherId: data.voucher_id,
            name: nullify(mi.name) || null,
            addressType: nullify(mi.address_type) || null,
            address: nullify(mi.address) || null,
            exciseRegnNo: nullify(mi.excise_regn_no) || null,
            importerExporterCode: nullify(mi.importer_exporter_code) || null,
            exciseRange: nullify(mi.excise_range) || null,
            division: nullify(mi.division) || null,
            commissionerate: nullify(mi.commissionerate) || null,
            invoiceNo: nullify(mi.invoice_no) || null,
            invoiceDate: nullify(mi.invoice_date) || null,
          });
        }
      }

      if (data.order_details !== undefined) {
        await db
          .delete(voucherOrderDetails)
          .where(eq(voucherOrderDetails.voucherId, data.voucher_id));
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
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${data.voucher_id}`,
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
      try {
        await db.execute({ sql: 'ROLLBACK', args: [] });
      } catch (_) {
        /* no open txn */
      }
      return { success: false, error: err.message };
    }
  },

  cancel: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`,
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
      try {
        await db.execute({ sql: 'ROLLBACK', args: [] });
      } catch (_) {
        /* no open txn */
      }
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`,
      );
      if (existing.length === 0) return { success: false, error: 'Voucher not found' };

      const voucher = existing[0];
      // Fetch affected ledger IDs before cascade delete removes entries
      const affected = await db.all(
        sql`SELECT DISTINCT ledger_id FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${id} AND ${voucherEntries.ledgerId} IS NOT NULL`,
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
        } catch (_e) {
          /* ignore individual errors */
        }
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
      try {
        await db.execute({ sql: 'ROLLBACK', args: [] });
      } catch (_) {
        /* no open txn */
      }
      return { success: false, error: err.message };
    }
  },
};
