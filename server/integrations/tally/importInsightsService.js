// ---------------------------------------------------------------------------
// Tally import insights: read-only answers about a TallyPrime data folder and
// how it compares with the books. Backs the Copilot's tally_* query resources.
//
// Nothing here writes. The folder is decoded on the importer's own path
// (binExtract.extractCompany + binImportRunner.adapt), the books are read
// with SELECTs, and the two are compared in memory. "Source" always means
// Paesa's decode of the .1800 files, not Tally's own reports: the binary
// carries no closing balances, so a source closing is the opening balance
// plus every decoded voucher.
//
// How vouchers are matched (matchVouchers):
//   1. A voucher's fingerprint is its type, its date and its ledger lines,
//      each line written "ledger:Dr|Cr:amount", sorted. Fingerprints are
//      compared as multisets: a source voucher with no counterpart in the
//      books is "missing", a book voucher with no counterpart is "extra",
//      and an extra whose exact fingerprint the source has is a duplicate
//      (the same voucher imported twice).
//   2. A missing and an extra voucher with the same type, number and date are
//      paired as "changed": edited after the import, or rebuilt on save the
//      way Payroll is. A changed voucher must never be imported again.
//   3. Per ledger, books minus source = opening difference + extra - missing
//      + changed. Anything left over (the residual) means a ledger was
//      renamed or merged after the import.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');
const { db } = require('../../db/index');
const companyService = require('../../company/companyService');
const financialYearService = require('../../financialYear/financialYearService');
const { signedOpening } = require('../../report/utils/ledgerBalance');
const importer = require('./importer');
const { extractCompany } = require('./binExtract');
const { adapt, fyStartForDate } = require('./binImportRunner');
const { reconcile, reconcileFields } = require('./verifyImport');
const { REQUIRED_BIN_FILES, resolveAttachedDataDir } = require('./dataDir');

const MAX_AGENT_DECODE_BYTES = 256 * 1024 * 1024; // both .1800 files together (D5)
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;
const EXPECTED = 'expected to import';
const NO_FOLDER =
  'No Tally data folder is attached. Use "Tally folder..." in the Copilot to attach one.';
// Tally voucher types that do not post to the books in Tally. Voucher-type masters are not
// decoded (F13), so the importer cannot tell and books these as Journals.
const NON_POSTING_TALLY_TYPE = /^(memorandum|reversing journal|stat only)/i;
const BASIS =
  "Source figures are Paesa's decode of the Tally files, not Tally's own reports. A closing is the opening balance plus every voucher across all years, Dr positive and Cr negative; difference = books minus source.";

// ----- small helpers ----------------------------------------------------------

const norm = (s) =>
  String(s == null ? '' : s)
    .trim()
    .toLowerCase();
