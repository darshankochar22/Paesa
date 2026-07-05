/**
 * gstReportService.js
 *
 * GST report engine for the generic report runner (report:run → definitions/gst-*.js
 * → universalReportService.getStatutoryReport → here). Every report is computed from
 * the company's own books (vouchers / stock entries / ledgers) and the returned rows
 * are shaped to match the EXACT column `field` keys the frontend ReportRunner renders
 * (client/src/pages/reports/definitions/gst.ts). There are four column shapes:
 *
 *   A "gst line"  : section_invoice, party_gstin, taxable_value, igst, cgst, sgst, status
 *   B "register"  : date, particulars, type_section, ref_vch_no, amount, status
 *   C "tax ledger": date_particulars, vch_type, vch_no, debit, credit, balance
 *   D "analysis"  : party_item, voucher_order_no, qty_count, taxable_gross, tax_discount, net_amount, status
 *
 * Reports that genuinely need data downloaded from the GST portal (2A/2B/IMS recon,
 * upload status, books-vs-portal) cannot be derived from books — they return an empty
 * result with an honest `message` instead of silently showing unrelated data.
 */
const {
  db,
  sql,
  INWARD_TYPES,
  OUTWARD_TYPES,
  sqlIn,
  baseVoucherFilter,
} = require('./reportHelpers');
const {
  vouchers,
  voucherStockEntries,
  voucherEntries,
  ledgers,
  groups,
  stockItems,
  gstVoucherTaxLines,
} = require('../../db/schema');

// ── Canonical GST tax source ────────────────────────────────────────────────
// gst_voucher_tax_lines (gvtl) is the SINGLE source of truth for per-voucher GST
// tax, written at save time by gstTaxEngine.saveManual/saveVoucherTaxLines and read
// by the live GSTR-1/3B services. It is per-component (CGST/SGST/IGST/CESS) and, by
// the save-time invariant (assertGstSidesExclusive), a voucher is IGST-side XOR
// CGST/SGST-side — never both.
//
// TAX_BY_VOUCHER returns one row per voucher: it PREFERS gvtl (canonical), and only
// when a voucher has no gvtl rows at all (legacy data saved before gvtl existed) does
// it fall back to the old voucher_stock_entries.*_amount columns — mirroring how the
// live gstr1Service falls back for legacy vouchers. The default (manual) save path
// leaves vse.*_amount at 0 and writes gvtl, so current data always takes the gvtl side.
// Taxable value still comes from stock entries (populated for every voucher, incl. nil).
const TAX_BY_VOUCHER = sql`(
  SELECT s.voucher_id AS vid,
         CASE WHEN g.voucher_id IS NOT NULL THEN g.cgst ELSE s.cgst END AS cgst,
         CASE WHEN g.voucher_id IS NOT NULL THEN g.sgst ELSE s.sgst END AS sgst,
         CASE WHEN g.voucher_id IS NOT NULL THEN g.igst ELSE s.igst END AS igst,
         CASE WHEN g.voucher_id IS NOT NULL THEN g.cess ELSE 0 END AS cess
  FROM (
    SELECT voucher_id,
           COALESCE(SUM(cgst_amount), 0) AS cgst,
           COALESCE(SUM(sgst_amount), 0) AS sgst,
           COALESCE(SUM(igst_amount), 0) AS igst
    FROM ${voucherStockEntries} GROUP BY voucher_id
  ) s
  LEFT JOIN (
    SELECT voucher_id,
           COALESCE(SUM(CASE WHEN tax_type = 'CGST' THEN amount ELSE 0 END), 0) AS cgst,
           COALESCE(SUM(CASE WHEN tax_type = 'SGST' THEN amount ELSE 0 END), 0) AS sgst,
           COALESCE(SUM(CASE WHEN tax_type = 'IGST' THEN amount ELSE 0 END), 0) AS igst,
           COALESCE(SUM(CASE WHEN tax_type = 'CESS' THEN amount ELSE 0 END), 0) AS cess
    FROM ${gstVoucherTaxLines} GROUP BY voucher_id
  ) g ON g.voucher_id = s.voucher_id
)`;
// Per-voucher taxable base + representative rate + qty from stock entries (1 row/voucher).
const TAXABLE_BY_VOUCHER = sql`(
  SELECT voucher_id AS vid,
         COALESCE(SUM(amount), 0) AS taxable_value,
         COALESCE(MAX(gst_rate), 0) AS max_rate,
         COALESCE(SUM(quantity), 0) AS qty
  FROM ${voucherStockEntries} GROUP BY voucher_id
)`;
// Full GST rate for a gvtl line: CGST/SGST store half the rate, IGST the full rate.
const GVTL_FULL_RATE = sql`CASE WHEN tl.tax_type IN ('CGST','SGST') THEN tl.rate * 2 ELSE tl.rate END`;
// Taxable value from gvtl without double-counting the CGST+SGST pair (count one side).
const GVTL_TAXABLE = sql`COALESCE(SUM(CASE WHEN tl.tax_type IN ('IGST','CGST') THEN tl.assessable_value ELSE 0 END), 0)`;

