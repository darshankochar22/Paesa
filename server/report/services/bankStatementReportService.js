/**
 * bankStatementReportService.js
 *
 * Reports over imported bank statements (Banking → Import Bank Statement):
 *   getImportedStatementRegister -- R146 Imported Bank Statement: every imported
 *       statement line, per bank, with its review/posting status.
 *   getStatementMatching         -- R147 Bank Statement Matching: statement lines
 *       vs books — which lines posted a voucher, which are still unmatched, and
 *       which book-side bank entries never appeared on the statement.
 */
const { db, sql } = require('./reportHelpers');
const {
  bankStatementImports,
  bankStatementLines,
  ledgers,
  vouchers,
  voucherEntries,
  reconciliations,
} = require('../../db/schema');

const dateWindow = (params = {}) => ({
  from: params.from_date || null,
  to: params.to_date || params.as_on_date || null,
});

// Statement lines in the period, soft-deleted imports excluded. joined_voucher_id
// distinguishes "voucher exists" from "voucher was deleted after posting".
async function fetchStatementLines(company_id, from, to) {
  const conditions = [sql`s.company_id = ${company_id}`, sql`COALESCE(i.is_deleted, 0) = 0`];
  if (from) conditions.push(sql`s.txn_date >= ${from}`);
  if (to) conditions.push(sql`s.txn_date <= ${to}`);
  return db.all(sql`
    SELECT s.line_id, s.ledger_id, s.txn_date, s.narration, s.ref_no,
           s.withdrawal, s.deposit, s.status, s.voucher_type, s.voucher_id,
           bl.name AS bank_ledger_name, cl.name AS contra_ledger_name,
           i.statement_from, i.statement_to,
           v.voucher_id AS joined_voucher_id, v.voucher_number,
           v.voucher_type AS posted_voucher_type
    FROM ${bankStatementLines} s
    JOIN ${bankStatementImports} i ON i.import_id = s.import_id
    LEFT JOIN ${ledgers} bl ON bl.ledger_id = s.ledger_id
    LEFT JOIN ${ledgers} cl ON cl.ledger_id = s.contra_ledger_id
    LEFT JOIN ${vouchers} v ON v.voucher_id = s.voucher_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY bank_ledger_name ASC, s.txn_date ASC, s.line_id ASC
  `);
}

const postedLabel = (l) =>
  `${l.posted_voucher_type || l.voucher_type || 'Voucher'} No. ${l.voucher_number || l.joined_voucher_id}`;

