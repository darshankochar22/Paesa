'use strict';

// Annual Computation — the FY-wide GSTR-9-style tree (section breakdowns and
// month-wise register) built from the shared classifier.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
const { getDatesForFY, fetchPeriodVouchers, classifyVoucher, buildFyMonths } = require('./core');

// computed from the SAME classifier as the drills so the voucher counts match the
// Statistics screen exactly. All amounts come from `included` vouchers, so when the
// company's GSTIN is invalid (everything relevant → uncertain) the sections are
// legitimately zero — matching TallyPrime. Shape matches AnnualComputation.tsx keys.
const getAnnualComputation = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const { fyLabel } = await getDatesForFY(fy_id);
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );

    // Registration GSTIN for the header.
    const activeRegs = await db.all(
      sql`SELECT gst_id, gstin FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
          ORDER BY gst_id ASC`,
    );
    const scopedReg =
      gstRegistrationId != null
        ? activeRegs.find((r) => Number(r.gst_id) === gstRegistrationId)
        : activeRegs[0];

    const zero = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 });
    const add = (acc, v) => {
      acc.txval += Number(v.taxable || 0);
      acc.iamt += Number(v.igst || 0);
      acc.camt += Number(v.cgst || 0);
      acc.samt += Number(v.sgst || 0);
    };
    const round = (a) => {
      for (const k of Object.keys(a)) a[k] = Number(a[k].toFixed(2));
      return a;
    };

    const taxable_and_advances = zero(); // outward taxable (tax payable)
    const not_payable = zero(); // outward nil/exempt/non-GST
    const itc_availed = zero(); // inward (Purchase) tax credit
    const summary_outward = zero();
    const summary_inward = zero();
    const vc = { total: 0, included: 0, not_relevant: 0, uncertain: 0 };

    for (const v of rows) {
      vc.total++;
      const cls = classifyVoucher(v, 'GSTR3B', companyGstinInvalid); // annual = outward + inward
      if (cls.bucket === 'not_relevant') {
        vc.not_relevant++;
        continue;
      }
      if (cls.bucket === 'uncertain') {
        vc.uncertain++;
        continue;
      }
      vc.included++;

      const isInward = v.voucher_type === 'Purchase';
      if (isInward) {
        add(itc_availed, v);
        add(summary_inward, v);
      } else {
        add(summary_outward, v);
        if (Number(v.max_rate || 0) > 0) add(taxable_and_advances, v);
        else add(not_payable, v);
      }
    }

    [taxable_and_advances, not_payable, itc_availed, summary_outward, summary_inward].forEach(
      round,
    );

    return {
      success: true,
      payload: {
        fy_label: fyLabel,
        gstin: gstRegistrationId != null ? scopedReg?.gstin || '' : 'All Registrations',
        voucher_count: vc,
        liability: {
          taxable_and_advances,
          not_payable,
          missing_invoice: zero(), // no cross-period invoice tracking offline
        },
        itc: {
          availed: itc_availed,
          reversal: zero(),
        },
        interest_late_fee: zero(),
        hsn_summary: { ...summary_outward },
        summary_outward,
        summary_inward,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Annual Computation drill tree (GSTR-9 style) — the multi-level breakdown behind
// each Particulars row: section → sub-category → Credit/Debit-note split → monthly
// summary → voucher register. Categories whose data cannot be derived from books
// offline (exports, SEZ, deemed, RCM, imports, ISD, reversals, interest) are shown
// with honest zeros — exactly how the empty rows look in TallyPrime with this data.
// ───────────────────────────────────────────────────────────────────────────────
const cdnSplit = (base) => ({
  supplies: { label: base },
  cn: { label: `Credit Notes Issued for ${base}` },
  dn: { label: `Debit Notes Issued for ${base}` },
});

const ANNUAL_TREE = {
  payable: {
    label: 'Outward and Inward Supplies on Which Tax is Payable (Including Advances)',
    children: {
      b2c: {
        label: 'Supplies to Unregistered Persons Including Credit/Debit Note (B2C)',
        children: {
          supplies: { label: 'Supplies to Unregistered Persons' },
          cn: { label: 'Credit Notes Issued to Unregistered Persons' },
          dn: { label: 'Debit Notes Issued to Unregistered Persons' },
        },
      },
      b2b: {
        label: 'Supplies to Registered Persons Including Credit/Debit Note (B2B)',
        children: {
          supplies: { label: 'Supplies to Registered Persons' },
          cn: { label: 'Credit Notes Issued to Registered Persons' },
          dn: { label: 'Debit Notes Issued to Registered Persons' },
        },
      },
      exports_pay: {
        label: 'Exports with Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('Exports with Payment of Tax'),
      },
      sez_pay: {
        label: 'SEZ Supplies with Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('SEZ Supplies with Payment of Tax'),
      },
      deemed: {
        label: 'Deemed Exports Including Credit/Debit Note',
        children: cdnSplit('Deemed Exports'),
      },
      inward_rcm: { label: 'Inward Supplies on Which Tax is to be Paid on Reverse Charge Basis' },
    },
  },
  not_payable: {
    label: 'Outward Supplies on Which Tax is Not Payable',
    children: {
      exports_nopay: {
        label: 'Exports without Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('Exports without Payment of Tax'),
      },
      sez_nopay: {
        label: 'SEZ Supplies without Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('SEZ Supplies without Payment of Tax'),
      },
      rcm_outward: {
        label: 'Outward Supplies Subject to Reverse Charge Including Credit/Debit Note',
        children: cdnSplit('Outward Supplies Subject to Reverse Charge'),
      },
      exempt: {
        label: 'Exempted Supplies Including Credit/Debit Note',
        children: cdnSplit('Exempted Supplies'),
      },
      nil: {
        label: 'Nil Rated Supplies Including Credit/Debit Note',
        children: cdnSplit('Nil Rated Supplies'),
      },
      non_gst: {
        label: 'Non-GST Supplies Including Credit/Debit Note',
        children: cdnSplit('Non-GST Supplies'),
      },
    },
  },
  itc: {
    label: 'Input Tax Credit',
    children: {
      impg: {
        label: 'Import of Goods (Including Supplies from SEZs)',
        children: {
          inputs: { label: 'Import of Goods - Inputs' },
          capital: { label: 'Import of Goods - Capital Goods' },
          sez_inputs: { label: 'Import of Goods from SEZ - Inputs' },
          sez_capital: { label: 'Import of Goods from SEZ - Capital Goods' },
        },
      },
      imps: { label: 'Import of Services (Excluding Inward Supplies from SEZs)' },
      isrc: { label: 'Inward Supplies Liable to Reverse Charge' },
      isd: { label: 'Inward Supplies from ISD' },
      all_other_itc: { label: 'All Other Input Tax Credit' },
      reclaimed: { label: 'Input Tax Credit Reclaimed' },
      any_other: { label: 'Any Other Input Tax Credit' },
      prev_fy: { label: 'Input Tax Credit Availed for Previous Financial Year' },
    },
  },
  itc_reversal: {
    label: 'Reversal of Input Tax Credit, Adjusted and Ineligible Input Tax Credit Declared',
    children: {
      rule37: { label: 'Non-Payment of Consideration to Supplier (Rule 37)' },
      rule39: { label: 'ISD Credit Note Received (Rule 39)' },
      excess: { label: 'Excess Input Tax Credit Claimed' },
      rule42: { label: 'Exempt and Non-Business Supplies (Rule 42)' },
      rule43: { label: 'Capital Goods Being Used for Exempted Supplies (Rule 43)' },
      sec175: { label: 'Ineligible Credit (Section 17(5))' },
      other: { label: 'Other Reversals' },
      deferral: { label: 'Deferral of Input Tax Credit Availed During Previous Financial Year' },
    },
  },
  interest: {
    label: 'Interest, Late Fee, Penalty and Others',
    children: {
      interest: { label: 'Interest' },
      late_fee: { label: 'Late Fee' },
      penalty: { label: 'Penalty' },
      other: { label: 'Other Charges' },
    },
  },
};

// Which tree leaf an INCLUDED voucher belongs to (dot-path). Book-derivable only:
// taxable outward splits B2B/B2C by party GSTIN with a CN/DN split; zero-rate outward
// lands in Nil Rated; purchases land in All Other ITC. Everything else has no book flag.
const annualCategoryOf = (v) => {
  if (v.voucher_type === 'Purchase') return 'itc.all_other_itc';
  const leaf =
    v.voucher_type === 'Credit Note' ? 'cn' : v.voucher_type === 'Debit Note' ? 'dn' : 'supplies';
  if (Number(v.max_rate || 0) === 0) return `not_payable.nil.${leaf}`;
  return `payable.${v.party_gstin ? 'b2b' : 'b2c'}.${leaf}`;
};

const resolveAnnualNode = (path) => {
  let node = { children: ANNUAL_TREE };
  for (const part of String(path || '')
    .split('.')
    .filter(Boolean)) {
    node = node.children?.[part];
    if (!node) return null;
  }
  return node;
};

const zeroAmts = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0, tax: 0 });
const addAmts = (acc, v) => {
  acc.txval += Number(v.taxable || 0);
  acc.iamt += Number(v.igst || 0);
  acc.camt += Number(v.cgst || 0);
  acc.samt += Number(v.sgst || 0);
  acc.tax += Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0);
};
const roundAmts = (a) => {
  for (const k of Object.keys(a)) a[k] = Number(a[k].toFixed(2));
  return a;
};

