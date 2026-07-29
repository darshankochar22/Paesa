// Bank-statement CSV parser (dependency-free, mirrors the repo's no-parser-library rule).
//
// Accepts the app's own template (client/src/lib/bankStatementTemplate.ts) as well as
// typical Indian bank exports: header names are matched by role (Date / Narration /
// Ref / Withdrawal / Deposit / Balance), single Amount + Dr/Cr layouts are supported
// (with the indicator column verified/discovered from the data itself), and metadata
// rows above the header ("Account Number,XXXX") are scanned for the bank account
// number used to auto-match the bank ledger.

// ---------------------------------------------------------------------------
// CSV tokenizer
// ---------------------------------------------------------------------------

// Candidate delimiter counts outside quotes in the first lines. The final pick is
// made by whichever candidate actually yields a recognisable header row (see
// parseStatement) — raw counts alone mislead when narrations contain semicolons.
function delimiterCounts(text) {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  let lines = 0;
  for (let i = 0; i < text.length && lines < 10; i++) {
    const ch = text[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch === '\n') lines++;
    else if (!inQuotes && counts[ch] !== undefined) counts[ch]++;
  }
  return counts;
}

// Parse CSV text into rows of trimmed cells. Handles quoted fields ("" escapes),
// \r\n line endings, a UTF-8 BOM, and comma/semicolon/tab delimiters. A quote is
// only an opener at the start of a cell (RFC 4180), so stray inch-marks inside
// unquoted narrations ('PIPE 5" DIA') stay literal.
function parseCsv(text, delim = null) {
  const src = String(text || '').replace(/^﻿/, '');
  if (!delim) {
    const counts = delimiterCounts(src);
    delim = Object.keys(counts).reduce((a, b) => (counts[b] > counts[a] ? b : a), ',');
  }
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.trim());
      cell = '';
      rows.push(row);
      row = [];
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell.trim());
  rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ''));
}

// ---------------------------------------------------------------------------
// Cell parsers
// ---------------------------------------------------------------------------

const MONTHS3 = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const pad2 = (n) => String(n).padStart(2, '0');

function ymd(y, m, d) {
  if (y < 100) y += 2000;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Real-calendar check: 31-02-2026 / 29-02-2027 must not become voucher dates.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

const NUMERIC_DATE = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[T\s]|$)/;

// "05-04-2026" / "5/4/26" / "2026-04-05" / "5-Apr-2026" (each optionally followed
// by a time) → "2026-04-05". Numeric forms are day-first (Indian statements)
// unless the caller detected an MM/DD file; a per-cell swap still rescues rows
// that are provably month-first.
function parseDate(raw, mmdd = false) {
  const s = String(raw || '').trim();
  if (!s) return null;

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3]));

  m = s.match(NUMERIC_DATE);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    let d = mmdd ? b : a;
    let mo = mmdd ? a : b;
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // provably the other convention
    return ymd(y, mo, d);
  }

  m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})(?:[T\s]|$)/);
  if (m) {
    const mo = MONTHS3[m[2].slice(0, 3).toLowerCase()];
    if (!mo) return null;
    return ymd(Number(m[3]), mo, Number(m[1]));
  }

  return null;
}

// "1,23,456.78", "₹ 500", "1234.00 Cr", "(250)", "500-" → { value, marker }.
// value's sign comes from parentheses / trailing minus only; marker reports an
// explicit Cr/Dr suffix so column-aware callers can decide direction themselves.
function parseAmountParts(raw) {
  let s = String(raw ?? '').trim();
  if (!s || /^[-–—]+$/.test(s)) return null;
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  let marker = null;
  const suffix = s.match(/\b(cr|dr)\.?\s*$/i);
  if (suffix) {
    marker = suffix[1].toLowerCase();
    s = s.slice(0, suffix.index);
  }
  if (/-\s*$/.test(s)) {
    sign = -1;
    s = s.replace(/-\s*$/, '');
  }
  s = s.replace(/(rs\.?|inr|₹)/gi, '').replace(/[,\s]/g, '');
  if (!s || !/^[-+]?\d*\.?\d+$/.test(s)) return null;
  return { value: sign * Number(s), marker };
}

// Signed convenience wrapper (Dr suffix → negative), kept for callers/tests.
function parseAmount(raw) {
  const parts = parseAmountParts(raw);
  if (parts == null) return null;
  if (parts.marker === 'dr') return -Math.abs(parts.value);
  if (parts.marker === 'cr') return Math.abs(parts.value);
  return parts.value;
}

// Account numbers are compared with separators stripped ("50100 1234 5678" ==
// "501001234-5678"); masked characters (X/*) survive for suffix matching.
function normalizeAccountNumber(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9*]/g, '');
}

// ---------------------------------------------------------------------------
// Header detection
// ---------------------------------------------------------------------------

// A Dr/Cr indicator column header: "Dr/Cr", "CR|DR", "Debit/Credit", "D-C",
// "Cr/Dr Flag", or a bare "Type" (the latter is verified against the data —
// banks also use "Type" for the transfer mode, NEFT/CHQ/...).
const DRCR_HEADER =
  /^(?:(?:d(?:r\.?|ebit)?)\s*[|/\\-]*\s*(?:c(?:r\.?|redit)?)|(?:c(?:r\.?|redit)?)\s*[|/\\-]*\s*(?:d(?:r\.?|ebit)?)|type)(?:\s*(?:flag|indicator))?$/i;

