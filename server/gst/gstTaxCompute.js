// GST voucher tax computation — the MANUAL model (validateAndComputeVoucherGst +
// saveManualVoucherTaxLines) and the AUTO model (computeVoucherTaxLines +
// saveVoucherTaxLines), plus supply-type resolution and the sides-exclusive
// guard. Resolution helpers come from gstTaxCore.js; consumers keep requiring
// gstTaxEngine.js (barrel).

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
const {
  resolveStateCode,
  resolveTaxRate,
  collectRateWarnings,
  resolveTaxLedgerId,
  resolveCompanyRegistration,
  classifyTaxLedgers,
} = require('./gstTaxCore');

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
  // Unknown destination → treat as local (company's own state), never a phantom Maharashtra.
  const destinationStateCode = resolveStateCode(destinationState, partyGSTIN) || companyStateCode;
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

// A blank/India country means a domestic supply; anything else on the party is an export.
const isIndiaCountry = (c) => {
  const s = String(c || '')
    .trim()
    .toLowerCase();
  return s === '' || s === 'india' || s === 'in' || s === 'bharat';
};

/**
 * Resolve a voucher's export/SEZ supply nature (Tally-style), from the party's country +
 * GST registration type and the company's LUT setting. Returns EXPWP|EXPWOP|SEZWP|SEZWOP,
 * or null for a domestic (B2B/B2C) supply.
 *   - SEZ party      -> SEZWOP (under LUT/Bond) | SEZWP (with payment of tax)
 *   - Overseas party -> EXPWOP (under LUT/Bond) | EXPWP (with payment of tax)
 * WOP (LUT/Bond) is zero-rated (no IGST); WP charges IGST (refund route). Both are always
 * treated as inter-state.
 */
const resolveSupplyType = ({ partyCountry, partyRegType, exportsUnderLut } = {}) => {
  const lut = exportsUnderLut == null ? true : !!Number(exportsUnderLut);
  const isSez = String(partyRegType || '')
    .toLowerCase()
    .includes('sez');
  const isOverseas = !isIndiaCountry(partyCountry);
  if (isSez) return lut ? 'SEZWOP' : 'SEZWP';
  if (isOverseas) return lut ? 'EXPWOP' : 'EXPWP';
  return null;
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
  let partyCountry = '';
  let partyRegType = '';
  if (party_ledger_id) {
    const partyRows = await db.all(
      sql`SELECT * FROM ${ledgers}
          WHERE ${ledgers.ledgerId} = ${party_ledger_id} AND ${ledgers.companyId} = ${company_id}`,
    );
    const party = partyRows[0];
    if (party) {
      partyState = party.state || '';
      partyGSTIN = party.gstin || '';
      partyCountry = party.country || '';
      partyRegType = party.registration_type || '';
    }
  }

  // Export/SEZ supply nature (Tally-style) from the party + the company's LUT setting.
  let exportsUnderLut = 1;
  try {
    const gstCfg = await db.all(
      sql`SELECT exports_under_lut FROM company_gst_details WHERE company_id = ${company_id}`,
    );
    if (gstCfg[0] && gstCfg[0].exports_under_lut != null)
      exportsUnderLut = gstCfg[0].exports_under_lut;
  } catch (_) {
    /* default to LUT (zero-rated) */
  }
  const supplyType = resolveSupplyType({ partyCountry, partyRegType, exportsUnderLut });
  const isExportSupply = !!supplyType;
  const isZeroRated = isExportSupply && supplyType.endsWith('WOP');

  // Destination State: place_of_supply overrides party state
  const destinationState = place_of_supply || partyState || companyState || '';
  // Unknown destination → treat as local (company's own state), never a phantom Maharashtra.
  const destinationStateCode = resolveStateCode(destinationState, partyGSTIN) || companyStateCode;

  // Interstate is derived LIVE from the (registration-frozen) company state vs the current
  // destination state. The pinned registration snapshot already keeps the company side
  // stable when the company's default registration changes; re-deriving here means editing
  // the voucher's party or place-of-supply to another state correctly flips the
  // CGST/SGST-vs-IGST split. (Previously the boolean itself was frozen, so a party change on
  // an edit silently kept the wrong split.)
  const isInterState = companyStateCode !== destinationStateCode;
  // Export & SEZ supplies are always inter-state (IGST) when taxed; under LUT they're
  // zero-rated (no tax at all). A domestic supply uses the live state-vs-state split.
  const effectiveInterState = isExportSupply ? true : isInterState;

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
    // Zero-rated (export/SEZ under LUT): the supply keeps its rate for reporting but carries
    // no tax amount. Otherwise split IGST vs CGST/SGST by the effective inter-state flag.
    if (gst_rate > 0 && !isZeroRated) {
      if (effectiveInterState) {
        igst_amount = Number((assessable_value * (gst_rate / 100)).toFixed(2));
        totalIGST += igst_amount;
      } else {
        cgst_amount = Number((assessable_value * (gst_rate / 2 / 100)).toFixed(2));
        sgst_amount = Number((assessable_value * (gst_rate / 2 / 100)).toFixed(2));
        totalCGST += cgst_amount;
        totalSGST += sgst_amount;
      }
    }

    if (rateDetails.cess_rate > 0 && !isZeroRated) {
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

  // 4. Generate updated accounting entries (double-entry injection).
  // Only a Purchase posts input tax Dr / party Cr. A Debit Note is a PURCHASE RETURN — it
  // DEBITS the supplier (party Dr) and reverses the input tax (Cr), the mirror of a purchase —
  // so it must NOT be grouped with Purchase here. (The manual flow already treats it this way;
  // grouping Debit Note with Purchase produced an all-Cr, unbalanced voucher.)
  const isPurchase = voucher_type === 'Purchase';
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

  // Inject CGST, SGST, IGST lines. Use effectiveInterState (not the raw state-vs-state
  // isInterState) so it matches how the AMOUNTS were split above — otherwise an SEZ/export
  // supply WITH payment of tax whose party sits in the company's own state computes IGST but
  // injects no IGST posting, leaving the voucher unbalanced.
  if (!effectiveInterState) {
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
    is_inter_state: effectiveInterState ? 1 : 0,
    warnings: rateWarnings,
    // Header GST snapshot to persist on the voucher (immutable after first save).
    gst_registration_id: gstRegistrationId,
    company_state: companyState,
    company_registration_type: companyRegistrationType,
    party_gstin: partyGSTIN,
    party_state: partyState,
    supply_type: supplyType || null,
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
  validateAndComputeVoucherGst,
  saveManualVoucherTaxLines,
  computeVoucherTaxLines,
  saveVoucherTaxLines,
  assertGstSidesExclusive,
  resolveSupplyType,
  isIndiaCountry,
};
