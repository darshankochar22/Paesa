// Voucher creation. Extracted verbatim from voucherCRUD.js, which re-exports
// create() so its public API is unchanged for all call sites.
const { db } = require('../db/index');
const auditTrailService = require('../auditTrail/auditTrailService');
const { isFeatureEnabled } = require('../tallyFeatures/featureFlags');
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
  logVoucherPostings,
} = require('./voucherLedgerHelpers');
const {
  NON_ACCOUNTING_INVENTORY_TYPES,
  resolveVoucherClassGstLedgers,
} = require('./voucherCommon');

module.exports = {
  create: async (data) => {
    try {
      if (data.voucher_type === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;

        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            const phRows = await db.all(
              sql`SELECT name, pay_head_type FROM ${payHeads} WHERE ${payHeads.payHeadId} = ${entry.pay_head_id}`,
            );
            if (phRows.length > 0) {
              const ph = phRows[0];
              const ledgerId = await getOrCreatePayHeadLedger(data.company_id, ph.name);
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

        if (totalNetDrCr !== 0 && data.party_ledger_id) {
          const bankLedgerId = Number(data.party_ledger_id);
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
        data.is_accounting_voucher = 1;
      }

      if (
        !data.import_mode &&
        data.is_accounting_voucher &&
        ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(data.voucher_type) &&
        // F11 "Enable GST" is a computation gate: with GST off, no auto GST
        // compute/validate — the user's own ledger lines pass through untouched.
        (await isFeatureEnabled(data.company_id, 'enable_gst'))
      ) {
        // import_mode (data migration): the voucher is an already-finalized
        // historical record whose tax lines are provided verbatim. Skip GST
        // recompute/validate so amounts are inserted losslessly; double-entry
        // balance is still enforced below.
        const gstTaxEngine = require('../gst/gstTaxEngine');
        const gstValidation = require('../gst/gstValidation');

        if (data.entries && !validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }

        data.voucher_class_gst_ledgers = await resolveVoucherClassGstLedgers(
          data.company_id,
          data.voucher_type,
          data.voucher_class,
        );

        if (data.voucher_class_gst_ledgers) {
          // OPT-IN: a Voucher Type Class with GST-details mapping still auto-injects its
          // explicitly mapped ledgers (existing feature — not the silent default flow).
          try {
            const computed = await gstTaxEngine.computeVoucherTaxLines(db, data);
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
        logVoucherPostings(`${data.voucher_type} (create)`, data.entries);
        if (!validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }
      }

      const voucher_number =
        data.voucher_number ||
        (await generateVoucherNumber(data.company_id, data.fy_id, data.voucher_type));

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
            isAccountingVoucher:
              data.is_accounting_voucher != null ? (data.is_accounting_voucher ? 1 : 0) : 1,
            isInventoryVoucher: data.is_inventory_voucher ? 1 : 0,
            isOrderVoucher: data.is_order_voucher ? 1 : 0,
            isCancelled: 0,
            isOptional: data.is_optional ? 1 : 0,
            isPostDated: data.is_post_dated ? 1 : 0,
            applicableUpto: nullify(data.applicable_upto) || null,
            voucherClass: nullify(data.voucher_class) || null,
            salesPurchaseLedgerId: nullify(data.sales_purchase_ledger_id) || null,
            // GST snapshot captured at first save (immutable thereafter). Non-GST-computed
            // types (Receipt/Payment/Journal/orders/…) still store the registration the
            // user picked on the entry screen — otherwise NULL rows get attributed to the
            // primary registration by every per-registration report.
            gstRegistrationId: data.computedGST
              ? (data.computedGST.gst_registration_id ?? null)
              : (nullify(data.gst_registration_id) ?? null),
            companyState: data.computedGST ? data.computedGST.company_state || null : null,
            isInterstate: data.computedGST ? (data.computedGST.is_inter_state ? 1 : 0) : 0,
            supplyType: data.computedGST ? data.computedGST.supply_type || null : null,
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
                description: nullify(item.description) || null,
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
              : item.batch
                ? [item.batch]
                : [];
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

        if (
          data.bill_references &&
          data.bill_references.length > 0 &&
          !NON_ACCOUNTING_INVENTORY_TYPES.includes(data.voucher_type)
        ) {
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

        if (data.gst_eway_details) {
          const ge = data.gst_eway_details;
          await db.insert(voucherGstEwayDetails).values({
            voucherId: voucher_id,
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

        if (data.excise_details) {
          const ed = data.excise_details;
          await db.insert(voucherExciseDetails).values({
            voucherId: voucher_id,
            inspectionDocumentNo: nullify(ed.inspection_document_no) || null,
            inspectionDocumentDate: nullify(ed.inspection_document_date) || null,
          });
        }

        if (data.manufacturer_importer_details) {
          const mi = data.manufacturer_importer_details;
          await db.insert(voucherManufacturerImporterDetails).values({
            voucherId: voucher_id,
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
            await db
              .update(companies)
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
                    sql`SELECT * FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${data.party_ledger_id}`,
                  )
                : null;

              const partyGSTIN = partyLedgerRows?.[0]?.gstin || null;

              // Total invoice value check (> 50,000)
              const totalValue = data.entries
                ? data.entries
                    .filter((e) => e.type === 'Cr')
                    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                : 0;

              if (partyGSTIN && totalValue >= 50000) {
                // Build NIC payload
                const companyRows = await db.all(
                  sql`SELECT * FROM ${companies} WHERE ${companies.companyId} = ${data.company_id}`,
                );
                const company = companyRows[0];

                const invoiceDate = new Date(data.date);
                const formattedDate = `${String(invoiceDate.getDate()).padStart(2, '0')}/${String(invoiceDate.getMonth() + 1).padStart(2, '0')}/${invoiceDate.getFullYear()}`;

                // Seller state code from GSTIN (first 2 digits)
                const sellerStateCode = credsRes.credentials.gstin?.substring(0, 2) || '27';
                const buyerStateCode = partyGSTIN?.substring(0, 2) || '27';

                // IGST if interstate, else CGST+SGST
                const isInterstate = sellerStateCode !== buyerStateCode;

                const itemList = (data.stock_entries || []).map((item, idx) => {
                  const assessable = item.quantity * item.rate;
                  const gstRate = item.gst_rate || 0;
                  const igstAmt = isInterstate ? (assessable * gstRate) / 100 : 0;
                  const cgstAmt = !isInterstate ? (assessable * gstRate) / 2 / 100 : 0;
                  const sgstAmt = !isInterstate ? (assessable * gstRate) / 2 / 100 : 0;

                  return {
                    SlNo: String(idx + 1),
                    PrdDesc: item.item_name || 'Item',
                    IsServc: 'N',
                    HsnCd: item.hsn_code || '',
                    Qty: item.quantity,
                    Unit: 'NOS',
                    UnitPrice: item.rate,
                    TotAmt: assessable,
                    Discount: item.discount_amount || 0,
                    AssAmt: assessable - (item.discount_amount || 0),
                    GstRt: gstRate,
                    IgstAmt: igstAmt,
                    CgstAmt: cgstAmt,
                    SgstAmt: sgstAmt,
                    CesRt: 0,
                    CesAmt: 0,
                    TotItemVal: assessable + igstAmt + cgstAmt + sgstAmt,
                  };
                });

                const totalAssessable = itemList.reduce((s, i) => s + i.AssAmt, 0);
                const totalIGST = itemList.reduce((s, i) => s + i.IgstAmt, 0);
                const totalCGST = itemList.reduce((s, i) => s + i.CgstAmt, 0);
                const totalSGST = itemList.reduce((s, i) => s + i.SgstAmt, 0);

                const nicPayload = {
                  Version: '1.1',
                  TranDtls: {
                    TaxSch: 'GST',
                    SupTyp: 'B2B',
                    RegRev: 'N',
                    IgstOnIntra: 'N',
                  },
                  DocDtls: {
                    Typ: 'INV',
                    No: voucher_number,
                    Dt: formattedDate,
                  },
                  SellerDtls: {
                    Gstin: credsRes.credentials.gstin,
                    LglNm: company?.name || '',
                    Addr1: company?.address || 'N/A',
                    Loc: company?.city || 'N/A',
                    Pin: Number(company?.pincode) || 100001,
                    Stcd: sellerStateCode,
                  },
                  BuyerDtls: {
                    Gstin: partyGSTIN,
                    LglNm: partyLedgerRows[0].name,
                    Pos: data.place_of_supply || buyerStateCode,
                    Addr1: partyLedgerRows[0].address1 || 'N/A',
                    Loc: partyLedgerRows[0].city || 'N/A',
                    Pin: Number(partyLedgerRows[0].pincode) || 100001,
                    Stcd: buyerStateCode,
                  },
                  ItemList: itemList,
                  ValDtls: {
                    AssVal: totalAssessable,
                    IgstVal: totalIGST,
                    CgstVal: totalCGST,
                    SgstVal: totalSGST,
                    CesVal: 0,
                    TotInvVal: totalValue,
                  },
                };

                // Fire and forget — don't block voucher save
                eInvoiceService
                  .generateIRN(data.company_id, voucher_id, nicPayload, credsRes.credentials)
                  .then((irnRes) => {
                    if (irnRes.success) {
                      console.log(`[eInvoice] IRN generated: ${irnRes.data.Irn}`);
                    } else {
                      console.warn(`[eInvoice] IRN failed: ${irnRes.error}`);
                    }
                  })
                  .catch((e) => {
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
          sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${voucher_id}`,
        );
        // Surface non-blocking GST data-quality warnings (e.g. an item with no configured
        // rate saved at zero tax) so the UI can flag them instead of silently understating tax.
        const gstWarnings = (data.computedGST && data.computedGST.warnings) || [];
        return {
          success: true,
          voucher: voucherRows[0],
          ...(gstWarnings.length ? { warnings: gstWarnings } : {}),
        };
      } catch (innerErr) {
        await db.execute({ sql: 'ROLLBACK', args: [] });
        throw innerErr;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
