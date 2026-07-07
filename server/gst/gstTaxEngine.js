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
  if (!stateName) return '27'; // Default to Maharashtra if nothing specified
  const nameLower = stateName.trim().toLowerCase();
  return STATE_CODE_MAP[nameLower] || '27';
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

/**
 * MANUAL GST model (the default voucher flow). Unlike computeVoucherTaxLines it
 * NEVER adds, removes, or substitutes tax ledgers — it keeps exactly the ledgers the
 * user selected, VALIDATES them at save, computes each selected tax ledger's amount
 * PER ITEM (bug 7), and snapshots the registration/state/interstate flag.
 *
 * Returns { errors, warnings, entries, stock_entries, manualTaxLines, is_inter_state,
 *           gst_registration_id, company_state, company_registration_type,
 *           party_gstin, party_state }.
 * On validation failure `errors` is non-empty and entries are returned unchanged.
 */
const validateAndComputeVoucherGst = async (db, payload) => {
  const {
    company_id,
    date,
    party_ledger_id,
    place_of_supply,
    voucher_type,
    entries = [],
    stock_entries = [],
    gst_snapshot = null,
    gst_registration_id = null,
  } = payload;

  if (!company_id) throw new Error('company_id is required for GST validation');

  // 1. Company registration + state.
  const companyReg = await resolveCompanyRegistration(db, company_id, {
    gst_snapshot,
    gst_registration_id,
  });
  const gstRegistrationId = companyReg ? companyReg.gst_id : null;
  const companyRegistrationType = companyReg ? companyReg.registration_type : null;
  const companyState = companyReg ? companyReg.state_id : '';
  const companyGSTIN = companyReg ? companyReg.gstin : '';
  const companyStateCode = resolveStateCode(companyState, companyGSTIN);

  // 2. Party state + interstate (frozen from the snapshot on the edit path).
  let partyState = '';
  let partyGSTIN = '';
  if (party_ledger_id) {
    const partyRows = await db.all(
      sql`SELECT state, gstin FROM ${ledgers}
          WHERE ${ledgers.ledgerId} = ${party_ledger_id} AND ${ledgers.companyId} = ${company_id} LIMIT 1`,
    );
    if (partyRows[0]) {
      partyState = partyRows[0].state || '';
      partyGSTIN = partyRows[0].gstin || '';
    }
  }
  const destinationState = place_of_supply || partyState || companyState || '';
  const destinationStateCode = resolveStateCode(destinationState, partyGSTIN);
  // Interstate is derived LIVE from the (registration-frozen) company state vs the current
  // destination state — NOT frozen as a boolean. The pinned registration already keeps the
  // company side stable when the company's default registration changes, while re-deriving
  // here means editing the voucher's party or place-of-supply to another state correctly
  // flips the CGST/SGST-vs-IGST split (the old frozen-boolean kept the wrong split).
  const isInterState = companyStateCode !== destinationStateCode;

  // 3. Per-item assessable value + rate + taxability.
  const items = [];
  const processedStockEntries = [];
  const rateWarnings = [];
  for (const entry of stock_entries) {
    const assessable_value =
      (entry.quantity || 0) * (entry.rate || 0) - (entry.discount_amount || 0);
    const rateDetails = await resolveTaxRate(db, {
      company_id,
      stock_item_id: entry.stock_item_id,
      ledger_id: entry.ledger_id,
      hsn_code: entry.hsn_code,
      date,
    });
    collectRateWarnings(rateWarnings, entry, rateDetails, assessable_value);
    items.push({
      assessable_value,
      gst_rate: rateDetails.gst_rate,
      cess_rate: rateDetails.cess_rate,
      taxability: rateDetails.taxability,
    });
    processedStockEntries.push({
      ...entry,
      hsn_code: rateDetails.hsn_code,
      gst_rate: rateDetails.gst_rate,
      assessable_value,
    });
  }

  // 4. Classify the user's manually-selected tax ledgers.
  const taxMap = await classifyTaxLedgers(db, company_id, entries);
  const taxLines = entries
    .filter((e) => taxMap.has(Number(e.ledger_id)))
    .map((e) => ({
      tax_type: taxMap.get(Number(e.ledger_id)).taxType,
      rate: taxMap.get(Number(e.ledger_id)).rate,
    }));

  // 5. Validate at save (bugs 3/4/8). Return early on the first blocking error.
  const errors = [];
  errors.push(...gstValidation.validateExemptItems({ items, taxLines }).errors);
  const combo = gstValidation.validateGstLedgers({
    isInterstate: isInterState,
    registrationType: companyRegistrationType,
    taxLines,
  });
  errors.push(...combo.errors);
  if (errors.length > 0) {
    return {
      errors,
      warnings: [...combo.warnings, ...rateWarnings],
      entries,
      stock_entries: processedStockEntries,
    };
  }

  // 6. Compute each selected tax ledger's amount PER ITEM, then sum (bug 7) — never a
  //    single flat rate on the combined subtotal.
  const componentRate = (taxType, it) => {
    if (taxType === 'CGST' || taxType === 'SGST') return (it.gst_rate || 0) / 2;
    if (taxType === 'IGST') return it.gst_rate || 0;
    if (taxType === 'CESS') return it.cess_rate || 0;
    return 0;
  };
  const manualTaxLines = [];
  let totalTaxableAssessable = 0;
  items.forEach((it) => {
    if (gstValidation.isItemTaxable(it)) totalTaxableAssessable += it.assessable_value;
  });

  const finalEntries = entries.map((e) => {
    const cls = taxMap.get(Number(e.ledger_id));
    if (!cls) return e;
    let amount = 0;
    for (const it of items) amount += it.assessable_value * (componentRate(cls.taxType, it) / 100);
    amount = Number(amount.toFixed(2));
    manualTaxLines.push({
      taxType: cls.taxType,
      rate: cls.rate,
      amount,
      assessableValue: Number(totalTaxableAssessable.toFixed(2)),
    });
    return { ...e, amount, amount_forex: amount };
  });

  // 7. Rebalance the party ledger so the voucher stays double-entry balanced after the
  //    tax amounts were (re)computed. No ledger is added/removed/substituted.
  // Party side by voucher type: Purchase → Cr (supplier owed); everything else,
  // including Debit Note (a purchase return DEBITS the supplier), keeps the party on
  // Dr — matching the entries the client builds. Grouping Debit Note with Purchase
  // here wrongly flipped the party to Cr, producing an all-Cr, unbalanced voucher.
  const isPurchase = voucher_type === 'Purchase';
  const partyEntryType = isPurchase ? 'Cr' : 'Dr';
  let totalDr = 0;
  let totalCr = 0;
  let partyIdx = -1;
  finalEntries.forEach((e, idx) => {
    if (Number(e.ledger_id) === Number(party_ledger_id)) {
      partyIdx = idx;
    } else if (e.type === 'Dr') totalDr += Number(e.amount) || 0;
    else totalCr += Number(e.amount) || 0;
  });
  if (partyIdx !== -1) {
    const bal = Number(Math.abs(totalDr - totalCr).toFixed(2));
    finalEntries[partyIdx] = {
      ...finalEntries[partyIdx],
      amount: bal,
      amount_forex: bal,
      type: partyEntryType,
    };
  }

  return {
    errors: [],
    warnings: [...combo.warnings, ...rateWarnings],
    is_inter_state: isInterState ? 1 : 0,
    gst_registration_id: gstRegistrationId,
    company_state: companyState,
    company_registration_type: companyRegistrationType,
    party_gstin: partyGSTIN,
    party_state: partyState,
    entries: finalEntries,
    stock_entries: processedStockEntries,
    manualTaxLines,
  };
};

