const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  companies,
  gstRegistrations,
  vouchers,
  ledgers,
  voucherStockEntries,
  voucherEntries,
  gstVoucherTaxLines,
  gstClassifications,
} = require('../db/schema');
const { resolveStateCode, resolveTaxRate, computeVoucherTaxLines } = require('./gstTaxEngine');

const getGSTR3B = async (company_id, fy_id, return_period) => {
  return await generateGSTR3B(company_id, fy_id, return_period);
};

const generateGSTR3B = async (company_id, fy_id, return_period) => {
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

    const companyGstRows = await db.all(
      sql`SELECT * FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id}
            AND ${gstRegistrations.isActive} = 1
          LIMIT 1`
    );
    const companyReg = companyGstRows[0];
    const companyGSTIN = companyReg ? companyReg.gstin : "";
    const companyState = companyReg ? companyReg.state_id : "";
    const companyStateCode = resolveStateCode(companyState, companyGSTIN);

    // 2. Fetch all vouchers in the date range
    const rawVouchers = await db.all(
      sql`SELECT v.*, l.name as party_name, l.gstin as party_gstin, l.state as party_state, l.registration_type as party_reg_type
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.date >= ${startDate} AND v.date < ${endDate}
          ORDER BY v.date ASC`
    );

    const ZERO = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 });

    const sup_details = {
      osup_det: ZERO(),
      osup_zero: ZERO(),
      osup_nil_exmp: ZERO(),
      isup_rev: ZERO(),
      osup_nongst: ZERO()
    };

    const inter_sup = {
      unreg_details: [ZERO()],
      comp_details: [ZERO()],
      uin_details: [ZERO()]
    };

    // itc_avl follows the GSTN positional order:
    // [0] Import of Goods, [1] Import of Services, [2] Inward supplies liable
    // to reverse charge, [3] Inward supplies from ISD, [4] All other ITC.
    const itc_elg = {
      itc_avl: [ZERO(), ZERO(), ZERO(), ZERO(), ZERO()],
      itc_rev: [ZERO()],
      itc_inelg: [ZERO(), ZERO()]
    };

    const inward_sup = {
      isup_details: [ZERO(), ZERO()]
    };

    const intr_ltfee = {
      intr_details: ZERO()
    };

    let totalVouchers = 0;

    for (const voucher of rawVouchers) {
      const vtype = voucher.voucher_type;
      if (vtype !== 'Sales' && vtype !== 'Purchase' && vtype !== 'Credit Note' && vtype !== 'Debit Note') {
        continue;
      }

      totalVouchers++;

      // Fetch stock entries
      const stockEntries = await db.all(
        sql`SELECT * FROM ${voucherStockEntries} WHERE ${voucherStockEntries.voucherId} = ${voucher.voucher_id}`
      );

      // Fetch entries to calculate total invoice value / party entries
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${voucher.voucher_id}`
      );

      // Get tax lines
      let taxLines = await db.all(
        sql`SELECT * FROM ${gstVoucherTaxLines} WHERE ${gstVoucherTaxLines.voucherId} = ${voucher.voucher_id}`
      );

      // If no tax lines stored in DB, compute on-the-fly
      if (taxLines.length === 0 && stockEntries.length > 0) {
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
                taxLines.push({ hsnCode: hsn, assessableValue: entry.assessable_value, taxType: 'IGST', rate: entry.gst_rate, amount: entry.igst_amount });
              } else {
                taxLines.push({ hsnCode: hsn, assessableValue: entry.assessable_value, taxType: 'CGST', rate: entry.gst_rate / 2, amount: entry.cgst_amount });
                taxLines.push({ hsnCode: hsn, assessableValue: entry.assessable_value, taxType: 'SGST', rate: entry.gst_rate / 2, amount: entry.sgst_amount });
              }
            }
            if (entry.cess_amount > 0) {
              taxLines.push({ hsnCode: hsn, assessableValue: entry.assessable_value, taxType: 'CESS', rate: 0, amount: entry.cess_amount });
            }
          });
        } catch (err) {
          console.error("Failed to compute tax lines on the fly:", err);
        }
      }

      // Group tax lines by type for this voucher
      let txval = 0;
      let iamt = 0;
      let camt = 0;
      let samt = 0;
      let cess = 0;

      const seenHsnAssessable = new Set();
      taxLines.forEach(line => {
        const key = `${line.hsnCode || line.hsn_code}_${line.assessableValue || line.assessable_value}`;
        if (!seenHsnAssessable.has(key)) {
          txval += (line.assessableValue || line.assessable_value || 0);
          seenHsnAssessable.add(key);
        }
        const ttype = line.taxType || line.tax_type;
        if (ttype === 'IGST') iamt += (line.amount || 0);
        else if (ttype === 'CGST') camt += (line.amount || 0);
        else if (ttype === 'SGST') samt += (line.amount || 0);
        else if (ttype === 'CESS') cess += (line.amount || 0);
      });

      const partyState = voucher.party_state || "";
      const partyStateCode = resolveStateCode(partyState, voucher.party_gstin);
      const isInterState = companyStateCode !== partyStateCode;
      const isRegistered = voucher.party_reg_type && voucher.party_reg_type !== 'Unregistered';

      let isRc = false;
      let isExempt = false;
      let isNonGst = false;

      const classificationId = taxLines.length > 0 ? (taxLines[0].gstClassificationId || taxLines[0].gst_classification_id) : null;
      if (classificationId) {
        const classRows = await db.all(
          sql`SELECT * FROM ${gstClassifications} WHERE ${gstClassifications.gcId} = ${classificationId}`
        );
        const classification = classRows[0];
        if (classification) {
          if (classification.isReverseCharge === 1) isRc = true;
          if (classification.taxability === 'Exempt' || classification.taxability === 'Nil Rated') isExempt = true;
          if (classification.isNonGstGoods === 1) isNonGst = true;
        }
      }

      if (taxLines.length === 0 && stockEntries.length > 0) {
        const allZero = stockEntries.every(s => (s.gst_rate || 0) === 0);
        if (allZero) {
          isExempt = true;
        }
      }

      const isOutward = vtype === 'Sales' || (vtype === 'Debit Note' && isRegistered) || (vtype === 'Credit Note' && !isRegistered);
      const isInward = vtype === 'Purchase' || (vtype === 'Debit Note' && !isRegistered) || (vtype === 'Credit Note' && isRegistered);

      if (isOutward) {
        const isCreditNote = vtype === 'Credit Note';
        const sign = isCreditNote ? -1 : 1;

        const voucherTax = {
          txval: txval * sign,
          iamt: iamt * sign,
          camt: camt * sign,
          samt: samt * sign,
          cess: cess * sign
        };

        if (isNonGst) {
          sup_details.osup_nongst.txval += voucherTax.txval;
        } else if (isExempt) {
          sup_details.osup_nil_exmp.txval += voucherTax.txval;
        } else if (voucher.place_of_supply === 'Export' || partyStateCode === '97' || partyStateCode === '96') {
          sup_details.osup_zero.txval += voucherTax.txval;
          sup_details.osup_zero.iamt += voucherTax.iamt;
          sup_details.osup_zero.cess += voucherTax.cess;
        } else {
          sup_details.osup_det.txval += voucherTax.txval;
          sup_details.osup_det.iamt += voucherTax.iamt;
          sup_details.osup_det.camt += voucherTax.camt;
          sup_details.osup_det.samt += voucherTax.samt;
          sup_details.osup_det.cess += voucherTax.cess;
        }

        if (isInterState) {
          const regType = voucher.party_reg_type || "Unregistered";
          if (regType === 'Unregistered') {
            inter_sup.unreg_details[0].txval += voucherTax.txval;
            inter_sup.unreg_details[0].iamt += voucherTax.iamt;
          } else if (regType === 'Composition') {
            inter_sup.comp_details[0].txval += voucherTax.txval;
            inter_sup.comp_details[0].iamt += voucherTax.iamt;
          } else if (regType === 'UIN') {
            inter_sup.uin_details[0].txval += voucherTax.txval;
            inter_sup.uin_details[0].iamt += voucherTax.iamt;
          }
        }
      } else if (isInward) {
        const isDebitNote = vtype === 'Debit Note';
        const sign = isDebitNote ? -1 : 1;

        const voucherTax = {
          txval: txval * sign,
          iamt: iamt * sign,
          camt: camt * sign,
          samt: samt * sign,
          cess: cess * sign
        };

        if (isRc) {
          sup_details.isup_rev.txval += voucherTax.txval;
          sup_details.isup_rev.iamt += voucherTax.iamt;
          sup_details.isup_rev.camt += voucherTax.camt;
          sup_details.isup_rev.samt += voucherTax.samt;
          sup_details.isup_rev.cess += voucherTax.cess;

          itc_elg.itc_avl[2].iamt += voucherTax.iamt;
          itc_elg.itc_avl[2].camt += voucherTax.camt;
          itc_elg.itc_avl[2].samt += voucherTax.samt;
          itc_elg.itc_avl[2].cess += voucherTax.cess;
        } else if (isNonGst) {
          inward_sup.isup_details[1].txval += voucherTax.txval;
        } else if (isExempt) {
          inward_sup.isup_details[0].txval += voucherTax.txval;
        } else {
          const isImport = partyStateCode === '97' || partyStateCode === '96' || voucher.place_of_supply === 'Import';
          const isService = stockEntries.length > 0 && stockEntries.every(s => s.item_name && s.item_name.toLowerCase().includes("service"));

          if (isImport) {
            if (isService) {
              itc_elg.itc_avl[1].iamt += voucherTax.iamt;
              itc_elg.itc_avl[1].cess += voucherTax.cess;
            } else {
              itc_elg.itc_avl[0].iamt += voucherTax.iamt;
              itc_elg.itc_avl[0].cess += voucherTax.cess;
            }
          } else {
            if (isDebitNote) {
              itc_elg.itc_rev[0].iamt += Math.abs(voucherTax.iamt);
              itc_elg.itc_rev[0].camt += Math.abs(voucherTax.camt);
              itc_elg.itc_rev[0].samt += Math.abs(voucherTax.samt);
              itc_elg.itc_rev[0].cess += Math.abs(voucherTax.cess);
            } else {
              itc_elg.itc_avl[4].iamt += voucherTax.iamt;
              itc_elg.itc_avl[4].camt += voucherTax.camt;
              itc_elg.itc_avl[4].samt += voucherTax.samt;
              itc_elg.itc_avl[4].cess += voucherTax.cess;
            }
          }
        }
      }
    }

    const format = (obj) => {
      Object.keys(obj).forEach(k => {
        if (typeof obj[k] === 'number') {
          obj[k] = Number(obj[k].toFixed(2));
        }
      });
    };

    format(sup_details.osup_det);
    format(sup_details.osup_zero);
    format(sup_details.osup_nil_exmp);
    format(sup_details.isup_rev);
    format(sup_details.osup_nongst);

    inter_sup.unreg_details.forEach(format);
    inter_sup.comp_details.forEach(format);
    inter_sup.uin_details.forEach(format);

    itc_elg.itc_avl.forEach(format);
    itc_elg.itc_rev.forEach(format);
    itc_elg.itc_inelg.forEach(format);

    inward_sup.isup_details.forEach(format);
    format(intr_ltfee.intr_details);

    const payload = {
      total_vouchers: totalVouchers,
      sup_details,
      inter_sup,
      itc_elg,
      inward_sup,
      intr_ltfee
    };

    return {
      success: true,
      payload
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  generateGSTR3B,
  getGSTR3B
};
