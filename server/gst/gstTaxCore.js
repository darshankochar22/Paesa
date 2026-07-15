// GST tax-engine core — state/GSTIN resolution, HSN/master rate resolution,
// duty-ledger resolution/setup, company-registration resolution and tax-ledger
// classification. The voucher-level compute/validate flows live in
// gstTaxCompute.js; consumers keep requiring gstTaxEngine.js (barrel).

const { sql, eq, and } = require('drizzle-orm');
const {
  companies,
  gstRegistrations,
  ledgers,
  ledgerStatutoryDetails,
  groups,
  stockItems,
  stockGroups,
  gstHsnRates,
  gstVoucherTaxLines,
} = require('../db/schema');
const gstValidation = require('./gstValidation');

const STATE_CODE_MAP = {
  'jammu and kashmir': '01',
  'himachal pradesh': '02',
  punjab: '03',
  chandigarh: '04',
  uttarakhand: '05',
  haryana: '06',
  delhi: '07',
  rajasthan: '08',
  'uttar pradesh': '09',
  bihar: '10',
  sikkim: '11',
  'arunachal pradesh': '12',
  nagaland: '13',
  manipur: '14',
  mizoram: '15',
  tripura: '16',
  meghalaya: '17',
  assam: '18',
  'west bengal': '19',
  jharkhand: '20',
  odisha: '21',
  chhattisgarh: '22',
  'madhya pradesh': '23',
  gujarat: '24',
  'daman and diu': '26',
  'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27',
  'andhra pradesh': '37',
  karnataka: '29',
  goa: '30',
  lakshadweep: '31',
  kerala: '32',
  'tamil nadu': '33',
  puducherry: '34',
  'andaman and nicobar islands': '35',
  telangana: '36',
  ladakh: '38',
};

const resolveStateCode = (stateName, gstin) => {
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    if (/^\d+$/.test(code)) {
      return code;
    }
  }
  // Unresolved state → '' (honest "unknown"), NOT a silent Maharashtra guess. Callers that
  // need a concrete code fall back to the company's own state (a stateless/unknown party is
  // treated as a local supply, Tally-style), so a non-Maharashtra company is never
  // misclassified as inter-state against a phantom '27'.
  if (!stateName) return '';
  const nameLower = stateName.trim().toLowerCase();
  return STATE_CODE_MAP[nameLower] || '';
};

// Taxability values that make a ZERO GST rate legitimate (the supply is genuinely
// exempt/nil/non-GST). Anything else that resolves to a zero rate with source 'default'
// means NO rate configuration was found — a silent-zero-tax hazard we surface as a warning.
const EXEMPT_TAXABILITIES = new Set([
  'exempt',
  'exempted',
  'nil rated',
  'nil-rated',
  'nil',
  'non-gst',
  'non gst',
  'nongst',
]);

// Collects per-item GST data-quality warnings (unconfigured rate, negative taxable value)
// so a save can flag them instead of silently emitting a zero-tax or negative-tax voucher
// that later corrupts GSTR-1/3B totals. Non-blocking by design.
const collectRateWarnings = (warnings, entry, rateDetails, assessableValue) => {
  const taxability = String(rateDetails.taxability || '').toLowerCase();
  const label = entry.item_name || rateDetails.hsn_code || entry.hsn_code || 'an item';
  if (
    assessableValue !== 0 &&
    rateDetails.source === 'default' &&
    (rateDetails.gst_rate || 0) === 0 &&
    (rateDetails.cess_rate || 0) === 0 &&
    !EXEMPT_TAXABILITIES.has(taxability)
  ) {
    warnings.push(
      `No GST rate configured for ${label} (HSN ${rateDetails.hsn_code || 'unset'}); saved with ZERO tax. ` +
        `Set a rate on the item, its stock group, the ledger, or an HSN override — or mark it Exempt/Nil-rated if that is intended.`,
    );
  }
  if (assessableValue < 0) {
    warnings.push(
      `Negative taxable value (${assessableValue}) on ${label} — discount exceeds the line amount; this will subtract from GST totals.`,
    );
  }
};

/**
 * Walks the statutory configuration hierarchy to resolve HSN and GST rate details.
 * Hierarchy: Item -> Stock Group -> Ledger (if item not used) -> Company HSN Override
 */