// A data value that belongs to a Dr/Cr indicator column.
const DRCR_VALUE = /^(cr|dr|c|d|credit|debit)\.?$/i;

// Role patterns tried in order; the first free role a header cell matches wins.
// 'date' is resolved separately (Txn Date preferred over Value Date).
const ROLE_PATTERNS = [
  ['drcr', DRCR_HEADER],
  ['amount', /^(txn\s*amount|transaction\s*amount|amount)\s*(\(.*\))?$/i],
  ['withdrawal', /(withdraw|debit|paid\s*out|^dr\.?$)/i],
  ['deposit', /(deposit|credit|paid\s*in|^cr\.?$)/i],
  ['balance', /balance/i],
  ['ref', /(ref|cheque|chq|utr|instrument|transaction\s*id|tran\s*id)/i],
  ['narration', /(narration|description|particulars|details|remarks)/i],
];

// Header cells are short labels; cells carrying data ("Statement generated
// date: 30-06-2026", "Total Debits: 5") must not claim a role.
const labelLike = (c) => !!c && c.length <= 40 && !/\d{4}/.test(c) && !/:\s*\d/.test(c);

// Map a header row's cells to roles, or null if the row isn't a plausible header.
function mapHeader(cells) {
  const roles = {};

  const dateCandidates = [];
  cells.forEach((c, i) => {
    if (labelLike(c) && /date/i.test(c)) dateCandidates.push(i);
  });
  if (dateCandidates.length) {
    roles.date =
      dateCandidates.find((i) => /(txn|trans|post)/i.test(cells[i])) ?? dateCandidates[0];
  }

  cells.forEach((c, i) => {
    if (i === roles.date || !labelLike(c)) return;
    for (const [role, pattern] of ROLE_PATTERNS) {
      if (roles[role] !== undefined) continue;
      if (pattern.test(c)) {
        roles[role] = i;
        return;
      }
    }
  });

  // Weak narration fallback: a bare "Transaction" column, only when no strong
  // narration name exists (keeps "Transaction Type" from stealing the role).
  if (roles.narration === undefined) {
    const used = new Set(Object.values(roles));
    const weak = cells.findIndex(
      (c, i) =>
        !used.has(i) &&
        labelLike(c) &&
        /transaction/i.test(c) &&
        !/(type|id|no\.?|date)\s*$/i.test(c),
    );
    if (weak >= 0) roles.narration = weak;
  }

  const hasAmounts =
    roles.withdrawal !== undefined || roles.deposit !== undefined || roles.amount !== undefined;
  if (roles.date === undefined || !hasAmounts) return null;
  return roles;
}

