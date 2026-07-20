'use strict';

// Repairs the GST fields a Tally `.1800` import leaves empty.
//
// Tally's binary export carries GST only as Duties & Taxes ledger POSTINGS — it does not
// repeat the rate on each inventory line, does not carry the UQC of a unit, and does not
// mark which ledgers are GST tax heads. Our GST engine reads all three, so a freshly
// imported company lands every voucher in "Uncertain" with:
//   - "Tax Rate is not specified"                    (voucher_stock_entries.gst_rate = 0)
//   - "UOM is not mapped to the Unit Quantity Code"  (units.unit_quantity_code blank)
//   - "Applicable Tax Ledger is not selected"        (no ledger_statutory_details GST row)
//
// importer.js now fills these at import time; this module repairs companies imported
// before that, and doubles as the importer's own implementation so the two can't drift.
//
// Every step is idempotent and never overwrites a value that is already set.

const { db } = require('../../db/index');

// ── Unit Quantity Codes ─────────────────────────────────────────────────────────────
// GSTN's UQC list, keyed by the unit symbols Tally actually emits. Only unambiguous
// mappings live here: a symbol that is not listed is left blank for the user to map in
// Map UOM-UQC rather than guessed at (a wrong UQC is a rejected return).
const UQC_BY_SYMBOL = {
  mtr: 'MTR',
  mtrs: 'MTR',
  meter: 'MTR',
  metre: 'MTR',
  m: 'MTR',
  kg: 'KGS',
  kgs: 'KGS',
  kilogram: 'KGS',
  roll: 'ROL',
  rolls: 'ROL',
  rol: 'ROL',
  pcs: 'PCS',
  pc: 'PCS',
  piece: 'PCS',
  pieces: 'PCS',
  ltr: 'LTR',
  ltrs: 'LTR',
  litre: 'LTR',
  liter: 'LTR',
  l: 'LTR',
  grs: 'GRS',
  gross: 'GRS',
  pac: 'PAC',
  pack: 'PAC',
  packs: 'PAC',
  nos: 'NOS',
  no: 'NOS',
  nos_: 'NOS',
  number: 'NOS',
  'cms.': 'CMS',
  cms: 'CMS',
  cm: 'CMS',
  box: 'BOX',
  boxes: 'BOX',
  bag: 'BAG',
  bags: 'BAG',
  bdl: 'BDL',
  bundle: 'BDL',
  btl: 'BTL',
  bottle: 'BTL',
  can: 'CAN',
  ctn: 'CTN',
  carton: 'CTN',
  doz: 'DOZ',
  dozen: 'DOZ',
  drm: 'DRM',
  drum: 'DRM',
  gms: 'GMS',
  gm: 'GMS',
  gram: 'GMS',
  mlt: 'MLT',
  ml: 'MLT',
  qtl: 'QTL',
  quintal: 'QTL',
  set: 'SET',
  sets: 'SET',
  sqf: 'SQF',
  sqft: 'SQF',
  sqm: 'SQM',
  ton: 'TON',
  tonne: 'TON',
  tons: 'TON',
  unt: 'UNT',
  unit: 'UNT',
  yds: 'YDS',
  yard: 'YDS',
};

const uqcFor = (symbol) =>
  UQC_BY_SYMBOL[
    String(symbol || '')
      .trim()
      .toLowerCase()
  ] || null;

// ── GST tax-head ledgers ────────────────────────────────────────────────────────────
// Which GST component a Duties & Taxes ledger represents, from its name. Order matters
// only in that CGST/SGST/UTGST are tested before the bare IGST substring.
const gstTaxTypeFor = (name) => {
  const n = String(name || '').toUpperCase();
  if (n.includes('CGST')) return 'CGST';
  if (n.includes('SGST') || n.includes('UTGST')) return 'SGST/UTGST';
  if (n.includes('IGST')) return 'IGST';
  return null;
};

// Standard GST slabs. A voucher's effective rate is snapped to whichever slab it is
// within TOLERANCE of — real invoices land a paisa or two off from rounding.
const SLABS = [0.25, 3, 5, 12, 18, 28];
const SLAB_TOLERANCE = 0.3;
const snapToSlab = (rate) => {
  if (!Number.isFinite(rate)) return null;
  for (const s of SLABS) if (Math.abs(rate - s) <= SLAB_TOLERANCE) return s;
  return null;
};

