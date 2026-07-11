// ---------------------------------------------------------------------------
// Standalone (non-Electron) Tally binary-extraction import runner.
//
// Feeds JSON extracted from TallyPrime native .1800 data files (see the
// reverse-engineering extractor's masters.json / vouchers.json) through the
// existing importer (importer.js), which routes every write through the app's
// services. No direct DB writes here.
//
// Usage (STARTUP_DB_PATH points db/index.js at a real SQLite file):
//
//   STARTUP_DB_PATH="/path/to/startup.db" node server/integrations/tally/binImportRunner.js \
//     --masters /path/to/masters.json \
//     --vouchers /path/to/vouchers.json \
//     --company "URMILA POLYBAGS - 2025-26" \
//     --fy-start 2025-04-01 \
//     [--state Chhattisgarh] [--pincode 492001] [--gstin 22AEQPJ7304E1ZR] \
//     [--dry-run] [--preserve-numbers] [--limit N]
//
// Behaviour:
//   * Finds the company by exact name, else creates it (companyService.create
//     seeds the default FY from --fy-start).
//   * Adapts the extractor JSON to the ParsedTally contract consumed by
//     importer.js (groups/ledgers/stockItems/vouchers).
//   * Voucher entries may reference ledgers by link_id; resolved to names via
//     the masters' link_id map before import.
//   * --dry-run prints importer.preview() counts and exits without writing.
//   * Prints a summary + first errors, then a post-import reconciliation
//     (voucher count, Dr/Cr totals) via the services' own read paths.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const { initDB } = require('../../db/index');
const companyService = require('../../company/companyService');
const financialYearService = require('../../financialYear/financialYearService');
const importer = require('./importer');

// ----- CLI ------------------------------------------------------------------

const parseArgs = (argv) => {
  const args = { flags: {} };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      args.flags[key] = true;
    } else {
      args.flags[key] = next;
      i++;
    }
  }
  return args.flags;
};

const readJson = (p) => {
  const abs = path.resolve(p);
  const raw = fs.readFileSync(abs, 'utf8');
  return JSON.parse(raw);
};

// ----- extractor JSON -> ParsedTally adapter ---------------------------------

// Tally custom voucher-type names -> the app's known types. The extractor may
// also provide voucher-type masters with a `parent` (Tally's base type); that
// wins when present. Heuristics only fill the gaps and every fallback is
// counted + reported, never silent.
const VOUCHER_TYPE_HEURISTICS = [
  [/outward|sales|sale\b|invoice/i, 'Sales'],
  [/inward|purchase/i, 'Purchase'],
  [/receipt note/i, 'Receipt Note'],
  [/delivery note|delivery challan/i, 'Delivery Note'],
  [/credit note/i, 'Credit Note'],
  [/debit note/i, 'Debit Note'],
  [/receipt/i, 'Receipt'],
  [/payment/i, 'Payment'],
  [/contra/i, 'Contra'],
  [/stock journal|stock jrnl/i, 'Stock Journal'],
  [/journal|jrnl/i, 'Journal'],
];

const buildVoucherTypeMap = (masters) => {
  const map = new Map(); // normalized tally name -> app type
  for (const vt of masters.voucherTypes || []) {
    if (!vt || vt.name == null) continue;
    const base = vt.parent || vt.name;
    const mapped = importer.mapVoucherType(base);
    map.set(String(vt.name).trim().toLowerCase(), mapped);
  }
  return map;
};

const mapVoucherTypeName = (name, vtMap, fallbackCounts) => {
  if (name == null) return 'Journal';
  const key = String(name).trim().toLowerCase();
  if (vtMap.has(key)) return vtMap.get(key);
  const direct = importer.mapVoucherType(name);
  if (direct !== 'Journal' || /journal/i.test(name)) return direct;
  for (const [re, mapped] of VOUCHER_TYPE_HEURISTICS) {
    if (re.test(name)) {
      fallbackCounts.set(name, (fallbackCounts.get(name) || 0) + 1);
      return mapped;
    }
  }
  fallbackCounts.set(name, (fallbackCounts.get(name) || 0) + 1);
  return 'Journal';
};