// ---------------------------------------------------------------------------
// R146 -- Imported Bank Statement register
// ---------------------------------------------------------------------------
const getImportedStatementRegister = async (company_id, fy_id, params = {}) => {
  try {
    const { from, to } = dateWindow(params);
    const lines = await fetchStatementLines(company_id, from, to);
    if (!lines.length) {
      return {
        success: true,
        rows: [],
        message:
          'No imported bank statement lines in this period. Use Banking → Import Bank Statement to bring in a CSV statement.',
      };
    }

    let totalDeposit = 0;
    let totalWithdrawal = 0;
    const rows = lines.map((l) => {
      const deposit = Number(l.deposit) || 0;
      const withdrawal = Number(l.withdrawal) || 0;
      totalDeposit += deposit;
      totalWithdrawal += withdrawal;

      let status;
      if (l.status === 'created') {
        status = l.joined_voucher_id
          ? `Voucher created — ${postedLabel(l)}`
          : 'Pending review (its voucher was deleted)';
      } else if (l.status === 'duplicate') {
        status = 'Possible duplicate';
      } else if (l.status === 'ignored') {
        status = 'Ignored';
      } else {
        status = 'Pending review';
      }

      return {
        id: `line-${l.line_id}`,
        date: l.txn_date,
        bank_ledger: l.bank_ledger_name || `Ledger #${l.ledger_id}`,
        narration: l.narration || '',
        ref_no: l.ref_no || '',
        counter_ledger: l.contra_ledger_name || '',
        deposit: deposit > 0 ? deposit : null,
        withdrawal: withdrawal > 0 ? withdrawal : null,
        status,
        voucher_id: l.joined_voucher_id || null,
      };
    });

    rows.push({
      id: 'total',
      isTotal: true,
      date: null,
      bank_ledger: 'Total',
      narration: `${lines.length} statement line${lines.length === 1 ? '' : 's'}`,
      ref_no: '',
      counter_ledger: '',
      deposit: totalDeposit,
      withdrawal: totalWithdrawal,
      status: '',
      voucher_id: null,
    });

    return { success: true, rows };
  } catch (err) {
    console.error('Error in getImportedStatementRegister:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// R147 -- Bank Statement Matching (statement lines vs book entries)
// ---------------------------------------------------------------------------
const getStatementMatching = async (company_id, fy_id, params = {}) => {
  try {
    const { from, to } = dateWindow(params);
    const lines = await fetchStatementLines(company_id, from, to);
    if (!lines.length) {
      return {
        success: true,
        rows: [],
        message:
          'No imported bank statements to match in this period. Use Banking → Import Bank Statement first.',
      };
    }

    // Vouchers posted from ANY statement line (soft-deleted imports included —
    // a voucher posted from a since-removed worksheet is still statement-born,
    // so it must not resurface as "book only").
    const linkedRows = await db.all(sql`
      SELECT DISTINCT ledger_id, voucher_id FROM ${bankStatementLines}
      WHERE company_id = ${company_id} AND voucher_id IS NOT NULL
    `);
    const linkedByLedger = new Map();
    for (const r of linkedRows) {
      if (!linkedByLedger.has(r.ledger_id)) linkedByLedger.set(r.ledger_id, new Set());
      linkedByLedger.get(r.ledger_id).add(r.voucher_id);
    }

    // Group statement lines per bank ledger.
    const banks = new Map();
    for (const l of lines) {
      if (!banks.has(l.ledger_id)) {
        banks.set(l.ledger_id, {
          name: l.bank_ledger_name || `Ledger #${l.ledger_id}`,
          lines: [],
          coverFrom: null,
          coverTo: null,
        });
      }
      const b = banks.get(l.ledger_id);
      b.lines.push(l);
      // Statement coverage = union of the imports' declared windows; fall back
      // to the line dates when an import carries no window.
      const f = l.statement_from || l.txn_date;
      const t = l.statement_to || l.txn_date;
      if (!b.coverFrom || f < b.coverFrom) b.coverFrom = f;
      if (!b.coverTo || t > b.coverTo) b.coverTo = t;
    }

    const rows = [];
    for (const [ledger_id, bank] of banks) {
      // Compare books only inside the window the statement actually covers,
      // clipped to the report period.
      const bookFrom = from && from > bank.coverFrom ? from : bank.coverFrom;
      const bookTo = to && to < bank.coverTo ? to : bank.coverTo;
      const bookEntries = await db.all(sql`
        SELECT e.entry_id, e.type, e.amount, v.voucher_id, v.voucher_type,
               v.voucher_number, v.date, v.party_name, v.narration,
               r.bank_date AS reconciled_bank_date
        FROM ${voucherEntries} e
        JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        LEFT JOIN ${reconciliations} r ON r.entry_id = e.entry_id
        WHERE v.company_id = ${company_id}
          AND e.ledger_id = ${ledger_id}
          AND v.date >= ${bookFrom} AND v.date <= ${bookTo}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        ORDER BY v.date ASC, v.voucher_id ASC
      `);
      const linked = linkedByLedger.get(ledger_id) || new Set();
      const bookOnly = bookEntries.filter((e) => !linked.has(e.voucher_id));

      rows.push({
        id: `bank-${ledger_id}`,
        isHeader: true,
        date: null,
        bank_ledger: `${bank.name} — statement ${bank.coverFrom} to ${bank.coverTo}`,
        particulars: '',
        deposit: null,
        withdrawal: null,
        match_status: '',
        voucher_id: null,
      });

      let matched = 0;
      let stmtDeposit = 0;
      let stmtWithdrawal = 0;
      const bankRows = [];

      for (const l of bank.lines) {
        const deposit = Number(l.deposit) || 0;
        const withdrawal = Number(l.withdrawal) || 0;
        stmtDeposit += deposit;
        stmtWithdrawal += withdrawal;

        let match_status;
        if (l.status === 'created' && l.joined_voucher_id) {
          matched++;
          match_status = `Matched — ${postedLabel(l)}`;
        } else if (l.status === 'created') {
          match_status = 'Was matched — voucher deleted';
        } else if (l.status === 'duplicate') {
          match_status = 'Possible duplicate — review before posting';
        } else if (l.status === 'ignored') {
          match_status = 'Ignored';
        } else {
          match_status = 'Unmatched — pending review';
        }

        bankRows.push({
          id: `line-${l.line_id}`,
          date: l.txn_date,
          bank_ledger: bank.name,
          particulars: [l.narration, l.ref_no].filter(Boolean).join(' · ') || '(no narration)',
          deposit: deposit > 0 ? deposit : null,
          withdrawal: withdrawal > 0 ? withdrawal : null,
          match_status,
          voucher_id: l.joined_voucher_id || null,
          _sort: `${l.txn_date}~0`,
        });
      }

      for (const e of bookOnly) {
        const isIn = e.type === 'Dr'; // Dr on the bank ledger = money in.
        bankRows.push({
          id: `entry-${e.entry_id}`,
          date: e.date,
          bank_ledger: bank.name,
          particulars:
            `${e.voucher_type} No. ${e.voucher_number || e.voucher_id}` +
            (e.party_name || e.narration ? ` — ${e.party_name || e.narration}` : ''),
          deposit: isIn ? Number(e.amount) || 0 : null,
          withdrawal: isIn ? null : Number(e.amount) || 0,
          match_status: e.reconciled_bank_date
            ? `Book only — reconciled in BRS (bank date ${e.reconciled_bank_date})`
            : 'Book only — not found in statement',
          voucher_id: e.voucher_id,
          _sort: `${e.date}~1`,
        });
      }

      bankRows.sort((a, b) => (a._sort < b._sort ? -1 : a._sort > b._sort ? 1 : 0));
      for (const r of bankRows) delete r._sort;
      rows.push(...bankRows);

      rows.push({
        id: `bank-${ledger_id}-summary`,
        isTotal: true,
        date: null,
        bank_ledger: `${bank.name} — summary`,
        particulars: `Matched ${matched} of ${bank.lines.length} statement lines · ${bookOnly.length} book-only entr${bookOnly.length === 1 ? 'y' : 'ies'}`,
        deposit: stmtDeposit,
        withdrawal: stmtWithdrawal,
        match_status: '',
        voucher_id: null,
      });
    }

    return { success: true, rows };
  } catch (err) {
    console.error('Error in getStatementMatching:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { getImportedStatementRegister, getStatementMatching };
