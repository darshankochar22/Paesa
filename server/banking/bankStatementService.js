// Bank Statement Entry (Banking → Import Bank Statement).
//
// Flow: importStatement parses a CSV bank statement, matches the bank ledger via
// the ledger's bank-details account number, classifies every transaction into a
// Payment / Receipt / Contra suggestion with a counter-ledger, and persists the
// batch. The review screen edits lines (updateLine), then createVouchers posts
// real vouchers through voucherService.create and auto-reconciles the bank leg
// with the statement date (the line IS the bank statement, so its date is the
// bank date). Confirmed narration→ledger picks are learned into
// bank_statement_rules so the next import suggests them automatically.

const crypto = require('crypto');
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const {
  bankStatementImports,
  bankStatementLines,
  bankStatementRules,
  ledgers,
  ledgerBankDetails,
  groups,
  financialYears,
  voucherEntries,
  vouchers,
} = require('../db/schema');
const { parseStatement, normalizeAccountNumber } = require('./statementParser');
const voucherService = require('../voucher/voucherService');
const bankingService = require('./bankingService');

const VOUCHER_TYPES = ['Payment', 'Receipt', 'Contra'];
const EDITABLE_STATUSES = ['pending', 'ignored'];

// Group names that make a ledger a bank / cash ledger — same lists the voucher
// entry screen uses (client useVoucherLedgers checkIsBank / checkIsCashOrBank).
const BANK_GROUPS = [
  'bank accounts',
  'bank od accounts',
  'bank od a/c',
  'bank od account',
  'bank occ a/c',
];
const CASH_GROUPS = ['cash-in-hand', 'cash in hand'];

// Narration tokens that carry no counterparty information (transfer-mode noise).
const NARRATION_STOPWORDS = new Set([
  'NEFT',
  'IMPS',
  'RTGS',
  'UPI',
  'ACH',
  'NACH',
  'TRF',
  'TRANSFER',
  'CHQ',
  'CHEQUE',
  'REF',
  'INB',
  'POS',
  'PAYMENT',
  'PMT',
  'BIL',
  'BILLPAY',
  'ATM',
  'WDL',
  'DEP',
  'TXN',
  'ECOM',
  'PVT',
  'LTD',
  'LIMITED',
  'THE',
  'AND',
  'FOR',
]);

// ---------------------------------------------------------------------------
// Company context + classification
// ---------------------------------------------------------------------------

async function loadContext(company_id) {
  const groupRows = await db.all(
    sql`SELECT group_id, name, parent_group_id FROM ${groups} WHERE company_id = ${company_id}`,
  );
  const ledgerRows = await db.all(sql`
    SELECT ledger_id, name, group_id FROM ${ledgers}
    WHERE company_id = ${company_id} AND COALESCE(is_active, 1) = 1
  `);
  const bankDetailRows = await db.all(sql`
    SELECT bd.ledger_id, bd.account_number
    FROM ${ledgerBankDetails} bd
    JOIN ${ledgers} l ON l.ledger_id = bd.ledger_id
    WHERE l.company_id = ${company_id} AND COALESCE(bd.account_number, '') != ''
  `);
  const ruleRows = await db.all(
    sql`SELECT rule_id, match_text, ledger_id, voucher_type, hits FROM ${bankStatementRules} WHERE company_id = ${company_id}`,
  );

  const groupsById = new Map(groupRows.map((g) => [g.group_id, g]));
  const ledgersById = new Map(ledgerRows.map((l) => [l.ledger_id, l]));

  const lineageMatches = (group_id, names) => {
    let g = groupsById.get(group_id);
    let depth = 0;
    while (g && depth < 20) {
      if (
        names.includes(
          String(g.name || '')
            .toLowerCase()
            .trim(),
        )
      )
        return true;
      g = groupsById.get(g.parent_group_id);
      depth++;
    }
    return false;
  };

  // "Bank" follows getBankLedgers' looser rule (group name contains "bank") plus
  // the exact lineage walk, so OD/OCC sub-groups are caught either way.
  const isBankLedger = (ledger) => {
    if (!ledger) return false;
    const g = groupsById.get(ledger.group_id);
    if (
      g &&
      String(g.name || '')
        .toLowerCase()
        .includes('bank')
    )
      return true;
    return lineageMatches(ledger.group_id, BANK_GROUPS);
  };
  const isCashLedger = (ledger) => !!ledger && lineageMatches(ledger.group_id, CASH_GROUPS);

  return {
    ledgerRows,
    ledgersById,
    bankDetailRows,
    ruleRows,
    isBankLedger,
    isCashLedger,
  };
}

