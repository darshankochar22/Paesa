const { sql, eq, and } = require('drizzle-orm');
const {
  gstRegistrations,
  ledgers,
  ledgerStatutoryDetails,
  groups,
  stockItems,
  stockGroups,
  gstHsnRates,
  gstVoucherTaxLines,
} = require('../db/schema');

const STATE_CODE_MAP = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "daman and diu": "26",
  "dadra and nagar haveli and daman and diu": "26",
  "maharashtra": "27",
  "andhra pradesh": "37",
  "karnataka": "29",
  "goa": "30",
  "lakshadweep": "31",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "andaman and nicobar islands": "35",
  "telangana": "36",
  "ladakh": "38"
};

const resolveStateCode = (stateName, gstin) => {
  if (gstin && gstin.length >= 2) {
    const code = gstin.substring(0, 2);
    if (/^\d+$/.test(code)) {
      return code;
    }
  }
  if (!stateName) return "27"; // Default to Maharashtra if nothing specified
  const nameLower = stateName.trim().toLowerCase();
  return STATE_CODE_MAP[nameLower] || "27";
};

/**
 * Walks the statutory configuration hierarchy to resolve HSN and GST rate details.
 * Hierarchy: Item -> Stock Group -> Ledger (if item not used) -> Company HSN Override
 */