const round2 = (n) => Number((Number(n) || 0).toFixed(2));
const pct = (n) => `${Number(n) || 0}%`;
const partyLabel = (name, gstin) => (name ? (gstin ? `${name} (${gstin})` : name) : gstin || '—');

// GST-relevant document types (invoices + notes). Inventory-only movements
// (Delivery Note, Material Out, …) carry no tax, so GST reports use is_invoice = 1.
const SALES = sql`v.voucher_type = 'Sales'`;
const PURCHASE = sql`v.voucher_type = 'Purchase'`;
const NOTES = sql`v.voucher_type IN ('Credit Note', 'Debit Note')`;

// Reports that require GSTN-portal data and cannot be computed from books alone.
const PORTAL_REPORTS = {
  gstr2a_reconciliation:
    'GSTR-2A reconciliation compares your purchases against supplier data on the GST portal. Open the GSTR-2A Reconciliation screen to import the portal data.',
  gstr2b_reconciliation:
    'GSTR-2B reconciliation needs the GSTR-2B statement downloaded from the GST portal. Open the GSTR-2B Reconciliation screen to import it.',
  challan_reconciliation:
    'Challan reconciliation needs cash-ledger / challan data from the GST portal.',
  gstr1_reconciliation:
    'GSTR-1 reconciliation compares filed portal data with your books. Import the filed GSTR-1 from the portal first.',
  gstr3b_reconciliation:
    'GSTR-3B reconciliation compares filed portal data with your books. Import the filed GSTR-3B first.',
  gstr3b_books_portal:
    'Books-vs-portal comparison needs the filed GSTR-3B downloaded from the GST portal.',
  gstr1_uploaded:
    'Upload status is reported by the GST portal after the return is pushed; it is not stored in books.',
  gstr1_rejected: 'Rejected-transaction status comes from the GST portal after upload.',
  gstr1_mismatched: 'Mismatch status is determined by comparing books with portal-filed data.',
};

// Tax-classification / advance reports that need GST-classification or advance tracking
// not modelled in the voucher schema. Honest message beats fabricated tax figures.
const UNSUPPORTED_REPORTS = {
  reverse_charge:
    'Reverse-charge supplies are identified by the GST classification on the ledger/stock item, which is not yet captured on vouchers. Tag transactions with an RCM classification to populate this report.',
  advance_receipt:
    'Advance-receipt GST requires advances to be tracked separately from invoice settlements; that linkage is not modelled yet.',
  advance_adjustment:
    'Advance-adjustment GST requires advance-to-invoice linkage that is not modelled yet.',
  gstr3b_itc_reversed:
    'ITC reversal (Rule 42/43) requires reversal entries that are not modelled in books yet.',
  gstr3b_interest:
    'Interest & late fee are entered at filing time and are not derivable from books.',
  gstr3b_payment:
    'Payment of tax (cash vs credit utilisation) is recorded at filing on the portal.',
  gst_audit_trail: 'GST audit trail of edits is available via the dedicated Audit Trail report.',
};

// ── Shape-A helpers ────────────────────────────────────────────────────────
const rowA = (section_invoice, party_gstin, r, status) => ({
  section_invoice,
  party_gstin: party_gstin || '',
  taxable_value: round2(r.taxable_value),
  igst: round2(r.igst),
  cgst: round2(r.cgst),
  sgst: round2(r.sgst),
  status: status || '',
});

