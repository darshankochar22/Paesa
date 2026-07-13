'use strict';

// Core of the GST return drill engine — FY date helpers plus the shared
// voucher fetch + classification used by every reconciliation module, so all
// screens report the SAME classification of the SAME vouchers.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
// Attendance vouchers live in their own table; reuse the Day Book helper so the GST
// drill engine sees them (as voucher_type 'Attendance') exactly as every other screen does.
const { fetchAttendanceVoucherRows } = require('../../voucher/voucherReads');

const getDatesForFY = async (fy_id) => {
  let fyStartDate = null;
  let fyEndDate = null;
  let fyLabel = '';
  try {
    const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
    const fy = fyRows[0];
    if (fy) {
      fyStartDate = fy.start_date;
      fyEndDate = fy.end_date;
      fyLabel = `${fy.start_date} to ${fy.end_date}`;
    }
  } catch (_) {}

  if (!fyStartDate) {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fyStartDate = `${yr}-04-01`;
    fyEndDate = `${yr + 1}-03-31`;
    fyLabel = `01-Apr-${yr} to 31-Mar-${yr + 1}`;
  }

  return { fyStartDate, fyEndDate, fyLabel };
};

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;

// Build the 12 months of a financial year from its start date ('YYYY-MM-DD').
// Each entry carries the keys used downstream: `ym` for GROUP BY substr(date,1,7),
// `period` as MMYYYY (the gst_filings key) and a human `label` like "Apr-26".
const buildFyMonths = (fyStartDate) => {
  const [ys, ms] = String(fyStartDate || '')
    .split('-')
    .map(Number);
  const startYear = Number.isFinite(ys) ? ys : new Date().getFullYear();
  const startMonth = Number.isFinite(ms) ? ms : 4;
  const months = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    const mm = String(m).padStart(2, '0');
    months.push({
      ym: `${y}-${mm}`,
      period: `${mm}${y}`,
      label: `${MONTH_ABBR[m - 1]}-${String(y).slice(-2)}`,
    });
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
  }
  return months;
};

// Real return-filing status for the "Track GST Return Activities" dashboard.
// Returns a per-registration -> per-month -> per-return matrix computed from the
// books (data-quality exceptions per period drive "Corrections Needed"; the
// gst_filings / gstr1_exports lifecycle drives "Pending to Be Filed"). A flat
// company-wide `returns` roll-up is kept for backward compatibility.
//
// Columns match TallyPrime's report. "Pending for Upload" (GSTR-1 only) and
// ───────────────────────────────────────────────────────────────────────────────
// Return-period drill engine — shared by Statistics, section summaries/registers,
// Not-Relevant breakdown and Uncertain Transactions, so every screen in the
// GSTR-1 / GSTR-3B drill chain reports the SAME classification of the SAME
// vouchers. All data is real (from books); nothing is fabricated.
// ───────────────────────────────────────────────────────────────────────────────
const OUTWARD_TYPES = ['Sales', 'Credit Note', 'Debit Note'];
// GSTR-2A / 2A reconciliation is inward: purchases plus purchase-side credit/debit notes.
const INWARD_RECON_TYPES = ['Purchase', 'Credit Note', 'Debit Note'];
const INVENTORY_TYPES = [
  'Delivery Note',
  'Receipt Note',
  'Stock Journal',
  'Physical Stock',
  'Material In',
  'Material Out',
  'Rejections In',
  'Rejections Out',
];
const ORDER_TYPES = ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'];
const PAYROLL_TYPES = ['Payroll', 'Salary Slip', 'Attendance'];
const B2CL_THRESHOLD = 250000;