/**
 * Invariant guard — a single voucher's GST tax lines must be IGST-side XOR CGST/SGST-side,
 * never both: a supply is either inter-state (IGST) or intra-state (CGST + SGST). This is
 * the last line of defence behind gstValidation.validateGstLedgers — it makes the STORED
 * data physically incapable of holding a mixed voucher, whatever code path calls the save.
 * Throws on violation so the enclosing transaction rolls back.
 */
const assertGstSidesExclusive = (lines = [], voucher_id) => {
  const typeOf = (l) => l.taxType || l.tax_type;
  const nonZero = (l) => Number(l.amount) !== 0;
  const hasIgst = lines.some((l) => typeOf(l) === 'IGST' && nonZero(l));
  const hasIntra = lines.some((l) => (typeOf(l) === 'CGST' || typeOf(l) === 'SGST') && nonZero(l));
  if (hasIgst && hasIntra) {
    throw new Error(
      `GST integrity violation on voucher ${voucher_id ?? '?'}: a voucher cannot carry both IGST and CGST/SGST — inter-state supplies use IGST, intra-state use CGST + SGST, never both.`,
    );
  }
};

/**
 * Persists gst_voucher_tax_lines for the MANUAL flow — one row per user-selected tax
 * ledger, from validateAndComputeVoucherGst().manualTaxLines. If the user added no tax
 * ledgers, nothing is written (bug 1).
 */