// Per-invoice tax totals for a document filter (Shape A source rows). Taxable from stock
// entries; CGST/SGST/IGST/cess from gst_voucher_tax_lines (see TAX_BY_VOUCHER). se/tx are
// 1 row per voucher, so no GROUP BY / line-multiplication.
async function invoiceRows(base, docCond) {
  return db.all(sql`
    SELECT v.voucher_id, v.voucher_number, v.voucher_type, v.date, v.party_name,
           v.place_of_supply,
           l.gstin AS party_gstin, l.state AS party_state, l.country AS party_country,
           l.registration_type AS party_reg_type,
           COALESCE(se.taxable_value, 0) AS taxable_value,
           COALESCE(tx.cgst, 0) AS cgst,
           COALESCE(tx.sgst, 0) AS sgst,
           COALESCE(tx.igst, 0) AS igst,
           COALESCE(se.taxable_value, 0) + COALESCE(tx.cgst, 0) + COALESCE(tx.sgst, 0)
             + COALESCE(tx.igst, 0) + COALESCE(tx.cess, 0) AS invoice_value
    FROM ${vouchers} v
    LEFT JOIN ${TAXABLE_BY_VOUCHER} se ON se.vid = v.voucher_id
    LEFT JOIN ${TAX_BY_VOUCHER} tx ON tx.vid = v.voucher_id
    LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
    WHERE ${sql.join([...base, sql`v.is_invoice = 1`, docCond], sql` AND `)}
    ORDER BY v.date ASC`);
}

// Aggregate (single-row) tax totals for a document filter.
async function totals(base, docCond) {
  const r = await db.all(sql`
    SELECT COALESCE(SUM(se.taxable_value), 0) AS taxable_value,
           COALESCE(SUM(tx.cgst), 0) AS cgst,
           COALESCE(SUM(tx.sgst), 0) AS sgst,
           COALESCE(SUM(tx.igst), 0) AS igst
    FROM ${vouchers} v
    INNER JOIN ${TAXABLE_BY_VOUCHER} se ON se.vid = v.voucher_id
    LEFT JOIN ${TAX_BY_VOUCHER} tx ON tx.vid = v.voucher_id
    LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
    WHERE ${sql.join([...base, sql`v.is_invoice = 1`, docCond], sql` AND `)}`);
  return r[0] || { taxable_value: 0, cgst: 0, sgst: 0, igst: 0 };
}

// Rate-wise breakup (Shape A category rows) for a document filter. Grouped on the full
// GST rate straight from gst_voucher_tax_lines (the tax source), so each rate slab's
// tax is the real filed amount.
async function byRate(base, docCond) {
  const rows = await db.all(sql`
    SELECT ${GVTL_FULL_RATE} AS gst_rate,
           ${GVTL_TAXABLE} AS taxable_value,
           COALESCE(SUM(CASE WHEN tl.tax_type = 'CGST' THEN tl.amount ELSE 0 END), 0) AS cgst,
           COALESCE(SUM(CASE WHEN tl.tax_type = 'SGST' THEN tl.amount ELSE 0 END), 0) AS sgst,
           COALESCE(SUM(CASE WHEN tl.tax_type = 'IGST' THEN tl.amount ELSE 0 END), 0) AS igst
    FROM ${gstVoucherTaxLines} tl
    INNER JOIN ${vouchers} v ON v.voucher_id = tl.voucher_id
    LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
    WHERE ${sql.join([...base, sql`v.is_invoice = 1`, docCond], sql` AND `)}
    GROUP BY gst_rate
    ORDER BY gst_rate ASC`);
  return rows.map((r) => rowA(`Taxable @ ${pct(r.gst_rate)}`, '', r, ''));
}

