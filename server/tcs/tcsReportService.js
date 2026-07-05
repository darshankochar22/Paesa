'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// E-TCS quarter for a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
const quarterOf = (dateStr) => {
  const s = String(dateStr || '');
  const y = Number(s.substring(0, 4));
  const m = Number(s.substring(5, 7));
  if (m >= 4 && m <= 6) return { from: `${y}-04-01`, to: `${y}-06-30` };
  if (m >= 7 && m <= 9) return { from: `${y}-07-01`, to: `${y}-09-30` };
  if (m >= 10 && m <= 12) return { from: `${y}-10-01`, to: `${y}-12-31` };
  return { from: `${y}-01-01`, to: `${y}-03-31` }; // Q4 (Jan-Mar)
};

// TCS Challan Reconciliation (#203) — mirrors TDS challan recon (#199): a TCS challan is a
// Payment voucher with a Dr entry against a Duties & Taxes ledger tagged
// ledger_statutory_details.type_of_duty_tax='TCS'; amount summed from voucher_entries.
// Section/collectee/BSR/challan/cheque identifiers come from the TCS portal / filed challan
// and stay blank until reconciled — not fabricated.
const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_number, v.party_name,
                 l.name AS party_ledger_name,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TCS'
                                   THEN ve.amount ELSE 0 END), 0) AS tcs_amount
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TCS' THEN 1 END) > 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );

    const challans = rows.map((v) => {
      const q = quarterOf(v.date);
      return {
        date: v.date,
        particulars: v.party_ledger_name || v.party_name || 'TCS Payment',
        quarter_from: q.from,
        quarter_to: q.to,
        section_no: '',
        collectee_type: '',
        resident_type: '',
        cheque_dd_no: '',
        cheque_dd_date: '',
        bsr_code: '',
        challan_no: '',
        challan_date: '',
        vch_no: v.voucher_number || '',
        amount: Number(v.tcs_amount) || 0,
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

// ---------------------------------------------------------------------------
// Form 27EQ (#204) — the quarterly TCS return. TCS twin of Form 27Q: a voucher is
// relevant when it hits a TCS-applicable ledger (is_tcs_applicable=1); the collectee
// (buyer) needs a type and PAN, and the company needs a valid TAN. Collection
// rate-buckets stay a shell until a TCS collection engine exists.
// ---------------------------------------------------------------------------

const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

const COLLECTION_ROWS_27EQ = [
  'Collection at Normal Rate',
  'Collection at Higher Rate',
  'Collection at Zero/Lower Rate',
  'Under Exemption limit',
];

const zeroCollection = () => ({
  assessable_prev: 0,
  assessable_current: 0,
  assessable_total: 0,
  tax_collectable: 0,
  collected_prev: 0,
  collected_current: 0,
  collected_total: 0,
  balance: 0,
});

// Shared classifier — one row per voucher with its 27EQ bucket + exception reason.
// reasons: collectee_type | pan | tcs_applicability (TAN invalid, surfaced under the
// Sales/Receipt Master bucket until ledger-level applicability is tracked).
const classify27EQ = async (company_id, fy_id) => {
  const tdsRows = await db.all(
    sql`SELECT tan FROM company_tds_details WHERE company_id = ${company_id} LIMIT 1`,
  );
  const tan = String(tdsRows[0] && tdsRows[0].tan ? tdsRows[0].tan : '')
    .trim()
    .toUpperCase();
  const tanValid = TAN_RE.test(tan);

  const rows = await db.all(
    sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.party_name,
               MAX(CASE WHEN l.is_tcs_applicable = 1 THEN 1 ELSE 0 END) AS has_tcs,
               p.ledger_id AS party_id, p.name AS party_ledger_name,
               p.pan AS party_pan, p.tcs_pan_it_no AS party_tcs_pan,
               p.tcs_buyer_lessee_type AS collectee_type,
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
    if (Number(r.has_tcs) === 1) {
      const ct = String(r.collectee_type || '').trim();
      const pan = String(r.party_pan || '').trim() || String(r.party_tcs_pan || '').trim();
      if (!ct || /unknown/i.test(ct)) {
        bucket = 'uncertain';
        reason = 'collectee_type';
      } else if (!pan) {
        bucket = 'uncertain';
        reason = 'pan';
      } else if (!tanValid) {
        bucket = 'uncertain';
        reason = 'tcs_applicability';
      } else {
        bucket = 'included';
      }
    }
    return { ...r, bucket, reason };
  });
};

const getForm27EQ = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};
    const rows = await classify27EQ(company_id, fy_id);
    const count = (b) => rows.filter((r) => r.bucket === b).length;

    // Payment side — TCS challans (Payment vouchers on a type_of_duty_tax='TCS' ledger).
    const payRows = await db.all(
      sql`SELECT v.voucher_id,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TCS'
                                   THEN ve.amount ELSE 0 END), 0) AS amt
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TCS' THEN 1 END) > 0`,
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
        collection_details: COLLECTION_ROWS_27EQ.map((label) => ({ label, ...zeroCollection() })),
        total_collected: zeroCollection(),
        payment: { included: payRows.length, uncertain: 0, paid_amount: paid, balance_payable: 0 },
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// The fixed exception taxonomy for 27EQ Uncertain Transactions (TCS wording of the
// TDS tree). Counts computed for reasons the classifier detects; the rest render blank.
const UNCERTAIN_TAXONOMY_27EQ = [
  {
    section: 'Master Related Exceptions',
    groups: [
      {
        title: 'Sales/Receipt Master',
        items: [
          {
            key: 'tcs_applicability',
            label: 'Unable to determine TCS applicability for ledgers or stock items',
          },
        ],
      },
      {
        title: 'Party Master',
        items: [
          { key: 'collectee_type', label: 'Unable to determine the collectee type for party' },
          { key: 'pan', label: 'PAN not available for party' },
          { key: null, label: 'Notification is not available for zero or lower rate' },
          { key: null, label: 'Party/Collectee details are not specified' },
        ],
      },
      {
        title: 'Duty Master',
        items: [{ key: null, label: 'Unable to determine TCS applicability for duty ledgers' }],
      },
      {
        title: 'Nature of Goods',
        items: [{ key: null, label: 'Unable to determine the tax rate for nature of goods' }],
      },
    ],
  },
  {
    section: 'Transaction Related Exceptions',
    groups: [
      {
        title: 'Mismatch in Nature of Goods',
        items: [{ key: null, label: 'Unable to determine the nature of goods in transaction' }],
      },
      {
        title: 'Booking & Booking with Collection Entries',
        items: [
          {
            key: null,
            label: 'No link is available in booking and booking with collection voucher',
          },
          { key: null, label: 'Unable to determine collectee details in cash transactions' },
        ],
      },
      {
        title: 'Collection Entries',
        items: [
          { key: null, label: 'TCS collected but not linked with sales/receipt transaction' },
          { key: null, label: 'Sales returns not linked with sales/receipt transaction' },
        ],
      },
      {
        title: 'Overridden Entries',
        items: [{ key: null, label: 'Transactions accepted with conflicts' }],
      },
    ],
  },
];

// One IPC surface for every Form 27EQ drill (mirrors tds getForm27QDrill):
//   view='not_relevant' | 'register' | 'uncertain' | 'resolution' | 'collection_details'
const getForm27EQDrill = async (company_id, fy_id, params = {}) => {
  try {
    const { view } = params;

    if (view === 'collection_details') {
      // Per-bucket collection breakdown — shell until a TCS collection engine exists.
      return { success: true, payload: { bucket: params.bucket || '', rows: [] } };
    }

    const rows = await classify27EQ(company_id, fy_id);

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
      const taxonomy = UNCERTAIN_TAXONOMY_27EQ.map((sec) => ({
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

      if (exception === 'collectee_type' || exception === 'pan') {
        // Offending collectee ledgers — party-level, else the entry-level TCS ledger
        // itself (Journal/Receipt vouchers often carry no party).
        const vids = uncertain.map((r) => Number(r.voucher_id)).filter(Number.isFinite);
        if (!vids.length) return { success: true, payload: { mode: 'ledgers', ledgers: [] } };
        const ledRows = await db.all(
          sql`SELECT DISTINCT l.ledger_id, l.name AS ledger_name,
                     l.tcs_buyer_lessee_type, l.pan, l.tcs_pan_it_no
              FROM voucher_entries ve
              JOIN ledgers l ON l.ledger_id = ve.ledger_id AND l.is_tcs_applicable = 1
              WHERE ve.voucher_id IN (${sql.raw(vids.join(','))})
              ORDER BY l.name`,
        );
        const partyRows = uncertain
          .filter((r) => r.party_id)
          .map((r) => ({
            ledger_id: r.party_id,
            ledger_name: r.party_ledger_name || r.party_name || '',
            tcs_buyer_lessee_type: r.collectee_type,
            pan: r.party_pan,
            tcs_pan_it_no: r.party_tcs_pan,
          }));
        const seen = new Map();
        for (const l of [...partyRows, ...ledRows]) {
          if (seen.has(l.ledger_id)) continue;
          seen.set(l.ledger_id, {
            ledger_id: l.ledger_id,
            ledger_name: l.ledger_name,
            collectee_type: String(l.tcs_buyer_lessee_type || '').trim() || 'Unknown',
            pan: String(l.pan || '').trim() || String(l.tcs_pan_it_no || '').trim(),
          });
        }
        return { success: true, payload: { mode: 'ledgers', ledgers: [...seen.values()] } };
      }

      // tcs_applicability → TCS-applicable ledgers grouped by parent group.
      const ids = uncertain.map((r) => Number(r.voucher_id)).filter(Number.isFinite);
      if (!ids.length) return { success: true, payload: { mode: 'groups', groups: [] } };
      const ledRows = await db.all(
        sql`SELECT DISTINCT l.ledger_id, l.name AS ledger_name, g.name AS group_name
            FROM voucher_entries ve
            JOIN ledgers l ON l.ledger_id = ve.ledger_id AND l.is_tcs_applicable = 1
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

    return { success: false, error: `Unknown Form 27EQ drill view: ${view}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getChallanReconciliation, getForm27EQ, getForm27EQDrill };