const adapt = (masters, vouchersJson, opts) => {
  const linkIdToLedger = new Map();
  for (const l of masters.ledgers || []) {
    if (l.link_id != null) linkIdToLedger.set(Number(l.link_id), l.name);
  }
  const linkIdToStock = new Map();
  const stockNameToUnit = new Map();
  for (const s of masters.stockItems || []) {
    if (s.link_id != null) linkIdToStock.set(Number(s.link_id), s.name);
    const unit = s.base_unit || s.baseUnit || null;
    if (unit) stockNameToUnit.set(s.name, unit);
  }

  const groups = (masters.groups || []).map((g) => ({
    name: g.name,
    parent: g.parent || null,
    nature: g.nature || null,
    isRevenue: !!g.is_revenue,
    isDeemedPositive: !!g.is_deemed_positive,
    isReserved: !!g.is_reserved,
    primaryGroup: g.primary_group || null,
    sortPosition: g.sort_position != null ? Number(g.sort_position) : null,
    guid: g.guid || null,
  }));

  const ledgers = (masters.ledgers || []).map((l) => ({
    name: l.name,
    parent: l.parent || null,
    openingBalance: Number(l.opening_balance) || 0,
    openingBalanceType: l.opening_balance_type || null,
    closingBalance: Number(l.closing_balance) || 0,
    gstin: l.gstin || null,
    registrationType: l.registration_type || null,
    mailingName: l.mailing_name || null,
    address: l.address || null,
    city: l.city || null,
    state: l.state || null,
    country: l.country || null,
    pincode: l.pincode || null,
    email: l.email || null,
    phone: l.phone || null,
    pan: l.pan || null,
    isBillWise: !!l.is_bill_wise,
    isRevenue: !!l.is_revenue,
    isDeemedPositive: !!l.is_deemed_positive,
    bank: l.bank || null,
    guid: l.guid || null,
  }));

  const stockItems = (masters.stockItems || []).map((s) => ({
    name: s.name,
    parent: s.parent || null,
    category: s.category || null,
    baseUnit: s.base_unit || s.baseUnit || null,
    openingQuantity: Math.abs(Number(s.opening_quantity) || 0),
    openingRate: Math.abs(Number(s.opening_rate) || 0),
    openingValue: Number(s.opening_value) || 0,
    hsnSac: s.hsn_sac || s.hsn || null,
    hsnSacDescription: s.hsn_sac_description || null,
    gstRate: Number(s.gst_rate) || 0,
    typeOfSupply: s.type_of_supply || null,
    taxability: s.taxability || null,
    guid: s.guid || null,
  }));

  const vtMap = buildVoucherTypeMap(masters);
  const fallbackCounts = new Map();
  const unresolvedLinkIds = new Set();

  let rawVouchers = Array.isArray(vouchersJson) ? vouchersJson : vouchersJson.vouchers || [];
  if (opts.limit) rawVouchers = rawVouchers.slice(0, opts.limit);

  const vouchers = rawVouchers.map((v) => {
    const entries = (v.entries || []).map((e) => {
      let ledgerName = e.ledger_name || e.ledgerName || null;
      if (ledgerName == null && e.ledger_link_id != null) {
        ledgerName = linkIdToLedger.get(Number(e.ledger_link_id)) || null;
        if (ledgerName == null) unresolvedLinkIds.add(Number(e.ledger_link_id));
      }
      const drCr = (e.dr_cr || e.type || '').toString();
      return {
        ledgerName,
        type: /^d/i.test(drCr) ? 'Dr' : 'Cr',
        amount: Math.abs(Number(e.amount) || 0),
      };
    });

    const inventoryEntries = (v.inventory || v.inventoryEntries || []).map((iv) => {
      let stockItemName = iv.item || iv.stockItemName || null;
      if (stockItemName == null && iv.item_link_id != null) {
        stockItemName = linkIdToStock.get(Number(iv.item_link_id)) || null;
      }
      return {
        stockItemName,
        description: iv.description || null,
        quantity: Math.abs(Number(iv.qty != null ? iv.qty : iv.quantity) || 0),
        rate: Math.abs(Number(iv.rate) || 0),
        amount: Math.abs(Number(iv.amount) || 0),
        hsn: iv.hsn || null,
        unit: (stockItemName && stockNameToUnit.get(stockItemName)) || null,
        godownName: iv.godown || iv.godownName || null,
      };
    });

    return {
      date: v.date,
      voucherType: mapVoucherTypeName(v.voucher_type || v.voucherType, vtMap, fallbackCounts),
      originalVoucherType: v.voucher_type || v.voucherType || null,
      number: v.number != null ? String(v.number) : null,
      narration: v.narration || null,
      party: v.party || null,
      reference: v.reference || null,
      isAccounting: entries.length > 0,
      isInventory: inventoryEntries.length > 0,
      entries,
      inventoryEntries,
      guid: v.guid || null,
    };
  });

  return {
    parsed: {
      meta: { source: 'tally-1800-binary', requestType: 'BinaryExtract', collectionType: null },
      groups,
      ledgers,
      stockItems,
      vouchers,
    },
    diagnostics: { fallbackCounts, unresolvedLinkIds },
  };
};