const resolveTaxRate = async (db, { company_id, stock_item_id, ledger_id, hsn_code, date }) => {
  let resolved = {
    hsn_code: hsn_code || "",
    gst_rate: 0,
    cgst_rate: 0,
    sgst_rate: 0,
    igst_rate: 0,
    cess_rate: 0,
    source: "default"
  };

  // 1. Resolve by Stock Item if stock_item_id is provided
  if (stock_item_id) {
    const itemRows = await db.all(
      sql`SELECT * FROM ${stockItems}
          WHERE ${stockItems.itemId} = ${stock_item_id} AND ${stockItems.companyId} = ${company_id}`
    );
    const item = itemRows[0];
    if (item) {
      if (item.hsn_code) resolved.hsn_code = item.hsn_code;
      if (item.gst_applicable === 'Applicable' || item.gst_rate > 0) {
        resolved.gst_rate = item.gst_rate || 0;
        resolved.cgst_rate = item.cgst_rate || 0;
        resolved.sgst_rate = item.sgst_rate || 0;
        resolved.igst_rate = item.igst_rate || 0;
        resolved.source = "stock_item";
        return resolved;
      }
      
      // 2. Check Stock Group of this item
      if (item.group_id) {
        const groupRows = await db.all(
          sql`SELECT * FROM ${stockGroups}
              WHERE ${stockGroups.sgId} = ${item.group_id} AND ${stockGroups.companyId} = ${company_id}`
        );
        const group = groupRows[0];
        if (group && (group.gst_rate > 0 || group.hsn_sac_code)) {
          if (group.hsn_sac_code) resolved.hsn_code = group.hsn_sac_code;
          resolved.gst_rate = group.gst_rate || 0;
          resolved.cgst_rate = group.cgst_rate || 0;
          resolved.sgst_rate = group.sgst_rate || 0;
          resolved.igst_rate = group.igst_rate || 0;
          resolved.cess_rate = group.cess_rate || 0;
          resolved.source = "stock_group";
          return resolved;
        }
      }
    }
  }

  // 3. Check Ledger Statutory Details
  if (ledger_id) {
    const ledgerStatRows = await db.all(
      sql`SELECT * FROM ${ledgerStatutoryDetails} WHERE ${ledgerStatutoryDetails.ledgerId} = ${ledger_id}`
    );
    const stat = ledgerStatRows[0];
    if (stat && (stat.gst_rate > 0 || stat.hsn_sac_code)) {
      if (stat.hsn_sac_code) resolved.hsn_code = stat.hsn_sac_code;
      resolved.gst_rate = stat.gst_rate || 0;
      resolved.cgst_rate = stat.cgst_rate || 0;
      resolved.sgst_rate = stat.sgst_rate || 0;
      resolved.igst_rate = stat.igst_rate || 0;
      resolved.source = "ledger";
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
          ORDER BY ${gstHsnRates.effectiveFrom} DESC LIMIT 1`
    );
    const hsnRate = hsnRateRows[0];
    if (hsnRate) {
      resolved.gst_rate = hsnRate.gst_rate || 0;
      resolved.cgst_rate = hsnRate.cgst_rate || 0;
      resolved.sgst_rate = hsnRate.sgst_rate || 0;
      resolved.igst_rate = hsnRate.igst_rate || 0;
      resolved.cess_rate = hsnRate.cess_rate || 0;
      resolved.source = "company_hsn";
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
  CGST: "CGST",
  SGST: "SGST/UTGST",
  IGST: "IGST",
  CESS: "Cess",
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
        ORDER BY l.ledger_id ASC LIMIT 1`
  );
  if (configuredRows.length > 0) {
    return { id: configuredRows[0].ledger_id, name: configuredRows[0].name };
  }

  const namedRows = await db.all(
    sql`SELECT l.ledger_id, l.name FROM ${ledgers} l
        WHERE l.company_id = ${company_id} AND l.is_active = 1 AND LOWER(l.name) = LOWER(${tax_type})
        LIMIT 1`
  );
  if (namedRows.length > 0) {
    return { id: namedRows[0].ledger_id, name: namedRows[0].name };
  }

  if (!createIfMissing) return null;

  // Find the group_id for "Duties & Taxes"
  const groupRows = await db.all(
    sql`SELECT group_id FROM ${groups}
        WHERE ${groups.companyId} = ${company_id} AND ${groups.name} = 'Duties & Taxes' AND ${groups.isActive} = 1
        LIMIT 1`
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
  await db
    .insert(ledgerStatutoryDetails)
    .values({
      ledgerId: ledger_id,
      gstApplicability: 'Applicable',
      typeOfDutyTax: 'GST',
      gstTaxType: gstTaxTypeLabel,
      percentageOfCalculation: 0,
    });

  return { id: ledger_id, name };
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
    voucher_class_gst_ledgers = null
  } = payload;

  if (!company_id) {
    throw new Error("company_id is required for GST calculation");
  }

  // When a Voucher Type Class with "Use Class for GST Details" = Yes is selected, its
  // explicitly mapped ledger wins over the normal auto-resolve/auto-create lookup. No
  // class (the default) falls straight through to resolveTaxLedgerId, unchanged.
  const resolveOrOverride = async (tax_type, { createIfMissing = true } = {}) => {
    const overrideId = voucher_class_gst_ledgers?.[`${tax_type.toLowerCase()}_ledger_id`];
    if (overrideId) {
      const rows = await db.all(
        sql`SELECT ledger_id, name FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${overrideId} LIMIT 1`
      );
      if (rows.length > 0) return { id: rows[0].ledger_id, name: rows[0].name };
    }
    return resolveTaxLedgerId(db, company_id, tax_type, { createIfMissing });
  };

  // 1. Resolve Company State
  const companyGstRows = await db.all(
    sql`SELECT * FROM ${gstRegistrations}
        WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1 LIMIT 1`
  );
  const companyReg = companyGstRows[0];
  const companyState = companyReg ? companyReg.state_id : "";
  const companyGSTIN = companyReg ? companyReg.gstin : "";
  const companyStateCode = resolveStateCode(companyState, companyGSTIN);

  // 2. Resolve Party State
  let partyState = "";
  let partyGSTIN = "";
  if (party_ledger_id) {
    const partyRows = await db.all(
      sql`SELECT * FROM ${ledgers}
          WHERE ${ledgers.ledgerId} = ${party_ledger_id} AND ${ledgers.companyId} = ${company_id}`
    );
    const party = partyRows[0];
    if (party) {
      partyState = party.state || "";
      partyGSTIN = party.gstin || "";
    }
  }

  // Destination State: place_of_supply overrides party state
  const destinationState = place_of_supply || partyState || companyState || "";
  const destinationStateCode = resolveStateCode(destinationState, partyGSTIN);

  const isInterState = companyStateCode !== destinationStateCode;

  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let totalCess = 0;
  let totalAssessableValue = 0;

  const processedStockEntries = [];
  const taxLinesBreakdown = [];

  // 3. Compute tax for each stock entry
  for (const entry of stock_entries) {
    const assessable_value = (entry.quantity || 0) * (entry.rate || 0) - (entry.discount_amount || 0);
    totalAssessableValue += assessable_value;

    const rateDetails = await resolveTaxRate(db, {
      company_id,
      stock_item_id: entry.stock_item_id,
      ledger_id: entry.ledger_id,
      hsn_code: entry.hsn_code,
      date
    });

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
        cgst_amount = Number((assessable_value * ((gst_rate / 2) / 100)).toFixed(2));
        sgst_amount = Number((assessable_value * ((gst_rate / 2) / 100)).toFixed(2));
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
      assessable_value
    });

    if (gst_rate > 0 || rateDetails.cess_rate > 0) {
      taxLinesBreakdown.push({
        hsn_code: rateDetails.hsn_code,
        assessable_value,
        gst_rate,
        cgst_amount,
        sgst_amount,
        igst_amount,
        cess_amount
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
    ["CGST", "SGST", "IGST"].map(t => resolveOrOverride(t, { createIfMissing: false })).concat([resolveTaxLedgerId(db, company_id, "CESS")])
  );
  const existingTaxLedgerIds = existingTaxLedgers.filter(Boolean).map(l => Number(l.id));
  const finalEntries = entries.filter(e => !existingTaxLedgerIds.includes(Number(e.ledger_id)));

  // Inject CGST, SGST, IGST lines
  if (!isInterState) {
    if (totalCGST > 0) {
      const cgstLedger = await resolveOrOverride("CGST");
      finalEntries.push({
        ledger_id: cgstLedger.id,
        ledger_name: cgstLedger.name,
        type: taxEntryType,
        amount: totalCGST,
        amount_forex: totalCGST,
        currency: "INR"
      });
    }
    if (totalSGST > 0) {
      const sgstLedger = await resolveOrOverride("SGST");
      finalEntries.push({
        ledger_id: sgstLedger.id,
        ledger_name: sgstLedger.name,
        type: taxEntryType,
        amount: totalSGST,
        amount_forex: totalSGST,
        currency: "INR"
      });
    }
  } else {
    if (totalIGST > 0) {
      const igstLedger = await resolveOrOverride("IGST");
      finalEntries.push({
        ledger_id: igstLedger.id,
        ledger_name: igstLedger.name,
        type: taxEntryType,
        amount: totalIGST,
        amount_forex: totalIGST,
        currency: "INR"
      });
    }
  }

  if (totalCess > 0) {
    const cessLedger = await resolveTaxLedgerId(db, company_id, "CESS", { createIfMissing: true });
    finalEntries.push({
      ledger_id: cessLedger.id,
      ledger_name: cessLedger.name,
      type: taxEntryType,
      amount: totalCess,
      amount_forex: totalCess,
      currency: "INR"
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
      ledger_name: "Party A/c",
      type: partyEntryType,
      amount: Number(balanceDiff.toFixed(2)),
      amount_forex: Number(balanceDiff.toFixed(2)),
      currency: "INR"
    });
  }

  return {
    is_inter_state: isInterState ? 1 : 0,
    party_gstin: partyGSTIN,
    party_state: partyState,
    total_cgst: totalCGST,
    total_sgst: totalSGST,
    total_igst: totalIGST,
    total_cess: totalCess,
    stock_entries: processedStockEntries,
    entries: finalEntries,
    taxLinesBreakdown
  };
};

/**
 * Savescomputed tax audit lines to the database for a voucher.
 */
const saveVoucherTaxLines = async (db, voucher_id, computedTax) => {
  // First clean out existing lines for this voucher
  await db.delete(gstVoucherTaxLines).where(eq(gstVoucherTaxLines.voucherId, voucher_id));

  const { is_inter_state, party_gstin, party_state, stock_entries = [] } = computedTax;

  for (const entry of stock_entries) {
    // Save line for CGST/SGST or IGST if tax is applicable
    if (entry.gst_rate > 0) {
      if (is_inter_state) {
        await db.insert(gstVoucherTaxLines).values({
          voucherId: voucher_id,
          hsnCode: entry.hsn_code || "",
          description: entry.item_name || "",
          quantity: entry.quantity || 0,
          unit: "",
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
          hsnCode: entry.hsn_code || "",
          description: entry.item_name || "",
          quantity: entry.quantity || 0,
          unit: "",
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
          hsnCode: entry.hsn_code || "",
          description: entry.item_name || "",
          quantity: entry.quantity || 0,
          unit: "",
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
        hsnCode: entry.hsn_code || "",
        description: entry.item_name || "",
        quantity: entry.quantity || 0,
        unit: "",
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
  computeVoucherTaxLines,
  saveVoucherTaxLines
};