// Bank-group ledgers whose bank-details account number matches the statement's.
// Exact normalized match first; falls back to a trailing-digits match so masked
// numbers ("XXXXXX1234") still resolve. Party ledgers also carry bank details,
// so candidates are restricted to bank-group ledgers.
function matchBankLedgers(ctx, accountNumber) {
  const target = normalizeAccountNumber(accountNumber);
  if (!target) return [];
  const bankCandidates = ctx.bankDetailRows.filter((bd) =>
    ctx.isBankLedger(ctx.ledgersById.get(bd.ledger_id)),
  );

  const exact = bankCandidates.filter((bd) => normalizeAccountNumber(bd.account_number) === target);
  if (exact.length) return exact.map((bd) => bd.ledger_id);

  const targetDigits = target.replace(/[^0-9]/g, '');
  if (targetDigits.length < 4) return [];
  const suffix = targetDigits.slice(-Math.min(targetDigits.length, 6));
  return bankCandidates
    .filter((bd) => {
      const digits = normalizeAccountNumber(bd.account_number).replace(/[^0-9]/g, '');
      return digits.length >= 4 && (digits.endsWith(suffix) || suffix.endsWith(digits.slice(-4)));
    })
    .map((bd) => bd.ledger_id);
}

// Suggest { voucher_type, contra_ledger_id, match_source } for one statement row.
// Deposits are money INTO the bank (Receipt), withdrawals money OUT (Payment);
// the suggestion flips to Contra when the counter ledger is itself cash/bank.
function classifyRow(row, ctx, bankLedgerId) {
  const isIn = row.deposit > 0;
  const defaultType = isIn ? 'Receipt' : 'Payment';
  const upper = String(row.narration || '').toUpperCase();
  const alnum = upper.replace(/[^A-Z0-9]/g, '');
  // Rule keys are stored space-normalized (see ruleKeyFromNarration), so match
  // them against the narration normalized the same way.
  const spaced = ` ${upper.replace(/[^A-Z0-9]+/g, ' ').trim()} `;

  const typeFor = (ledger_id) => {
    const ledger = ctx.ledgersById.get(ledger_id);
    return ctx.isBankLedger(ledger) || ctx.isCashLedger(ledger) ? 'Contra' : defaultType;
  };

  // 1. Another own account's number inside the narration → inter-account Contra.
  for (const bd of ctx.bankDetailRows) {
    if (bd.ledger_id === bankLedgerId) continue;
    const acct = normalizeAccountNumber(bd.account_number);
    if (acct.length >= 6 && !acct.includes('*') && alnum.includes(acct)) {
      return {
        voucher_type: typeFor(bd.ledger_id),
        contra_ledger_id: bd.ledger_id,
        match_source: 'account_number',
      };
    }
  }

  // 2. Learned rules — longest matching text wins, then most-used.
  const ruleHits = ctx.ruleRows
    .filter(
      (r) =>
        r.match_text &&
        r.ledger_id !== bankLedgerId &&
        spaced.includes(` ${r.match_text} `) &&
        ctx.ledgersById.has(r.ledger_id),
    )
    .sort((a, b) => b.match_text.length - a.match_text.length || (b.hits || 0) - (a.hits || 0));
  if (ruleHits.length) {
    const rule = ruleHits[0];
    const voucher_type = VOUCHER_TYPES.includes(rule.voucher_type)
      ? rule.voucher_type
      : typeFor(rule.ledger_id);
    // A learned Payment rule can't apply to a deposit (and vice versa) — Contra can.
    const usable = voucher_type === 'Contra' || voucher_type === defaultType;
    if (usable) {
      return { voucher_type, contra_ledger_id: rule.ledger_id, match_source: 'rule' };
    }
  }

  // 3. A ledger's own name inside the narration — longest name wins.
  let named = null;
  for (const l of ctx.ledgerRows) {
    if (l.ledger_id === bankLedgerId) continue;
    const name = String(l.name || '')
      .toUpperCase()
      .trim();
    if (name.length >= 4 && upper.includes(name)) {
      if (!named || name.length > named.name.length) named = { ledger_id: l.ledger_id, name };
    }
  }
  if (named) {
    return {
      voucher_type: typeFor(named.ledger_id),
      contra_ledger_id: named.ledger_id,
      match_source: 'ledger_name',
    };
  }

  // 4. Keyword defaults: charges / interest / ATM-cash.
  const findLedger = (pattern) =>
    ctx.ledgerRows.find((l) => pattern.test(String(l.name || '')) && l.ledger_id !== bankLedgerId);
  if (/\b(CHG|CHRG|CHARGE|CHARGES|FEE|FEES|AMC)\b/.test(upper)) {
    const l = findLedger(/charge/i);
    if (l) {
      return { voucher_type: defaultType, contra_ledger_id: l.ledger_id, match_source: 'keyword' };
    }
  }
  if (/\bINT\b|INTEREST/.test(upper)) {
    const l = findLedger(/interest/i);
    if (l) {
      return { voucher_type: defaultType, contra_ledger_id: l.ledger_id, match_source: 'keyword' };
    }
  }
  if (/\bATM\b|CASH\s*(WDL|WITHDRAWAL|DEP|DEPOSIT)|\bCSH\b|\bSELF\b/.test(upper)) {
    const l = ctx.ledgerRows.find(
      (x) => x.ledger_id !== bankLedgerId && ctx.isCashLedger(ctx.ledgersById.get(x.ledger_id)),
    );
    if (l) {
      return { voucher_type: 'Contra', contra_ledger_id: l.ledger_id, match_source: 'keyword' };
    }
  }

  return { voucher_type: defaultType, contra_ledger_id: null, match_source: null };
}

