// Read-side voucher queries — extracted verbatim from voucherCRUD.js.
// getAll / getById / getDaybook / getByType / getByLedger plus the attendance
// row-mapping helper they share. No accounting mutation happens here.
const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
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
} = require('../db/schema');

// Attendance vouchers live in their own table (attendance_vouchers), so the regular
// voucher queries never return them. This maps them into the shared Day Book / Voucher
// Register row shape so they show up alongside normal vouchers. voucher_id is negated
// to avoid colliding with real voucher ids (the UI skips navigation for negatives).
// Pass a from/to range to filter by date (Day Book); omit it for the full list.
async function fetchAttendanceVoucherRows(company_id, fy_id, from = null, to = null) {
  let rows = [];
  try {
    const dateCond = from && to ? sql` AND av.date >= ${from} AND av.date <= ${to}` : sql``;
    rows = await db.all(
      sql`SELECT av.attendance_voucher_id AS aid, av.voucher_number, av.date, av.narration,
            (SELECT emp.name FROM attendance_voucher_entries e
             LEFT JOIN employees emp ON emp.employee_id = e.employee_id
             WHERE e.attendance_voucher_id = av.attendance_voucher_id
             ORDER BY e.entry_id ASC LIMIT 1) AS first_employee,
            (SELECT COUNT(*) FROM attendance_voucher_entries e
             WHERE e.attendance_voucher_id = av.attendance_voucher_id) AS entry_count
          FROM attendance_vouchers av
          WHERE av.company_id = ${company_id}${dateCond}`,
    );
  } catch (_) {
    return [];
  }
  return rows.map((a) => {
    const cnt = Number(a.entry_count) || 0;
    const particulars = a.first_employee
      ? cnt > 1
        ? `${a.first_employee} + ${cnt - 1} more`
        : a.first_employee
      : a.narration || null;
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

module.exports = {
  fetchAttendanceVoucherRows,

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
            ORDER BY v.date DESC, v.voucher_id DESC`,
      );
      // Attendance vouchers live in their own table — merge them into the register.
      const attMapped = await fetchAttendanceVoucherRows(company_id, fy_id);
      const merged = [...rows, ...attMapped].sort((a, b) =>
        String(b.date).localeCompare(String(a.date)),
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
        sql`SELECT * FROM ${vouchers} WHERE ${vouchers.voucherId} = ${id}`,
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
            WHERE ve.voucher_id = ${id}`,
      );
      // Joined so VoucherView can show Godown/per (unit) columns the way each
      // Create form does — vse.* alone only carries the bare godown_id/unit_id.
      const stockItems = await db.all(
        sql`SELECT vse.*, g.name AS godown_name, u.symbol AS unit_symbol
            FROM ${voucherStockEntries} vse
            LEFT JOIN godowns g ON g.godown_id = vse.godown_id
            LEFT JOIN units u ON u.unit_id = vse.unit_id
            WHERE vse.voucher_id = ${id}`,
      );
      const bills = await db.all(
        sql`SELECT * FROM ${voucherBillReferences} WHERE ${voucherBillReferences.voucherId} = ${id}`,
      );
      const bank = await db.all(
        sql`SELECT * FROM ${voucherBankDetails} WHERE ${voucherBankDetails.voucherId} = ${id}`,
      );
      // Multi-row bank allocations round-trip as JSON alongside the flat legacy columns.
      if (bank[0]?.allocations_json) {
        try {
          bank[0].allocations = JSON.parse(bank[0].allocations_json);
        } catch (_) {}
      }
      const costCentres = await db.all(
        sql`SELECT * FROM ${voucherCostCentres} WHERE ${voucherCostCentres.voucherId} = ${id}`,
      );
      const cashDenoms = await db.all(
        sql`SELECT * FROM ${voucherCashDenominations} WHERE ${voucherCashDenominations.voucherId} = ${id}`,
      );

      const stockWithBatches = await Promise.all(
        stockItems.map(async (s) => {
          const batches = await db.all(
            sql`SELECT * FROM ${voucherBatches} WHERE ${voucherBatches.stockEntryId} = ${s.stock_entry_id}`,
          );
          const excise = await db.all(
            sql`SELECT * FROM ${voucherItemExcise} WHERE ${voucherItemExcise.stockEntryId} = ${s.stock_entry_id}`,
          );
          return { ...s, batches: batches, excise_item_details: excise[0] || null };
        }),
      );

      const receiptDetails = await db.all(
        sql`SELECT * FROM ${voucherReceiptDetails} WHERE ${voucherReceiptDetails.voucherId} = ${id}`,
      );
      const partyDetails = await db.all(
        sql`SELECT * FROM ${voucherPartyDetails} WHERE ${voucherPartyDetails.voucherId} = ${id}`,
      );
      const dispatchDetails = await db.all(
        sql`SELECT * FROM ${voucherDispatchDetails} WHERE ${voucherDispatchDetails.voucherId} = ${id}`,
      );
      const creditNoteDetails = await db.all(
        sql`SELECT * FROM ${voucherCreditNoteDetails} WHERE ${voucherCreditNoteDetails.voucherId} = ${id}`,
      );
      const debitNoteDetails = await db.all(
        sql`SELECT * FROM ${voucherDebitNoteDetails} WHERE ${voucherDebitNoteDetails.voucherId} = ${id}`,
      );
      const vatDetails = await db.all(
        sql`SELECT * FROM ${voucherVatDetails} WHERE ${voucherVatDetails.voucherId} = ${id}`,
      );
      const gstEwayDetails = await db.all(
        sql`SELECT * FROM ${voucherGstEwayDetails} WHERE ${voucherGstEwayDetails.voucherId} = ${id}`,
      );
      const manufacturerImporterDetails = await db.all(
        sql`SELECT * FROM ${voucherManufacturerImporterDetails} WHERE ${voucherManufacturerImporterDetails.voucherId} = ${id}`,
      );
      const exciseDetails = await db.all(
        sql`SELECT * FROM ${voucherExciseDetails} WHERE ${voucherExciseDetails.voucherId} = ${id}`,
      );
      const orderDetails = await db.all(
        sql`SELECT * FROM ${voucherOrderDetails} WHERE ${voucherOrderDetails.voucherId} = ${id}`,
      );
      let payrollEntries = [];
      try {
        payrollEntries = await db.all(
          sql`SELECT pe.*, emp.name as employee_name, emp.employee_code AS employee_number, ph.name as pay_head_name
              FROM ${voucherPayrollEntries} pe
              LEFT JOIN employees emp ON emp.employee_id = pe.employee_id
              LEFT JOIN ${payHeads} ph ON ph.pay_head_id = pe.pay_head_id
              WHERE pe.voucher_id = ${id}`,
        );
      } catch (_) {
        try {
          payrollEntries = await db.all(
            sql`SELECT pe.*, emp.name as employee_name, emp.employee_code AS employee_number
                FROM ${voucherPayrollEntries} pe
                LEFT JOIN employees emp ON emp.employee_id = pe.employee_id
                WHERE pe.voucher_id = ${id}`,
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
          gst_eway_details: gstEwayDetails[0] || null,
          manufacturer_importer_details: manufacturerImporterDetails[0] || null,
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
      ORDER BY v.date ASC, v.voucher_id ASC`,
      );

      // Attendance vouchers live in their own table — merge them in (date-filtered).
      const attMapped = await fetchAttendanceVoucherRows(company_id, fy_id, from, to);
      const merged = [...rows, ...attMapped].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
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
            ORDER BY v.date DESC, v.voucher_id DESC`,
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
            ORDER BY v.date DESC`,
      );
      return { success: true, vouchers: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
