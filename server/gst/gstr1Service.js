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
  gstr1Exports,
} = require('../db/schema');
const { resolveStateCode, resolveTaxRate, computeVoucherTaxLines } = require('./gstTaxEngine');

const formatGSTDate = (dateStr) => {
  if (!dateStr) return "";
  // DB date is usually YYYY-MM-DD
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY
  }
  return dateStr;
};

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

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
      sql`SELECT * FROM ${companies} WHERE ${companies.companyId} = ${company_id}`
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
          ORDER BY gst_id ASC`
    );
    const primaryId = activeRegs[0] ? Number(activeRegs[0].gst_id) : null;
    const companyReg = gst_registration_id != null
      ? activeRegs.find((r) => Number(r.gst_id) === Number(gst_registration_id))
      : activeRegs[0];
    const companyGSTIN = companyReg ? companyReg.gstin : "";
    const companyState = companyReg ? companyReg.state_id : "";
    const companyStateCode = resolveStateCode(companyState, companyGSTIN);

    // The primary (first active) registration also owns legacy vouchers whose
    // gst_registration_id is NULL; a secondary registration matches its id exactly.
    let regFilter = sql``;
    if (gst_registration_id != null) {
      regFilter = Number(gst_registration_id) === primaryId
        ? sql`AND (v.gst_registration_id = ${gst_registration_id} OR v.gst_registration_id IS NULL)`
        : sql`AND v.gst_registration_id = ${gst_registration_id}`;
    }

    // 2. Fetch all vouchers in the date range (scoped to the registration if given)
    const rawVouchers = await db.all(
      sql`SELECT v.*, l.name as party_name, l.gstin as party_gstin, l.state as party_state, l.registration_type as party_reg_type
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND v.date >= ${startDate} AND v.date < ${endDate}
          ${regFilter}
          ORDER BY v.date ASC`
    );

    const b2b = [];
    const b2cl = [];
    const b2cs = [];
    const cdnr = [];
    const hsnSummary = {};
    const errors = [];

    // Helper maps to avoid duplicates
    const b2bMap = {};
    const b2clMap = {};
    const cdnrMap = {};

    let serialCounter = 1;

    for (const voucher of rawVouchers) {
      // We only include sales related vouchers: Sales, Debit Note, Credit Note
      const vtype = voucher.voucher_type;
      if (vtype !== 'Sales' && vtype !== 'Credit Note' && vtype !== 'Debit Note') {
        continue;
      }

      // Fetch stock entries
      const stockEntries = await db.all(
        sql`SELECT * FROM ${voucherStockEntries} WHERE ${voucherStockEntries.voucherId} = ${voucher.voucher_id}`
      );

      if (stockEntries.length === 0) continue;

      // Fetch entries to calculate total invoice value
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${voucher.voucher_id}`
      );

      // Sum invoice total (the party ledger amount)
      let invoiceValue = 0;
      const partyEntry = entries.find(e => Number(e.ledger_id) === Number(voucher.party_ledger_id));
      if (partyEntry) {
        invoiceValue = partyEntry.amount;
      } else {
        // Fallback: sum of all Cr or Dr entries
        invoiceValue = stockEntries.reduce((sum, s) => sum + (s.amount || 0) + (s.cgst_amount || 0) + (s.sgst_amount || 0) + (s.igst_amount || 0), 0);
      }

      // Fetch tax lines (audit trail) or compute on-the-fly
      let taxLines = await db.all(
        sql`SELECT * FROM ${gstVoucherTaxLines} WHERE ${gstVoucherTaxLines.voucherId} = ${voucher.voucher_id}`
      );

      if (taxLines.length === 0) {
        // Compute on the fly
        try {
          const computed = await computeVoucherTaxLines(db, {
            company_id,
            date: voucher.date,
            party_ledger_id: voucher.party_ledger_id,
            place_of_supply: voucher.place_of_supply,
            stock_entries: stockEntries,
            entries: entries,
            voucher_type: vtype
          });
          taxLines = [];
          computed.stock_entries.forEach(entry => {
            const hsn = entry.hsn_code || "OTH";
            const isInter = computed.is_inter_state;
            if (entry.gst_rate > 0) {
              if (isInter) {
                taxLines.push({ hsn_code: hsn, assessable_value: entry.assessable_value, tax_type: 'IGST', rate: entry.gst_rate, amount: entry.igst_amount });
              } else {
                taxLines.push({ hsn_code: hsn, assessable_value: entry.assessable_value, tax_type: 'CGST', rate: entry.gst_rate / 2, amount: entry.cgst_amount });
                taxLines.push({ hsn_code: hsn, assessable_value: entry.assessable_value, tax_type: 'SGST', rate: entry.gst_rate / 2, amount: entry.sgst_amount });
              }
            }
          });
        } catch (err) {
          errors.push({
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
            error: `Failed to compute tax details: ${err.message}`
          });
          continue;
        }
      }

      // Check validation warnings
      const isRegistered = voucher.party_reg_type && voucher.party_reg_type !== 'Unregistered';
      const hasGSTIN = !!voucher.party_gstin;

      if (isRegistered && !hasGSTIN) {
        errors.push({
          voucher_id: voucher.voucher_id,
          voucher_number: voucher.voucher_number,
          error: `Party is marked as registered (${voucher.party_reg_type}) but has no GSTIN`
        });
      }

      if (hasGSTIN && !validateGSTIN(voucher.party_gstin)) {
        errors.push({
          voucher_id: voucher.voucher_id,
          voucher_number: voucher.voucher_number,
          error: `Invalid GSTIN format for party: ${voucher.party_gstin}`
        });
      }

      const partyState = voucher.party_state || "";
      const partyStateCode = resolveStateCode(partyState, voucher.party_gstin);

      if (hasGSTIN) {
        const stateDigits = voucher.party_gstin.substring(0, 2);
        if (stateDigits !== partyStateCode) {
          errors.push({
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
            error: `GSTIN state prefix (${stateDigits}) does not match party state (${partyStateCode} - ${partyState})`
          });
        }
      }

      // Group tax lines by rate for this invoice
      // GSTN expects items grouped by tax rate
      const itemsByRate = {};
      taxLines.forEach(line => {
        const rate = Number(line.rate);
        // If local CGST/SGST rate is X, the full GST rate is 2 * X
        const fullRate = (line.tax_type === 'CGST' || line.tax_type === 'SGST') ? rate * 2 : rate;

        if (!itemsByRate[fullRate]) {
          itemsByRate[fullRate] = {
            txval: 0,
            rt: fullRate,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
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
          csamt: Number(item.csamt.toFixed(2))
        }
      }));

      // Classify Transaction
      const isInterState = companyStateCode !== partyStateCode;

      if (vtype === 'Credit Note' || vtype === 'Debit Note') {
        // CDNR or CDNUR
        if (hasGSTIN && isRegistered) {
          const ctin = voucher.party_gstin;
          if (!cdnrMap[ctin]) {
            cdnrMap[ctin] = { ctin, nt: [] };
          }
          cdnrMap[ctin].nt.push({
            ntty: vtype === 'Credit Note' ? 'C' : 'D',
            nt_num: voucher.voucher_number,
            nt_dt: formatGSTDate(voucher.date),
            val: Number(invoiceValue.toFixed(2)),
            inum: voucher.reference_number || "N/A",
            idt: formatGSTDate(voucher.reference_date || voucher.date),
            p_gst: "Y", // normal supply
            itms: itmsList
          });
        } else {
          // CDNUR (Credit Debit Note Unregistered) - skip or push to errors if details missing
          // Standard simplifies CDNUR to B2CS or similar, or we can handle it if needed
        }
      } else {
        // Sales Invoices
        if (hasGSTIN && isRegistered) {
          // B2B
          const ctin = voucher.party_gstin;
          if (!b2bMap[ctin]) {
            b2bMap[ctin] = { ctin, inv: [] };
          }
          b2bMap[ctin].inv.push({
            inum: voucher.voucher_number,
            idt: formatGSTDate(voucher.date),
            val: Number(invoiceValue.toFixed(2)),
            pos: partyStateCode,
            rchrg: "N",
            inv_typ: "R", // Regular
            itms: itmsList
          });
        } else {
          // B2C
          if (isInterState && invoiceValue > 250000) {
            // B2CL Large Unregistered
            const pos = partyStateCode;
            if (!b2clMap[pos]) {
              b2clMap[pos] = { pos, inv: [] };
            }
            b2clMap[pos].inv.push({
              inum: voucher.voucher_number,
              idt: formatGSTDate(voucher.date),
              val: Number(invoiceValue.toFixed(2)),
              itms: itmsList
            });
          } else {
            // B2CS Small Unregistered
            // B2CS aggregates by POS and Tax Rate
            const pos = partyStateCode || companyStateCode;
            const supplyType = isInterState ? "INTER" : "INTRA";

            Object.values(itemsByRate).forEach(item => {
              const match = b2cs.find(x => x.pos === pos && x.rt === item.rt && x.sply_ty === supplyType);
              if (match) {
                match.txval += item.txval;
                match.iamt += item.iamt;
                match.camt += item.camt;
                match.samt += item.samt;
                match.csamt += item.csamt;
              } else {
                b2cs.push({
                  sply_ty: supplyType,
                  pos: pos,
                  rt: item.rt,
                  txval: item.txval,
                  iamt: item.iamt,
                  camt: item.camt,
                  samt: item.samt,
                  csamt: item.csamt
                });
              }
            });
          }
        }
      }

      // Add to HSN summary
      for (const entry of stockEntries) {
        const rateDetails = await resolveTaxRate(db, {
          company_id,
          stock_item_id: entry.stock_item_id,
          ledger_id: entry.ledger_id,
          hsn_code: entry.hsn_code,
          date: voucher.date
        });

        const hsn = rateDetails.hsn_code || entry.hsn_code || "OTH";
        const desc = rateDetails.hsn_sac_description || entry.item_name || "Goods/Services";
        const qty = entry.quantity || 0;
        const value = entry.amount || 0;
        const taxableVal = value - (entry.discount_amount || 0);

        if (!hsnSummary[hsn]) {
          hsnSummary[hsn] = {
            hsn_sc: hsn,
            desc: desc.substring(0, 30), // standard character limit
            uqc: "OTH",
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          };
        }

        hsnSummary[hsn].qty += qty;
        hsnSummary[hsn].val += value;
        hsnSummary[hsn].txval += taxableVal;
        hsnSummary[hsn].iamt += entry.igst_amount || 0;
        hsnSummary[hsn].camt += entry.cgst_amount || 0;
        hsnSummary[hsn].samt += entry.sgst_amount || 0;
        hsnSummary[hsn].csamt += entry.cess_amount || 0;
      }
    }

    // Format B2B, B2CL, CDNR arrays
    const formattedB2b = Object.values(b2bMap);
    const formattedB2cl = Object.values(b2clMap);
    const formattedCdnr = Object.values(cdnrMap);

    // Format B2CS amounts to 2 decimals
    b2cs.forEach(x => {
      x.txval = Number(x.txval.toFixed(2));
      x.iamt = Number(x.iamt.toFixed(2));
      x.camt = Number(x.camt.toFixed(2));
      x.samt = Number(x.samt.toFixed(2));
      x.csamt = Number(x.csamt.toFixed(2));
    });

    // Format HSN summaries to 2 decimals and compile list
    const hsnList = Object.values(hsnSummary).map((x, idx) => ({
      num: idx + 1,
      hsn_sc: x.hsn_sc,
      desc: x.desc,
      uqc: x.uqc,
      qty: Number(x.qty.toFixed(2)),
      val: Number(x.val.toFixed(2)),
      txval: Number(x.txval.toFixed(2)),
      iamt: Number(x.iamt.toFixed(2)),
      camt: Number(x.camt.toFixed(2)),
      samt: Number(x.samt.toFixed(2)),
      csamt: Number(x.csamt.toFixed(2))
    }));

    // Construct full GSTR-1 payload
    const payload = {
      gstin: companyGSTIN,
      fp: return_period,
      cur_gt: 0.0, // gross turnover helper
      b2b: formattedB2b,
      b2cl: formattedB2cl,
      b2cs: b2cs,
      cdnr: formattedCdnr,
      hsn: {
        data: hsnList
      }
    };

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
            eq(gstr1Exports.status, 'Draft')
          )
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
          b2csJson: JSON.stringify(b2cs),
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
      errors
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
          ORDER BY ${gstr1Exports.exportId} DESC LIMIT 1`
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
      errors: JSON.parse(row.errors_json)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  generateGSTR1,
  getGSTR1
};
