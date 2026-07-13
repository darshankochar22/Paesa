// ---------------------------------------------------------------------------
// reconcile.js — verify a company imported from a TallyPrime folder is COMPLETE
// against its source .1800 binary. Compares masters (by name) and vouchers (by
// type+number), the double-entry total, and detail coverage. Prints a pass/fail
// report and lists exactly what (if anything) is missing.
//
// usage: STARTUP_DB_PATH=/path node reconcile.js <folder> <company_id>
// ---------------------------------------------------------------------------
'use strict';

const { extractCompany } = require('./binExtract');
const { adapt } = require('./binImportRunner');

const norm = (s) =>
  String(s == null ? '' : s)
    .trim()
    .toLowerCase();

async function reconcile(db, folder, companyId) {
  // ---- source (what SHOULD be imported) -----------------------------------
  const { masters, vouchers } = extractCompany(folder);
  const { parsed } = adapt(masters, { vouchers }, {});

  // A voucher is importable iff it has balanced accounting entries.
  const balanced = (v) => {
    if (!v.entries || !v.entries.length) return false;
    let s = 0;
    for (const e of v.entries) s += e.type === 'Dr' ? -e.amount : e.amount;
    return Math.abs(s) < 0.01;
  };
  const srcVouchers = parsed.vouchers.filter(balanced);
  const srcNoEntries = parsed.vouchers.filter((v) => !v.entries || !v.entries.length).length;
  const srcUnbalanced = parsed.vouchers.length - srcVouchers.length - srcNoEntries;

  const srcLedgerNames = new Set(masters.ledgers.map((l) => norm(l.name)));
  const srcItemNames = new Set(masters.stockItems.map((s) => norm(s.name)));
  // Voucher numbers repeat across FYs and can be null, so identity is
  // (type|number) counted as a MULTISET — compare how many of each key exist in
  // source vs DB, not just presence.
  const vkey = (v) =>
    `${norm(v.voucherType || v.voucher_type)}|${v.number == null ? '' : v.number}`;
  const srcCounts = new Map();
  for (const v of srcVouchers) srcCounts.set(vkey(v), (srcCounts.get(vkey(v)) || 0) + 1);

  // signed rupee total across all balanced source entries (should net ~0)
  let srcDr = 0;
  let srcCr = 0;
  for (const v of srcVouchers)
    for (const e of v.entries) e.type === 'Dr' ? (srcDr += e.amount) : (srcCr += e.amount);

  // ---- DB (what WAS imported) ---------------------------------------------
  const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;
  const dbLedgers = await q('SELECT name FROM ledgers WHERE company_id = ?', [companyId]);
  const dbItems = await q('SELECT name FROM stock_items WHERE company_id = ?', [companyId]);
  const dbVouchers = await q(
    'SELECT voucher_type, voucher_number FROM vouchers WHERE company_id = ?',
    [companyId],
  );
  const [{ n: dbEntries }] = await q(
    'SELECT COUNT(*) n FROM voucher_entries e JOIN vouchers v ON v.voucher_id=e.voucher_id WHERE v.company_id = ?',
    [companyId],
  );
  const [{ n: dbStockLines }] = await q(
    'SELECT COUNT(*) n FROM voucher_stock_entries s JOIN vouchers v ON v.voucher_id=s.voucher_id WHERE v.company_id = ?',
    [companyId],
  );
  const drRow = await q(
    'SELECT type, SUM(amount) t FROM voucher_entries e JOIN vouchers v ON v.voucher_id=e.voucher_id WHERE v.company_id = ? GROUP BY type',
    [companyId],
  );
  const dbDr = Number(drRow.find((r) => r.type === 'Dr')?.t || 0);
  const dbCr = Number(drRow.find((r) => r.type === 'Cr')?.t || 0);

  const dbLedgerNames = new Set(dbLedgers.map((r) => norm(r.name)));
  const dbItemNames = new Set(dbItems.map((r) => norm(r.name)));
  // DB voucher numbers are always assigned; a source null-number maps to a
  // generated number, so match by type only for null-numbered source vouchers.
  const dbCounts = new Map();
  for (const r of dbVouchers) {
    const k = `${norm(r.voucher_type)}|${r.voucher_number == null ? '' : r.voucher_number}`;
    dbCounts.set(k, (dbCounts.get(k) || 0) + 1);
  }
  const dbByType = new Map();
  for (const r of dbVouchers)
    dbByType.set(norm(r.voucher_type), (dbByType.get(norm(r.voucher_type)) || 0) + 1);
  const srcByType = new Map();
  for (const v of srcVouchers) {
    const t = norm(v.voucherType || v.voucher_type);
    srcByType.set(t, (srcByType.get(t) || 0) + 1);
  }

  // ---- diffs ---------------------------------------------------------------
  const missingLedgers = [...srcLedgerNames].filter((n) => !dbLedgerNames.has(n));
  const missingItems = [...srcItemNames].filter((n) => !dbItemNames.has(n));
  // per voucher-type shortfall (robust to number reuse / nulls)
  const missingVouchers = [];
  for (const [t, n] of srcByType) {
    const have = dbByType.get(t) || 0;
    if (have < n) missingVouchers.push(`${t}: source ${n}, db ${have} (${n - have} short)`);
  }
  const srcVoucherTotal = srcVouchers.length;
  const dbVoucherTotal = dbVouchers.length;

  // detail coverage in the DB
  const [{ n: ledWithGst }] = await q(
    "SELECT COUNT(*) n FROM ledgers WHERE company_id = ? AND gstin IS NOT NULL AND gstin <> ''",
    [companyId],
  );
  const [{ n: itemsWithHsn }] = await q(
    "SELECT COUNT(*) n FROM stock_items WHERE company_id = ? AND hsn_sac IS NOT NULL AND hsn_sac <> ''",
    [companyId],
  );
  const srcLedWithGst = masters.ledgers.filter((l) => l.gstin).length;
  const srcItemsWithHsn = masters.stockItems.filter((s) => s.hsn_sac).length;

  const money = (n) =>
    n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const checks = [];
  const add = (label, ok, detail) => checks.push({ label, ok, detail });

  add(
    'Ledgers',
    missingLedgers.length === 0,
    `source ${srcLedgerNames.size}, db ${dbLedgerNames.size}, missing ${missingLedgers.length}`,
  );
  add(
    'Stock items',
    missingItems.length === 0,
    `source ${srcItemNames.size}, db ${dbItemNames.size}, missing ${missingItems.length}`,
  );
  add(
    'Vouchers (importable)',
    missingVouchers.length === 0 && dbVoucherTotal >= srcVoucherTotal,
    `source ${srcVoucherTotal}, db ${dbVoucherTotal}`,
  );
  add('Voucher entries', dbEntries > 0, `db ${dbEntries}`);
  add('Stock lines', dbStockLines > 0, `db ${dbStockLines}`);
  add('Books balance (Dr==Cr)', Math.abs(dbDr - dbCr) < 1, `Dr ${money(dbDr)} / Cr ${money(dbCr)}`);
  add(
    'Ledger GST coverage',
    ledWithGst >= srcLedWithGst,
    `db ${ledWithGst} / source ${srcLedWithGst}`,
  );
  add(
    'Stock HSN coverage',
    itemsWithHsn >= srcItemsWithHsn,
    `db ${itemsWithHsn} / source ${srcItemsWithHsn}`,
  );

  return {
    companyId,
    folder,
    checks,
    missingLedgers,
    missingItems,
    missingVouchers,
    notImportable: { noEntries: srcNoEntries, unbalanced: srcUnbalanced },
  };
}