const round2 = (n) => Math.round(n * 100) / 100 + 0; // "+ 0" turns -0 into 0
const signed = (line) => (line.type === 'Dr' ? line.amount : -line.amount);
const fail = (error) => ({ success: false, error });
const clampLimit = (n) => Math.min(Math.max(Number(n) || DEFAULT_LIMIT, 1), MAX_LIMIT);
const voucherHref = (id) => `/transactions/voucher/${id}`;
const ledgerHref = (id) => `/reports/accounts/ledger?ledger_id=${id}`;
// '2025-04-01' -> '2025-26'
const fyLabel = (start) => {
  const year = Number(start.slice(0, 4));
  return `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
};
// Keep the state code and the last three characters; hide the PAN in between.
const maskGstin = (g) => (g ? `${String(g).slice(0, 2)}**********${String(g).slice(-3)}` : null);
const drTotal = (v) =>
  round2(v.entries.reduce((sum, e) => (e.type === 'Dr' ? sum + e.amount : sum), 0));
const sourceRef = (v) => ({ ref: v.ref, type: v.type, number: v.number, date: v.date });
const bookRef = (v) => ({
  voucher_id: v.voucher_id,
  href: voucherHref(v.voucher_id),
  type: v.type,
  number: v.number,
  date: v.date,
});

// ----- the source (decoded folder) --------------------------------------------

// A decoded voucher as the matcher sees it. type is what the importer would save it as;
// ref is its 1-based position in the decode, the only stable handle a source voucher has.
const toSourceVoucher = (v, i) => ({
  ref: `src-${i + 1}`,
  type: importer.mapVoucherType(v.voucherType),
  tallyType: v.originalVoucherType,
  number: v.number,
  date: v.date,
  entries: v.entries.map((e) => ({ ledger: e.ledgerName, type: e.type, amount: Number(e.amount) })),
  balanced: v.entries.length > 0 && importer.entriesBalanced(v.entries),
  hasInventory: v.inventoryEntries.length > 0,
});

// The last folder decoded, keyed on its path plus both files' size and mtime. In one
// conversation inspect, preview and verify read the same folder, and decoding is
// synchronous work in the Electron main process, so it should happen once per version of
// the files.
let cache = null;

function loadSource(dir) {
  const stats = REQUIRED_BIN_FILES.map((f) => fs.statSync(path.join(dir, f)));
  const bytes = stats.reduce((sum, s) => sum + s.size, 0);
  if (bytes > MAX_AGENT_DECODE_BYTES) {
    throw new Error(
      `This company's Tally files total ${Math.round(bytes / 1048576)} MB, more than the Copilot reads (256 MB). Use Import from TallyPrime for it.`,
    );
  }
  const key = [dir, ...stats.map((s) => `${s.size}:${s.mtimeMs}`)].join('|');
  if (cache && cache.key === key) return cache.source;

  let extracted;
  try {
    extracted = extractCompany(dir);
  } catch (err) {
    throw new Error(
      `Could not read the Tally data (${err.message}). If TallyPrime has this company open, close it and try again.`,
    );
  }
  const { parsed, diagnostics } = adapt(extracted.masters, { vouchers: extracted.vouchers }, {});
  const source = { extracted, parsed, diagnostics, vouchers: parsed.vouchers.map(toSourceVoucher) };
  cache = { key, source };
  return source;
}

const clearSourceCache = () => {
  cache = null;
};

// Vouchers the importer can book: lines present and Dr = Cr. Only these are compared.
const importable = (source) => source.vouchers.filter((v) => v.balanced);

const sourceFyStarts = (source) =>
  [...new Set(source.vouchers.filter((v) => v.date).map((v) => fyStartForDate(v.date)))].sort();

// What the importer would do with a source voucher, following importer.importVouchersPhase
// step by step (then the NOT NULL date column): EXPECTED, or the problem it would hit.
// ledgerNames holds the normalised names of the ledgers that will exist at import time.
function predictOutcome(v, ledgerNames) {
  if (!v.entries.length) return 'no ledger lines';
  // The importer resolves lines in order and stops at the first ledger it cannot find. A
  // named one fails the voucher. An unnamed one does not (F22): the voucher goes on with
  // only the lines before it, which fail the balance check unless they happen to balance.
  const stop = v.entries.findIndex((e) => !e.ledger || !ledgerNames.has(norm(e.ledger)));
  const unnamed = stop !== -1 && !v.entries[stop].ledger;
  if (stop !== -1 && !unnamed) return `ledger "${v.entries[stop].ledger}" not in Paesa`;
  const kept = unnamed ? v.entries.slice(0, stop) : v.entries;
  if (!importer.entriesBalanced(kept)) {
    return unnamed ? 'a ledger could not be named' : 'debits and credits differ';
  }
  if (!v.date) return 'no date';
  if (unnamed) {
    const saved = kept.length ? `only its first ${kept.length} line(s)` : 'no ledger lines';
    return `imports with ${saved}: a ledger could not be named`;
  }
  if (v.type === 'Payroll') return 'imports with no ledger lines (Payroll)';
  return EXPECTED;
}

