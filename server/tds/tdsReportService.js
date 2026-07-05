'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// E-TDS quarter for a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
const quarterOf = (dateStr) => {
  const s = String(dateStr || '');
  const y = Number(s.substring(0, 4));
  const m = Number(s.substring(5, 7));
  if (m >= 4 && m <= 6) return { from: `${y}-04-01`, to: `${y}-06-30` };
  if (m >= 7 && m <= 9) return { from: `${y}-07-01`, to: `${y}-09-30` };
  if (m >= 10 && m <= 12) return { from: `${y}-10-01`, to: `${y}-12-31` };
  return { from: `${y}-01-01`, to: `${y}-03-31` }; // Q4 (Jan-Mar)
};

// TDS Challan Reconciliation — a TDS challan is a Payment voucher with an entry against
// a Duties & Taxes ledger tagged type_of_duty_tax='TDS'; the amount is the total TDS
// debited, summed from voucher_entries (the voucher row carries no amount column).
// Section number, deductee/resident type, BSR code, cheque and challan identifiers come
// from the TDS portal / filed challan and stay blank until reconciled — not fabricated.
const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_number, v.party_name,
                 l.name AS party_ledger_name,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TDS'
                                   THEN ve.amount ELSE 0 END), 0) AS tds_amount
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TDS' THEN 1 END) > 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );

    const challans = rows.map((v) => {
      const q = quarterOf(v.date);
      return {
        date: v.date,
        particulars: v.party_ledger_name || v.party_name || 'TDS Payment',
        quarter_from: q.from,
        quarter_to: q.to,
        section_no: '',
        deductee_type: '',
        resident_type: '',
        cheque_dd_no: '',
        cheque_dd_date: '',
        bsr_code: '',
        challan_no: '',
        challan_date: '',
        vch_no: v.voucher_number || '',
        amount: Number(v.tds_amount) || 0,
      };
    });

    return {
      success: true,
      payload: { challans, period_label: `${fy.start_date || ''} to ${fy.end_date || ''}` },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

const DEDUCTION_ROWS = [
  'Deduction at Normal Rate',
  'Deduction at Higher Rate',
  'Lower Rated Taxable Expense',
  'Zero rated Taxable Expense',
  'Under Exemption limit',
  'Exempt in lieu of PAN available',
];

const zeroDeduction = () => ({
  assessable_prev: 0,
  assessable_current: 0,
  assessable_total: 0,
  tax_deductable: 0,
  deducted_prev: 0,
  deducted_current: 0,
  deducted_total: 0,
  balance: 0,
});

// Form 26Q — the quarterly TDS return for non-salary payments. A voucher is relevant
// when it hits a TDS-deductable ledger (is_tds_deductable=1); it becomes Uncertain when
// the company TAN is invalid/missing OR the deductee party has no PAN (mirrors the GST
// classifier). The deduction rate-buckets stay zero until a TDS deduction engine exists;
// the payment side sums TDS challans (Payment vouchers on a type_of_duty_tax='TDS' ledger).
const getForm26Q = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const tdsRows = await db.all(
      sql`SELECT tan FROM company_tds_details WHERE company_id = ${company_id} LIMIT 1`,
    );
    const tan = String(tdsRows[0] && tdsRows[0].tan ? tdsRows[0].tan : '')
      .trim()
      .toUpperCase();
    const tanValid = TAN_RE.test(tan);

    const rows = await db.all(
      sql`SELECT v.voucher_id,
                 MAX(CASE WHEN l.is_tds_deductable = 1 THEN 1 ELSE 0 END) AS has_tds,
                 p.pan AS party_pan
          FROM vouchers v
          LEFT JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = ve.ledger_id
          LEFT JOIN ledgers p ON p.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          GROUP BY v.voucher_id`,
    );

    let total = 0;
    let included = 0;
    let notRelevant = 0;
    let uncertain = 0;
    for (const r of rows) {
      total++;
      if (Number(r.has_tds) !== 1) {
        notRelevant++;
        continue;
      }
      const partyPanMissing = !String(r.party_pan || '').trim();
      if (!tanValid || partyPanMissing) uncertain++;
      else included++;
    }

    const payRows = await db.all(
      sql`SELECT v.voucher_id,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TDS'
                                   THEN ve.amount ELSE 0 END), 0) AS amt
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TDS' THEN 1 END) > 0`,
    );
    const paid = payRows.reduce((s, r) => s + (Number(r.amt) || 0), 0);

    return {
      success: true,
      payload: {
        period_label: `${fy.start_date || ''} to ${fy.end_date || ''}`,
        voucher_status: { total, included, not_relevant: notRelevant, uncertain },
        deduction_details: DEDUCTION_ROWS.map((label) => ({ label, ...zeroDeduction() })),
        total_deducted: zeroDeduction(),
        payment: { included: payRows.length, uncertain: 0, paid_amount: paid, balance_payable: 0 },
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Form 27Q — the quarterly TDS return for payments to NON-RESIDENTS. Same spine
// as Form 26Q, but a voucher only belongs here when the deductee (party) is a
// non-resident type; resident deductees are Not Relevant (26Q territory) and a
// missing deductee type is an Uncertain exception. Deduction rows stay a shell
// (like 26Q) until a TDS deduction engine exists — 27Q adds the DTAA bucket.
// ---------------------------------------------------------------------------

const DEDUCTION_ROWS_27Q = [
  'Deduction at Normal Rate',
  'Deduction at Higher Rate',
  'Lower Rated Taxable Expense',
  'Zero rated Taxable Expense',
  'Under Exemption limit',
  'DTAA Rated Taxable Expenses',
];

const isNonResidentDeductee = (t) => {
  const s = String(t || '').toLowerCase();
  return (
    s.includes('non-resident') ||
    s.includes('non resident') ||
    s.includes('foreign') ||
    s.includes('nri')
  );
};

// Shared classifier: one row per voucher with its 27Q bucket + exception reason.
// reasons: deductee_type | pan | tds_applicability (TAN invalid — surfaced under the
// Expenses/Purchase Master bucket until ledger-level applicability is tracked).
const classify27Q = async (company_id, fy_id) => {
  const tdsRows = await db.all(
    sql`SELECT tan FROM company_tds_details WHERE company_id = ${company_id} LIMIT 1`,
  );
  const tan = String(tdsRows[0] && tdsRows[0].tan ? tdsRows[0].tan : '')
    .trim()
    .toUpperCase();
  const tanValid = TAN_RE.test(tan);

  const rows = await db.all(
    sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.party_name,
               MAX(CASE WHEN l.is_tds_deductable = 1 THEN 1 ELSE 0 END) AS has_tds,
               p.ledger_id AS party_id, p.name AS party_ledger_name,
               p.pan AS party_pan, p.deductee_type AS party_deductee_type,
               COALESCE(SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END), 0) AS amount
        FROM vouchers v
        LEFT JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
        LEFT JOIN ledgers l ON l.ledger_id = ve.ledger_id
        LEFT JOIN ledgers p ON p.ledger_id = v.party_ledger_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
        GROUP BY v.voucher_id
        ORDER BY v.date ASC, v.voucher_id ASC`,
  );

  return rows.map((r) => {
    let bucket = 'not_relevant';
    let reason = null;
    if (Number(r.has_tds) === 1) {
      const dt = String(r.party_deductee_type || '').trim();
      if (!dt || /unknown/i.test(dt)) {
        bucket = 'uncertain';
        reason = 'deductee_type';
      } else if (!isNonResidentDeductee(dt)) {
        bucket = 'not_relevant'; // resident deductee → belongs to 26Q, not 27Q
      } else if (!String(r.party_pan || '').trim()) {
        bucket = 'uncertain';
        reason = 'pan';
      } else if (!tanValid) {
        bucket = 'uncertain';
        reason = 'tds_applicability';
      } else {
        bucket = 'included';
      }
    }
    return { ...r, bucket, reason };
  });
};

const getForm27Q = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};
    const rows = await classify27Q(company_id, fy_id);

    const count = (b) => rows.filter((r) => r.bucket === b).length;

    const payRows = await db.all(
      sql`SELECT v.voucher_id,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TDS'
                                   THEN ve.amount ELSE 0 END), 0) AS amt
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TDS' THEN 1 END) > 0`,
    );
    const paid = payRows.reduce((s, r) => s + (Number(r.amt) || 0), 0);

    return {
      success: true,
      payload: {
        period_label: `${fy.start_date || ''} to ${fy.end_date || ''}`,
        voucher_status: {
          total: rows.length,
          included: count('included'),
          not_relevant: count('not_relevant'),
          uncertain: count('uncertain'),
        },
        deduction_details: DEDUCTION_ROWS_27Q.map((label) => ({ label, ...zeroDeduction() })),
        total_deducted: zeroDeduction(),
        payment: { included: payRows.length, uncertain: 0, paid_amount: paid, balance_payable: 0 },
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// The fixed Tally exception taxonomy for 27Q Uncertain Transactions. Counts are
// computed for the reasons the classifier can actually detect; the rest render blank.
const UNCERTAIN_TAXONOMY_27Q = [
  {
    section: 'Master Related Exceptions',
    groups: [
      {
        title: 'Expenses/Purchase Master',
        items: [
          {
            key: 'tds_applicability',
            label: 'Unable to determine TDS applicability for ledgers or stock items',
          },
        ],
      },
      {
        title: 'Party Master',
        items: [
          { key: 'deductee_type', label: 'Unable to determine the deductee type for party' },
          { key: 'pan', label: 'PAN not available for party' },
          { key: null, label: 'Notification is not available for zero or lower rate' },
          { key: null, label: 'Party/Deductee details are not specified' },
        ],
      },
      {
        title: 'Duty Master',
        items: [{ key: null, label: 'Unable to determine TDS applicability for duty ledgers' }],
      },
      {
        title: 'Nature of Payment',
        items: [{ key: null, label: 'Unable to determine the tax rate for nature of payment' }],
      },
    ],
  },
  {
    section: 'Transaction Related Exceptions',
    groups: [
      {
        title: 'Mismatch in Nature of Payment',
        items: [{ key: null, label: 'Unable to determine the nature of payment in transaction' }],
      },
      {
        title: 'Booking & Booking with Deduction Entries',
        items: [
          {
            key: null,
            label: 'No link is available in booking and booking with deduction voucher',
          },
          { key: null, label: 'Unable to determine deductee details in cash transactions' },
        ],
      },
      {
        title: 'Deduction Entries',
        items: [
          { key: null, label: 'TDS deducted but not linked with expense/purchase transaction' },
          {
            key: null,
            label: 'Expenses/purchase returns not linked with expense/purchase transaction',
          },
        ],
      },
      {
        title: 'Overridden Entries',
        items: [{ key: null, label: 'Transactions accepted with conflicts' }],
      },
    ],
  },
];

// One IPC surface for every Form 27Q drill-down (kept together so the classifier runs once
// per request and every view stays consistent with the summary counts).
//   view='not_relevant'          → voucher-type breakdown of Not Relevant vouchers
//   view='register'              → voucher list, filtered by { bucket, voucher_type }
//   view='uncertain'             → exception taxonomy with per-exception voucher counts
//   view='resolution'            → data to resolve one exception ({ exception })
const getForm27QDrill = async (company_id, fy_id, params = {}) => {
  try {
    const { view } = params;
    const rows = await classify27Q(company_id, fy_id);

    if (view === 'not_relevant') {
      const byType = new Map();
      for (const r of rows) {
        if (r.bucket !== 'not_relevant') continue;
        byType.set(r.voucher_type, (byType.get(r.voucher_type) || 0) + 1);
      }
      const breakdown = [...byType.entries()]
        .map(([voucher_type, count]) => ({ voucher_type, count }))
        .sort((a, b) => a.voucher_type.localeCompare(b.voucher_type));
      return {
        success: true,
        payload: { breakdown, total: rows.filter((r) => r.bucket === 'not_relevant').length },
      };
    }

    if (view === 'register') {
      const { bucket = 'not_relevant', voucher_type } = params;
      const list = rows
        .filter((r) => r.bucket === bucket && (!voucher_type || r.voucher_type === voucher_type))
        .map((r) => ({
          voucher_id: r.voucher_id,
          date: r.date,
          particulars: r.party_ledger_name || r.party_name || r.voucher_type,
          voucher_type: r.voucher_type,
          voucher_number: r.voucher_number || '',
          amount: Number(r.amount) || 0,
        }));
      return { success: true, payload: { vouchers: list } };
    }

    if (view === 'uncertain') {
      const counts = {};
      for (const r of rows) {
        if (r.bucket !== 'uncertain' || !r.reason) continue;
        counts[r.reason] = (counts[r.reason] || 0) + 1;
      }
      const taxonomy = UNCERTAIN_TAXONOMY_27Q.map((sec) => ({
        section: sec.section,
        groups: sec.groups.map((g) => ({
          title: g.title,
          items: g.items.map((it) => ({
            key: it.key,
            label: it.label,
            count: it.key ? counts[it.key] || 0 : 0,
          })),
        })),
      }));
      return { success: true, payload: { taxonomy } };
    }

    if (view === 'resolution') {
      const { exception } = params;
      const uncertain = rows.filter((r) => r.bucket === 'uncertain' && r.reason === exception);

      if (exception === 'deductee_type' || exception === 'pan') {
        // Distinct offending ledgers among the uncertain vouchers. The deductee may be the
        // voucher party OR (when no party is set — Journal/Payment/Receipt) the entry-level
        // TDS-deductable ledger itself, so resolve from voucher_entries.
        const vids = uncertain.map((r) => Number(r.voucher_id)).filter(Number.isFinite);
        if (!vids.length) return { success: true, payload: { mode: 'ledgers', ledgers: [] } };
        const ledRows = await db.all(
          sql`SELECT DISTINCT l.ledger_id, l.name AS ledger_name, l.deductee_type, l.pan
              FROM voucher_entries ve
              JOIN ledgers l ON l.ledger_id = ve.ledger_id AND l.is_tds_deductable = 1
              WHERE ve.voucher_id IN (${sql.raw(vids.join(','))})
              ORDER BY l.name`,
        );
        const partyRows = uncertain
          .filter((r) => r.party_id)
          .map((r) => ({
            ledger_id: r.party_id,
            ledger_name: r.party_ledger_name || r.party_name || '',
            deductee_type: r.party_deductee_type,
            pan: r.party_pan,
          }));
        const seen = new Map();
        for (const l of [...partyRows, ...ledRows]) {
          if (seen.has(l.ledger_id)) continue;
          seen.set(l.ledger_id, {
            ledger_id: l.ledger_id,
            ledger_name: l.ledger_name,
            deductee_type: String(l.deductee_type || '').trim() || 'Unknown',
            pan: String(l.pan || '').trim(),
          });
        }
        return { success: true, payload: { mode: 'ledgers', ledgers: [...seen.values()] } };
      }

      // tds_applicability → the TDS-deductable expense/purchase ledgers hit by those
      // vouchers, grouped by parent group (mirrors Tally's List of Groups resolution).
      const ids = uncertain.map((r) => Number(r.voucher_id)).filter(Number.isFinite);
      if (!ids.length) return { success: true, payload: { mode: 'groups', groups: [] } };
      // ids are our own integer PKs — safe to inline; drizzle's sql`` can't expand arrays in IN().
      const ledRows = await db.all(
        sql`SELECT DISTINCT l.ledger_id, l.name AS ledger_name, g.name AS group_name
            FROM voucher_entries ve
            JOIN ledgers l ON l.ledger_id = ve.ledger_id AND l.is_tds_deductable = 1
            LEFT JOIN groups g ON g.group_id = l.group_id
            WHERE ve.voucher_id IN (${sql.raw(ids.join(','))})
            ORDER BY g.name, l.name`,
      );
      const byGroup = new Map();
      for (const r of ledRows) {
        const key = r.group_name || 'Primary';
        if (!byGroup.has(key)) byGroup.set(key, []);
        byGroup.get(key).push({ ledger_id: r.ledger_id, ledger_name: r.ledger_name });
      }
      const groups = [...byGroup.entries()].map(([group_name, ledgers]) => ({
        group_name,
        ledgers,
      }));
      return { success: true, payload: { mode: 'groups', groups } };
    }

    return { success: false, error: `Unknown Form 27Q drill view: ${view}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// #202 — Return Transaction Book, TDS Outstandings, Ledgers Without PAN
// ---------------------------------------------------------------------------

// TDS Return Transaction Book — the register of SAVED returns (Tally's "Save Return" /
// "Save as Revised" on Form 26Q/27Q). No return-saving engine exists yet, so the book is
// honestly empty with the correct column contract (Date / From / To / Tax Type /
// Is Modified / Form Type) — rows appear once saving returns is implemented.
const getReturnTransactionBook = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};
    return {
      success: true,
      payload: {
        period_label: `${fy.start_date || ''} to ${fy.end_date || ''}`,
        returns: [],
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// TDS Outstandings — TDS deducted (Cr on a type_of_duty_tax='TDS' ledger) but not yet
// paid to the government (Dr on the same ledger), grouped by Nature of Payment or by
// Party. The Company / Non Company split follows the voucher party's deductee type
// ("…Company…" → Company bucket; anything else, or no party → Non Company).
const getTdsOutstandings = async (company_id, fy_id, { by = 'nature' } = {}) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const rows = await db.all(
      sql`SELECT ve.type, ve.amount,
                 dl.nature_of_payment, dl.name AS duty_ledger_name,
                 v.party_name, p.name AS party_ledger_name, p.deductee_type
          FROM voucher_entries ve
          JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
            AND sd.type_of_duty_tax = 'TDS'
          JOIN ledgers dl ON dl.ledger_id = ve.ledger_id
          JOIN vouchers v ON v.voucher_id = ve.voucher_id
          LEFT JOIN ledgers p ON p.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0`,
    );

    const buckets = new Map();
    for (const r of rows) {
      const key =
        by === 'party'
          ? r.party_ledger_name || r.party_name || '(No Party)'
          : r.nature_of_payment || r.duty_ledger_name || 'Any';
      if (!buckets.has(key)) buckets.set(key, { label: key, company: 0, non_company: 0 });
      const b = buckets.get(key);
      // Cr = deducted (adds to pending); Dr = paid to govt (reduces pending).
      const signed = (r.type === 'Cr' ? 1 : -1) * (Number(r.amount) || 0);
      const isCompany = /company/i.test(String(r.deductee_type || ''));
      if (isCompany) b.company += signed;
      else b.non_company += signed;
    }

    const out = [...buckets.values()]
      .map((b) => ({
        label: b.label,
        company: b.company,
        non_company: b.non_company,
        total_pending: b.company + b.non_company,
      }))
      .filter((b) => b.total_pending !== 0)
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      success: true,
      payload: {
        period_label: `${fy.start_date || ''} to ${fy.end_date || ''}`,
        by,
        rows: out,
        grand_total: out.reduce((s, r) => s + r.total_pending, 0),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Ledgers Without PAN — deductee ledgers (deductee type set, or hit as a TDS deductable
// party) whose PAN is missing. Contact columns come from the ledger's mailing details.
const getLedgersWithoutPan = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT ledger_id, name, deductee_type, mailing_name, phone, pan, tds_pan_it_no
          FROM ledgers
          WHERE company_id = ${company_id}
            AND (
              (deductee_type IS NOT NULL AND TRIM(deductee_type) != ''
               AND LOWER(TRIM(deductee_type)) != 'unknown')
              OR is_tds_deductable = 1
            )
            AND (pan IS NULL OR TRIM(pan) = '')
            AND (tds_pan_it_no IS NULL OR TRIM(tds_pan_it_no) = '')
          ORDER BY name`,
    );
    return {
      success: true,
      payload: {
        ledgers: rows.map((r) => ({
          ledger_id: r.ledger_id,
          name: r.name,
          deductee_type: String(r.deductee_type || '').trim() || 'Unknown',
          contact_person: r.mailing_name || '',
          contact_no: r.phone || '',
          pan: '',
        })),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getChallanReconciliation,
  getForm26Q,
  getForm27Q,
  getForm27QDrill,
  getReturnTransactionBook,
  getTdsOutstandings,
  getLedgersWithoutPan,
};