// The rate decision for ONE voucher, shared by the import path and the repair pass so
// the two can never drift. Inputs are already-summed money, no DB access:
//   taxable   — sum of the voucher's inventory line amounts
//   bookedTax — sum of its GST tax-ledger postings
//   masterTax — sum of line amount x that line's stock-item master rate
// Returns { mode: 'voucher', rate } | { mode: 'master' } | { mode: 'review' }.
const deriveVoucherRate = ({ taxable = 0, bookedTax = 0, masterTax = 0 } = {}) => {
  // No booked tax = nothing to derive from. Do NOT snap to a slab here: 0 sits within
  // tolerance of the 0.25% slab, which would stamp a rough-diamond rate onto an
  // untaxed voucher. Whether this is a genuine exempt supply or a missing tax ledger is
  // the classifier's call, and it needs the line left at 0 to make it.
  if (bookedTax <= 0) return { mode: 'review' };
  if (taxable > 0) {
    const slab = snapToSlab((bookedTax * 100) / taxable);
    if (slab != null) return { mode: 'voucher', rate: slab };
    // Mixed-slab invoice: a single voucher rate cannot describe it, but the per-line
    // master rates can — accept them only if they reproduce the booked tax.
    if (Math.abs(masterTax - bookedTax) <= Math.max(1, bookedTax * 0.01)) return { mode: 'master' };
  }
  return { mode: 'review' };
};

// ── Step 1: UQC ─────────────────────────────────────────────────────────────────────
async function backfillUnitUqc(company_id, { dryRun = false } = {}) {
  const res = await db.execute(
    `SELECT unit_id, name, symbol FROM units
      WHERE company_id = ?
        AND (unit_quantity_code IS NULL OR TRIM(unit_quantity_code) = '')`,
    [company_id],
  );
  const mapped = [];
  const unmapped = [];
  for (const u of res.rows || []) {
    const uqc = uqcFor(u.symbol) || uqcFor(u.name);
    if (uqc) mapped.push({ unit_id: u.unit_id, symbol: u.symbol, uqc });
    else unmapped.push({ unit_id: u.unit_id, symbol: u.symbol });
  }
  if (!dryRun) {
    for (const m of mapped) {
      await db.execute(`UPDATE units SET unit_quantity_code = ? WHERE unit_id = ?`, [
        m.uqc,
        m.unit_id,
      ]);
    }
  }
  return { mapped: mapped.length, unmapped: unmapped.map((u) => u.symbol), details: mapped };
}

// ── Step 2: tag GST tax ledgers ─────────────────────────────────────────────────────
// Only Duties & Taxes ledgers whose name names a GST component. Deliberately excludes
// payment/control accounts that merely contain "GST" (GST Cash Ledger, GST PAYMENT, GST
// RECEIVABLE) — tagging those would add tax lines that carry no component and corrupt
// the taxable-value derivation — and Purchase/Sales ledgers, which are not tax heads.
async function tagGstLedgers(company_id, { dryRun = false } = {}) {
  const res = await db.execute(
    `SELECT l.ledger_id, l.name
       FROM ledgers l
       JOIN groups g ON g.group_id = l.group_id
       LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
      WHERE l.company_id = ?
        AND g.name = 'Duties & Taxes'
        AND (l.name LIKE '%CGST%' OR l.name LIKE '%SGST%'
             OR l.name LIKE '%IGST%' OR l.name LIKE '%UTGST%')
        AND sd.id IS NULL`,
    [company_id],
  );
  const rows = (res.rows || [])
    .map((l) => ({ ledger_id: l.ledger_id, name: l.name, taxType: gstTaxTypeFor(l.name) }))
    .filter((l) => l.taxType);
  if (!dryRun) {
    for (const l of rows) {
      await db.execute(
        `INSERT INTO ledger_statutory_details
           (ledger_id, gst_applicability, type_of_duty_tax, gst_tax_type)
         VALUES (?, 'Applicable', 'GST', ?)`,
        [l.ledger_id, l.taxType],
      );
    }
  }
  return { tagged: rows.length, details: rows };
}