// Source vouchers grouped by predicted outcome, most common first, with examples of each
// problem.
function groupOutcomes(vouchers, ledgerNames, limit) {
  const groups = new Map();
  for (const v of vouchers) {
    const reason = predictOutcome(v, ledgerNames);
    if (!groups.has(reason)) groups.set(reason, { reason, count: 0, sample: [] });
    const g = groups.get(reason);
    g.count++;
    if (reason !== EXPECTED && g.sample.length < limit) g.sample.push(sourceRef(v));
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

// Tally voucher type -> what it imports as, how many, and whether the type was guessed.
function voucherTypeRows(source) {
  const types = new Map();
  for (const v of source.vouchers) {
    const name = v.tallyType || '(no type)';
    if (!types.has(name)) {
      const guessed = source.diagnostics.fallbackCounts.has(v.tallyType);
      types.set(name, { tally_type: name, imports_as: v.type, count: 0, guessed });
    }
    types.get(name).count++;
  }
  return [...types.values()].sort((a, b) => b.count - a.count);
}

// Problems the import screen does not show before importing.
function importWarnings(source, voucherTypes) {
  const warnings = [];
  const unnamed = source.vouchers.filter((v) => v.entries.some((e) => !e.ledger)).length;
  if (unnamed) {
    const ids = [...source.diagnostics.unresolvedLinkIds].join(', ');
    warnings.push(
      `${unnamed} voucher(s) use a ledger the decode could not name (link id ${ids}). The importer keeps only the lines before that ledger, so each one fails or is saved incomplete, though the import screen counts it as balanced.`,
    );
  }
  for (const t of voucherTypes) {
    if (NON_POSTING_TALLY_TYPE.test(t.tally_type)) {
      warnings.push(
        `${t.count} "${t.tally_type}" voucher(s) would import as ${t.imports_as} and change ledger balances; in Tally this type does not post to the books.`,
      );
    } else if (t.guessed) {
      warnings.push(
        `${t.count} "${t.tally_type}" voucher(s) will import as ${t.imports_as}, a type guessed from the name.`,
      );
    }
  }
  const payroll = source.vouchers.filter((v) => v.type === 'Payroll').length;
  if (payroll) warnings.push(`${payroll} Payroll voucher(s) will import with no ledger lines.`);
  return warnings;
}

// What the folder holds, from the decode alone: identity, period, counts, voucher types,
// and warnings.
function describeSource(source) {
  const { extracted, parsed, vouchers } = source;
  const dates = vouchers
    .map((v) => v.date)
    .filter(Boolean)
    .sort();
  const fyStarts = sourceFyStarts(source);
  const counts = importer.preview(parsed);
  const voucherTypes = voucherTypeRows(source);

  return {
    identity: {
      gst_registrations: (extracted.masters.gstRegistrations || []).map((r) => ({
        name: r.name || null,
        state: r.state || null,
        gstin_masked: maskGstin(r.gstin),
      })),
    },
    period: {
      first_voucher: dates[0] || null,
      last_voucher: dates[dates.length - 1] || null,
      financial_years: fyStarts.map(fyLabel),
      // The import screen defaults to the current year; history needs the earliest one.
      suggested_books_beginning: fyStarts[0] || null,
      undated: vouchers.length - dates.length,
    },
    counts: {
      groups: counts.groups,
      ledgers: counts.ledgers,
      stock_items: counts.stockItems,
      units: counts.units,
      vouchers: counts.vouchers,
      balanced_vouchers: counts.balancedVouchers,
    },
    voucher_types: voucherTypes,
    warnings: importWarnings(source, voucherTypes),
  };
}

// ----- the books -----------------------------------------------------------------

// The company's vouchers (cancelled ones left out) with their lines, and its ledgers. One
// LEFT JOIN, so vouchers saved without lines still show up (Payroll imports, F12). A line's
// ledger name is the one stored on the line, which the importer copies from the source.
async function loadBooks(companyId) {
  const res = await db.execute(
    `SELECT v.voucher_id, v.voucher_type, v.voucher_number, v.date,
            e.ledger_id, COALESCE(e.ledger_name, l.name) AS ledger_name, e.type, e.amount
       FROM vouchers v
       LEFT JOIN voucher_entries e ON e.voucher_id = v.voucher_id
       LEFT JOIN ledgers l ON l.ledger_id = e.ledger_id
      WHERE v.company_id = ? AND COALESCE(v.is_cancelled, 0) = 0
      ORDER BY v.voucher_id, e.entry_id`,
    [companyId],
  );
  const vouchers = [];
  for (const r of res.rows) {
    let v = vouchers[vouchers.length - 1];
    if (!v || v.voucher_id !== Number(r.voucher_id)) {
      v = {
        voucher_id: Number(r.voucher_id),
        type: r.voucher_type,
        number: r.voucher_number,
        date: r.date,
        entries: [],
      };
      vouchers.push(v);
    }
    if (r.type) {
      const ledgerId = r.ledger_id == null ? null : Number(r.ledger_id);
      v.entries.push({
        ledger_id: ledgerId,
        ledger: r.ledger_name,
        type: r.type,
        amount: Number(r.amount),
      });
    }
  }
  const ledgerRes = await db.execute(
    'SELECT ledger_id, name, opening_balance, opening_balance_type FROM ledgers WHERE company_id = ?',
    [companyId],
  );
  const ledgers = ledgerRes.rows.map((l) => ({ ...l, ledger_id: Number(l.ledger_id) }));
  return { vouchers, ledgers };
}

// ----- matching ------------------------------------------------------------------

// type | date | sorted lines. Names compare ignoring case and spacing at the ends; amounts
// to the paisa, the precision both the decoder and the books keep.
function voucherFingerprint(type, date, entries) {
  const lines = entries
    .map((e) => `${norm(e.ledger)}:${e.type}:${Number(e.amount).toFixed(2)}`)
    .sort()
    .join(';');
  return `${norm(type)}|${date || ''}|${lines}`;
}

// Steps 1 and 2 of the header. Returns { matched, missing, extra, changed }: missing are
// source vouchers, extra are book vouchers with duplicate set, changed are
// { source, book } pairs.
function matchVouchers(sourceVouchers, bookVouchers) {
  const byFingerprint = (list) => {
    const groups = new Map();
    for (const v of list) {
      const fp = voucherFingerprint(v.type, v.date, v.entries);
      if (!groups.has(fp)) groups.set(fp, []);
      groups.get(fp).push(v);
    }
    return groups;
  };
  const src = byFingerprint(sourceVouchers);
  const books = byFingerprint(bookVouchers);

  // 1. Multiset compare. Book vouchers come in voucher_id order, so within a fingerprint
  //    the earliest are the matches and the later copies are the extras.
  let matched = 0;
  let missing = [];
  let extra = [];
  for (const [fp, list] of src) {
    const inBooks = (books.get(fp) || []).length;
    matched += Math.min(list.length, inBooks);
    missing.push(...list.slice(inBooks));
  }
  for (const [fp, list] of books) {
    const inSource = (src.get(fp) || []).length;
    for (const v of list.slice(inSource)) extra.push({ ...v, duplicate: inSource > 0 });
  }

  // 2. Pair the leftovers on type, number and date. A duplicate is never "changed" (the
  //    source has its exact lines), and vouchers without a number cannot be paired.
  const identity = (v) => `${norm(v.type)}|${v.number}|${v.date}`;
  const unpaired = new Map(); // identity -> extras not yet paired
  for (const b of extra) {
    if (b.duplicate || !b.number) continue;
    if (!unpaired.has(identity(b))) unpaired.set(identity(b), []);
    unpaired.get(identity(b)).push(b);
  }
  const changed = [];
  missing = missing.filter((s) => {
    const candidates = s.number ? unpaired.get(identity(s)) : null;
    if (!candidates || !candidates.length) return true;
    changed.push({ source: s, book: candidates.shift() });
    return false;
  });
  const paired = new Set(changed.map((c) => c.book));
  extra = extra.filter((b) => !paired.has(b));

  missing.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  extra.sort((a, b) => a.voucher_id - b.voucher_id);
  return { matched, missing, extra, changed };
}

// Step 3 of the header: raw per-ledger sums, signed (Dr positive). Book ledgers are keyed by
// id; a source ledger maps onto the book ledger of the same name, or stands alone when the
// books have no such ledger.
function ledgerRows(source, books, match) {
  const rows = new Map();
  const nameById = new Map(books.ledgers.map((l) => [l.ledger_id, l.name]));
  const idByName = new Map(books.ledgers.map((l) => [norm(l.name), l.ledger_id]));
  const rowFor = (key, ledgerId, name) => {
    if (!rows.has(key)) {
      rows.set(key, {
        ledger_id: ledgerId,
        name,
        source_opening: 0,
        source_movement: 0,
        paesa_opening: 0,
        paesa_movement: 0,
        missing: 0,
        extra: 0,
        changed: 0,
      });
    }
    return rows.get(key);
  };
  const bookRow = (id, lineName) => rowFor(`id:${id}`, id, nameById.get(id) || lineName);
  const sourceRow = (name) =>
    idByName.has(norm(name))
      ? bookRow(idByName.get(norm(name)))
      : rowFor(`name:${norm(name)}`, null, name || '(ledger not named in the decode)');

  for (const l of books.ledgers) {
    bookRow(l.ledger_id).paesa_opening = signedOpening(l.opening_balance, l.opening_balance_type);
  }
  for (const l of source.parsed.ledgers) {
    sourceRow(l.name).source_opening += signedOpening(l.openingBalance, l.openingBalanceType);
  }
  for (const v of importable(source)) {
    for (const e of v.entries) sourceRow(e.ledger).source_movement += signed(e);
  }
  for (const v of books.vouchers) {
    for (const e of v.entries) bookRow(e.ledger_id, e.ledger).paesa_movement += signed(e);
  }
  for (const v of match.missing) {
    for (const e of v.entries) sourceRow(e.ledger).missing += signed(e);
  }
  for (const v of match.extra) {
    for (const e of v.entries) bookRow(e.ledger_id, e.ledger).extra += signed(e);
  }
  for (const { source: s, book: b } of match.changed) {
    for (const e of b.entries) bookRow(e.ledger_id, e.ledger).changed += signed(e);
    for (const e of s.entries) sourceRow(e.ledger).changed -= signed(e);
  }
  return [...rows.values()];
}

// One ledger's closings and its difference split into the parts the match explains. Each
// part is its effect on the difference, so opening + missing + extra + changed + residual
// adds up to the difference.
function describeLedgerRow(r) {
  const sourceClosing = r.source_opening + r.source_movement;
  const paesaClosing = r.paesa_opening + r.paesa_movement;
  const difference = paesaClosing - sourceClosing;
  const explained = {
    opening: r.paesa_opening - r.source_opening,
    missing: -r.missing, // in the source, not in the books
    extra: r.extra,
    changed: r.changed,
  };
  const residual =
    difference - explained.opening - explained.missing - explained.extra - explained.changed;
  return {
    ledger_id: r.ledger_id,
    name: r.name,
    ...(r.ledger_id != null ? { href: ledgerHref(r.ledger_id) } : {}),
    source_closing: round2(sourceClosing),
    paesa_closing: round2(paesaClosing),
    difference: round2(difference),
    explained: Object.fromEntries(Object.entries(explained).map(([k, n]) => [k, round2(n)])),
    residual: round2(residual),
    ...(round2(residual) !== 0 ? { residual_reason: 'ledger renamed or merged after import' } : {}),
  };
}

// Ledgers whose books closing differs from the source, largest difference first.
function ledgerDifferences(rows) {
  return rows
    .map(describeLedgerRow)
    .filter((r) => r.difference !== 0 || r.residual !== 0)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

// Comparing a folder with the wrong company would report everything as missing. Refuse
// when fewer than half of the source's ledger names exist in the active company (given
// enough ledgers to judge).
function identityGuard(source, books) {
  const names = source.parsed.ledgers.map((l) => norm(l.name));
  if (names.length < 5) return null;
  const inBooks = new Set(books.ledgers.map((l) => norm(l.name)));
  const found = names.filter((n) => inBooks.has(n)).length;
  if (found / names.length >= 0.5) return null;
  return `Only ${found} of the ${names.length} ledgers in this Tally folder exist in the active company. Switch to the company it was imported into first.`;
}

// Why a source voucher is not in the books. An importable one was deleted or never imported.
const missingReason = (v, ledgerNames) => {
  const reason = predictOutcome(v, ledgerNames);
  return reason === EXPECTED ? 'importable, but not in the books' : reason;
};

// ----- the four resources --------------------------------------------------------

// The attached folder narrowed to one company: { dir } or { error }.
function locate(ctx, companyDir) {
  if (!ctx.tally_folder) return { error: NO_FOLDER };
  const found = resolveAttachedDataDir(ctx.tally_folder, companyDir);
  return found.dir ? { dir: found.dir } : { error: found.error };
}

// The companies in a Tally Data folder, by folder name, for the user to choose from.
const companyFolders = (root, names) =>
  names.map((name) => {
    const [manager, tranMgr] = REQUIRED_BIN_FILES.map((f) => fs.statSync(path.join(root, name, f)));
    const modified = new Date(Math.max(manager.mtimeMs, tranMgr.mtimeMs));
    return {
      company_dir: name,
      manager_bytes: manager.size,
      tranmgr_bytes: tranMgr.size,
      modified: modified.toISOString().slice(0, 10),
    };
  });

// tally_inspect: what the attached folder holds. Reads the folder only, never the books.
async function inspectFolder(ctx, args) {
  if (!ctx.tally_folder) return fail(NO_FOLDER);
  const found = resolveAttachedDataDir(ctx.tally_folder, args.company_dir);
  if (!found.dir && found.candidates.length > 1) {
    return {
      success: true,
      companies: companyFolders(ctx.tally_folder, found.candidates),
      hint: 'This Tally Data folder holds several companies. Ask the user which one, then pass its company_dir.',
    };
  }
  if (!found.dir) return fail(found.error);

  const source = loadSource(found.dir);
  const ledgerNames = new Set(source.parsed.ledgers.map((l) => norm(l.name)));
  const outcomes = groupOutcomes(source.vouchers, ledgerNames, clampLimit(args.limit));
  return {
    success: true,
    folder: path.basename(found.dir),
    ...describeSource(source),
    not_importable: outcomes.filter((g) => g.reason !== EXPECTED),
  };
}

// tally_preview: what importing this folder would do, simulated without writing. A real
// run-then-roll-back is not possible: every voucher commits in its own transaction.
async function previewImport(ctx, args) {
  const found = locate(ctx, args.company_dir);
  if (found.error) return fail(found.error);
  const source = loadSource(found.dir);
  const limit = clampLimit(args.limit);
  const fyStarts = sourceFyStarts(source);
  // The importer finds the company by name (trimmed, any case) and creates it otherwise.
  const all = args.company_name ? await companyService.getAll() : { companies: [] };
  const target = (all.companies || []).find((c) => norm(c.name) === norm(args.company_name));

  const ledgerNames = new Set(source.parsed.ledgers.map((l) => norm(l.name)));
  let masters = null;
  let duplicates = 0;
  let existingFys = new Set();
  if (target) {
    // Masters are matched by name, so these would be reused rather than created.
    const resolver = await importer.buildResolver(target.company_id);
    for (const name of resolver.ledgerNameToId.keys()) ledgerNames.add(name);
    const split = (rows, byName) => {
      const existing = rows.filter((r) => byName.has(norm(r.name))).length;
      return { new: rows.length - existing, existing };
    };
    masters = {
      groups: split(source.parsed.groups, resolver.groupNameToId),
      ledgers: split(source.parsed.ledgers, resolver.ledgerNameToId),
      stock_items: split(source.parsed.stockItems, resolver.stockNameToId),
    };
    // The importer never skips a voucher already in the books (F10).
    const books = await loadBooks(target.company_id);
    duplicates = matchVouchers(importable(source), books.vouchers).matched;
    const fys = await financialYearService.getAll(target.company_id);
    existingFys = new Set((fys.financialYears || []).map((f) => String(f.start_date).slice(0, 10)));
  }

  const { counts, period, warnings } = describeSource(source);
  return {
    success: true,
    target: target
      ? { existing_company: target.name, company_id: target.company_id }
      : { new_company: args.company_name || null },
    counts,
    period,
    warnings,
    outcomes: groupOutcomes(source.vouchers, ledgerNames, limit),
    masters,
    duplicate_risk: {
      count: duplicates,
      ...(duplicates
        ? { note: 'These vouchers are already in the books and would be booked twice.' }
        : {}),
    },
    financial_years_to_create: fyStarts.filter((s) => !existingFys.has(s)).map(fyLabel),
    suggested_settings: { books_beginning: fyStarts[0] || null, import_screen: '/import/tally' },
    limits: [
      'Simulation only; nothing was written.',
      "Predictions follow the importer's checks on the decoded data. A master that fails to save is not predicted.",
    ],
  };
}

// tally_verify: the active company's books against the folder it was imported from.
async function checkImport(ctx, args) {
  const found = locate(ctx, args.company_dir);
  if (found.error) return fail(found.error);
  if (!ctx.company_id) return fail('No active company selected.');
  const source = loadSource(found.dir);
  const books = await loadBooks(ctx.company_id);
  const refused = identityGuard(source, books);
  if (refused) return fail(refused);

  const limit = clampLimit(args.limit);
  const match = matchVouchers(importable(source), books.vouchers);
  const ledgerNames = new Set(books.ledgers.map((l) => norm(l.name)));
  const rows = ledgerRows(source, books, match);
  const differences = ledgerDifferences(rows);
  const recon = await reconcile(db, found.dir, ctx.company_id, source.extracted);
  const fields = await reconcileFields(db, source.parsed, ctx.company_id);
  const noInventory = !source.vouchers.some((v) => v.hasInventory);
  const empty = books.vouchers.filter((v) => !v.entries.length);
  const sum = (key) => round2(rows.reduce((total, r) => total + r[key], 0));

  return {
    success: true,
    basis: BASIS,
    // reconcile()'s checks, except that "Stock lines" cannot apply to an accounts-only source.
    checks: recon.checks.map((c) =>
      c.label === 'Stock lines' && noInventory
        ? { ...c, ok: null, detail: 'n/a: the source has no inventory lines' }
        : c,
    ),
    field_checks: {
      summary: fields.summary,
      failed: fields.failed.map((c) => `${c.master}.${c.field}: ${c.matched}/${c.srcHas}`),
    },
    vouchers: {
      source_importable: importable(source).length,
      in_paesa: books.vouchers.length,
      matched: match.matched,
      missing: {
        count: match.missing.length,
        sample: match.missing.slice(0, limit).map((v) => ({
          ...sourceRef(v),
          amount: drTotal(v),
          reason: missingReason(v, ledgerNames),
        })),
      },
      changed: {
        count: match.changed.length,
        sample: match.changed.slice(0, limit).map(({ source: s, book: b }) => ({
          ...bookRef(b),
          source_amount: drTotal(s),
          paesa_amount: drTotal(b),
        })),
      },
      extra: {
        count: match.extra.length,
        duplicates: match.extra.filter((v) => v.duplicate).length,
        sample: match.extra
          .slice(0, limit)
          .map((v) => ({ ...bookRef(v), amount: drTotal(v), duplicate: v.duplicate })),
      },
      empty_in_paesa: { count: empty.length, sample: empty.slice(0, limit).map(bookRef) },
    },
    ledger_differences: { count: differences.length, top: differences.slice(0, limit) },
    opening_difference: { source: sum('source_opening'), paesa: sum('paesa_opening') },
    not_importable: groupOutcomes(
      source.vouchers.filter((v) => !v.balanced),
      ledgerNames,
      limit,
    ),
  };
}

// tally_ledger_diff: one ledger's difference between books and source, voucher by voucher.
async function explainLedger(ctx, args) {
  const found = locate(ctx, args.company_dir);
  if (found.error) return fail(found.error);
  if (!ctx.company_id) return fail('No active company selected.');
  const source = loadSource(found.dir);
  const books = await loadBooks(ctx.company_id);
  const refused = identityGuard(source, books);
  if (refused) return fail(refused);
  const ledger = books.ledgers.find((l) => l.ledger_id === Number(args.ledger_id));
  if (!ledger) return fail('ledger_id is not a ledger of the active company. Use lookup.');

  const limit = clampLimit(args.limit);
  const match = matchVouchers(importable(source), books.vouchers);
  const row = ledgerRows(source, books, match).find((r) => r.ledger_id === ledger.ledger_id);
  const ledgerNames = new Set(books.ledgers.map((l) => norm(l.name)));
  // A source line belongs to this ledger by name, a book line by id.
  const inSource = (e) => norm(e.ledger) === norm(ledger.name);
  const inBooks = (e) => e.ledger_id === ledger.ledger_id;
  const touches = (v, mine) => v.entries.some(mine);
  const net = (v, mine) => round2(v.entries.filter(mine).reduce((t, e) => t + signed(e), 0));
  const drCr = (v, mine) => {
    const lines = v.entries.filter(mine);
    const total = (type) => lines.filter((e) => e.type === type).reduce((t, e) => t + e.amount, 0);
    return { dr: round2(total('Dr')), cr: round2(total('Cr')) };
  };
  const summary = describeLedgerRow(row);

  return {
    success: true,
    ledger: { ledger_id: ledger.ledger_id, name: ledger.name, href: summary.href },
    basis: BASIS,
    source: {
      opening: round2(row.source_opening),
      movement: round2(row.source_movement),
      closing: summary.source_closing,
    },
    paesa: {
      opening: round2(row.paesa_opening),
      movement: round2(row.paesa_movement),
      closing: summary.paesa_closing,
    },
    difference: summary.difference,
    explained: summary.explained,
    residual: summary.residual,
    missing_in_paesa: match.missing
      .filter((v) => touches(v, inSource))
      .slice(0, limit)
      .map((v) => ({
        ...sourceRef(v),
        ...drCr(v, inSource),
        reason: missingReason(v, ledgerNames),
      })),
    extra_in_paesa: match.extra
      .filter((v) => touches(v, inBooks))
      .slice(0, limit)
      .map((v) => ({ ...bookRef(v), ...drCr(v, inBooks), duplicate: v.duplicate })),
    changed: match.changed
      .filter(({ source: s, book: b }) => touches(s, inSource) || touches(b, inBooks))
      .slice(0, limit)
      .map(({ source: s, book: b }) => ({
        ...bookRef(b),
        source_amount: net(s, inSource),
        paesa_amount: net(b, inBooks),
      })),
    unimportable_in_source: source.vouchers
      .filter((v) => !v.balanced && touches(v, inSource))
      .slice(0, limit)
      .map((v) => ({
        ...sourceRef(v),
        ...drCr(v, inSource),
        reason: predictOutcome(v, ledgerNames),
      })),
  };
}

// Each resource returns { success: false, error } instead of throwing, and an error never
// carries the attached folder's absolute path, only its name: tool results go to the model.
const resource =
  (fn) =>
  async (ctx = {}, args = {}) => {
    const root = ctx.tally_folder;
    const scrub = (message) => (root ? message.split(root).join(path.basename(root)) : message);
    try {
      const result = await fn(ctx, args || {});
      return result.success === false ? fail(scrub(result.error)) : result;
    } catch (err) {
      return fail(scrub(String((err && err.message) || err)));
    }
  };

module.exports = {
  inspectFolder: resource(inspectFolder),
  previewImport: resource(previewImport),
  checkImport: resource(checkImport),
  explainLedger: resource(explainLedger),
  // exported for tests / reuse
  loadSource,
  clearSourceCache,
  loadBooks,
  matchVouchers,
  ledgerDifferences,
  predictOutcome,
  voucherFingerprint,
  MAX_AGENT_DECODE_BYTES,
};