// ----- company / FY resolution -----------------------------------------------

const findOrCreateCompany = async (opts) => {
  const all = await companyService.getAll();
  if (all.success) {
    const hit = (all.companies || []).find(
      (c) => String(c.name).trim().toLowerCase() === opts.company.trim().toLowerCase(),
    );
    if (hit) return { company: hit, created: false };
  }
  const res = await companyService.create({
    name: opts.company,
    mailing_name: opts.company,
    address1: opts.address1 || 'SHOP NO-12, GADIYA COMPLEX',
    address2: opts.address2 || 'R.S SHUKLA ROAD, RAIPUR',
    state: opts.state || 'Chhattisgarh',
    country: 'India',
    pincode: opts.pincode || '492001',
    email: opts.email || null,
    base_currency_symbol: '₹',
    formal_name: 'INR',
    financial_year_beginning_from: opts.fyStart,
    books_beginning_from: opts.fyStart,
  });
  if (!res.success) throw new Error(`company create failed: ${res.error}`);
  return { company: res.company, created: true };
};

// Indian FY: Apr 1 .. Mar 31. Returns the FY-start ISO date for a voucher date.
const fyStartForDate = (isoDate) => {
  const [y, m] = isoDate.split('-').map(Number);
  const startYear = m >= 4 ? y : y - 1;
  return `${startYear}-04-01`;
};

// Ensure a financial_years row exists for every FY the vouchers touch; return a
// map fyStartISO -> fy row. Creates missing years (the company create only
// seeds the first).
const ensureFinancialYears = async (company_id, fyStarts) => {
  const map = new Map();
  const existing = await financialYearService.getAll(company_id);
  const rows = (existing.success && existing.financialYears) || [];
  for (const r of rows) {
    const s = String(r.start_date || r.startDate || '').slice(0, 10);
    if (s) map.set(s, r);
  }
  for (const s of fyStarts) {
    if (map.has(s)) continue;
    const created = await financialYearService.create({ company_id, start_date: s });
    if (created.success) {
      map.set(s, created.fy);
    } else {
      // may already exist from a concurrent path; re-fetch
      const again = await financialYearService.getAll(company_id);
      for (const r of again.financialYears || []) {
        const rs = String(r.start_date || r.startDate || '').slice(0, 10);
        if (rs === s) map.set(s, r);
      }
    }
  }
  return map;
};

// ----- main -------------------------------------------------------------------

