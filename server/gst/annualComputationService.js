'use strict';

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
const { resolveStateCode, computeVoucherTaxLines } = require('./gstTaxEngine');

/**
 * Annual Computation Report
 *
 * Aggregates all GST data (outward supplies, ITC, tax payable, interest) for
 * the full financial year and returns a structured payload ready for the UI.
 *
 * @param {string|number} company_id
 * @param {string|number} fy_id
 * @returns {{ success: boolean, payload?: object, error?: string }}
 */
const generateAnnualComputation = async (company_id, fy_id) => {
  try {
    // ── 1. Company + Registration ─────────────────────────────────────────
    const companyRows = await db.all(
      sql`SELECT * FROM ${companies} WHERE ${companies.companyId} = ${company_id}`,
    );
    const company = companyRows[0];
    if (!company) return { success: false, error: 'Company not found' };

    const companyGstRows = await db.all(
      sql`SELECT * FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id}
            AND ${gstRegistrations.isActive} = 1
          LIMIT 1`,
    );
    const companyReg = companyGstRows[0];
    const companyGSTIN = companyReg ? companyReg.gstin : '';
    const companyState = companyReg ? companyReg.state_id : '';
    const companyStateCode = resolveStateCode(companyState, companyGSTIN);

    // ── 2. Financial year date range ──────────────────────────────────────
    // Fetch the FY start/end from the DB; fall back to current financial year
    let fyStartDate, fyEndDate, fyLabel;
    try {
      const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
      const fy = fyRows[0];
      if (fy) {
        fyStartDate = fy.start_date;
        fyEndDate = fy.end_date;
        fyLabel = `${fy.start_date} to ${fy.end_date}`;
      }
    } catch (_) {
      /* financial_years table may not exist yet; proceed with fallback */
    }

    if (!fyStartDate) {
      const now = new Date();
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fyStartDate = `${yr}-04-01`;
      fyEndDate = `${yr + 1}-03-31`;
      fyLabel = `01-Apr-${yr} to 31-Mar-${yr + 1}`;
    }

    // ── 3. All vouchers for the FY ────────────────────────────────────────
    const rawVouchers = await db.all(
      sql`SELECT v.*, l.name as party_name, l.gstin as party_gstin,
                 l.state as party_state, l.registration_type as party_reg_type
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id    = ${fy_id}
            AND v.is_cancelled = 0
            AND v.date >= ${fyStartDate}
            AND v.date <= ${fyEndDate}
          ORDER BY v.date ASC`,
    );

    // ── 4. Accumulator helpers ────────────────────────────────────────────
    const ZERO = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 });
    const add = (dest, src, sign = 1) => {
      dest.txval += (src.txval || 0) * sign;
      dest.iamt += (src.iamt || 0) * sign;
      dest.camt += (src.camt || 0) * sign;
      dest.samt += (src.samt || 0) * sign;
      dest.cess += (src.cess || 0) * sign;
    };

    // Outward supplies
    const outward_taxable = ZERO(); // (a) Regular taxable supplies
    const outward_zero = ZERO(); // (b) Zero-rated (exports)
    const outward_nil_exmp = ZERO(); // (c) Nil-rated / Exempt
    const outward_nongst = ZERO(); // (d) Non-GST
    const inward_rcm = ZERO(); // (e) Inward RCM supplies

    // ITC
    const itc_import_goods = ZERO();
    const itc_import_services = ZERO();
    const itc_rcm = ZERO();
    const itc_other = ZERO();
    const itc_reversed = ZERO();

    // Tax payable (aggregated per head)
    const tax_payable = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const tax_paid = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

    // Monthly breakdowns for the table
    const MONTH_NAMES = [
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
    ];
    const monthlyMap = {}; // key: "YYYY-MM" → row object

    const getMonthKey = (dateStr) => {
      const [y, m] = dateStr.split('-');
      return `${y}-${m}`;
    };

    const ensureMonth = (key, dateStr) => {
      if (!monthlyMap[key]) {
        const [y, m] = dateStr.split('-');
        const mIdx = Number(m) - 1;
        const fyMIdx = mIdx >= 3 ? mIdx - 3 : mIdx + 9; // Apr=0 … Mar=11
        monthlyMap[key] = {
          monthLabel: `${MONTH_NAMES[mIdx]}-${y.slice(2)}`,
          fyIdx: fyMIdx,
          outward_taxable_val: 0,
          outward_tax: 0,
          itc_availed: 0,
          net_tax: 0,
        };
      }
      return monthlyMap[key];
    };

    // ── 5. Process each voucher ───────────────────────────────────────────
    for (const voucher of rawVouchers) {
      const vtype = voucher.voucher_type;
      if (!['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(vtype)) continue;

      const stockEntries = await db.all(
        sql`SELECT * FROM ${voucherStockEntries} WHERE ${voucherStockEntries.voucherId} = ${voucher.voucher_id}`,
      );
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE ${voucherEntries.voucherId} = ${voucher.voucher_id}`,
      );

      let taxLines = await db.all(
        sql`SELECT * FROM ${gstVoucherTaxLines} WHERE ${gstVoucherTaxLines.voucherId} = ${voucher.voucher_id}`,
      );

      // Compute on-the-fly if missing
      if (taxLines.length === 0 && stockEntries.length > 0) {
        try {
          const computed = await computeVoucherTaxLines(db, {
            company_id,
            date: voucher.date,
            party_ledger_id: voucher.party_ledger_id,
            place_of_supply: voucher.place_of_supply,
            stock_entries: stockEntries,
            entries,
            voucher_type: vtype,
          });
          taxLines = [];
          computed.stock_entries.forEach((e) => {
            const hsn = e.hsn_code || 'OTH';
            if (computed.is_inter_state) {
              if (e.gst_rate > 0)
                taxLines.push({
                  hsnCode: hsn,
                  assessableValue: e.assessable_value,
                  taxType: 'IGST',
                  rate: e.gst_rate,
                  amount: e.igst_amount,
                });
            } else {
              if (e.gst_rate > 0) {
                taxLines.push({
                  hsnCode: hsn,
                  assessableValue: e.assessable_value,
                  taxType: 'CGST',
                  rate: e.gst_rate / 2,
                  amount: e.cgst_amount,
                });
                taxLines.push({
                  hsnCode: hsn,
                  assessableValue: e.assessable_value,
                  taxType: 'SGST',
                  rate: e.gst_rate / 2,
                  amount: e.sgst_amount,
                });
              }
            }
            if (e.cess_amount > 0)
              taxLines.push({
                hsnCode: hsn,
                assessableValue: e.assessable_value,
                taxType: 'CESS',
                rate: 0,
                amount: e.cess_amount,
              });
          });
        } catch (err) {
          console.error('Annual computation: failed to compute tax lines on-the-fly:', err);
        }
      }

      // Aggregate tax amounts
      let txval = 0,
        iamt = 0,
        camt = 0,
        samt = 0,
        cess = 0;
      const seen = new Set();
      taxLines.forEach((line) => {
        const key = `${line.hsnCode || line.hsn_code}_${line.assessableValue || line.assessable_value}`;
        if (!seen.has(key)) {
          txval += line.assessableValue || line.assessable_value || 0;
          seen.add(key);
        }
        const tt = line.taxType || line.tax_type;
        if (tt === 'IGST') iamt += line.amount || 0;
        else if (tt === 'CGST') camt += line.amount || 0;
        else if (tt === 'SGST') samt += line.amount || 0;
        else if (tt === 'CESS') cess += line.amount || 0;
      });

      const partyStateCode = resolveStateCode(voucher.party_state || '', voucher.party_gstin);
      const isInterState = companyStateCode !== partyStateCode;
      const isRegistered = voucher.party_reg_type && voucher.party_reg_type !== 'Unregistered';

      // Classification flags
      let isRc = false,
        isExempt = false,
        isNonGst = false;
      const classId =
        taxLines.length > 0
          ? taxLines[0].gstClassificationId || taxLines[0].gst_classification_id
          : null;
      if (classId) {
        const classRows = await db.all(
          sql`SELECT * FROM ${gstClassifications} WHERE ${gstClassifications.gcId} = ${classId}`,
        );
        const cls = classRows[0];
        if (cls) {
          if (cls.isReverseCharge === 1) isRc = true;
          if (cls.taxability === 'Exempt' || cls.taxability === 'Nil Rated') isExempt = true;
          if (cls.isNonGstGoods === 1) isNonGst = true;
        }
      }
      if (taxLines.length === 0 && stockEntries.length > 0) {
        if (stockEntries.every((s) => (s.gstRate || 0) === 0)) isExempt = true;
      }

      const isOutward =
        vtype === 'Sales' ||
        (vtype === 'Debit Note' && isRegistered) ||
        (vtype === 'Credit Note' && !isRegistered);
      const isInward =
        vtype === 'Purchase' ||
        (vtype === 'Debit Note' && !isRegistered) ||
        (vtype === 'Credit Note' && isRegistered);

      const isCreditNote = vtype === 'Credit Note';
      const isDebitNote = vtype === 'Debit Note';
      const outSign = isCreditNote ? -1 : 1;
      const inSign = isDebitNote ? -1 : 1;

      const vTax = { txval, iamt, camt, samt, cess };

      // Month tracking
      const mk = getMonthKey(voucher.date);
      const mRow = ensureMonth(mk, voucher.date);

      if (isOutward) {
        const isExport =
          voucher.place_of_supply === 'Export' ||
          partyStateCode === '97' ||
          partyStateCode === '96';

        if (isNonGst) {
          add(outward_nongst, vTax, outSign);
        } else if (isExempt) {
          add(outward_nil_exmp, vTax, outSign);
        } else if (isExport) {
          add(outward_zero, vTax, outSign);
          mRow.outward_taxable_val += txval * outSign;
          mRow.outward_tax += (iamt + cess) * outSign;
        } else {
          add(outward_taxable, vTax, outSign);
          tax_payable.igst += iamt * outSign;
          tax_payable.cgst += camt * outSign;
          tax_payable.sgst += samt * outSign;
          tax_payable.cess += cess * outSign;
          mRow.outward_taxable_val += txval * outSign;
          mRow.outward_tax += (iamt + camt + samt + cess) * outSign;
        }
      }

      if (isInward) {
        if (isRc) {
          add(inward_rcm, vTax, inSign);
          tax_payable.igst += iamt * inSign;
          tax_payable.cgst += camt * inSign;
          tax_payable.sgst += samt * inSign;
          tax_payable.cess += cess * inSign;
        }

        const isImport =
          partyStateCode === '97' ||
          partyStateCode === '96' ||
          voucher.place_of_supply === 'Import';
        const isService =
          stockEntries.length > 0 &&
          stockEntries.every((s) => s.itemName && s.itemName.toLowerCase().includes('service'));

        if (isImport) {
          if (isService) add(itc_import_services, vTax, inSign);
          else add(itc_import_goods, vTax, inSign);
        } else if (isRc) {
          add(itc_rcm, vTax, inSign);
        } else if (!isExempt && !isNonGst) {
          if (isDebitNote) add(itc_reversed, vTax, Math.abs(inSign));
          else add(itc_other, vTax, inSign);
        }

        const itcAmt = (iamt + camt + samt + cess) * inSign;
        mRow.itc_availed += itcAmt;
      }
    }

    // ── 6. Round all accumulators ─────────────────────────────────────────
    const round2 = (obj) => {
      Object.keys(obj).forEach((k) => {
        if (typeof obj[k] === 'number') obj[k] = Number(obj[k].toFixed(2));
      });
    };
    [
      outward_taxable,
      outward_zero,
      outward_nil_exmp,
      outward_nongst,
      inward_rcm,
      itc_import_goods,
      itc_import_services,
      itc_rcm,
      itc_other,
      itc_reversed,
    ].forEach(round2);
    round2(tax_payable);
    round2(tax_paid);

    // Total ITC available
    const total_itc_availed = {
      iamt: Number(
        (itc_import_goods.iamt + itc_import_services.iamt + itc_rcm.iamt + itc_other.iamt).toFixed(
          2,
        ),
      ),
      camt: Number(
        (itc_import_goods.camt + itc_import_services.camt + itc_rcm.camt + itc_other.camt).toFixed(
          2,
        ),
      ),
      samt: Number(
        (itc_import_goods.samt + itc_import_services.samt + itc_rcm.samt + itc_other.samt).toFixed(
          2,
        ),
      ),
      cess: Number(
        (itc_import_goods.cess + itc_import_services.cess + itc_rcm.cess + itc_other.cess).toFixed(
          2,
        ),
      ),
    };

    // Net tax payable — via the statutory ITC set-off order (NOT a naive per-head subtract,
    // which both ignored cross-head utilisation AND silently discarded excess credit):
    //   1. each head's credit against its own liability;
    //   2. IGST credit surplus → CGST, then SGST;
    //   3. CGST surplus → IGST; SGST surplus → IGST (CGST↔SGST cannot offset each other);
    //   4. Cess credit only against Cess.
    // Whatever credit remains is the balance carried forward (electronic credit ledger),
    // surfaced instead of dropped.
    const liab = {
      igst: tax_payable.igst,
      cgst: tax_payable.cgst,
      sgst: tax_payable.sgst,
      cess: tax_payable.cess,
    };
    const cr = {
      igst: total_itc_availed.iamt,
      cgst: total_itc_availed.camt,
      sgst: total_itc_availed.samt,
      cess: total_itc_availed.cess,
    };
    const setOff = (payHead, creditHead) => {
      const u = Math.min(Math.max(0, liab[payHead]), Math.max(0, cr[creditHead]));
      liab[payHead] -= u;
      cr[creditHead] -= u;
    };
    ['igst', 'cgst', 'sgst', 'cess'].forEach((h) => setOff(h, h)); // same-head first
    setOff('cgst', 'igst'); // IGST surplus → CGST
    setOff('sgst', 'igst'); // IGST surplus → SGST
    setOff('igst', 'cgst'); // CGST surplus → IGST
    setOff('igst', 'sgst'); // SGST surplus → IGST

    const net_tax = {
      igst: Number(Math.max(0, liab.igst).toFixed(2)),
      cgst: Number(Math.max(0, liab.cgst).toFixed(2)),
      sgst: Number(Math.max(0, liab.sgst).toFixed(2)),
      cess: Number(Math.max(0, liab.cess).toFixed(2)),
    };
    // Excess input tax credit carried forward to the next period (per head).
    const itc_carried_forward = {
      igst: Number(Math.max(0, cr.igst).toFixed(2)),
      cgst: Number(Math.max(0, cr.cgst).toFixed(2)),
      sgst: Number(Math.max(0, cr.sgst).toFixed(2)),
      cess: Number(Math.max(0, cr.cess).toFixed(2)),
    };

    // Monthly summary (sorted by FY order Apr→Mar)
    const monthly_summary = Object.values(monthlyMap)
      .sort((a, b) => a.fyIdx - b.fyIdx)
      .map((r) => ({
        month: r.monthLabel,
        taxable_val: Number(r.outward_taxable_val.toFixed(2)),
        outward_tax: Number(r.outward_tax.toFixed(2)),
        itc_availed: Number(r.itc_availed.toFixed(2)),
        net_tax: Number((r.outward_tax - r.itc_availed).toFixed(2)),
      }));

    // Annual totals row
    const annual_total = monthly_summary.reduce(
      (acc, r) => ({
        taxable_val: Number((acc.taxable_val + r.taxable_val).toFixed(2)),
        outward_tax: Number((acc.outward_tax + r.outward_tax).toFixed(2)),
        itc_availed: Number((acc.itc_availed + r.itc_availed).toFixed(2)),
        net_tax: Number((acc.net_tax + r.net_tax).toFixed(2)),
      }),
      { taxable_val: 0, outward_tax: 0, itc_availed: 0, net_tax: 0 },
    );

    return {
      success: true,
      payload: {
        fy_label: fyLabel,
        gstin: companyGSTIN,
        company_name: company.name,
        outward_supplies: {
          taxable: outward_taxable,
          zero: outward_zero,
          nil_exmp: outward_nil_exmp,
          nongst: outward_nongst,
          rcm: inward_rcm,
        },
        itc: {
          import_goods: itc_import_goods,
          import_services: itc_import_services,
          rcm: itc_rcm,
          other: itc_other,
          reversed: itc_reversed,
          total_availed: total_itc_availed,
        },
        tax_payable,
        tax_paid,
        net_tax,
        itc_carried_forward,
        monthly_summary,
        annual_total,
      },
    };
  } catch (err) {
    console.error('Annual Computation error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { generateAnnualComputation };