const resolveTaxRate = async (db, { company_id, stock_item_id, ledger_id, hsn_code, date }) => {
  let resolved = {
    hsn_code: hsn_code || '',
    gst_rate: 0,
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 0,
    cess_rate: 0,
    taxability: '',
    source: 'default',
  };

  // 1. Resolve by Stock Item if stock_item_id is provided
  if (stock_item_id) {
    const itemRows = await db.all(
      sql`SELECT * FROM ${stockItems}
          WHERE ${stockItems.itemId} = ${stock_item_id} AND ${stockItems.companyId} = ${company_id}`,
    );
    const item = itemRows[0];
    if (item) {
      if (item.taxability_type) resolved.taxability = item.taxability_type;
      if (item.hsn_code) resolved.hsn_code = item.hsn_code;
      if (item.gst_applicable === 'Applicable' || item.gst_rate > 0) {
        resolved.gst_rate = item.gst_rate || 0;
        resolved.cgst_rate = item.cgst_rate || 0;
        resolved.sgst_rate = item.sgst_rate || 0;
        resolved.igst_rate = item.igst_rate || 0;
        resolved.source = 'stock_item';
        // The stock_items table has no cess column, so an item rated at the item level would
        // otherwise return zero cess. Inherit any cess configured on its stock group so a cess
        // item (autos/tobacco/aerated drinks) still reports cess instead of silently zeroing it.
        if (item.group_id) {
          const gRows = await db.all(
            sql`SELECT cess_rate FROM ${stockGroups}
                WHERE ${stockGroups.sgId} = ${item.group_id} AND ${stockGroups.companyId} = ${company_id}`,
          );
          if (gRows[0] && (gRows[0].cess_rate || 0) > 0) resolved.cess_rate = gRows[0].cess_rate;
        }
        return resolved;
      }

      // 2. Check Stock Group of this item
      if (item.group_id) {
        const groupRows = await db.all(
          sql`SELECT * FROM ${stockGroups}
              WHERE ${stockGroups.sgId} = ${item.group_id} AND ${stockGroups.companyId} = ${company_id}`,
        );
        const group = groupRows[0];
        if (group && (group.gst_rate > 0 || group.hsn_sac_code)) {
          if (group.hsn_sac_code) resolved.hsn_code = group.hsn_sac_code;
          resolved.gst_rate = group.gst_rate || 0;
          resolved.cgst_rate = group.cgst_rate || 0;
          resolved.sgst_rate = group.sgst_rate || 0;
          resolved.igst_rate = group.igst_rate || 0;
          resolved.cess_rate = group.cess_rate || 0;
          resolved.source = 'stock_group';
          return resolved;
        }
      }
    }
  }

  // 3. Check Ledger Statutory Details
  if (ledger_id) {
    const ledgerStatRows = await db.all(
      sql`SELECT * FROM ${ledgerStatutoryDetails} WHERE ${ledgerStatutoryDetails.ledgerId} = ${ledger_id}`,
    );
    const stat = ledgerStatRows[0];
    if (stat && (stat.gst_rate > 0 || stat.hsn_sac_code)) {
      if (stat.hsn_sac_code) resolved.hsn_code = stat.hsn_sac_code;
      resolved.gst_rate = stat.gst_rate || 0;
      resolved.cgst_rate = stat.cgst_rate || 0;
      resolved.sgst_rate = stat.sgst_rate || 0;
      resolved.igst_rate = stat.igst_rate || 0;
      resolved.source = 'ledger';
      return resolved;
    }
  }

  // 4. Fallback to Company HSN Rate overrides (if HSN code is resolved)
  const queryHsn = resolved.hsn_code || hsn_code;
  if (queryHsn) {
    const effectiveDate = date || new Date().toISOString().split('T')[0];
    const hsnRateRows = await db.all(
      sql`SELECT * FROM ${gstHsnRates}
          WHERE ${gstHsnRates.companyId} = ${company_id}
            AND ${gstHsnRates.hsnCode} = ${queryHsn}
            AND ${gstHsnRates.effectiveFrom} <= ${effectiveDate}
            AND (${gstHsnRates.effectiveTo} IS NULL OR ${gstHsnRates.effectiveTo} >= ${effectiveDate})
          ORDER BY ${gstHsnRates.effectiveFrom} DESC LIMIT 1`,
    );
    const hsnRate = hsnRateRows[0];
    if (hsnRate) {
      resolved.gst_rate = hsnRate.gst_rate || 0;
      resolved.cgst_rate = hsnRate.cgst_rate || 0;
      resolved.sgst_rate = hsnRate.sgst_rate || 0;
      resolved.igst_rate = hsnRate.igst_rate || 0;
      resolved.cess_rate = hsnRate.cess_rate || 0;
      resolved.source = 'company_hsn';
      return resolved;
    }
  }

  return resolved;
};