// Counterparty key learned from a narration ("NEFT-AXISB123-ACME TRADERS-INV88"
// → "ACME TRADERS"): transfer-mode noise, numbers and short tokens dropped.
function ruleKeyFromNarration(narration) {
  const tokens = String(narration || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(' ')
    .filter(
      (t) => t.length >= 3 && !NARRATION_STOPWORDS.has(t) && !/^\d+$/.test(t) && !/\d{4,}/.test(t),
    );
  return tokens.join(' ').slice(0, 40).trim();
}

function lineHash(company_id, ledger_id, row) {
  const key = [
    company_id,
    ledger_id,
    row.txn_date,
    Number(row.withdrawal || 0).toFixed(2),
    Number(row.deposit || 0).toFixed(2),
    String(row.narration || '')
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim(),
  ].join('|');
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function fetchLineWithNames(line_id) {
  const rows = await db.all(sql`
    SELECT s.*, cl.name AS contra_ledger_name, v.voucher_number
    FROM ${bankStatementLines} s
    LEFT JOIN ${ledgers} cl ON cl.ledger_id = s.contra_ledger_id
    LEFT JOIN ${vouchers} v ON v.voucher_id = s.voucher_id
    WHERE s.line_id = ${line_id} LIMIT 1
  `);
  return rows[0] || null;
}

module.exports = {
  // Parse + classify + persist one statement file. When no ledger_id is passed
  // and the account number doesn't resolve to exactly one bank ledger, returns
  // { needs_ledger: true } so the renderer can ask the user to pick the bank.
  importStatement: async ({ company_id, ledger_id = null, file_name = null, content }) => {
    try {
      if (!company_id) return { success: false, error: 'company_id is required' };
      if (!content || !String(content).trim()) {
        return { success: false, error: 'The file is empty.' };
      }

      const parsed = parseStatement(content);
      if (!parsed.success) return parsed;

      const ctx = await loadContext(company_id);

      let bankLedgerId = null;
      let matched_by = null;
      if (ledger_id) {
        const ledger = ctx.ledgersById.get(Number(ledger_id));
        if (!ledger) return { success: false, error: 'Bank ledger not found for this company' };
        bankLedgerId = ledger.ledger_id;
        matched_by = 'manual';
      } else {
        const candidates = parsed.account_number
          ? matchBankLedgers(ctx, parsed.account_number)
          : [];
        if (candidates.length === 1) {
          bankLedgerId = candidates[0];
          matched_by = 'account_number';
        } else {
          return {
            success: true,
            needs_ledger: true,
            account_number: parsed.account_number || null,
            rows_found: parsed.rows.length,
            candidates: candidates.map((id) => ({
              ledger_id: id,
              name: ctx.ledgersById.get(id)?.name || '',
            })),
          };
        }
      }

      const existing = await db.all(sql`
        SELECT line_hash FROM ${bankStatementLines}
        WHERE company_id = ${company_id} AND ledger_id = ${bankLedgerId}
      `);
      const seenHashes = new Set(existing.map((r) => r.line_hash).filter(Boolean));

      const dates = parsed.rows.map((r) => r.txn_date).sort();
      let duplicates = 0;
      let suggested = 0;

      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
      let import_id;
      try {
        const inserted = await db
          .insert(bankStatementImports)
          .values({
            companyId: company_id,
            ledgerId: bankLedgerId,
            fileName: file_name || null,
            accountNumber: parsed.account_number || null,
            statementFrom: dates[0],
            statementTo: dates[dates.length - 1],
            totalRows: parsed.rows.length,
          })
          .returning({ id: bankStatementImports.importId });
        import_id = Number(inserted[0].id);

        for (const row of parsed.rows) {
          const hash = lineHash(company_id, bankLedgerId, row);
          const isDuplicate = seenHashes.has(hash);
          if (isDuplicate) duplicates++;
          const suggestion = classifyRow(row, ctx, bankLedgerId);
          if (suggestion.contra_ledger_id) suggested++;
          await db.insert(bankStatementLines).values({
            importId: import_id,
            companyId: company_id,
            ledgerId: bankLedgerId,
            txnDate: row.txn_date,
            narration: row.narration || null,
            refNo: row.ref_no || null,
            withdrawal: row.withdrawal || 0,
            deposit: row.deposit || 0,
            balance: row.balance ?? null,
            voucherType: suggestion.voucher_type,
            contraLedgerId: suggestion.contra_ledger_id,
            matchSource: suggestion.match_source,
            status: isDuplicate ? 'duplicate' : 'pending',
            lineHash: hash,
          });
        }
        await db.execute({ sql: 'COMMIT', args: [] });
      } catch (txErr) {
        await db.execute({ sql: 'ROLLBACK', args: [] });
        throw txErr;
      }

      return {
        success: true,
        import_id,
        ledger_id: bankLedgerId,
        ledger_name: ctx.ledgersById.get(bankLedgerId)?.name || '',
        matched_by,
        total: parsed.rows.length,
        duplicates,
        suggested,
        skipped: parsed.skipped || 0,
        warnings: parsed.errors || [],
      };
    } catch (err) {
      console.error('Error in banking.importStatement:', err);
      return { success: false, error: err.message };
    }
  },

  // All imports for a company, newest first, with per-status line counts.
  getImports: async (company_id) => {
    try {
      const rows = await db.all(sql`
        SELECT i.*, l.name AS ledger_name,
               COALESCE(SUM(CASE WHEN s.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
               COALESCE(SUM(CASE WHEN s.status = 'created' THEN 1 ELSE 0 END), 0) AS created_count,
               COALESCE(SUM(CASE WHEN s.status = 'ignored' THEN 1 ELSE 0 END), 0) AS ignored_count,
               COALESCE(SUM(CASE WHEN s.status = 'duplicate' THEN 1 ELSE 0 END), 0) AS duplicate_count
        FROM ${bankStatementImports} i
        LEFT JOIN ${ledgers} l ON l.ledger_id = i.ledger_id
        LEFT JOIN ${bankStatementLines} s ON s.import_id = i.import_id
        WHERE i.company_id = ${company_id} AND COALESCE(i.is_deleted, 0) = 0
        GROUP BY i.import_id
        ORDER BY i.import_id DESC
      `);
      return { success: true, imports: rows };
    } catch (err) {
      console.error('Error in banking.getStatementImports:', err);
      return { success: false, error: err.message, imports: [] };
    }
  },

  // One import's header + its lines (counter-ledger name and voucher number joined in).
  getImportLines: async (company_id, import_id) => {
    try {
      const headers = await db.all(sql`
        SELECT i.*, l.name AS ledger_name
        FROM ${bankStatementImports} i
        LEFT JOIN ${ledgers} l ON l.ledger_id = i.ledger_id
        WHERE i.import_id = ${import_id} AND i.company_id = ${company_id}
          AND COALESCE(i.is_deleted, 0) = 0
        LIMIT 1
      `);
      if (!headers.length) {
        return { success: false, error: 'Statement import not found', rows: [] };
      }
      let rows = await db.all(sql`
        SELECT s.*, cl.name AS contra_ledger_name, v.voucher_number,
               v.voucher_id AS joined_voucher_id
        FROM ${bankStatementLines} s
        LEFT JOIN ${ledgers} cl ON cl.ledger_id = s.contra_ledger_id
        LEFT JOIN ${vouchers} v ON v.voucher_id = s.voucher_id
        WHERE s.import_id = ${import_id} AND s.company_id = ${company_id}
        ORDER BY s.txn_date ASC, s.line_id ASC
      `);
      // Heal lines whose voucher was deleted elsewhere (Day Book delete leaves
      // the line frozen at 'created' with a dangling voucher_id otherwise).
      const dangling = rows.filter((r) => r.voucher_id != null && r.joined_voucher_id == null);
      if (dangling.length) {
        for (const r of dangling) {
          await db
            .update(bankStatementLines)
            .set({ status: 'pending', voucherId: null })
            .where(eq(bankStatementLines.lineId, r.line_id));
        }
        rows = rows.map((r) =>
          r.voucher_id != null && r.joined_voucher_id == null
            ? { ...r, status: 'pending', voucher_id: null, voucher_number: null }
            : r,
        );
      }
      rows = rows.map(({ joined_voucher_id: _omit, ...rest }) => rest);
      return { success: true, import: headers[0], rows };
    } catch (err) {
      console.error('Error in banking.getStatementImportLines:', err);
      return { success: false, error: err.message, rows: [] };
    }
  },

  // Review-screen edits: voucher_type, counter ledger, pending⇄ignored. Lines
  // whose voucher is already created are frozen.
  updateLine: async ({ company_id, line_id, voucher_type, contra_ledger_id, status }) => {
    try {
      if (!company_id || !line_id) {
        return { success: false, error: 'company_id and line_id are required' };
      }
      const line = await fetchLineWithNames(line_id);
      if (!line || line.company_id !== Number(company_id)) {
        return { success: false, error: 'Statement line not found' };
      }
      if (line.status === 'created') {
        return { success: false, error: 'A voucher was already created for this line' };
      }

      const sets = {};
      if (voucher_type !== undefined) {
        if (!VOUCHER_TYPES.includes(voucher_type)) {
          return {
            success: false,
            error: `voucher_type must be one of ${VOUCHER_TYPES.join(', ')}`,
          };
        }
        // The line's money direction is fixed by the statement: a deposit can
        // only be a Receipt/Contra, a withdrawal only a Payment/Contra.
        if (Number(line.deposit) > 0 && voucher_type === 'Payment') {
          return { success: false, error: 'A deposit cannot be a Payment — use Receipt or Contra' };
        }
        if (Number(line.withdrawal) > 0 && voucher_type === 'Receipt') {
          return {
            success: false,
            error: 'A withdrawal cannot be a Receipt — use Payment or Contra',
          };
        }
        sets.voucherType = voucher_type;
      }
      if (contra_ledger_id !== undefined) {
        if (contra_ledger_id === null) {
          sets.contraLedgerId = null;
          sets.matchSource = null;
        } else {
          if (Number(contra_ledger_id) === Number(line.ledger_id)) {
            return {
              success: false,
              error: 'The counter ledger cannot be the statement’s own bank ledger',
            };
          }
          const found = await db.all(sql`
            SELECT ledger_id FROM ${ledgers}
            WHERE ledger_id = ${contra_ledger_id} AND company_id = ${company_id} LIMIT 1
          `);
          if (!found.length) return { success: false, error: 'Ledger not found for this company' };
          sets.contraLedgerId = Number(contra_ledger_id);
          sets.matchSource = 'manual';
        }
      }
      if (status !== undefined) {
        if (!EDITABLE_STATUSES.includes(status)) {
          return { success: false, error: `status must be one of ${EDITABLE_STATUSES.join(', ')}` };
        }
        sets.status = status;
      }
      if (!Object.keys(sets).length) return { success: false, error: 'Nothing to update' };

      await db
        .update(bankStatementLines)
        .set(sets)
        .where(
          and(
            eq(bankStatementLines.lineId, Number(line_id)),
            eq(bankStatementLines.companyId, Number(company_id)),
          ),
        );
      return { success: true, line: await fetchLineWithNames(line_id) };
    } catch (err) {
      console.error('Error in banking.updateStatementLine:', err);
      return { success: false, error: err.message };
    }
  },

  // Post vouchers for the given lines. Each line becomes one Payment / Receipt /
  // Contra voucher (deposit → Dr bank, withdrawal → Cr bank); the bank leg is
  // auto-reconciled with the statement date and the narration→ledger pick is
  // learned as a rule. Per-line failures don't block the rest.
  createVouchers: async ({
    company_id,
    line_ids,
    auto_reconcile = true,
    include_duplicates = false,
  }) => {
    try {
      if (!company_id || !Array.isArray(line_ids) || !line_ids.length) {
        return { success: false, error: 'company_id and line_ids are required' };
      }

      const lines = await db.all(sql`
        SELECT * FROM ${bankStatementLines}
        WHERE company_id = ${company_id} AND line_id IN (${sql.join(
          line_ids.map((id) => sql`${Number(id)}`),
          sql`, `,
        )})
        ORDER BY txn_date ASC, line_id ASC
      `);
      const fys = await db.all(sql`
        SELECT fy_id, start_date, end_date FROM ${financialYears} WHERE company_id = ${company_id}
      `);
      const ctx = await loadContext(company_id);
      const ledgerName = new Map(ctx.ledgerRows.map((l) => [l.ledger_id, l.name]));

      const results = [];
      for (const line of lines) {
        const fail = (error) => results.push({ line_id: line.line_id, success: false, error });
        try {
          if (line.status === 'created') {
            fail('Voucher already created');
            continue;
          }
          if (line.status === 'ignored') {
            fail('Line is ignored');
            continue;
          }
          // Duplicates never post via the bulk default — the renderer passes
          // include_duplicates only for lines the user explicitly selected.
          if (line.status === 'duplicate' && !include_duplicates) {
            fail('Flagged as a possible duplicate — select the line explicitly to post it');
            continue;
          }
          if (!VOUCHER_TYPES.includes(line.voucher_type)) {
            fail('Set a voucher type (Payment / Receipt / Contra) first');
            continue;
          }
          if (!line.contra_ledger_id || !ledgerName.has(line.contra_ledger_id)) {
            fail('Assign a ledger to this line first');
            continue;
          }
          if (Number(line.contra_ledger_id) === Number(line.ledger_id)) {
            fail('The counter ledger cannot be the statement’s own bank ledger');
            continue;
          }
          const isIn = Number(line.deposit) > 0;
          const amount = isIn ? Number(line.deposit) : Number(line.withdrawal);
          if (!(amount > 0)) {
            fail('Line has no amount');
            continue;
          }
          // Type must agree with the money direction the statement dictates.
          if (isIn && line.voucher_type === 'Payment') {
            fail('A deposit cannot be a Payment — use Receipt or Contra');
            continue;
          }
          if (!isIn && line.voucher_type === 'Receipt') {
            fail('A withdrawal cannot be a Receipt — use Payment or Contra');
            continue;
          }
          const contraLedger = ctx.ledgersById.get(line.contra_ledger_id);
          const contraIsCashBank = ctx.isBankLedger(contraLedger) || ctx.isCashLedger(contraLedger);
          if (line.voucher_type === 'Contra' && !contraIsCashBank) {
            fail('Contra requires a bank or cash counter ledger');
            continue;
          }
          const fy = fys.find((f) => f.start_date <= line.txn_date && line.txn_date <= f.end_date);
          if (!fy) {
            fail(`No financial year covers ${line.txn_date} — create it first`);
            continue;
          }

          // Inter-account transfers appear on BOTH banks' statements; if the
          // other side already posted this Contra, don't post it again.
          if (line.voucher_type === 'Contra') {
            const bankSide = isIn ? 'Dr' : 'Cr';
            const otherSide = isIn ? 'Cr' : 'Dr';
            const existing = await db.all(sql`
              SELECT v.voucher_id, v.voucher_number
              FROM ${vouchers} v
              JOIN ${voucherEntries} e1 ON e1.voucher_id = v.voucher_id
                AND e1.ledger_id = ${line.ledger_id} AND e1.type = ${bankSide}
              JOIN ${voucherEntries} e2 ON e2.voucher_id = v.voucher_id
                AND e2.ledger_id = ${line.contra_ledger_id} AND e2.type = ${otherSide}
              WHERE v.company_id = ${company_id}
                AND v.voucher_type = 'Contra'
                AND v.date = ${line.txn_date}
                AND COALESCE(v.is_cancelled, 0) = 0
                AND ABS(e1.amount - ${amount}) < 0.01
              LIMIT 1
            `);
            if (existing.length) {
              fail(
                `A matching Contra voucher already exists (No. ${existing[0].voucher_number || existing[0].voucher_id}) — likely the other side of this transfer; reconcile it in BRS instead`,
              );
              continue;
            }
          }

          const bankEntry = {
            ledger_id: line.ledger_id,
            ledger_name: ledgerName.get(line.ledger_id) || null,
            type: isIn ? 'Dr' : 'Cr',
            amount,
          };
          const contraEntry = {
            ledger_id: line.contra_ledger_id,
            ledger_name: ledgerName.get(line.contra_ledger_id) || null,
            type: isIn ? 'Cr' : 'Dr',
            amount,
          };

          const res = await voucherService.create({
            company_id: Number(company_id),
            fy_id: fy.fy_id,
            voucher_type: line.voucher_type,
            date: line.txn_date,
            narration: line.narration || 'Imported from bank statement',
            reference_number: line.ref_no || null,
            is_accounting_voucher: 1,
            is_invoice: 0,
            entry_mode: 'double',
            entries: isIn ? [bankEntry, contraEntry] : [contraEntry, bankEntry],
          });
          if (!res.success) {
            fail(res.error || 'Voucher creation failed');
            continue;
          }
          const voucher = res.voucher;

          await db
            .update(bankStatementLines)
            .set({ status: 'created', voucherId: voucher.voucher_id })
            .where(eq(bankStatementLines.lineId, line.line_id));

          if (auto_reconcile) {
            const bankSide = isIn ? 'Dr' : 'Cr';
            const entryRows = await db.all(sql`
              SELECT entry_id FROM ${voucherEntries}
              WHERE voucher_id = ${voucher.voucher_id}
                AND ledger_id = ${line.ledger_id}
                AND type = ${bankSide}
              LIMIT 1
            `);
            if (entryRows.length) {
              await bankingService.reconcile({
                entry_id: entryRows[0].entry_id,
                voucher_id: voucher.voucher_id,
                ledger_id: line.ledger_id,
                bank_date: line.txn_date,
                reconciled_date: line.txn_date,
                bank_reference: line.ref_no || null,
              });
            }
          }

          const key = ruleKeyFromNarration(line.narration);
          if (key.length >= 4) {
            const prior = await db.all(sql`
              SELECT rule_id FROM ${bankStatementRules}
              WHERE company_id = ${company_id} AND match_text = ${key} LIMIT 1
            `);
            if (prior.length) {
              await db.run(sql`
                UPDATE ${bankStatementRules}
                SET ledger_id = ${line.contra_ledger_id}, voucher_type = ${line.voucher_type},
                    hits = hits + 1, updated_at = datetime('now')
                WHERE rule_id = ${prior[0].rule_id}
              `);
            } else {
              await db.insert(bankStatementRules).values({
                companyId: Number(company_id),
                matchText: key,
                ledgerId: line.contra_ledger_id,
                voucherType: line.voucher_type,
              });
            }
          }

          results.push({
            line_id: line.line_id,
            success: true,
            voucher_id: voucher.voucher_id,
            voucher_number: voucher.voucher_number,
          });
        } catch (lineErr) {
          // One bad line must not abort the batch (its voucher, if created,
          // is already committed by voucherService.create's own transaction).
          console.error('Error posting statement line', line.line_id, lineErr);
          fail(lineErr.message);
        }
      }

      const created = results.filter((r) => r.success).length;
      return { success: true, created, failed: results.length - created, results };
    } catch (err) {
      console.error('Error in banking.createVouchersFromStatement:', err);
      return { success: false, error: err.message };
    }
  },

  // Remove an import. Vouchers already created from it stay — deleting the
  // worksheet must never delete posted books entries. When the import HAS
  // created lines, it is soft-deleted (hidden) and those lines are kept so
  // line_hash duplicate detection still recognises the transactions on a
  // re-import; only never-posted lines are physically removed.
  deleteImport: async ({ company_id, import_id }) => {
    try {
      if (!company_id || !import_id) {
        return { success: false, error: 'company_id and import_id are required' };
      }
      const found = await db.all(sql`
        SELECT import_id FROM ${bankStatementImports}
        WHERE import_id = ${import_id} AND company_id = ${company_id}
          AND COALESCE(is_deleted, 0) = 0
        LIMIT 1
      `);
      if (!found.length) return { success: false, error: 'Statement import not found' };

      const created = await db.all(sql`
        SELECT COUNT(*) AS n FROM ${bankStatementLines}
        WHERE import_id = ${import_id} AND company_id = ${company_id} AND status = 'created'
      `);
      const hasCreated = Number(created[0]?.n || 0) > 0;

      await db.run(sql`
        DELETE FROM ${bankStatementLines}
        WHERE import_id = ${import_id} AND company_id = ${company_id} AND status != 'created'
      `);
      if (hasCreated) {
        await db.run(sql`
          UPDATE ${bankStatementImports} SET is_deleted = 1
          WHERE import_id = ${import_id} AND company_id = ${company_id}
        `);
      } else {
        await db.run(sql`
          DELETE FROM ${bankStatementImports}
          WHERE import_id = ${import_id} AND company_id = ${company_id}
        `);
      }
      return { success: true, removed: 1 };
    } catch (err) {
      console.error('Error in banking.deleteStatementImport:', err);
      return { success: false, error: err.message };
    }
  },
};