const saveManualVoucherTaxLines = async (db, voucher_id, result) => {
  await db.delete(gstVoucherTaxLines).where(eq(gstVoucherTaxLines.voucherId, voucher_id));
  const { is_inter_state, party_gstin, party_state, manualTaxLines = [] } = result;
  assertGstSidesExclusive(manualTaxLines, voucher_id);
  for (const line of manualTaxLines) {
    await db.insert(gstVoucherTaxLines).values({
      voucherId: voucher_id,
      assessableValue: line.assessableValue || 0,
      taxType: line.taxType,
      rate: line.rate || 0,
      amount: line.amount || 0,
      isInterState: is_inter_state || 0,
      partyGstin: party_gstin || '',
      partyState: party_state || '',
    });
  }
};

/**
 * Computes GST tax lines for a voucher payload.
 */
const computeVoucherTaxLines = async (db, payload) => {
  const {
    company_id,
    date,
    party_ledger_id,
    place_of_supply,
    stock_entries = [],
    entries = [],
    voucher_type,
    voucher_class_gst_ledgers = null,
    // Edit path: the voucher's OWN saved GST snapshot. When present it FREEZES the
    // registration/company-state/interstate flag so re-saving never re-derives them
    // from the company's (possibly changed) current default. Absent = fresh create.
    gst_snapshot = null,
  } = payload;

  if (!company_id) {
    throw new Error('company_id is required for GST calculation');
  }

  // When a Voucher Type Class with "Use Class for GST Details" = Yes is selected, its
  // explicitly mapped ledger wins over the normal auto-resolve/auto-create lookup. No
  // class (the default) falls straight through to resolveTaxLedgerId, unchanged.
  const resolveOrOverride = async (tax_type, { createIfMissing = true } = {}) => {
    const overrideId = voucher_class_gst_ledgers?.[`${tax_type.toLowerCase()}_ledger_id`];
    if (overrideId) {
      const rows = await db.all(
        sql`SELECT ledger_id, name FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${overrideId} LIMIT 1`,
      );
      if (rows.length > 0) return { id: rows[0].ledger_id, name: rows[0].name };
    }
    return resolveTaxLedgerId(db, company_id, tax_type, { createIfMissing });
  };

  // 1. Resolve the company's GST registration, in priority order:
  //    (a) edit path — the voucher's own snapshotted registration (frozen);
  //    (b) create path — the company's current default registration;
  //    (c) fallback — the first active registration (legacy behavior).
  let companyReg = null;
  const pinnedRegId = gst_snapshot && gst_snapshot.gst_registration_id;
  if (pinnedRegId) {
    const rows = await db.all(
      sql`SELECT * FROM ${gstRegistrations} WHERE ${gstRegistrations.gstId} = ${pinnedRegId} LIMIT 1`,
    );
    companyReg = rows[0] || null;
  }
  if (!companyReg) {
    const companyRows = await db.all(
      sql`SELECT current_default_gst_registration_id AS def_id FROM ${companies}
          WHERE ${companies.companyId} = ${company_id} LIMIT 1`,
    );
    const defaultRegId = companyRows[0] && companyRows[0].def_id;
    if (defaultRegId) {
      const rows = await db.all(
        sql`SELECT * FROM ${gstRegistrations}
            WHERE ${gstRegistrations.gstId} = ${defaultRegId}
              AND ${gstRegistrations.companyId} = ${company_id}
              AND ${gstRegistrations.isActive} = 1 LIMIT 1`,
      );
      companyReg = rows[0] || null;
    }
  }
  if (!companyReg) {
    const rows = await db.all(
      sql`SELECT * FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1 LIMIT 1`,
    );
    companyReg = rows[0] || null;
  }
  const gstRegistrationId = companyReg ? companyReg.gst_id : null;
  const companyRegistrationType = companyReg ? companyReg.registration_type : null;
  const companyState = companyReg ? companyReg.state_id : '';
  const companyGSTIN = companyReg ? companyReg.gstin : '';
  const companyStateCode = resolveStateCode(companyState, companyGSTIN);

  // 2. Resolve Party State
  let partyState = '';
  let partyGSTIN = '';
  if (party_ledger_id) {
    const partyRows = await db.all(
      sql`SELECT * FROM ${ledgers}
          WHERE ${ledgers.ledgerId} = ${party_ledger_id} AND ${ledgers.companyId} = ${company_id}`,
    );
    const party = partyRows[0];
    if (party) {
      partyState = party.state || '';
      partyGSTIN = party.gstin || '';
    }
  }

  // Destination State: place_of_supply overrides party state
  const destinationState = place_of_supply || partyState || companyState || '';
  const destinationStateCode = resolveStateCode(destinationState, partyGSTIN);

  // Interstate is derived LIVE from the (registration-frozen) company state vs the current
  // destination state. The pinned registration snapshot already keeps the company side
  // stable when the company's default registration changes; re-deriving here means editing
  // the voucher's party or place-of-supply to another state correctly flips the
  // CGST/SGST-vs-IGST split. (Previously the boolean itself was frozen, so a party change on
  // an edit silently kept the wrong split.)
  const isInterState = companyStateCode !== destinationStateCode;

  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalCess = 0;
  let totalAssessableValue = 0;

  const processedStockEntries = [];
  const taxLinesBreakdown = [];
  const rateWarnings = [];

  // 3. Compute tax for each stock entry
  for (const entry of stock_entries) {
    const assessable_value =
      (entry.quantity || 0) * (entry.rate || 0) - (entry.discount_amount || 0);
    totalAssessableValue += assessable_value;

    const rateDetails = await resolveTaxRate(db, {
      company_id,
      stock_item_id: entry.stock_item_id,
      ledger_id: entry.ledger_id,
      hsn_code: entry.hsn_code,
      date,
    });
    collectRateWarnings(rateWarnings, entry, rateDetails, assessable_value);

    let cgst_amount = 0;
    let sgst_amount = 0;
    let igst_amount = 0;
    let cess_amount = 0;

    const gst_rate = rateDetails.gst_rate;
    if (gst_rate > 0) {
      if (isInterState) {
        igst_amount = Number((assessable_value * (gst_rate / 100)).toFixed(2));
        totalIGST += igst_amount;
      } else {
        cgst_amount = Number((assessable_value * (gst_rate / 2 / 100)).toFixed(2));
        sgst_amount = Number((assessable_value * (gst_rate / 2 / 100)).toFixed(2));
        totalCGST += cgst_amount;
        totalSGST += sgst_amount;
      }
    }

    if (rateDetails.cess_rate > 0) {
      cess_amount = Number((assessable_value * (rateDetails.cess_rate / 100)).toFixed(2));
      totalCess += cess_amount;
    }

    processedStockEntries.push({
      ...entry,
      hsn_code: rateDetails.hsn_code,
      gst_rate: gst_rate,
      cgst_amount,
      sgst_amount,
      igst_amount,
      cess_amount,
      assessable_value,
    });

    if (gst_rate > 0 || rateDetails.cess_rate > 0) {
      taxLinesBreakdown.push({
        hsn_code: rateDetails.hsn_code,
        assessable_value,
        gst_rate,
        cgst_amount,
        sgst_amount,
        igst_amount,
        cess_amount,
      });
    }
  }

  // 4. Generate updated accounting entries (double-entry injection)
  // Determine if it is a debit or credit tax post
  const isPurchase = voucher_type === 'Purchase' || voucher_type === 'Debit Note';
  const taxEntryType = isPurchase ? 'Dr' : 'Cr';
  const partyEntryType = isPurchase ? 'Cr' : 'Dr';

  // Strip prior tax postings by resolved ledger id (not fragile name matching) so
  // re-saving/altering a voucher doesn't duplicate or orphan tax entries. Uses the same
  // override-aware resolution so a class-mapped ledger from a prior save is stripped too.
  const existingTaxLedgers = await Promise.all(
    ['CGST', 'SGST', 'IGST', 'CESS'].map((t) => resolveOrOverride(t, { createIfMissing: false })),
  );
  const existingTaxLedgerIds = existingTaxLedgers.filter(Boolean).map((l) => Number(l.id));
  const finalEntries = entries.filter((e) => !existingTaxLedgerIds.includes(Number(e.ledger_id)));

  // Inject CGST, SGST, IGST lines
  if (!isInterState) {
    if (totalCGST > 0) {
      const cgstLedger = await resolveOrOverride('CGST');
      finalEntries.push({
        ledger_id: cgstLedger.id,
        ledger_name: cgstLedger.name,
        type: taxEntryType,
        amount: totalCGST,
        amount_forex: totalCGST,
        currency: 'INR',
      });
    }
    if (totalSGST > 0) {
      const sgstLedger = await resolveOrOverride('SGST');
      finalEntries.push({
        ledger_id: sgstLedger.id,
        ledger_name: sgstLedger.name,
        type: taxEntryType,
        amount: totalSGST,
        amount_forex: totalSGST,
        currency: 'INR',
      });
    }
  } else {
    if (totalIGST > 0) {
      const igstLedger = await resolveOrOverride('IGST');
      finalEntries.push({
        ledger_id: igstLedger.id,
        ledger_name: igstLedger.name,
        type: taxEntryType,
        amount: totalIGST,
        amount_forex: totalIGST,
        currency: 'INR',
      });
    }
  }

  if (totalCess > 0) {
    const cessLedger = await resolveOrOverride('CESS');
    finalEntries.push({
      ledger_id: cessLedger.id,
      ledger_name: cessLedger.name,
      type: taxEntryType,
      amount: totalCess,
      amount_forex: totalCess,
      currency: 'INR',
    });
  }

  // Balance the Party Ledger (Sundry Debtor / Sundry Creditor)
  // Sum Dr and Cr of non-party entries
  let totalDr = 0;
  let totalCr = 0;
  let partyEntryIndex = -1;

  finalEntries.forEach((e, idx) => {
    if (Number(e.ledger_id) === Number(party_ledger_id)) {
      partyEntryIndex = idx;
    } else {
      if (e.type === 'Dr') totalDr += e.amount;
      else totalCr += e.amount;
    }
  });

  const balanceDiff = Math.abs(totalDr - totalCr);

  if (partyEntryIndex !== -1) {
    // Update the party ledger entry with the balanced grand total
    finalEntries[partyEntryIndex].amount = Number(balanceDiff.toFixed(2));
    finalEntries[partyEntryIndex].amount_forex = Number(balanceDiff.toFixed(2));
    finalEntries[partyEntryIndex].type = partyEntryType;
  } else if (party_ledger_id) {
    // Add the party entry if missing
    finalEntries.unshift({
      ledger_id: party_ledger_id,
      ledger_name: 'Party A/c',
      type: partyEntryType,
      amount: Number(balanceDiff.toFixed(2)),
      amount_forex: Number(balanceDiff.toFixed(2)),
      currency: 'INR',
    });
  }

  return {
    is_inter_state: isInterState ? 1 : 0,
    warnings: rateWarnings,
    // Header GST snapshot to persist on the voucher (immutable after first save).
    gst_registration_id: gstRegistrationId,
    company_state: companyState,
    company_registration_type: companyRegistrationType,
    party_gstin: partyGSTIN,
    party_state: partyState,
    total_cgst: totalCGST,
    total_sgst: totalSGST,
    total_igst: totalIGST,
    total_cess: totalCess,
    stock_entries: processedStockEntries,
    entries: finalEntries,
    taxLinesBreakdown,
  };
};