/**
 * Maps the internal tax component key to the exact label the Ledger Create/Alter
 * screen stores in ledger_statutory_details.gst_tax_type (see DutyTaxSection's
 * "Tax type" dropdown in client/src/pages/master/ledger/components/LedgerTaxPanel.tsx).
 */
const GST_TAX_TYPE_LABELS = {
  CGST: 'CGST',
  SGST: 'SGST/UTGST',
  IGST: 'IGST',
  CESS: 'Cess',
};

/**
 * Resolves the Duties & Taxes ledger a user configured for a given GST tax
 * component (matched on ledger_statutory_details.type_of_duty_tax = 'GST' AND
 * gst_tax_type = <component>), falling back to an exact-name match for legacy
 * ledgers, and optionally auto-creating one (correctly tagged) if neither exists.
 */
const resolveTaxLedgerId = async (db, company_id, tax_type, { createIfMissing = false } = {}) => {
  const gstTaxTypeLabel = GST_TAX_TYPE_LABELS[tax_type] || tax_type;

  const configuredRows = await db.all(
    sql`SELECT l.ledger_id, l.name FROM ${ledgers} l
        JOIN ${ledgerStatutoryDetails} sd ON sd.ledger_id = l.ledger_id
        WHERE l.company_id = ${company_id} AND l.is_active = 1
          AND sd.type_of_duty_tax = 'GST' AND sd.gst_tax_type = ${gstTaxTypeLabel}
        ORDER BY l.ledger_id ASC LIMIT 1`,
  );
  if (configuredRows.length > 0) {
    return { id: configuredRows[0].ledger_id, name: configuredRows[0].name };
  }

  const namedRows = await db.all(
    sql`SELECT l.ledger_id, l.name FROM ${ledgers} l
        WHERE l.company_id = ${company_id} AND l.is_active = 1 AND LOWER(l.name) = LOWER(${tax_type})
        LIMIT 1`,
  );
  if (namedRows.length > 0) {
    return { id: namedRows[0].ledger_id, name: namedRows[0].name };
  }

  if (!createIfMissing) return null;

  // Find the group_id for "Duties & Taxes"
  const groupRows = await db.all(
    sql`SELECT group_id FROM ${groups}
        WHERE ${groups.companyId} = ${company_id} AND ${groups.name} = 'Duties & Taxes' AND ${groups.isActive} = 1
        LIMIT 1`,
  );
  const group_id = groupRows.length > 0 ? groupRows[0].group_id : null;

  // Insert the ledger
  const name = tax_type.toUpperCase();
  const insertedLedger = await db
    .insert(ledgers)
    .values({
      companyId: company_id,
      groupId: group_id,
      name: name,
      ledgerType: 'Duties & Taxes',
      nature: 'Liabilities',
      openingBalance: 0,
      closingBalance: 0,
      isBillWise: 0,
      maintainInventoryValues: 0,
      registrationType: 'Unregistered',
      isActive: 1,
      isPredefined: 0,
    })
    .returning({ id: ledgers.ledgerId });

  const ledger_id = Number(insertedLedger[0].id);

  // Insert statutory details — tagged the same way the Ledger Create/Alter screen
  // would, so this ledger is found by name (or by a user editing it later).
  await db.insert(ledgerStatutoryDetails).values({
    ledgerId: ledger_id,
    gstApplicability: 'Applicable',
    typeOfDutyTax: 'GST',
    gstTaxType: gstTaxTypeLabel,
    percentageOfCalculation: 0,
  });

  return { id: ledger_id, name };
};

/**
 * Bulk-setup utility (spec STEP 3): ensures the standard set of Duties & Taxes
 * ledgers (CGST, SGST/UTGST, IGST, Cess) exists for a company, each correctly
 * tagged in ledger_statutory_details so the engine resolves them. Idempotent —
 * existing tagged/named ledgers are reused, never duplicated.
 *
 * The engine's tax ledgers are rate-agnostic (the applied rate comes from the
 * item/classification, not the ledger), so a single ledger per component covers
 * every rate slab present in gst_classifications.
 * Returns a map of tax_type -> { id, name }.
 */