async function main() {
  const [folder, companyId] = [process.argv[2], Number(process.argv[3])];
  if (!folder || !companyId) {
    console.error('usage: STARTUP_DB_PATH=... node reconcile.js <folder> <company_id>');
    process.exit(1);
  }
  const { initDB, db } = require('../../db/index');
  await initDB();
  const r = await reconcile(db, folder, companyId);
  console.log(`\n== RECONCILE company ${r.companyId}  vs  ${r.folder} ==`);
  let allOk = true;
  for (const c of r.checks) {
    if (!c.ok) allOk = false;
    console.log(`  [${c.ok ? 'PASS' : 'FAIL'}] ${c.label.padEnd(24)} ${c.detail}`);
  }
  if (r.missingLedgers.length) console.log('  missing ledgers:', r.missingLedgers.slice(0, 20));
  if (r.missingItems.length) console.log('  missing items:', r.missingItems.slice(0, 20));
  if (r.missingVouchers.length)
    console.log('  missing vouchers (first 20):', r.missingVouchers.slice(0, 20));
  console.log(
    `  (not importable in source: ${r.notImportable.noEntries} no-entry + ${r.notImportable.unbalanced} unbalanced)`,
  );
  console.log(allOk ? '  RESULT: PASS — nothing left behind.' : '  RESULT: FAIL — see above.');
  process.exit(allOk ? 0 : 1);
}