// ── Main entry ─────────────────────────────────────────────────────────────
async function getGstReport(company_id, fy_id, arg = {}) {
  try {
    const reportType = arg.gstReport || '';
    if (PORTAL_REPORTS[reportType]) {
      return {
        success: true,
        rows: [],
        message: PORTAL_REPORTS[reportType],
        portal_required: true,
      };
    }
    if (UNSUPPORTED_REPORTS[reportType]) {
      return {
        success: true,
        rows: [],
        message: UNSUPPORTED_REPORTS[reportType],
        not_available: true,
      };
    }

    const dateConds = [];
    if (arg.from_date) dateConds.push(sql`v.date >= ${arg.from_date}`);
    if (arg.to_date) dateConds.push(sql`v.date <= ${arg.to_date}`);
    const base = [...baseVoucherFilter(company_id, fy_id), ...dateConds];

    switch (reportType) {
      // ── Shape A: invoice lists ───────────────────────────────────────────
      case 'gstr1_b2b': {
        const rows = await invoiceRows(
          base,
          sql`(${SALES}) AND l.gstin IS NOT NULL AND l.gstin != ''`,
        );
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, 'B2B'),
          ),
        };
      }
      case 'gstr1_b2c_large': {
        const rows = await invoiceRows(base, sql`(${SALES}) AND (l.gstin IS NULL OR l.gstin = '')`);
        const large = rows.filter((r) => Number(r.invoice_value) > 250000);
        return {
          success: true,
          rows: (large.length ? large : rows).map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, ''), r, 'B2C (Large)'),
          ),
        };
      }
      case 'gstr1_b2c_small': {
        const rows = await invoiceRows(base, sql`(${SALES}) AND (l.gstin IS NULL OR l.gstin = '')`);
        const byPos = {};
        for (const r of rows) {
          const pos = r.place_of_supply || r.party_state || 'Unspecified';
          byPos[pos] ||= { taxable_value: 0, cgst: 0, sgst: 0, igst: 0 };
          byPos[pos].taxable_value += Number(r.taxable_value);
          byPos[pos].cgst += Number(r.cgst);
          byPos[pos].sgst += Number(r.sgst);
          byPos[pos].igst += Number(r.igst);
        }
        return {
          success: true,
          rows: Object.entries(byPos).map(([pos, t]) => rowA(`POS: ${pos}`, '', t, 'B2C (Small)')),
        };
      }
      case 'gstr1_cd_notes':
      case 'gstr1_cdnr': {
        const rows = await invoiceRows(base, NOTES);
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(
              `${r.voucher_type} ${r.voucher_number}`,
              partyLabel(r.party_name, r.party_gstin),
              r,
              r.voucher_type,
            ),
          ),
        };
      }
      case 'gstr1_nil': {
        const rows = await invoiceRows(base, SALES);
        const nil = rows.filter((r) => round2(r.cgst) + round2(r.sgst) + round2(r.igst) === 0);
        return {
          success: true,
          rows: nil.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, 'Nil/Exempt'),
          ),
        };
      }
      case 'gstr1_export': {
        const rows = await invoiceRows(
          base,
          sql`(${SALES}) AND l.country IS NOT NULL AND l.country != '' AND LOWER(l.country) != 'india'`,
        );
        if (rows.length === 0) {
          return {
            success: true,
            rows: [],
            message:
              'No export invoices found. Exports are identified by a party whose country is set to something other than India.',
          };
        }
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_country), r, 'Export'),
          ),
        };
      }

      // ── Shape A: GSTR-1 working sets (uncertain / included / not relevant) ─
      case 'gstr1_uncertain': {
        const rows = await invoiceRows(base, SALES);
        const bad = rows.filter((r) => {
          const reg = r.party_reg_type && r.party_reg_type !== 'Unregistered';
          const gstin = (r.party_gstin || '').trim();
          if (reg && !gstin) return true;
          if (gstin && gstin.length !== 15) return true;
          if (!(r.place_of_supply || '').trim()) return true;
          return false;
        });
        return {
          success: true,
          rows: bad.map((r) => {
            const reg = r.party_reg_type && r.party_reg_type !== 'Unregistered';
            const gstin = (r.party_gstin || '').trim();
            const reason =
              reg && !gstin
                ? 'Missing GSTIN'
                : gstin && gstin.length !== 15
                  ? 'Invalid GSTIN'
                  : 'Missing Place of Supply';
            return rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, reason);
          }),
        };
      }
      case 'gstr1_included': {
        const rows = await invoiceRows(base, SALES);
        const ok = rows.filter((r) => {
          const reg = r.party_reg_type && r.party_reg_type !== 'Unregistered';
          const gstin = (r.party_gstin || '').trim();
          if (reg && (!gstin || gstin.length !== 15)) return false;
          if (!(r.place_of_supply || '').trim()) return false;
          return true;
        });
        return {
          success: true,
          rows: ok.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, 'Included'),
          ),
        };
      }
      case 'gstr1_not_relevant': {
        // Vouchers in the period that don't affect the GST return (no tax invoice).
        const rows = await db.all(sql`
          SELECT v.voucher_number, v.voucher_type, v.date, v.party_name
          FROM ${vouchers} v
          WHERE ${sql.join([...base, sql`COALESCE(v.is_invoice, 0) = 0`], sql` AND `)}
          ORDER BY v.date ASC LIMIT 500`);
        return {
          success: true,
          rows: rows.map((r) => ({
            section_invoice: `${r.voucher_type} ${r.voucher_number}`,
            party_gstin: r.party_name || '',
            taxable_value: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            status: 'Not relevant',
          })),
        };
      }

      // ── Shape A: HSN / SAC summaries ─────────────────────────────────────
      case 'gstr1_hsn':
      case 'hsn_sac_summary':
      case 'gstr9_hsn':
      case 'hsn_summary': {
        const rows = await db.all(sql`
          SELECT COALESCE(NULLIF(tl.hsn_code, ''), 'N/A') AS hsn_code,
                 ${GVTL_FULL_RATE} AS gst_rate,
                 ${GVTL_TAXABLE} AS taxable_value,
                 COALESCE(SUM(CASE WHEN tl.tax_type = 'CGST' THEN tl.amount ELSE 0 END), 0) AS cgst,
                 COALESCE(SUM(CASE WHEN tl.tax_type = 'SGST' THEN tl.amount ELSE 0 END), 0) AS sgst,
                 COALESCE(SUM(CASE WHEN tl.tax_type = 'IGST' THEN tl.amount ELSE 0 END), 0) AS igst
          FROM ${gstVoucherTaxLines} tl
          INNER JOIN ${vouchers} v ON v.voucher_id = tl.voucher_id
          WHERE ${sql.join([...base, sql`(${SALES})`], sql` AND `)}
          GROUP BY hsn_code, gst_rate
          ORDER BY hsn_code ASC`);
        return {
          success: true,
          rows: rows.map((r) => rowA(`${r.hsn_code}`, pct(r.gst_rate), r, '')),
        };
      }

      // ── Shape A: GSTR-3B / GSTR-9 / annual summaries (category rows) ──────
      case 'gstr3b_outward':
      case 'gstr9_outward':
        return { success: true, rows: await byRate(base, SALES) };
      case 'gstr3b_itc_available':
      case 'gstr9_itc':
        return { success: true, rows: await byRate(base, PURCHASE) };
      case 'gstr3b_exempt': {
        const out = await totals(base, sql`(${SALES}) AND COALESCE(se.max_rate, 0) = 0`);
        const inn = await totals(base, sql`(${PURCHASE}) AND COALESCE(se.max_rate, 0) = 0`);
        return {
          success: true,
          rows: [
            rowA('Exempt / nil-rated outward supplies', '', out, ''),
            rowA('Exempt / nil-rated inward supplies', '', inn, ''),
          ],
        };
      }
      case 'gstr3b_summary':
      case 'gstr3b_format':
      case 'gstr9':
      case 'gstr1_summary':
      case 'gstr1':
      case 'activities':
      case 'annual_computation': {
        const out = await totals(base, SALES);
        const inn = await totals(base, PURCHASE);
        const notes = await totals(base, NOTES);
        const outTax = round2(out.cgst) + round2(out.sgst) + round2(out.igst);
        const inTax = round2(inn.cgst) + round2(inn.sgst) + round2(inn.igst);
        return {
          success: true,
          rows: [
            rowA('Outward taxable supplies (Sales)', '', out, 'Output'),
            rowA('Credit / Debit notes', '', notes, 'Adjust'),
            rowA('Inward supplies (ITC eligible)', '', inn, 'ITC'),
            {
              section_invoice: 'Net GST payable',
              party_gstin: '',
              taxable_value: 0,
              igst: round2(round2(out.igst) - round2(inn.igst)),
              cgst: round2(round2(out.cgst) - round2(inn.cgst)),
              sgst: round2(round2(out.sgst) - round2(inn.sgst)),
              status: outTax - inTax >= 0 ? 'Payable' : 'Credit',
            },
          ],
        };
      }

      // ── Shape A: exception reports ───────────────────────────────────────
      case 'missing_gstin': {
        const rows = await invoiceRows(
          base,
          sql`(${SALES}) AND (l.gstin IS NULL OR l.gstin = '') AND l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'`,
        );
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, ''), r, 'Missing GSTIN'),
          ),
        };
      }
      case 'gstin_validation': {
        const rows = await invoiceRows(
          base,
          sql`(${SALES}) AND l.gstin IS NOT NULL AND l.gstin != '' AND length(l.gstin) != 15`,
        );
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, 'Invalid GSTIN'),
          ),
        };
      }
      case 'place_of_supply': {
        const rows = await invoiceRows(
          base,
          sql`(${SALES}) AND COALESCE(v.place_of_supply, '') = ''`,
        );
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(
              r.voucher_number,
              partyLabel(r.party_name, r.party_gstin),
              r,
              'Missing Place of Supply',
            ),
          ),
        };
      }
      case 'missing_hsn': {
        const rows = await db.all(sql`
          SELECT v.voucher_number, v.party_name, vse.item_name,
                 COALESCE(vse.amount, 0) AS taxable_value,
                 0 AS cgst, 0 AS sgst, 0 AS igst
          FROM ${voucherStockEntries} vse
          INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
          LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
          WHERE ${sql.join([...base, sql`COALESCE(NULLIF(vse.hsn_code, ''), si.hsn_code, '') = ''`], sql` AND `)}
          ORDER BY v.date ASC`);
        return {
          success: true,
          rows: rows.map((r) =>
            rowA(
              `${r.voucher_number} — ${r.item_name || 'Item'}`,
              r.party_name || '',
              r,
              'Missing HSN/SAC',
            ),
          ),
        };
      }
      case 'gst_exception': {
        const noGstin = await invoiceRows(
          base,
          sql`(${SALES}) AND (l.gstin IS NULL OR l.gstin = '') AND l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'`,
        );
        const badGstin = await invoiceRows(
          base,
          sql`(${SALES}) AND l.gstin IS NOT NULL AND l.gstin != '' AND length(l.gstin) != 15`,
        );
        const noPos = await invoiceRows(
          base,
          sql`(${SALES}) AND COALESCE(v.place_of_supply, '') = ''`,
        );
        const rows = [
          ...noGstin.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, ''), r, 'Missing GSTIN'),
          ),
          ...badGstin.map((r) =>
            rowA(r.voucher_number, partyLabel(r.party_name, r.party_gstin), r, 'Invalid GSTIN'),
          ),
          ...noPos.map((r) =>
            rowA(
              r.voucher_number,
              partyLabel(r.party_name, r.party_gstin),
              r,
              'Missing Place of Supply',
            ),
          ),
        ];
        if (rows.length === 0)
          return {
            success: true,
            rows: [],
            message: 'No GST exceptions — all invoices have a valid GSTIN and place of supply.',
          };
        return { success: true, rows };
      }

      // ── Shape D: rate / state / party-wise analysis ──────────────────────
      case 'rate_wise_sales':
      case 'rate_wise_purchase':
      case 'state_wise_sales':
      case 'state_wise_purchase':
      case 'party_wise_sales':
      case 'party_wise_purchase': {
        const docCond = reportType.endsWith('_purchase') ? PURCHASE : SALES;
        const group = reportType.startsWith('rate_wise')
          ? sql`COALESCE(se.max_rate, 0)`
          : reportType.startsWith('state_wise')
            ? sql`COALESCE(NULLIF(l.state, ''), v.place_of_supply, 'Unspecified')`
            : sql`COALESCE(v.party_name, 'Unspecified')`;
        const rows = await db.all(sql`
          SELECT ${group} AS grp,
                 COUNT(DISTINCT v.voucher_id) AS cnt,
                 COALESCE(SUM(se.qty), 0) AS qty,
                 COALESCE(SUM(se.taxable_value), 0) AS taxable,
                 COALESCE(SUM(COALESCE(tx.cgst,0) + COALESCE(tx.sgst,0) + COALESCE(tx.igst,0) + COALESCE(tx.cess,0)), 0) AS tax
          FROM ${vouchers} v
          INNER JOIN ${TAXABLE_BY_VOUCHER} se ON se.vid = v.voucher_id
          LEFT JOIN ${TAX_BY_VOUCHER} tx ON tx.vid = v.voucher_id
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE ${sql.join([...base, sql`v.is_invoice = 1`, docCond], sql` AND `)}
          GROUP BY grp
          ORDER BY taxable DESC`);
        return {
          success: true,
          rows: rows.map((r) => ({
            party_item: reportType.startsWith('rate_wise')
              ? `Taxable @ ${pct(r.grp)}`
              : r.grp || 'Unspecified',
            voucher_order_no: `${r.cnt} vch`,
            qty_count: round2(r.qty),
            taxable_gross: round2(r.taxable),
            tax_discount: round2(r.tax),
            net_amount: round2(Number(r.taxable) + Number(r.tax)),
            status: '',
          })),
        };
      }

      // ── Shape B: liability & payment registers ───────────────────────────
      case 'liability_register': {
        const rows = await db.all(sql`
          SELECT strftime('%Y-%m', v.date) AS ym,
                 SUM(CASE WHEN v.voucher_type = 'Sales' THEN COALESCE(tx.cgst,0)+COALESCE(tx.sgst,0)+COALESCE(tx.igst,0) ELSE 0 END) AS output_tax,
                 SUM(CASE WHEN v.voucher_type = 'Purchase' THEN COALESCE(tx.cgst,0)+COALESCE(tx.sgst,0)+COALESCE(tx.igst,0) ELSE 0 END) AS itc
          FROM ${vouchers} v
          LEFT JOIN ${TAX_BY_VOUCHER} tx ON tx.vid = v.voucher_id
          WHERE ${sql.join([...base, sql`v.is_invoice = 1`, sql`v.voucher_type IN ('Sales','Purchase')`], sql` AND `)}
          GROUP BY ym
          ORDER BY ym ASC`);
        const out = [];
        for (const r of rows) {
          const net = round2(Number(r.output_tax) - Number(r.itc));
          out.push({
            date: `${r.ym}-01`,
            particulars: 'Output tax liability',
            type_section: r.ym,
            ref_vch_no: '',
            amount: round2(r.output_tax),
            status: '',
          });
          out.push({
            date: `${r.ym}-01`,
            particulars: 'Less: input tax credit',
            type_section: r.ym,
            ref_vch_no: '',
            amount: round2(-r.itc),
            status: '',
          });
          out.push({
            date: `${r.ym}-01`,
            particulars: 'Net GST payable',
            type_section: r.ym,
            ref_vch_no: '',
            amount: net,
            status: net >= 0 ? 'Payable' : 'Credit c/f',
          });
        }
        return { success: true, rows: out };
      }
      case 'payment_register': {
        const rows = await db.all(sql`
          SELECT v.date, v.voucher_number, v.voucher_type, l.name AS ledger_name,
                 ve.type, ve.amount
          FROM ${voucherEntries} ve
          INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
          INNER JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          WHERE ${sql.join([...base, sql`g.name = 'Duties & Taxes'`, sql`v.voucher_type IN ('Payment','Journal')`], sql` AND `)}
          ORDER BY v.date ASC`);
        return {
          success: true,
          rows: rows.map((r) => ({
            date: r.date,
            particulars: r.ledger_name,
            type_section: r.voucher_type,
            ref_vch_no: r.voucher_number,
            amount: round2(r.amount),
            status: r.type === 'Dr' ? 'Paid' : 'Accrued',
          })),
        };
      }

      // ── Shape C: input / output tax ledgers (running balance) ────────────
      case 'itc_ledger':
      case 'output_tax_ledger': {
        const docCond = reportType === 'itc_ledger' ? PURCHASE : SALES;
        const rows = await db.all(sql`
          SELECT v.date, v.voucher_number, v.voucher_type, v.party_name,
                 COALESCE(tx.cgst,0) + COALESCE(tx.sgst,0) + COALESCE(tx.igst,0) AS tax
          FROM ${vouchers} v
          LEFT JOIN ${TAX_BY_VOUCHER} tx ON tx.vid = v.voucher_id
          WHERE ${sql.join([...base, sql`v.is_invoice = 1`, docCond, sql`(COALESCE(tx.cgst,0) + COALESCE(tx.sgst,0) + COALESCE(tx.igst,0)) != 0`], sql` AND `)}
          ORDER BY v.date ASC`);
        let balance = 0;
        const isItc = reportType === 'itc_ledger';
        return {
          success: true,
          rows: rows.map((r) => {
            const tax = round2(r.tax);
            balance = round2(balance + tax);
            return {
              date_particulars: `${r.date} — ${r.party_name || r.voucher_type}`,
              vch_type: r.voucher_type,
              vch_no: r.voucher_number,
              debit: isItc ? tax : 0, // ITC accumulates as a debit (asset); output tax as a credit (liability)
              credit: isItc ? 0 : tax,
              balance,
            };
          }),
        };
      }

      // ── Navigation pseudo-report ─────────────────────────────────────────
      case 'menu':
        return {
          success: true,
          rows: [],
          message: 'Use the GST Reports menu to open a specific report.',
        };

      default:
        return {
          success: true,
          rows: [],
          message: `GST report "${reportType}" is not available from books.`,
        };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { getGstReport };