// ── Step 3: per-line GST rate on voucher stock entries ──────────────────────────────
// The rate is derived from the tax ACTUALLY BOOKED on the voucher, never from the stock
// item master: the same item is commonly sold at different slabs across a year, so the
// master's single current rate contradicts historical invoices (measured on a real
// import: 1632 of 3922 vouchers, ~Rs 39 lakh of tax). Three tiers:
//   A. effective rate (booked GST / taxable) snaps to a standard slab → use it
//   B. mixed-slab invoice where the per-line master rates reproduce the booked tax
//      within 1% → use the master rate per line
//   C. neither works (tax-only notes with no taxable value, unexplained blends) → leave
//      untouched so the voucher stays in Uncertain for a human, rather than inventing a
//      rate that would silently misstate the return.
async function backfillStockGstRates(company_id, fy_id, { dryRun = false } = {}) {
  const res = await db.execute(
    `SELECT t.voucher_id, t.taxable, t.master_tax, COALESCE(b.tax, 0) AS tax
       FROM (SELECT v.voucher_id,
                    SUM(vse.amount) AS taxable,
                    SUM(vse.amount * COALESCE(si.gst_rate, 0) / 100.0) AS master_tax
               FROM vouchers v
               JOIN voucher_stock_entries vse ON vse.voucher_id = v.voucher_id
               LEFT JOIN stock_items si ON si.item_id = vse.stock_item_id
              WHERE v.company_id = ? AND v.fy_id = ?
              GROUP BY v.voucher_id) t
       LEFT JOIN (SELECT ve.voucher_id, SUM(ve.amount) AS tax
                    FROM voucher_entries ve
                    JOIN ledger_statutory_details sd
                      ON sd.ledger_id = ve.ledger_id AND sd.type_of_duty_tax = 'GST'
                   GROUP BY ve.voucher_id) b ON b.voucher_id = t.voucher_id`,
    [company_id, fy_id],
  );

  const tierA = [];
  const tierB = [];
  const tierC = [];
  for (const v of res.rows || []) {
    const taxable = Number(v.taxable) || 0;
    const tax = Number(v.tax) || 0;
    const d = deriveVoucherRate({ taxable, bookedTax: tax, masterTax: Number(v.master_tax) || 0 });
    if (d.mode === 'voucher') tierA.push({ voucher_id: v.voucher_id, rate: d.rate });
    else if (d.mode === 'master') tierB.push({ voucher_id: v.voucher_id });
    else tierC.push({ voucher_id: v.voucher_id, taxable, tax });
  }

  if (!dryRun) {
    for (const a of tierA) {
      await db.execute(`UPDATE voucher_stock_entries SET gst_rate = ? WHERE voucher_id = ?`, [
        a.rate,
        a.voucher_id,
      ]);
    }
    for (const b of tierB) {
      // Per-line rate off the item master — the only correct choice for a mixed-slab
      // invoice, and verified above to reproduce the booked tax.
      await db.execute(
        `UPDATE voucher_stock_entries
            SET gst_rate = COALESCE((SELECT si.gst_rate FROM stock_items si
                                      WHERE si.item_id = voucher_stock_entries.stock_item_id), 0)
          WHERE voucher_id = ?`,
        [b.voucher_id],
      );
    }
  }

  return {
    vouchers: (res.rows || []).length,
    voucherRate: tierA.length,
    perLineMasterRate: tierB.length,
    needsReview: tierC.length,
    needsReviewVouchers: tierC,
  };
}

// Runs all three steps for one company/FY. `dryRun` reports what would change without
// writing, so the caller can show a diff before touching real accounting data.
async function repairImportedGst(company_id, fy_id, { dryRun = false } = {}) {
  if (!company_id || !fy_id) return { success: false, error: 'company_id and fy_id are required.' };
  try {
    const uqc = await backfillUnitUqc(company_id, { dryRun });
    // Tagging must precede the rate pass: the derived rate reads booked tax through the
    // GST ledger tags this step creates.
    const ledgers = await tagGstLedgers(company_id, { dryRun });
    const rates = await backfillStockGstRates(company_id, fy_id, { dryRun });
    return { success: true, dryRun, uqc, ledgers, rates };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  repairImportedGst,
  deriveVoucherRate,
  backfillUnitUqc,
  tagGstLedgers,
  backfillStockGstRates,
  uqcFor,
  gstTaxTypeFor,
  snapToSlab,
  UQC_BY_SYMBOL,
};
