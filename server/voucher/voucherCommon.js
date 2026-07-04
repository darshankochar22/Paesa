// Shared voucher write-path helpers used by both create (voucherCRUD.js) and
// update (voucherUpdate.js). Extracted verbatim from voucherCRUD.js.
const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  voucherTypes,
  voucherTypeConfigs,
  ledgers,
  ledgerStatutoryDetails,
} = require('../db/schema');

// Non-accounting inventory-only voucher types never post a voucher_entries row
// for the party ledger, so a bill reference against them would be orphaned
// (no accounting entry to settle) and corrupts bill-wise outstanding reports.
const NON_ACCOUNTING_INVENTORY_TYPES = [
  'Delivery Note',
  'Receipt Note',
  'Rejection In',
  'Rejection Out',
  'Material In',
  'Material Out',
];

// Maps the label the Ledger Create/Alter screen stores in ledger_statutory_details.gst_tax_type
// (see LedgerTaxPanel.tsx) to the override key gstTaxEngine's resolveOrOverride() looks up.
const GST_TAX_TYPE_TO_OVERRIDE_KEY = {
  CGST: 'cgst_ledger_id',
  'SGST/UTGST': 'sgst_ledger_id',
  IGST: 'igst_ledger_id',
  Cess: 'cess_ledger_id',
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
          LIMIT 1`,
    );
    if (vtRows.length === 0) return null;

    const configRows = await db.all(
      sql`SELECT voucher_classes FROM ${voucherTypeConfigs}
          WHERE ${voucherTypeConfigs.voucherTypeId} = ${vtRows[0].vt_id} LIMIT 1`,
    );
    if (configRows.length === 0) return null;

    let classes = [];
    try {
      classes = JSON.parse(configRows[0].voucher_classes || '[]');
    } catch (_) {
      classes = [];
    }
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
          WHERE l.ledger_id IN (${sql.join(
            ledgerIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
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
  NON_ACCOUNTING_INVENTORY_TYPES,
  GST_TAX_TYPE_TO_OVERRIDE_KEY,
  resolveVoucherClassGstLedgers,
};
