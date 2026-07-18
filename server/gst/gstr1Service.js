const { db } = require('../db/index');
const { sql, eq, and, asc, desc } = require('drizzle-orm');
const {
  companies,
  gstRegistrations,
  vouchers,
  ledgers,
  voucherStockEntries,
  voucherEntries,
  gstVoucherTaxLines,
  gstClassifications,
  gstr1Exports,
} = require('../db/schema');
const { resolveStateCode, resolveTaxRate, computeVoucherTaxLines } = require('./gstTaxEngine');
// Shared, party-group-aware direction logic — the SAME helpers the classifier/drill uses, so the
// filed payload and the on-screen "Included" count agree. A Credit Note against a supplier
// (purchase return) is inward and must NOT file outward; a Debit Note against a customer is outward.
const { isOutwardVoucher, isNote } = require('./reconciliation/direction');
const { buildDocIssue } = require('./docIssue');

// Inter-state B2C invoices at or above this value are reported invoice-wise (B2CL/CDNUR),
// smaller ones net into B2CS. Notification 12/2024-Central Tax (Rule 59(4)) cut this from
// ₹2.5 lakh to ₹1 lakh w.e.f. 1 Aug 2024.
const B2CL_THRESHOLD = 100000;

const formatGSTDate = (dateStr) => {
  if (!dateStr) return '';
  // DB date is usually YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  }
  return dateStr;
};

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;
  return gstinRegex.test(gstin);
};

// A GSTR-1 HSN summary is mandatory and GSTN rejects blank/malformed HSN/SAC. A valid code
// is 4, 6, or 8 digits (SAC is 6). Returns null when acceptable, else a reason string.
const validateHsn = (hsn) => {
  if (!hsn || String(hsn).trim() === '' || hsn === 'OTH') return 'missing HSN/SAC code';
  if (!/^\d{4}$|^\d{6}$|^\d{8}$/.test(String(hsn).trim())) return `malformed HSN/SAC "${hsn}"`;
  return null;
};

// Maps an item's taxability to the GSTR-1 nil/exempt/non-GST bucket (table 8). Returns
// 'nil' | 'exempt' | 'nongst' for a NON-taxed supply, or null when it is a normal taxable
// supply (or the taxability is unconfigured — that is surfaced as an error elsewhere).
const classifyTaxability = (taxability) => {
  const s = String(taxability || '').toLowerCase();
  if (s.includes('non')) return 'nongst';
  if (s.includes('exempt')) return 'exempt';
  if (s.includes('nil')) return 'nil';
  return null;
};

// Export supplies are flagged by an explicit "Export" place of supply.
const isExportPos = (placeOfSupply) => /export/i.test(String(placeOfSupply || ''));