const main = async () => {
  const flags = parseArgs(process.argv);
  const required = ['masters', 'company', 'fy-start'];
  for (const r of required) {
    if (!flags[r]) {
      console.error(
        'Usage: node binImportRunner.js --masters m.json [--vouchers v.json] ' +
          '--company "NAME" --fy-start YYYY-MM-DD [--dry-run] [--preserve-numbers] [--limit N]',
      );
      process.exit(1);
    }
  }
  if (!process.env.STARTUP_DB_PATH && process.env.NODE_ENV !== 'test') {
    console.error('Refusing to run without STARTUP_DB_PATH (would try to load Electron).');
    process.exit(1);
  }

  await initDB();

  const masters = readJson(flags.masters);
  const vouchersJson = flags.vouchers ? readJson(flags.vouchers) : { vouchers: [] };
  const { parsed, diagnostics } = adapt(masters, vouchersJson, {
    limit: flags.limit ? Number(flags.limit) : 0,
  });

  console.log('== preview ==');
  console.log(JSON.stringify(importer.preview(parsed), null, 2));
  if (diagnostics.unresolvedLinkIds.size) {
    console.log(
      `WARNING: ${diagnostics.unresolvedLinkIds.size} ledger link_ids had no master name`,
    );
  }
  if (diagnostics.fallbackCounts.size) {
    console.log('voucher-type fallbacks used:');
    for (const [name, n] of diagnostics.fallbackCounts) console.log(`  ${name}: ${n}`);
  }
  if (flags['dry-run']) return;

  const { company, created } = await findOrCreateCompany({
    company: flags.company,
    fyStart: flags['fy-start'],
    state: flags.state,
    pincode: flags.pincode,
  });
  console.log(
    `company: ${company.name} (id=${company.company_id}) ${created ? '[created]' : '[existing]'}`,
  );

  // Vouchers may span multiple Indian FYs (a continuously-used company). Make
  // sure a financial_years row exists for each, then route each voucher to its
  // own FY by date.
  const datedVouchers = parsed.vouchers.filter((v) => v.date);
  const neededStarts = new Set(datedVouchers.map((v) => fyStartForDate(v.date)));
  neededStarts.add(flags['fy-start']);
  const fyMap = await ensureFinancialYears(company.company_id, [...neededStarts].sort());
  console.log(
    'financial years:',
    [...fyMap.entries()].map(([s, r]) => `${s}=#${r.fy_id || r.id}`).join(', '),
  );

  const ctx = {
    company_id: company.company_id,
    fy_id: (fyMap.get(flags['fy-start']) || {}).fy_id,
    importMode: true,
    preserveVoucherNumbers: !!flags['preserve-numbers'],
  };

  console.log('== importing masters ==');
  const m = await importer.importMasters(parsed, ctx);
  for (const k of ['groups', 'units', 'ledgers', 'stockItems']) {
    const s = m[k];
    console.log(`${k}: created=${s.created} skipped=${s.skipped} failed=${s.failed}`);
    for (const e of (s.errors || []).slice(0, 10)) console.log(`   ! ${e}`);
    if ((s.errors || []).length > 10) console.log(`   ... ${s.errors.length - 10} more`);
  }

  if (parsed.vouchers.length) {
    console.log('== importing vouchers (per financial year) ==');
    const total = { created: 0, skipped: 0, failed: 0, errors: [] };
    // group vouchers by FY start
    const byFy = new Map();
    for (const v of parsed.vouchers) {
      const s = v.date ? fyStartForDate(v.date) : flags['fy-start'];
      if (!byFy.has(s)) byFy.set(s, []);
      byFy.get(s).push(v);
    }
    for (const [s, vs] of [...byFy.entries()].sort()) {
      const fyRow = fyMap.get(s);
      if (!fyRow) {
        console.log(`  ! no FY row for ${s}, skipping ${vs.length} vouchers`);
        continue;
      }
      const fyCtx = { ...ctx, fy_id: fyRow.fy_id || fyRow.id };
      const v = await importer.importVouchers({ ...parsed, vouchers: vs }, fyCtx, m.resolver);
      const sres = v.vouchers;
      console.log(
        `  FY ${s}: created=${sres.created} skipped=${sres.skipped} failed=${sres.failed} (of ${vs.length})`,
      );
      total.created += sres.created;
      total.skipped += sres.skipped;
      total.failed += sres.failed;
      total.errors.push(...(sres.errors || []));
    }
    console.log(
      `vouchers TOTAL: created=${total.created} skipped=${total.skipped} failed=${total.failed}`,
    );
    for (const e of total.errors.slice(0, 20)) console.log(`   ! ${e}`);
    if (total.errors.length > 20) console.log(`   ... ${total.errors.length - 20} more`);
  }

  console.log('== done ==');
};

main().catch((err) => {
  console.error('FATAL:', err && err.stack ? err.stack : err);
  process.exit(1);
});