/**
 * Savescomputed tax audit lines to the database for a voucher.
 */
const saveVoucherTaxLines = async (db, voucher_id, computedTax) => {
  // First clean out existing lines for this voucher
  await db.delete(gstVoucherTaxLines).where(eq(gstVoucherTaxLines.voucherId, voucher_id));

  const { is_inter_state, party_gstin, party_state, stock_entries = [] } = computedTax;

  // Same IGST-⊕-CGST/SGST guarantee for the auto flow (structurally single-side, but
  // asserted so no future change to computeVoucherTaxLines can silently store a mix).
  assertGstSidesExclusive(
    stock_entries.flatMap((e) => [
      { tax_type: 'IGST', amount: e.igst_amount || 0 },
      { tax_type: 'CGST', amount: e.cgst_amount || 0 },
      { tax_type: 'SGST', amount: e.sgst_amount || 0 },
    ]),
    voucher_id,
  );

  for (const entry of stock_entries) {
    // Save line for CGST/SGST or IGST if tax is applicable
    if (entry.gst_rate > 0) {
      if (is_inter_state) {
        await db.insert(gstVoucherTaxLines).values({
          voucherId: voucher_id,
          hsnCode: entry.hsn_code || '',
          description: entry.item_name || '',
          quantity: entry.quantity || 0,
          unit: '',
          assessableValue: entry.assessable_value || 0,
          taxType: 'IGST',
          rate: entry.gst_rate,
          amount: entry.igst_amount || 0,
          isInterState: is_inter_state,
          partyGstin: party_gstin,
          partyState: party_state,
        });
      } else {
        // CGST
        await db.insert(gstVoucherTaxLines).values({
          voucherId: voucher_id,
          hsnCode: entry.hsn_code || '',
          description: entry.item_name || '',
          quantity: entry.quantity || 0,
          unit: '',
          assessableValue: entry.assessable_value || 0,
          taxType: 'CGST',
          rate: entry.gst_rate / 2,
          amount: entry.cgst_amount || 0,
          isInterState: is_inter_state,
          partyGstin: party_gstin,
          partyState: party_state,
        });
        // SGST
        await db.insert(gstVoucherTaxLines).values({
          voucherId: voucher_id,
          hsnCode: entry.hsn_code || '',
          description: entry.item_name || '',
          quantity: entry.quantity || 0,
          unit: '',
          assessableValue: entry.assessable_value || 0,
          taxType: 'SGST',
          rate: entry.gst_rate / 2,
          amount: entry.sgst_amount || 0,
          isInterState: is_inter_state,
          partyGstin: party_gstin,
          partyState: party_state,
        });
      }
    }

    if (entry.cess_amount > 0) {
      await db.insert(gstVoucherTaxLines).values({
        voucherId: voucher_id,
        hsnCode: entry.hsn_code || '',
        description: entry.item_name || '',
        quantity: entry.quantity || 0,
        unit: '',
        assessableValue: entry.assessable_value || 0,
        taxType: 'CESS',
        rate: 0,
        amount: entry.cess_amount || 0,
        isInterState: is_inter_state,
        partyGstin: party_gstin,
        partyState: party_state,
      });
    }
  }
};

module.exports = {
  STATE_CODE_MAP,
  resolveStateCode,
  resolveTaxRate,
  resolveTaxLedgerId,
  setupStandardTaxLedgers,
  resolveCompanyRegistration,
  classifyTaxLedgers,
  validateAndComputeVoucherGst,
  saveManualVoucherTaxLines,
  computeVoucherTaxLines,
  saveVoucherTaxLines,
  assertGstSidesExclusive,
};