const setupStandardTaxLedgers = async (db, company_id) => {
  if (!company_id) throw new Error('company_id is required to set up tax ledgers');
  const result = {};
  for (const taxType of ['CGST', 'SGST', 'IGST', 'CESS']) {
    result[taxType] = await resolveTaxLedgerId(db, company_id, taxType, { createIfMissing: true });
  }
  return result;
};

/**
 * Resolves the company's GST registration for a voucher, in priority order:
 *   (a) edit path  — the voucher's OWN snapshotted registration id (frozen, STEP 7);
 *   (b) create path — an explicitly chosen registration id from the payload (bug 5);
 *   (c) create path — the company's current default registration;
 *   (d) fallback    — the first active registration (legacy behavior).
 */
const resolveCompanyRegistration = async (
  db,
  company_id,
  { gst_snapshot = null, gst_registration_id = null } = {},
) => {
  let reg = null;
  const pinnedRegId = (gst_snapshot && gst_snapshot.gst_registration_id) || null;
  const tryReg = async (id, requireActive) => {
    if (!id) return null;
    const rows = await db.all(
      requireActive
        ? sql`SELECT * FROM ${gstRegistrations}
               WHERE ${gstRegistrations.gstId} = ${id} AND ${gstRegistrations.companyId} = ${company_id}
                 AND ${gstRegistrations.isActive} = 1 LIMIT 1`
        : sql`SELECT * FROM ${gstRegistrations} WHERE ${gstRegistrations.gstId} = ${id} LIMIT 1`,
    );
    return rows[0] || null;
  };

  reg = await tryReg(pinnedRegId, false); // (a) frozen snapshot — honored as-is
  if (!reg) reg = await tryReg(gst_registration_id, true); // (b) explicit choice on this save
  if (!reg) {
    const companyRows = await db.all(
      sql`SELECT current_default_gst_registration_id AS def_id FROM ${companies}
          WHERE ${companies.companyId} = ${company_id} LIMIT 1`,
    );
    reg = await tryReg(companyRows[0] && companyRows[0].def_id, true); // (c) company default
  }
  if (!reg) {
    const rows = await db.all(
      sql`SELECT * FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1 LIMIT 1`,
    );
    reg = rows[0] || null; // (d) first active
  }
  return reg;
};

/**
 * Classifies which of a voucher's manually-entered accounting entries are GST
 * Duties & Taxes ledgers, and with what tax_type + fixed rate. Reads
 * ledger_statutory_details (type_of_duty_tax = 'GST'). Returns a Map:
 *   ledger_id(Number) -> { taxType: 'CGST'|'SGST'|'IGST'|'CESS', rate: Number }
 */
const classifyTaxLedgers = async (db, company_id, entries = []) => {
  const map = new Map();
  const ids = [...new Set(entries.map((e) => Number(e.ledger_id)).filter(Boolean))];
  if (ids.length === 0) return map;
  const rows = await db.all(
    sql`SELECT l.ledger_id AS ledger_id, l.name AS name, sd.gst_tax_type AS gst_tax_type,
               sd.gst_rate AS gst_rate, sd.percentage_of_calculation AS pct
        FROM ${ledgers} l
        JOIN ${ledgerStatutoryDetails} sd ON sd.ledger_id = l.ledger_id
        WHERE l.company_id = ${company_id} AND sd.type_of_duty_tax = 'GST'
          AND l.ledger_id IN (${sql.join(ids, sql`, `)})`,
  );
  for (const r of rows) {
    // Prefer the configured gst_tax_type; fall back to inferring from the ledger name so a
    // Duties&Taxes ledger tagged type_of_duty_tax='GST' but missing gst_tax_type (e.g. a
    // ledger literally named "IGST") is still recognised instead of silently ignored.
    let taxType = gstValidation.normalizeTaxType(r.gst_tax_type);
    if (!['CGST', 'SGST', 'IGST', 'CESS'].includes(taxType)) {
      taxType = gstValidation.normalizeTaxType(r.name);
    }
    if (!['CGST', 'SGST', 'IGST', 'CESS'].includes(taxType)) continue;
    map.set(Number(r.ledger_id), { taxType, rate: Number(r.gst_rate || r.pct || 0) });
  }
  return map;
};

module.exports = {
  STATE_CODE_MAP,
  resolveStateCode,
  EXEMPT_TAXABILITIES,
  collectRateWarnings,
  resolveTaxRate,
  GST_TAX_TYPE_LABELS,
  resolveTaxLedgerId,
  setupStandardTaxLedgers,
  resolveCompanyRegistration,
  classifyTaxLedgers,
};