const generateGSTR1 = async (company_id, fy_id, return_period, gst_registration_id = null) => {
  try {
    const month = return_period.substring(0, 2);
    const year = return_period.substring(2, 6);

    const startDate = `${year}-${month}-01`;
    const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1;
    const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year);
    const nextMonthStr = String(nextMonth).padStart(2, '0');
    const endDate = `${nextYear}-${nextMonthStr}-01`;

    // 1. Fetch Company details and active GST registration
    const companyRows = await db.all(
      sql`SELECT * FROM ${companies} WHERE ${companies.companyId} = ${company_id}`,
    );
    const company = companyRows[0];
    if (!company) return { success: false, error: 'Company not found' };

    // Active registrations (ordered). When a specific registration is requested
    // (drill-down from Track GST Return Activities), compute the return for THAT
    // registration and use its GSTIN; otherwise fall back to the first active one.
    const activeRegs = await db.all(
      sql`SELECT gst_id, gstin, state_id FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id}
            AND ${gstRegistrations.isActive} = 1
          ORDER BY gst_id ASC`,
    );
    const primaryId = activeRegs[0] ? Number(activeRegs[0].gst_id) : null;
    const companyReg =
      gst_registration_id != null
        ? activeRegs.find((r) => Number(r.gst_id) === Number(gst_registration_id))
        : activeRegs[0];
    const companyGSTIN = companyReg ? companyReg.gstin : '';
    const companyState = companyReg ? companyReg.state_id : '';
    const companyStateCode = resolveStateCode(companyState, companyGSTIN);

    // The primary (first active) registration also owns legacy vouchers whose
    // gst_registration_id is NULL; a secondary registration matches its id exactly.
    let regFilter = sql``;
    if (gst_registration_id != null) {
      regFilter =
        Number(gst_registration_id) === primaryId
          ? sql`AND (v.gst_registration_id = ${gst_registration_id} OR v.gst_registration_id IS NULL)`
          : sql`AND v.gst_registration_id = ${gst_registration_id}`;
    }

    // 2. Fetch all vouchers in the date range (scoped to the registration if given)
    const rawVouchers = await db.all(
      sql`SELECT v.*, l.name as party_name, l.gstin as party_gstin, l.state as party_state, l.registration_type as party_reg_type,
                 pg.name AS party_group
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN groups pg ON pg.group_id = l.group_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          -- Exclude Optional / Memorandum vouchers — non-posting, never part of the return.
          AND COALESCE(v.is_optional, 0) = 0 AND v.voucher_type != 'Memorandum'
          AND v.date >= ${startDate} AND v.date < ${endDate}
          ${regFilter}
          ORDER BY v.date ASC`,
    );

    // 2b. Table 13 (Documents Issued) reports CANCELLED documents too, so it needs its
    // own fetch — the query above filters them out.
    const docIssueRows = await db.all(
      sql`SELECT v.voucher_number, v.voucher_type, v.is_cancelled, pg.name AS party_group
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN groups pg ON pg.group_id = l.group_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
          AND COALESCE(v.is_optional, 0) = 0 AND v.voucher_type != 'Memorandum'
          AND v.date >= ${startDate} AND v.date < ${endDate}
          ${regFilter}`,
    );

    const b2b = [];
    const b2cl = [];
    const b2cs = [];
    const cdnr = [];
    const cdnur = []; // credit/debit notes to UNREGISTERED parties (table 9B unregistered)
    const exp = []; // export invoices (table 6A), grouped WPAY/WOPAY
    const hsnSummary = {};
    const errors = [];

    // Nil-rated / exempted / non-GST outward supplies (table 8), split by supply category.
    // Each key holds { nil, expt, ngsup } rupee totals.
    const nilCat = {
      inter_reg: { nil: 0, expt: 0, ngsup: 0 },
      intra_reg: { nil: 0, expt: 0, ngsup: 0 },
      inter_unreg: { nil: 0, expt: 0, ngsup: 0 },
      intra_unreg: { nil: 0, expt: 0, ngsup: 0 },
    };

    // Helper maps to avoid duplicates
    const b2bMap = {};
    const b2clMap = {};
    const cdnrMap = {};
    const expMap = {}; // keyed by WPAY | WOPAY

    let serialCounter = 1;

    // GST duty ledgers for this company. A voucher that posts to none of these charged no
    // GST, so we must NOT synthesise tax from the item's rate — its tax stays zero.
    const gstLedgerRows = await db.all(
      sql`SELECT sd.ledger_id FROM ledger_statutory_details sd
          JOIN ${ledgers} l ON l.ledger_id = sd.ledger_id
          WHERE l.company_id = ${company_id} AND sd.type_of_duty_tax = 'GST'`,
    );
    const gstLedgerIds = new Set(gstLedgerRows.map((r) => Number(r.ledger_id)));

    for (const voucher of rawVouchers) {
      // GSTR-1 is OUTWARD only: Sales and Credit Notes (sales returns). A Debit Note in this
      // app is a PURCHASE RETURN (inward) — it belongs to the ITC/GSTR-2 side, never outward —
      // so it is excluded here (matching classifyVoucher's "Not Relevant" for inward docs).
      const vtype = voucher.voucher_type;
      // OUTWARD only, resolved by party group (not voucher_type alone): Sales, sales-return
      // Credit Notes, and outward Debit Notes issued to customers. A Credit Note against a
      // supplier (purchase return) is inward and is excluded here.
      if (!isOutwardVoucher(voucher)) {
        continue;
      }

      // Fetch stock entries
      const stockEntries = await db.all(
        sql`SELECT * FROM ${voucherStockEntries} WHERE ${voucherStockEntries.voucherId} = ${voucher.voucher_id}`,
      );

      // Fetch tax lines (audit trail) up front — an accounting-mode invoice (service/sales
      // with GST via Duties & Taxes ledgers but NO inventory line) has no stock entries yet
      // still belongs in the return; it is built from these stored tax lines instead.
      let taxLines = await db.all(
        sql`SELECT * FROM ${gstVoucherTaxLines} WHERE ${gstVoucherTaxLines.voucherId} = ${voucher.voucher_id}`,
      );

      // Skip only when there is genuinely nothing to report (no stock lines AND no tax lines).
      if (stockEntries.length === 0 && taxLines.length === 0) continue;

      // Exclude "Uncertain" vouchers from the return sections, matching the Statistics /
      // Track-Activities classifier: an invalid company GSTIN or any missing/invalid
      // HSN/SAC makes the voucher not ready to file, so Tally parks it under Uncertain
      // (Corrections needed) and keeps it OUT of B2B/B2CS/CDN. A recipient WITHOUT a
      // (valid) GSTIN is NOT an error — under GST law that is an unregistered buyer and
      // the sale files under B2C (B2CS/B2CL/CDNUR), which the section gates below handle.
      // HSN is validated from stock lines when present, else from the accounting tax lines.
      const hsnBad = stockEntries.length
        ? stockEntries.some((s) => validateHsn(s.hsn_code) !== null)
        : taxLines.some((t) => validateHsn(t.hsn_code) !== null);
      if (!validateGSTIN(companyGSTIN) || hsnBad) {
        continue;
      }

      // Fetch entries to calculate total invoice value
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${voucher.voucher_id}`,
      );

      // Sum invoice total (the party ledger amount)
      let invoiceValue = 0;
      const partyEntry = entries.find(
        (e) => Number(e.ledger_id) === Number(voucher.party_ledger_id),
      );
      if (partyEntry) {
        invoiceValue = partyEntry.amount;
      } else {
        // Fallback: sum of all Cr or Dr entries
        invoiceValue = stockEntries.reduce(
          (sum, s) =>
            sum +
            (s.amount || 0) +
            (s.cgst_amount || 0) +
            (s.sgst_amount || 0) +
            (s.igst_amount || 0),
          0,
        );
      }

      // (taxLines fetched above, before the accounting-mode skip.)

      // Only synthesise tax from the item rate when the voucher actually booked GST (has a
      // GST duty-ledger posting). Otherwise the invoice genuinely carries no tax.
      const hasGstEntry = entries.some((e) => gstLedgerIds.has(Number(e.ledger_id)));

      // A line carrying a positive tax rate but a voucher that booked NO GST at all is an
      // incomplete entry (tax never charged). Tally parks it under Uncertain, so keep it OUT
      // of the return sections — this mirrors classifyVoucher's "Tax amount is not calculated"
      // exception and keeps the section totals equal to the "Included in Return" count.
      const maxItemRate = stockEntries.reduce((m, s) => Math.max(m, Number(s.gst_rate || 0)), 0);
      const stockTax = stockEntries.reduce(
        (s, e) =>
          s + Number(e.igst_amount || 0) + Number(e.cgst_amount || 0) + Number(e.sgst_amount || 0),
        0,
      );
      const ledgerTax = entries
        .filter((e) => gstLedgerIds.has(Number(e.ledger_id)))
        .reduce((s, e) => s + Number(e.amount || 0), 0);
      const taxBooked = stockTax > 0.01 ? stockTax : ledgerTax;
      if (maxItemRate > 0 && taxBooked < 0.01) continue;

      // No GST anywhere on the voucher — no duty-ledger posting, no stored tax
      // lines, no tax on any stock line, no GST rate on any item: the sale was
      // billed without GST, so it is NOT part of the return (Not Relevant) —
      // unless an item is explicitly configured Nil-rated/Exempt/Non-GST in the
      // masters, which belongs in table 8 rather than being dropped.
      if (!hasGstEntry && taxLines.length === 0 && maxItemRate === 0 && taxBooked < 0.01) {
        let nilConfigured = false;
        for (const s of stockEntries) {
          const rd = await resolveTaxRate(db, {
            company_id,
            stock_item_id: s.stock_item_id,
            ledger_id: s.ledger_id,
            hsn_code: s.hsn_code,
            date: voucher.date,
          });
          if ((rd.gst_rate || 0) === 0 && classifyTaxability(rd.taxability)) {
            nilConfigured = true;
            break;
          }
        }
        if (!nilConfigured) continue;
      }

      if (taxLines.length === 0 && hasGstEntry) {
        // Compute on the fly
        try {
          const computed = await computeVoucherTaxLines(db, {
            company_id,
            date: voucher.date,
            party_ledger_id: voucher.party_ledger_id,
            place_of_supply: voucher.place_of_supply,
            stock_entries: stockEntries,
            entries: entries,
            voucher_type: vtype,
          });
          taxLines = [];
          computed.stock_entries.forEach((entry) => {
            const hsn = entry.hsn_code || 'OTH';
            const isInter = computed.is_inter_state;
            if (entry.gst_rate > 0) {
              if (isInter) {
                taxLines.push({
                  hsn_code: hsn,
                  assessable_value: entry.assessable_value,
                  tax_type: 'IGST',
                  rate: entry.gst_rate,
                  amount: entry.igst_amount,
                });
              } else {
                taxLines.push({
                  hsn_code: hsn,
                  assessable_value: entry.assessable_value,
                  tax_type: 'CGST',
                  rate: entry.gst_rate / 2,
                  amount: entry.cgst_amount,
                });
                taxLines.push({
                  hsn_code: hsn,
                  assessable_value: entry.assessable_value,
                  tax_type: 'SGST',
                  rate: entry.gst_rate / 2,
                  amount: entry.sgst_amount,
                });
              }
            }
          });
        } catch (err) {
          errors.push({
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
            error: `Failed to compute tax details: ${err.message}`,
          });
          continue;
        }
      }

      // No GST was charged (no tax lines): keep the invoice's TAXABLE value with zero tax so
      // it still appears in the return at its correct amount — just without fabricated tax.
      if (taxLines.length === 0) {
        stockEntries.forEach((s) => {
          taxLines.push({
            hsn_code: s.hsn_code || 'OTH',
            assessable_value: Number(s.amount || 0),
            tax_type: 'TAXABLE',
            rate: 0,
            amount: 0,
          });
        });
      }

      // Reverse-charge outward supply (rare — notified goods/services): read the SAME GST
      // classification flag GSTR-3B uses so the B2B/CDNR rchrg flag is real, not hardcoded 'N'.
      let isRcm = false;
      const rcmClassId = taxLines.length
        ? taxLines[0].gst_classification_id || taxLines[0].gstClassificationId
        : null;
      if (rcmClassId) {
        const cr = await db.all(
          sql`SELECT is_reverse_charge FROM ${gstClassifications} WHERE ${gstClassifications.gcId} = ${rcmClassId}`,
        );
        if (cr[0] && Number(cr[0].is_reverse_charge) === 1) isRcm = true;
      }
      const rchrgFlag = isRcm ? 'Y' : 'N';

      // Check validation warnings
      const isRegistered = voucher.party_reg_type && voucher.party_reg_type !== 'Unregistered';
      const hasGSTIN = !!voucher.party_gstin;
      // B2B / CDNR strictly require a VALID 15-char GSTIN as the ctin — a party
      // without one classifies as a consumer (B2C/B2CL/B2CS/CDNUR), never B2B.
      const validPartyGstin = validateGSTIN(voucher.party_gstin || '');

      if (isRegistered && !hasGSTIN) {
        errors.push({
          voucher_id: voucher.voucher_id,
          voucher_number: voucher.voucher_number,
          error: `Party is marked as registered (${voucher.party_reg_type}) but has no GSTIN`,
        });
      }

      if (hasGSTIN && !validateGSTIN(voucher.party_gstin)) {
        errors.push({
          voucher_id: voucher.voucher_id,
          voucher_number: voucher.voucher_number,
          error: `Invalid GSTIN format for party: ${voucher.party_gstin}`,
        });
      }

      const partyState = voucher.party_state || '';
      const partyStateCode = resolveStateCode(partyState, voucher.party_gstin);

      if (hasGSTIN) {
        const stateDigits = voucher.party_gstin.substring(0, 2);
        if (stateDigits !== partyStateCode) {
          errors.push({
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
            error: `GSTIN state prefix (${stateDigits}) does not match party state (${partyStateCode} - ${partyState})`,
          });
        }
      }

      // Group tax lines by rate for this invoice
      // GSTN expects items grouped by tax rate
      const itemsByRate = {};
      taxLines.forEach((line) => {
        const rate = Number(line.rate);
        // If local CGST/SGST rate is X, the full GST rate is 2 * X
        const fullRate = line.tax_type === 'CGST' || line.tax_type === 'SGST' ? rate * 2 : rate;

        if (!itemsByRate[fullRate]) {
          itemsByRate[fullRate] = {
            txval: 0,
            rt: fullRate,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }

        // Avoid adding assessable value twice for CGST & SGST
        if (line.tax_type !== 'SGST') {
          itemsByRate[fullRate].txval += line.assessable_value;
        }

        if (line.tax_type === 'IGST') itemsByRate[fullRate].iamt += line.amount;
        else if (line.tax_type === 'CGST') itemsByRate[fullRate].camt += line.amount;
        else if (line.tax_type === 'SGST') itemsByRate[fullRate].samt += line.amount;
        else if (line.tax_type === 'CESS') itemsByRate[fullRate].csamt += line.amount;
      });

      const itmsList = Object.values(itemsByRate).map((item, idx) => ({
        num: idx + 1,
        itm_det: {
          txval: Number(item.txval.toFixed(2)),
          rt: item.rt,
          iamt: Number(item.iamt.toFixed(2)),
          camt: Number(item.camt.toFixed(2)),
          samt: Number(item.samt.toFixed(2)),
          csamt: Number(item.csamt.toFixed(2)),
        },
      }));

      // Classify Transaction.
      // Place of Supply drives B2CL/B2CS and the inter/intra split — NOT the party's home
      // state — matching how the tax was actually computed in the engine. Export supplies
      // are their own section regardless of the numeric POS.
      // Export is flagged by the supply-type snapshot (overseas party) or an explicit
      // "Export" place of supply. SEZ (SEZWP/SEZWOP) is a B2B invoice type, not table 6A.
      const isExport =
        isExportPos(voucher.place_of_supply) || /^EXP/.test(String(voucher.supply_type || ''));
      const posState = voucher.place_of_supply || partyState;
      // Unknown destination → treat as local (company's own state), never a phantom Maharashtra.
      const posStateCode = isExport
        ? '96'
        : resolveStateCode(posState, voucher.party_gstin) || companyStateCode;
      const isInterState = isExport ? true : companyStateCode !== posStateCode;
      const invIgst = Object.values(itemsByRate).reduce((s, it) => s + it.iamt, 0);

      // Aggregate a set of per-rate items into the shared B2CS accumulator. `sign` is -1 for
      // small unregistered credit notes, which GSTN nets against B2CS rather than CDNUR.
      const addToB2cs = (pos, supplyType, sign) => {
        Object.values(itemsByRate).forEach((item) => {
          const match = b2cs.find(
            (x) => x.pos === pos && x.rt === item.rt && x.sply_ty === supplyType,
          );
          const target = match || {
            sply_ty: supplyType,
            pos,
            rt: item.rt,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
          target.txval += sign * item.txval;
          target.iamt += sign * item.iamt;
          target.camt += sign * item.camt;
          target.samt += sign * item.samt;
          target.csamt += sign * item.csamt;
          if (!match) b2cs.push(target);
        });
      };

      if (isNote(vtype)) {
        // Both note types can be outward: a sales-return Credit Note (ntty 'C') and a customer
        // Debit Note / supplementary invoice (ntty 'D'). Inward notes were already excluded by
        // isOutwardVoucher above. A credit note reduces a small B2CS bucket (sign -1); an
        // outward debit note increases it (sign +1).
        const ntty = vtype === 'Credit Note' ? 'C' : 'D';
        const noteSign = vtype === 'Credit Note' ? -1 : 1;
        if (validPartyGstin) {
          // CDNR — notes to registered parties.
          const ctin = voucher.party_gstin;
          if (!cdnrMap[ctin]) {
            cdnrMap[ctin] = { ctin, nt: [] };
          }
          // GSTN de-linked notes from the original invoice in 2020, so no inum/idt/p_gst;
          // rchrg + inv_typ are required.
          cdnrMap[ctin].nt.push({
            ntty,
            nt_num: voucher.voucher_number,
            nt_dt: formatGSTDate(voucher.date),
            val: Number(invoiceValue.toFixed(2)),
            pos: posStateCode,
            rchrg: rchrgFlag,
            inv_typ: 'R',
            itms: itmsList,
          });
        } else if (isExport || (isInterState && invoiceValue > B2CL_THRESHOLD)) {
          // CDNUR — notes to unregistered parties that have an explicit home:
          // exports (EXPWP/EXPWOP) or large inter-state (B2CL). Small ones net into B2CS.
          cdnur.push({
            ntty,
            nt_num: voucher.voucher_number,
            nt_dt: formatGSTDate(voucher.date),
            val: Number(invoiceValue.toFixed(2)),
            typ: isExport ? (invIgst > 0 ? 'EXPWP' : 'EXPWOP') : 'B2CL',
            pos: posStateCode,
            itms: itmsList,
          });
        } else {
          // Small unregistered note → net into B2CS (credit -1, debit +1).
          addToB2cs(posStateCode || companyStateCode, isInterState ? 'INTER' : 'INTRA', noteSign);
        }
      } else if (isExport) {
        // Export invoices (table 6A). With-payment (WPAY) when IGST was charged, else LUT/bond.
        const expTyp = invIgst > 0 ? 'WPAY' : 'WOPAY';
        if (!expMap[expTyp]) expMap[expTyp] = { exp_typ: expTyp, inv: [] };
        expMap[expTyp].inv.push({
          inum: voucher.voucher_number,
          idt: formatGSTDate(voucher.date),
          val: Number(invoiceValue.toFixed(2)),
          itms: itmsList.map((i) => ({
            txval: i.itm_det.txval,
            rt: i.itm_det.rt,
            iamt: i.itm_det.iamt,
            csamt: i.itm_det.csamt,
          })),
        });
      } else if (validPartyGstin) {
        // B2B — sales to registered parties.
        const ctin = voucher.party_gstin;
        if (!b2bMap[ctin]) {
          b2bMap[ctin] = { ctin, inv: [] };
        }
        b2bMap[ctin].inv.push({
          inum: voucher.voucher_number,
          idt: formatGSTDate(voucher.date),
          val: Number(invoiceValue.toFixed(2)),
          pos: posStateCode,
          rchrg: rchrgFlag,
          inv_typ: 'R',
          itms: itmsList,
        });
      } else if (isInterState && invoiceValue > B2CL_THRESHOLD) {
        // B2CL — large inter-state sales to unregistered consumers.
        if (!b2clMap[posStateCode]) {
          b2clMap[posStateCode] = { pos: posStateCode, inv: [] };
        }
        b2clMap[posStateCode].inv.push({
          inum: voucher.voucher_number,
          idt: formatGSTDate(voucher.date),
          val: Number(invoiceValue.toFixed(2)),
          itms: itmsList,
        });
      } else {
        // B2CS — small sales to unregistered consumers, aggregated by POS + rate.
        addToB2cs(posStateCode || companyStateCode, isInterState ? 'INTER' : 'INTRA', 1);
      }

      // Category for the nil/exempt/non-GST table (table 8).
      const nilCatKey = `${isInterState ? 'inter' : 'intra'}_${isRegistered ? 'reg' : 'unreg'}`;

      // Add to HSN summary
      for (const entry of stockEntries) {
        const rateDetails = await resolveTaxRate(db, {
          company_id,
          stock_item_id: entry.stock_item_id,
          ledger_id: entry.ledger_id,
          hsn_code: entry.hsn_code,
          date: voucher.date,
        });

        const resolvedHsn = rateDetails.hsn_code || entry.hsn_code;
        const hsn = resolvedHsn || 'OTH';
        const desc = rateDetails.hsn_sac_description || entry.item_name || 'Goods/Services';
        const qty = entry.quantity || 0;
        const value = entry.amount || 0;
        const taxableVal = value - (entry.discount_amount || 0);

        // GSTN rejects blank/malformed HSN — surface it so it is fixed before filing,
        // rather than silently filing everything under "OTH".
        const hsnErr = validateHsn(resolvedHsn);
        if (hsnErr) {
          errors.push({
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
            error: `${hsnErr} for ${entry.item_name || 'an item'} — GSTR-1 HSN summary requires a 4/6/8-digit code`,
          });
        }

        // Non-taxed supply → nil / exempt / non-GST buckets (table 8) instead of being
        // dropped. Taxable lines already flow through itemsByRate above.
        if ((rateDetails.gst_rate || 0) === 0) {
          const bucket = classifyTaxability(rateDetails.taxability);
          if (bucket) {
            const col = bucket === 'nongst' ? 'ngsup' : bucket === 'exempt' ? 'expt' : 'nil';
            nilCat[nilCatKey][col] += taxableVal;
          }
        }

        // Per-entry tax is often 0 on the stock line (the real split lives in the tax
        // lines), so derive CGST/SGST/IGST from the rate + supply type — otherwise the
        // HSN summary reports zero tax and fails to reconcile with the return.
        const hsnRate = rateDetails.gst_rate || entry.gst_rate || 0;
        // Use the voucher's actual inter-state flag (POS vs company state), not the presence of
        // an IGST tax line — a supply whose lines were synthesised as TAXABLE-only would else be
        // mis-split as CGST/SGST in the HSN summary even when it is inter-state.
        const isInter = isInterState;
        let hIamt = entry.igst_amount || 0,
          hCamt = entry.cgst_amount || 0,
          hSamt = entry.sgst_amount || 0;
        if (hsnRate > 0 && !hIamt && !hCamt && !hSamt) {
          if (isInter) {
            hIamt = Number(((taxableVal * hsnRate) / 100).toFixed(2));
          } else {
            hCamt = Number(((taxableVal * hsnRate) / 200).toFixed(2));
            hSamt = hCamt;
          }
        }

        // GSTN's HSN summary (table 12) is keyed by HSN + rate; a taxable row needs both
        // the rate (rt) and the total value (val).
        const hsnKey = `${hsn}_${hsnRate}`;
        if (!hsnSummary[hsnKey]) {
          hsnSummary[hsnKey] = {
            hsn_sc: hsn,
            desc: desc.substring(0, 30), // standard character limit
            uqc: 'OTH',
            rt: hsnRate,
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }

        hsnSummary[hsnKey].qty += qty;
        hsnSummary[hsnKey].val += value;
        hsnSummary[hsnKey].txval += taxableVal;
        hsnSummary[hsnKey].iamt += hIamt;
        hsnSummary[hsnKey].camt += hCamt;
        hsnSummary[hsnKey].samt += hSamt;
        hsnSummary[hsnKey].csamt += entry.cess_amount || 0;
      }
    }

    // Format B2B, B2CL, CDNR arrays
    const formattedB2b = Object.values(b2bMap);
    const formattedB2cl = Object.values(b2clMap);
    const formattedCdnr = Object.values(cdnrMap);
    const formattedExp = Object.values(expMap);
    const round2 = (n) => Number(Number(n || 0).toFixed(2));

    // Format B2CS amounts to 2 decimals, dropping rows fully netted to zero by credit notes.
    b2cs.forEach((x) => {
      x.txval = round2(x.txval);
      x.iamt = round2(x.iamt);
      x.camt = round2(x.camt);
      x.samt = round2(x.samt);
      x.csamt = round2(x.csamt);
    });
    const b2csFiltered = b2cs.filter((x) => x.txval || x.iamt || x.camt || x.samt || x.csamt);

    // Round CDNUR note amounts.
    const formattedCdnur = cdnur.map((n) => ({ ...n, val: round2(n.val) }));

    // Build the nil/exempt/non-GST section (table 8).
    const NIL_SPLY_TY = {
      intra_reg: 'INTRB2B',
      intra_unreg: 'INTRB2C',
      inter_reg: 'INTERB2B',
      inter_unreg: 'INTERB2C',
    };
    const nilInv = Object.entries(nilCat)
      .filter(([, v]) => v.nil || v.expt || v.ngsup)
      .map(([k, v]) => ({
        sply_ty: NIL_SPLY_TY[k],
        nil_amt: round2(v.nil),
        expt_amt: round2(v.expt),
        ngsup_amt: round2(v.ngsup),
      }));

    // Format HSN summaries to 2 decimals and compile list
    const hsnList = Object.values(hsnSummary).map((x, idx) => ({
      num: idx + 1,
      hsn_sc: x.hsn_sc,
      desc: x.desc,
      uqc: x.uqc,
      rt: x.rt,
      qty: Number(x.qty.toFixed(2)),
      // GSTN's HSN (table 12) record schema has no `val` key — total value isn't
      // submitted. The `hsn` node is a 2-subschema oneOf with record-level
      // additionalProperties:false, so an extra `val` fails both subschemas
      // ("#/hsn: no subschema matched"). Emit only schema-defined keys.
      txval: Number(x.txval.toFixed(2)),
      iamt: Number(x.iamt.toFixed(2)),
      camt: Number(x.camt.toFixed(2)),
      samt: Number(x.samt.toFixed(2)),
      csamt: Number(x.csamt.toFixed(2)),
    }));

    // Construct full GSTR-1 payload
    const payload = {
      gstin: companyGSTIN,
      fp: return_period,
      cur_gt: 0.0, // gross turnover helper
      b2b: formattedB2b,
      b2cl: formattedB2cl,
      b2cs: b2csFiltered,
      cdnr: formattedCdnr,
      cdnur: formattedCdnur,
      exp: formattedExp,
      nil: { inv: nilInv },
      hsn: {
        data: hsnList,
      },
    };

    // Table 13 — omitted entirely when no documents were issued (the portal rejects an
    // empty doc_issue node rather than treating it as "nothing to report").
    const docIssue = buildDocIssue(docIssueRows);
    if (docIssue) payload.doc_issue = docIssue;

    // Persist the snapshot only for the company-wide return. A registration-scoped
    // computation is a drill-down view — persisting it would corrupt the company-wide
    // snapshot (gstr1_exports is keyed by company+fy+period, with no registration).
    let export_id = null;
    if (gst_registration_id == null) {
      await db
        .delete(gstr1Exports)
        .where(
          and(
            eq(gstr1Exports.companyId, company_id),
            eq(gstr1Exports.fyId, fy_id),
            eq(gstr1Exports.returnPeriod, return_period),
            eq(gstr1Exports.status, 'Draft'),
          ),
        );

      const inserted = await db
        .insert(gstr1Exports)
        .values({
          companyId: company_id,
          fyId: fy_id,
          returnPeriod: return_period,
          status: 'Draft',
          b2bJson: JSON.stringify(formattedB2b),
          b2clJson: JSON.stringify(formattedB2cl),
          b2csJson: JSON.stringify(b2csFiltered),
          cdnrJson: JSON.stringify(formattedCdnr),
          hsnJson: JSON.stringify(hsnList),
          errorsJson: JSON.stringify(errors),
          fullPayloadJson: JSON.stringify(payload),
        })
        .returning({ id: gstr1Exports.exportId });
      export_id = Number(inserted[0].id);
    }

    return {
      success: true,
      export_id,
      payload,
      errors,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getGSTR1 = async (company_id, fy_id, return_period, gst_registration_id = null) => {
  try {
    // Registration-scoped drill-downs always compute live — the cached snapshot in
    // gstr1_exports is company-wide (keyed without a registration).
    if (gst_registration_id != null) {
      return await generateGSTR1(company_id, fy_id, return_period, gst_registration_id);
    }
    const rows = await db.all(
      sql`SELECT * FROM ${gstr1Exports}
          WHERE ${gstr1Exports.companyId} = ${company_id}
            AND ${gstr1Exports.fyId} = ${fy_id}
            AND ${gstr1Exports.returnPeriod} = ${return_period}
          ORDER BY ${gstr1Exports.exportId} DESC LIMIT 1`,
    );

    if (rows.length === 0) {
      // If not generated, automatically trigger generation
      return await generateGSTR1(company_id, fy_id, return_period);
    }

    const row = rows[0];
    return {
      success: true,
      export_id: row.export_id,
      status: row.status,
      filed_date: row.filed_date,
      payload: JSON.parse(row.full_payload_json),
      errors: JSON.parse(row.errors_json),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  generateGSTR1,
  getGSTR1,
};