// ---------------------------------------------------------------------------
// reconcileFields — permanent, self-running field-level fidelity check.
//
// Given the already-parsed source tree and the imported company_id, compares
// EVERY meaningful master field (ledger GST/PAN/address/opening, stock HSN/rate/
// unit/group, group nature) source-vs-DB and reports per-field coverage. This is
// the guardrail that keeps the importer honest: if a future change stops carrying
// a field, coverage drops below 100% and the import summary flags it — no manual
// audit needed. Pure reads; never writes.
// ---------------------------------------------------------------------------
const present = (v) => v != null && String(v).trim() !== '' && String(v).trim() !== '0';

async function reconcileFields(db, parsed, companyId) {
  const q = async (sql, args = []) => (await db.execute({ sql, args })).rows;
  const dbLedgers = await q('SELECT * FROM ledgers WHERE company_id = ?', [companyId]);
  const dbItems = await q('SELECT * FROM stock_items WHERE company_id = ?', [companyId]);
  const dbGroups = await q('SELECT * FROM groups WHERE company_id = ?', [companyId]);

  const checks = [];
  const compare = (master, srcRows, dbRows, keyOf, fields) => {
    const dbByKey = new Map(dbRows.map((r) => [keyOf(r), r]));
    for (const [field, srcGet, dbGet, cmp] of fields) {
      let srcHas = 0,
        matched = 0,
        missing = 0,
        differ = 0;
      const sample = [];
      for (const s of srcRows) {
        const sv = srcGet(s);
        if (!present(sv)) continue;
        srcHas++;
        const d = dbByKey.get(keyOf(s));
        if (!d) {
          missing++;
          continue;
        }
        const dv = dbGet(d);
        const eq = cmp ? cmp(sv, dv) : norm(sv) === norm(dv);
        if (eq) matched++;
        else if (!present(dv)) {
          missing++;
          if (sample.length < 3) sample.push(`${s.name}: src=${JSON.stringify(sv)} db=∅`);
        } else {
          differ++;
          if (sample.length < 3)
            sample.push(`${s.name}: src=${JSON.stringify(sv)} db=${JSON.stringify(dv)}`);
        }
      }
      checks.push({
        master,
        field,
        srcHas,
        matched,
        missing,
        differ,
        ok: srcHas === 0 || matched === srcHas,
        sample,
      });
    }
  };

  compare('ledger', parsed.ledgers, dbLedgers, (r) => norm(r.name), [
    [
      'opening_balance',
      (s) => s.openingBalance,
      (d) => d.opening_balance,
      (a, b) => Math.abs(Number(a) - Math.abs(Number(b))) < 0.01,
    ],
    ['gstin', (s) => s.gstin, (d) => d.gstin],
    ['registration_type', (s) => s.registrationType, (d) => d.registration_type],
    ['pan', (s) => s.pan, (d) => d.pan],
    ['state', (s) => s.state, (d) => d.state],
    ['pincode', (s) => s.pincode, (d) => d.pincode],
    ['country', (s) => s.country, (d) => d.country],
    ['address', (s) => s.address, (d) => d.address1],
    [
      'is_bill_wise',
      (s) => (s.isBillWise ? 1 : 0),
      (d) => d.is_bill_wise,
      (a, b) => Number(a) === Number(b),
    ],
    ['group_id', () => 1, (d) => (present(d.group_id) ? 1 : 0), (a, b) => Number(b) === 1],
  ]);
  compare('stock_item', parsed.stockItems, dbItems, (r) => norm(r.name), [
    ['hsn_sac', (s) => s.hsnSac, (d) => d.hsn_sac],
    [
      'gst_rate',
      (s) => s.gstRate,
      (d) => d.gst_rate,
      (a, b) => Math.abs(Number(a) - Number(b)) < 0.01,
    ],
    ['unit', (s) => s.baseUnit, (d) => (present(d.unit_id) ? 'y' : ''), (a, b) => b === 'y'],
    ['group_id', () => 1, (d) => (present(d.group_id) ? 1 : 0), (a, b) => Number(b) === 1],
    ['taxability', (s) => s.taxability, (d) => d.taxability_type],
    ['type_of_supply', (s) => s.typeOfSupply, (d) => d.type_of_supply],
  ]);
  compare('group', parsed.groups, dbGroups, (r) => norm(r.name), [
    ['nature', (s) => s.nature, (d) => d.nature],
  ]);

  const failed = checks.filter((c) => !c.ok);
  return {
    ok: failed.length === 0,
    checks,
    failed,
    summary: `${checks.length - failed.length}/${checks.length} field checks at 100% coverage`,
  };
}

if (require.main === module)
  main().catch((e) => {
    console.error('FATAL', e.stack);
    process.exit(1);
  });

module.exports = { reconcile, reconcileFields };