// One level of the annual drill tree with real sums per child (prefix-matched).
const getAnnualSectionBreakdown = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const path = String(opts.path || '');
    const node = resolveAnnualNode(path);
    if (!node) return { success: false, error: `Unknown annual section: ${path}` };
    if (!node.children) return { success: true, label: node.label, rows: [] };

    const { rows: vRows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );
    const sums = {}; // child key -> amounts
    for (const v of vRows) {
      const cls = classifyVoucher(v, 'ANNUAL', companyGstinInvalid);
      if (cls.bucket !== 'included') continue;
      const cat = annualCategoryOf(v);
      if (path && !cat.startsWith(`${path}.`)) continue;
      const childKey = path ? cat.slice(path.length + 1).split('.')[0] : cat.split('.')[0];
      if (!node.children[childKey]) continue;
      addAmts(sums[childKey] || (sums[childKey] = zeroAmts()), v);
    }

    return {
      success: true,
      label: node.label || '',
      rows: Object.entries(node.children).map(([key, child]) => ({
        key: path ? `${path}.${key}` : key,
        label: child.label,
        has_children: !!child.children,
        ...roundAmts(sums[key] || zeroAmts()),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Monthly summary for one category (April..March), or — with `month` (MMYYYY) — the
// intra/interstate × registered/unregistered breakup Tally shows below the month level.
const getAnnualMonthly = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const category = String(opts.category || '');
    const { fyStartDate } = await getDatesForFY(fy_id);
    const { rows: vRows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );

    const matches = vRows.filter((v) => {
      const cls = classifyVoucher(v, 'ANNUAL', companyGstinInvalid);
      if (cls.bucket !== 'included') return false;
      const cat = annualCategoryOf(v);
      return cat === category || cat.startsWith(`${category}.`);
    });

    if (opts.month) {
      const mm = String(opts.month).substring(0, 2);
      const yy = String(opts.month).substring(2, 6);
      const combos = {
        inter_reg: { label: 'Interstate supplies to registered person', amounts: zeroAmts() },
        inter_unreg: { label: 'Interstate supplies to unregistered person', amounts: zeroAmts() },
        intra_reg: { label: 'Intrastate supplies to registered person', amounts: zeroAmts() },
        intra_unreg: { label: 'Intrastate supplies to unregistered person', amounts: zeroAmts() },
      };
      for (const v of matches) {
        if (String(v.date).substring(0, 7) !== `${yy}-${mm}`) continue;
        const key = `${Number(v.is_interstate || 0) === 1 ? 'inter' : 'intra'}_${v.party_gstin ? 'reg' : 'unreg'}`;
        addAmts(combos[key].amounts, v);
      }
      return {
        success: true,
        view: 'breakup',
        rows: Object.values(combos).map((c) => ({ label: c.label, ...roundAmts(c.amounts) })),
      };
    }

    const months = buildFyMonths(fyStartDate);
    const byYm = {};
    for (const v of matches) {
      const ym = String(v.date).substring(0, 7);
      addAmts(byYm[ym] || (byYm[ym] = zeroAmts()), v);
    }
    const MONTH_NAMES = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return {
      success: true,
      view: 'monthly',
      rows: months.map((mo) => ({
        period: mo.period,
        label: MONTH_NAMES[Number(mo.period.substring(0, 2)) - 1],
        ...roundAmts(byYm[mo.ym] || zeroAmts()),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getAnnualComputation,
  getAnnualSectionBreakdown,
  getAnnualMonthly,
  annualCategoryOf,
};