// Credit / Debit notes are directional. A note booked against a customer (Sundry
// Debtors) is an outward sales return → GSTR-1 (CDN). A note against a supplier
// (Sundry Creditors) is an inward purchase return → belongs to GSTR-2/3B, so it is
// NOT relevant to GSTR-1. Resolve by the party ledger's group ANCESTRY (a ledger
// under a custom subgroup like "Raw Material Suppliers" still resolves through its
// Sundry Creditors ancestor); fall back to the Tally convention (Credit Note =
// sales return/outward, Debit Note = purchase return/inward) when no ancestor
// group name decides it.
const noteDirection = (v) => {
  const grp = String(v.party_group || '');
  if (/creditor/i.test(grp)) return 'inward';
  if (/debtor/i.test(grp)) return 'outward';
  return v.voucher_type === 'Credit Note' ? 'outward' : 'inward';
};
const isNote = (t) => t === 'Credit Note' || t === 'Debit Note';
const isOutwardVoucher = (v) =>
  v.voucher_type === 'Sales' || (isNote(v.voucher_type) && noteDirection(v) === 'outward');
const isInwardVoucher = (v) =>
  v.voucher_type === 'Purchase' || (isNote(v.voucher_type) && noteDirection(v) === 'inward');

// Load every non-cancelled voucher of a return period (optionally scoped to a
// registration) with party info + tax sums aggregated from voucher_stock_entries.
const fetchPeriodVouchers = async (
  company_id,
  fy_id,
  return_period,
  gstRegistrationId,
  annual = false,
) => {
  let startDate;
  let endDate;
  if (annual) {
    // Annual Computation spans the whole financial year.
    const { fyStartDate, fyEndDate } = await getDatesForFY(fy_id);
    startDate = fyStartDate;
    const end = new Date(fyEndDate);
    end.setDate(end.getDate() + 1); // exclusive upper bound = day after FY end
    endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  } else {
    const month = String(return_period).substring(0, 2);
    const year = String(return_period).substring(2, 6);
    startDate = `${year}-${month}-01`;
    const nm = Number(month) === 12 ? 1 : Number(month) + 1;
    const ny = Number(month) === 12 ? Number(year) + 1 : Number(year);
    endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;
  }

  const activeRegs = await db.all(
    sql`SELECT gst_id, gstin FROM ${gstRegistrations}
        WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
        ORDER BY gst_id ASC`,
  );
  const primaryId = activeRegs[0] ? Number(activeRegs[0].gst_id) : null;
  const scopedReg =
    gstRegistrationId != null
      ? activeRegs.find((r) => Number(r.gst_id) === Number(gstRegistrationId))
      : activeRegs[0];
  const companyGstinInvalid = !GSTIN_RE.test(String(scopedReg?.gstin || '').toUpperCase());

  let regFilter = sql``;
  if (gstRegistrationId != null) {
    regFilter =
      Number(gstRegistrationId) === primaryId
        ? sql`AND (v.gst_registration_id = ${gstRegistrationId} OR v.gst_registration_id IS NULL)`
        : sql`AND v.gst_registration_id = ${gstRegistrationId}`;
  }

  const rows = await db.all(
    sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.reference_number, v.party_name,
               v.place_of_supply, v.is_interstate,
               l.name AS ledger_name, l.gstin AS party_gstin, l.registration_type AS party_reg_type,
               l.group_id AS party_group_id, pg.name AS party_group,
               COALESCE(s.stock_count, 0) AS stock_count,
               COALESCE(s.taxable, 0) AS taxable,
               COALESCE(s.igst, 0) AS igst,
               COALESCE(s.cgst, 0) AS cgst,
               COALESCE(s.sgst, 0) AS sgst,
               COALESCE(s.max_rate, 0) AS max_rate,
               COALESCE(s.bad_hsn, 0) AS bad_hsn,
               COALESCE(s.no_rate, 0) AS no_rate,
               COALESCE(s.taxable_lines, 0) AS taxable_lines,
               COALESCE(s.exempt_lines, 0) AS exempt_lines,
               COALESCE(s.nongst_lines, 0) AS nongst_lines,
               COALESCE(s.undef_tax, 0) AS undef_tax,
               COALESCE(s.gst_lines, 0) AS gst_lines,
               COALESCE(s.bad_uqc, 0) AS bad_uqc,
               COALESCE(e.dr_total, 0) AS dr_total,
               COALESCE(e.cr_total, 0) AS cr_total,
               (SELECT pe.type FROM voucher_entries pe
                 WHERE pe.voucher_id = v.voucher_id AND pe.ledger_id = v.party_ledger_id
                 LIMIT 1) AS party_side,
               COALESCE(g.gst_ledger_lines, 0) AS gst_ledger_lines,
               COALESCE(g.e_cgst, 0) AS e_cgst,
               COALESCE(g.e_sgst, 0) AS e_sgst,
               COALESCE(g.e_igst, 0) AS e_igst
        FROM ${vouchers} v
        LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
        LEFT JOIN groups pg ON pg.group_id = l.group_id
        LEFT JOIN (
          SELECT vse.voucher_id, COUNT(*) AS stock_count, SUM(vse.amount) AS taxable,
                 SUM(vse.igst_amount) AS igst, SUM(vse.cgst_amount) AS cgst,
                 SUM(vse.sgst_amount) AS sgst, MAX(vse.gst_rate) AS max_rate,
                 SUM(CASE WHEN vse.hsn_code IS NULL OR TRIM(vse.hsn_code) = ''
                          OR LENGTH(TRIM(vse.hsn_code)) NOT IN (4, 6, 8) THEN 1 ELSE 0 END) AS bad_hsn,
                 -- A line valued but carrying no rate, on an item meant to be taxed
                 -- (Taxable/Not Defined), = "Tax Rate is not specified". The line-rate=0
                 -- guard means this can never fire on a properly-taxed line.
                 SUM(CASE WHEN COALESCE(vse.gst_rate, 0) = 0 AND COALESCE(vse.amount, 0) > 0
                          AND si.taxability_type IN ('Taxable', 'Not Defined')
                          THEN 1 ELSE 0 END) AS no_rate,
                 -- Per-item GST taxability off the stock-item master (Tally's "Taxability
                 -- Type"). Only an EXPLICIT Exempt / Nil-Rated / Non-GST value excuses a line
                 -- from GST treatment; a linked item left blank or 'Not Defined' is a
                 -- correction ("Taxability Type is invalid or not specified").
                 SUM(CASE WHEN si.taxability_type = 'Taxable' THEN 1 ELSE 0 END) AS taxable_lines,
                 SUM(CASE WHEN si.taxability_type IN ('Exempt', 'Nil Rated', 'Nil-Rated', 'Nil', 'Exempted')
                          THEN 1 ELSE 0 END) AS exempt_lines,
                 SUM(CASE WHEN si.taxability_type IN ('Non-GST', 'Non-GST Goods', 'NonGST', 'Non GST')
                          THEN 1 ELSE 0 END) AS nongst_lines,
                 SUM(CASE WHEN si.item_id IS NOT NULL AND (si.taxability_type IS NULL
                          OR si.taxability_type NOT IN ('Taxable', 'Exempt', 'Nil Rated', 'Nil-Rated',
                             'Nil', 'Exempted', 'Non-GST', 'Non-GST Goods', 'NonGST', 'Non GST'))
                          THEN 1 ELSE 0 END) AS undef_tax,
                 -- Lines that require GST treatment: everything NOT explicitly exempt/non-GST
                 -- (a blank/'Not Defined'/no-item line still counts as a GST supply).
                 SUM(CASE WHEN si.taxability_type IS NULL
                          OR si.taxability_type NOT IN ('Exempt', 'Nil Rated', 'Nil-Rated', 'Nil',
                             'Exempted', 'Non-GST', 'Non-GST Goods', 'NonGST', 'Non GST')
                          THEN 1 ELSE 0 END) AS gst_lines,
                 -- A stock line whose UOM has no mapped Unit Quantity Code (UQC).
                 SUM(CASE WHEN vse.unit_id IS NOT NULL
                          AND (u.unit_quantity_code IS NULL OR TRIM(u.unit_quantity_code) = '')
                          THEN 1 ELSE 0 END) AS bad_uqc
          FROM ${voucherStockEntries} vse
          LEFT JOIN stock_items si ON si.item_id = vse.stock_item_id
          LEFT JOIN units u ON u.unit_id = vse.unit_id
          GROUP BY vse.voucher_id
        ) s ON s.voucher_id = v.voucher_id
        LEFT JOIN (
          SELECT voucher_id,
                 SUM(CASE WHEN type = 'Dr' THEN amount ELSE 0 END) AS dr_total,
                 SUM(CASE WHEN type = 'Cr' THEN amount ELSE 0 END) AS cr_total
          FROM voucher_entries GROUP BY voucher_id
        ) e ON e.voucher_id = v.voucher_id
        LEFT JOIN (
          -- The ACTUAL GST booked on the voucher, taken from its Duties & Taxes (GST) ledger
          -- postings. A voucher with no such postings genuinely carries no GST (nothing is
          -- fabricated from the item rate). Component split by ledger name / gst_tax_type.
          SELECT ve.voucher_id, COUNT(*) AS gst_ledger_lines,
                 SUM(CASE WHEN l2.name LIKE '%IGST%' THEN ve.amount ELSE 0 END) AS e_igst,
                 SUM(CASE WHEN l2.name LIKE '%CGST%' OR sd.gst_tax_type = 'CGST'
                          THEN ve.amount ELSE 0 END) AS e_cgst,
                 SUM(CASE WHEN l2.name LIKE '%SGST%' OR l2.name LIKE '%UTGST%'
                          OR sd.gst_tax_type LIKE '%SGST%' OR sd.gst_tax_type LIKE '%UTGST%'
                          THEN ve.amount ELSE 0 END) AS e_sgst
          FROM voucher_entries ve
          JOIN ledger_statutory_details sd
            ON sd.ledger_id = ve.ledger_id AND sd.type_of_duty_tax = 'GST'
          JOIN ${ledgers} l2 ON l2.ledger_id = ve.ledger_id
          GROUP BY ve.voucher_id
        ) g ON g.voucher_id = v.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          -- Optional and Memorandum vouchers are non-posting/provisional: Tally keeps them
          -- out of the books and out of the GST return entirely (not even "Not Relevant").
          AND COALESCE(v.is_optional, 0) = 0 AND v.voucher_type != 'Memorandum'
          AND v.date >= ${startDate} AND v.date < ${endDate}
          ${regFilter}
        ORDER BY v.date ASC, v.voucher_id ASC`,
  );

  // Resolve each party group to its full ancestor chain (names joined), so directional
  // checks (noteDirection's creditor/debtor test) work for ledgers under custom
  // subgroups of Sundry Creditors / Sundry Debtors, not only direct children.
  const groupById = new Map();
  try {
    const allGroups = await db.all(
      sql`SELECT group_id, name, parent_group_id FROM groups WHERE company_id = ${company_id}`,
    );
    for (const g of allGroups) groupById.set(Number(g.group_id), g);
  } catch (_) {}
  const groupChain = (groupId) => {
    const names = [];
    let g = groupById.get(Number(groupId));
    for (let i = 0; g && i < 20; i++) {
      names.push(g.name);
      g = groupById.get(Number(g.parent_group_id));
    }
    return names.join(' > ');
  };

  // When the per-line stock-entry tax amounts weren't persisted (a real data condition),
  // fall back to the ACTUAL GST booked in the voucher's Duties & Taxes ledgers. A voucher
  // that charged no GST (no GST ledger postings) therefore shows zero tax — we never
  // fabricate tax from the item rate. Vouchers that DID persist stock-entry tax are kept.
  const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
  for (const row of rows) {
    if (row.party_group_id != null) {
      const chain = groupChain(row.party_group_id);
      if (chain) row.party_group = chain;
    }
    const stored = Number(row.igst || 0) + Number(row.cgst || 0) + Number(row.sgst || 0);
    if (stored < 0.01) {
      row.cgst = r2(row.e_cgst);
      row.sgst = r2(row.e_sgst);
      row.igst = r2(row.e_igst);
    }
    // Accounting-mode voucher (no stock lines) that DID book GST via Duties & Taxes
    // ledgers: derive the taxable value from the party-side total minus the tax, so the
    // 2A/2B reconciliation has a real amount to compare against the portal invoice.
    if (
      Number(row.stock_count || 0) === 0 &&
      Number(row.gst_ledger_lines || 0) > 0 &&
      !(Number(row.taxable) > 0)
    ) {
      const total =
        row.party_side === 'Cr'
          ? Number(row.cr_total || 0)
          : row.party_side === 'Dr'
            ? Number(row.dr_total || 0)
            : 0;
      const tax = Number(row.igst || 0) + Number(row.cgst || 0) + Number(row.sgst || 0);
      const derived = r2(total - tax);
      if (derived > 0) row.taxable = derived;
    }
  }

  // Attendance vouchers live in a separate table with no gst_registration_id, so they
  // behave like registration-less vouchers (Contra/Journal): include them only when no
  // specific registration is scoped, or when the scoped one is the primary registration.
  const includeRegless = gstRegistrationId == null || Number(gstRegistrationId) === primaryId;
  let attendanceRows = [];
  if (includeRegless) {
    // endDate is an exclusive upper bound (day after the period); attendance filter is
    // inclusive, so shift back one day to the period's last date.
    const end = new Date(endDate);
    end.setDate(end.getDate() - 1);
    const inclusiveEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
    attendanceRows = await fetchAttendanceVoucherRows(company_id, fy_id, startDate, inclusiveEnd);
  }

  return { rows: [...rows, ...attendanceRows], companyGstinInvalid };
};

// Classify one voucher: bucket (included / not_relevant / uncertain), the
// Not-Relevant grouping (non_gst category or other_returns), the GSTR-1 section
// it lands in when included, and the concrete exceptions when uncertain.
const classifyVoucher = (v, returnType, companyGstinInvalid) => {
  const isOutward = isOutwardVoucher(v);
  const isInward = isInwardVoucher(v);
  // GSTR-2A/2B reconciliation is inward (purchase + purchase-side notes).
  const inwardRecon = returnType === 'GSTR2A' || returnType === 'GSTR2B';
  // GSTR-3B and Annual Computation treat both outward + inward as relevant.
  const bothSides = returnType === 'GSTR3B' || returnType === 'ANNUAL';
  const relevant = inwardRecon ? isInward : bothSides ? isOutward || isInward : isOutward;

  if (!relevant) {
    let group = 'non_gst';
    let category = 'Other Transactions';
    // Anything that carries GST but doesn't belong to THIS return is an inward/ITC
    // transaction of another GST return: purchases, purchase-side notes, and any
    // GST-bearing journal/payment (an entry against a Duties & Taxes GST ledger, or a
    // taxed stock line). Everything else is a genuinely Non-GST transaction.
    const carriesGst =
      isInward ||
      Number(v.gst_ledger_lines || 0) > 0 ||
      Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0) > 0;
    if (!bothSides && carriesGst) {
      group = 'other_returns';
      category = 'Transactions of Other GST Returns';
    } else if (v.voucher_type === 'Contra') category = 'Contra Vouchers';
    else if (INVENTORY_TYPES.includes(v.voucher_type)) category = 'Inventory Vouchers';
    else if (ORDER_TYPES.includes(v.voucher_type)) category = 'Order Vouchers';
    else if (PAYROLL_TYPES.includes(v.voucher_type)) category = 'Payroll Vouchers';
    return { bucket: 'not_relevant', group, category, section: null, exceptions: [] };
  }

  // 2A/2B reconciliation only covers supplies a REGISTERED supplier files on the portal.
  // A purchase from an unregistered/consumer party (no registration type, no valid GSTIN)
  // can never appear in GSTR-2A/2B — it is out of the reconciliation's scope, not an
  // "Available Only in Books" discrepancy. (A party MARKED registered but carrying an
  // invalid GSTIN still falls through to the exception below.)
  if (inwardRecon) {
    const registered = v.party_reg_type && v.party_reg_type !== 'Unregistered';
    const gstinOk = GSTIN_RE.test(
      String(v.party_gstin || '')
        .trim()
        .toUpperCase(),
    );
    if (!registered && !gstinOk) {
      return {
        bucket: 'not_relevant',
        group: 'non_gst',
        category: 'Unregistered Party (Not on Portal)',
        section: null,
        exceptions: [],
      };
    }
  }

  // The company's own registration being invalid is a blocking, voucher-independent
  // problem — Tally surfaces ONLY this exception for such vouchers (No. of Exceptions: 1),
  // so short-circuit before the per-voucher data checks (avoids extra exception lines).
  if (companyGstinInvalid) {
    return {
      bucket: 'uncertain',
      group: null,
      category: null,
      section: null,
      exceptions: ['GST Registration Details of the Company are invalid or not specified'],
    };
  }

  const exceptions = [];
  const taxBooked = Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0);
  const stockCount = Number(v.stock_count || 0);
  // Lines needing GST treatment (anything not EXPLICITLY exempt/non-GST) vs lines the item
  // master explicitly marks Non-GST. Genuine exempt/non-GST config is what excuses a
  // voucher from the return exceptions — NOT merely "no tax happened to be booked".
  const gstLines = Number(v.gst_lines || 0);
  const nongstLines = Number(v.nongst_lines || 0);

  // Party registration applies BOTH to an inward supplier (needed for ITC / 2A / 2B) and to
  // an outward recipient marked Registered: Tally flags a registered party carrying no valid
  // 15-char GSTIN. An Unregistered party is simply B2C and is never flagged.
  const partyRegistered = v.party_reg_type && v.party_reg_type !== 'Unregistered';
  const validPartyGstin = GSTIN_RE.test(
    String(v.party_gstin || '')
      .trim()
      .toUpperCase(),
  );
  if (partyRegistered && !validPartyGstin)
    exceptions.push('GST Registration Details of the Party are invalid or not specified');

  if (stockCount === 0) {
    // Place of supply is auto-derived from the party/company state (as in TallyPrime), so a
    // blank place-of-supply is never surfaced; a voucher with no stock lines at all has
    // nothing to derive GST from — EXCEPT an accounting-mode purchase (no inventory lines)
    // that booked real GST through Duties & Taxes ledgers: for the inward 2A/2B
    // reconciliation that is a complete, matchable document, not a correction.
    const accountingModeInward =
      inwardRecon && Number(v.gst_ledger_lines || 0) > 0 && taxBooked >= 0.01;
    if (!accountingModeInward) {
      exceptions.push('No item or tax details available in the voucher');
    }
  } else {
    // A linked item whose Taxability Type is blank / 'Not Defined' (Tally can't tell whether
    // it is taxable, exempt or non-GST) → correction needed.
    if (Number(v.undef_tax || 0) > 0)
      exceptions.push('Taxability Type is invalid or not specified');
    // A GST-applicable stock line without a valid HSN/SAC (blank, or not a 4/6/8-digit code).
    if (gstLines > 0 && Number(v.bad_hsn || 0) > 0)
      exceptions.push('HSN/SAC is invalid, mismatched, or not specified');
    // A taxable item that ended up with no rate on the voucher (can coexist with HSN above).
    if (Number(v.no_rate || 0) > 0) exceptions.push('Tax Rate is not specified');
    // A stock line whose UOM is not mapped to a Unit Quantity Code (UQC).
    if (Number(v.bad_uqc || 0) > 0)
      exceptions.push('UOM is not mapped to the Unit Quantity Code (UQC)');
    // A GST-applicable supply that booked NO GST at all and posted no Duties & Taxes (GST)
    // ledger → the tax ledger was never selected. This is the case the user pointed at:
    // sales / credit / debit notes carrying no GST details must be parked in Uncertain, not
    // silently dropped to Not Relevant.
    if (gstLines > 0 && taxBooked < 0.01 && Number(v.gst_ledger_lines || 0) === 0)
      exceptions.push('Applicable Tax Ledger is not selected');
  }
  if (exceptions.length)
    return { bucket: 'uncertain', group: null, category: null, section: null, exceptions };

  // No exceptions. A voucher whose every stock line is EXPLICITLY marked Non-GST was billed
  // outside GST — it is not part of any GST return (Tally: "Not relevant in this Return") and
  // must not be counted as a nil-rated supply. Exempt / Nil-rated supplies fall through to the
  // 'nil' section below (they ARE reported in GSTR-1).
  if (stockCount > 0 && nongstLines === stockCount) {
    return {
      bucket: 'not_relevant',
      group: 'non_gst',
      category: 'Other Transactions',
      section: null,
      exceptions: [],
    };
  }

  // Inward reconciliations don't use GSTR-1 outward sections.
  if (inwardRecon)
    return { bucket: 'included', group: null, category: null, section: null, exceptions: [] };

  // GSTR-1 section for an included outward voucher. B2B strictly requires a
  // VALID 15-char GSTIN — a party without one (or with a malformed value) is a
  // consumer sale and must classify as B2C, never B2B.
  const hasGstin = GSTIN_RE.test(
    String(v.party_gstin || '')
      .trim()
      .toUpperCase(),
  );
  let section = null;
  if (isNote(v.voucher_type)) section = hasGstin ? 'cdnr' : 'cdnur';
  else if (Number(v.max_rate || 0) === 0) section = 'nil';
  else if (hasGstin) section = 'b2b';
  else if (Number(v.is_interstate || 0) === 1 && invoiceOf(v) > B2CL_THRESHOLD) section = 'b2cl';
  else section = 'b2cs';
  return { bucket: 'included', group: null, category: null, section, exceptions: [] };
};

const invoiceOf = (v) =>
  Number(v.taxable || 0) + Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0);

const voucherRow = (v, cls) => ({
  voucher_id: v.voucher_id,
  date: v.date,
  particulars: v.party_name || v.ledger_name || '',
  voucher_type: v.voucher_type,
  voucher_number: v.voucher_number,
  party_gstin: v.party_gstin || '',
  // Place of supply + dominant rate — the B2C (Small) drill groups rows Tally-style
  // as "<State> - <rate>%" (e.g. "Chhattisgarh - 18%").
  place_of_supply: v.place_of_supply || '',
  rate: Number(v.max_rate || 0),
  is_interstate: Number(v.is_interstate || 0) === 1,
  taxable: Number(v.taxable || 0),
  igst: Number(v.igst || 0),
  cgst: Number(v.cgst || 0),
  sgst: Number(v.sgst || 0),
  cess: 0,
  tax: Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0),
  invoice: invoiceOf(v),
  // Accounting-side totals — Tally's registers for non-return drills (statistics,
  // Not Relevant) show Debit/Credit Amount columns rather than tax columns.
  ...accountingSide(v),
  exceptions: cls ? cls.exceptions : [],
});

// A balanced voucher has dr_total === cr_total, so showing both columns would
// double the amount. Tally posts the voucher's value on the party ledger's ACTUAL
// posting side only (party_side), leaving the other column blank — a sales invoice
// debits the party (Debit), a payment to a supplier credits it (Credit), etc.
// Vouchers with no party ledger (Journal/Contra) keep their raw dr/cr totals.
const accountingSide = (v) => {
  const total = Number(v.dr_total || 0) || Number(v.cr_total || 0);
  if (v.party_side === 'Dr') return { debit: total, credit: 0 };
  if (v.party_side === 'Cr') return { debit: 0, credit: total };
  return { debit: Number(v.dr_total || 0), credit: Number(v.cr_total || 0) };
};

module.exports = {
  getDatesForFY,
  MONTH_ABBR,
  buildFyMonths,
  GSTIN_RE,
  OUTWARD_TYPES,
  INWARD_RECON_TYPES,
  INVENTORY_TYPES,
  ORDER_TYPES,
  PAYROLL_TYPES,
  B2CL_THRESHOLD,
  noteDirection,
  isNote,
  isOutwardVoucher,
  isInwardVoucher,
  fetchPeriodVouchers,
  classifyVoucher,
  invoiceOf,
  voucherRow,
};