// Scan rows above the header for an account number ("Account Number","1234…" or
// "A/c No: 1234…" in a single cell).
function findAccountNumber(rows, headerIndex) {
  const LABEL = /\b(a\/?c\.?|acct|account)\b.{0,12}\b(no\.?|number|#)/i;
  for (let r = 0; r < headerIndex; r++) {
    const cells = rows[r];
    for (let c = 0; c < cells.length; c++) {
      if (!LABEL.test(cells[c])) continue;
      const inline = cells[c]
        .split(/[:\-–]\s*/)
        .slice(1)
        .join(' ');
      const candidates = [inline, ...cells.slice(c + 1)];
      for (const cand of candidates) {
        const m = String(cand || '').match(/[A-Za-z0-9*][A-Za-z0-9*\s-]{4,}[A-Za-z0-9*]/);
        if (m && /[\d*]{4,}/.test(m[0].replace(/[^0-9*]/g, ''))) {
          return normalizeAccountNumber(m[0]);
        }
      }
    }
  }
  return null;
}

// Non-empty values of one column across up to `limit` data rows.
function sampleColumn(rows, headerIndex, col, limit = 20) {
  const vals = [];
  for (let r = headerIndex + 1; r < rows.length && vals.length < limit; r++) {
    const v = (rows[r][col] ?? '').trim();
    if (v) vals.push(v);
  }
  return vals;
}

// ---------------------------------------------------------------------------
// parseStatement — the entry point
// ---------------------------------------------------------------------------

// Returns { success, account_number, rows, skipped, errors } where each row is
// { txn_date, narration, ref_no, withdrawal, deposit, balance }. Rows whose date
// cell doesn't parse (report footers, blank padding) are skipped, not fatal.
function parseStatement(content) {
  // Pick the delimiter that actually produces a recognisable header row.
  const counts = delimiterCounts(String(content || ''));
  const candidates = Object.keys(counts)
    .filter((d) => counts[d] > 0)
    .sort((a, b) => counts[b] - counts[a]);
  if (!candidates.length) candidates.push(',');

  let rows = null;
  let headerIndex = -1;
  let roles = null;
  for (const delim of candidates) {
    const tokenized = parseCsv(content, delim);
    for (let i = 0; i < Math.min(tokenized.length, 30); i++) {
      const mapped = mapHeader(tokenized[i]);
      if (mapped) {
        rows = tokenized;
        headerIndex = i;
        roles = mapped;
        break;
      }
    }
    if (roles) break;
  }
  if (!roles) {
    if (!parseCsv(content, candidates[0]).length) {
      return { success: false, error: 'The file is empty.' };
    }
    return {
      success: false,
      error:
        'Could not find a header row. Expected columns like Date, Narration, Withdrawal, Deposit (see the downloadable template).',
    };
  }

  // Verify a claimed Dr/Cr indicator against the data ("Type" often holds the
  // transfer mode instead), and discover an unlabelled indicator column when the
  // layout is single-Amount.
  if (roles.drcr !== undefined) {
    const vals = sampleColumn(rows, headerIndex, roles.drcr);
    const ok = vals.filter((v) => DRCR_VALUE.test(v)).length;
    if (!vals.length || ok / vals.length < 0.8) delete roles.drcr;
  }
  if (
    roles.drcr === undefined &&
    roles.amount !== undefined &&
    roles.withdrawal === undefined &&
    roles.deposit === undefined
  ) {
    const used = new Set(Object.values(roles));
    const width = rows[headerIndex].length;
    for (let c = 0; c < width; c++) {
      if (used.has(c)) continue;
      const vals = sampleColumn(rows, headerIndex, c);
      if (vals.length && vals.every((v) => DRCR_VALUE.test(v))) {
        roles.drcr = c;
        break;
      }
    }
  }

  const account_number = findAccountNumber(rows, headerIndex);

  // File-wide DD/MM vs MM/DD: if the second field exceeds 12 somewhere while the
  // first never does, the whole file is month-first.
  let firstGt12 = false;
  let secondGt12 = false;
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const m = String(rows[r][roles.date] ?? '')
      .trim()
      .match(NUMERIC_DATE);
    if (!m) continue;
    if (Number(m[1]) > 12) firstGt12 = true;
    if (Number(m[2]) > 12) secondGt12 = true;
  }
  const mmdd = secondGt12 && !firstGt12;

  const out = [];
  const errors = [];
  let skipped = 0;
  const cellAt = (cells, idx) => (idx === undefined ? '' : (cells[idx] ?? ''));

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const cells = rows[r];
    const txn_date = parseDate(cellAt(cells, roles.date), mmdd);
    if (!txn_date) {
      skipped++;
      continue;
    }

    let withdrawal = 0;
    let deposit = 0;
    if (roles.withdrawal !== undefined || roles.deposit !== undefined) {
      // Negative values / explicit Cr in a Withdrawal column are reversals
      // (money back in) and vice versa — flip instead of dropping the sign.
      const w = parseAmountParts(cellAt(cells, roles.withdrawal));
      const d = parseAmountParts(cellAt(cells, roles.deposit));
      if (w != null) {
        if (w.value < 0 || w.marker === 'cr') deposit += Math.abs(w.value);
        else withdrawal += Math.abs(w.value);
      }
      if (d != null) {
        if (d.value < 0 || d.marker === 'dr') withdrawal += Math.abs(d.value);
        else deposit += Math.abs(d.value);
      }
    } else {
      const parts = parseAmountParts(cellAt(cells, roles.amount));
      if (parts == null) {
        skipped++;
        continue;
      }
      const drcr = cellAt(cells, roles.drcr);
      let isCredit;
      if (roles.drcr !== undefined && drcr) isCredit = /^c/i.test(drcr);
      else if (parts.marker) isCredit = parts.marker === 'cr';
      else isCredit = parts.value > 0;
      if (isCredit) deposit = Math.abs(parts.value);
      else withdrawal = Math.abs(parts.value);
    }

    if (!withdrawal && !deposit) {
      skipped++;
      continue;
    }
    if (withdrawal && deposit) {
      errors.push(`Row ${r + 1}: both Withdrawal and Deposit are filled — split it into two rows.`);
      continue;
    }

    out.push({
      txn_date,
      narration: cellAt(cells, roles.narration).trim(),
      ref_no: cellAt(cells, roles.ref).trim() || null,
      withdrawal,
      deposit,
      balance: parseAmount(cellAt(cells, roles.balance)),
    });
  }

  if (!out.length) {
    return {
      success: false,
      error: 'No transaction rows found below the header (check the Date column format).',
      errors,
    };
  }

  // Single-Amount layout with no usable indicator and every value positive:
  // nothing distinguishes withdrawals — say so instead of silently guessing.
  if (
    roles.withdrawal === undefined &&
    roles.deposit === undefined &&
    roles.drcr === undefined &&
    out.length > 1 &&
    out.every((r) => r.deposit > 0)
  ) {
    errors.push(
      'No Dr/Cr column was found and every amount is positive — all rows were imported as deposits. Verify, or use the template’s Withdrawal/Deposit columns.',
    );
  }

  return { success: true, account_number, rows: out, skipped, errors };
}

module.exports = {
  parseStatement,
  parseCsv,
  parseDate,
  parseAmount,
  parseAmountParts,
  normalizeAccountNumber,
};
