// Regression guard for the F11 "Company Features won't save" bug.
//
// Root cause seen in production: a pre-existing `tally_features` table was
// missing the newer flag columns (set_alter_tds_details, enable_vat, …). Every
// save writes ALL flag columns in one UPDATE, so SQLite threw "no such column"
// and the WHOLE update silently failed (service catches it -> success:false),
// leaving the DB untouched. On reopen each flag fell back to its default (many
// default to Yes) — the "it keeps turning back to Yes" symptom.
//
// A fresh in-memory test DB hides this because init()'s CREATE TABLE already
// lists every column. The only way to catch it is to simulate an OLD database
// (table present, new columns absent) and prove init()'s ALTER-TABLE migrations
// bring it fully up to date so a full-flag save round-trips.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const { getTableColumns } = require('drizzle-orm');
const { tallyFeatures } = require('../db/schema');
const tallyFeaturesInit = require('../tallyFeatures/tallyFeatures');
const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

// Authoritative column list = the drizzle schema (source of truth). Adding a new
// flag to the schema automatically extends this test's coverage.
const ALL_COLUMNS = Object.values(getTableColumns(tallyFeatures)).map((c) => c.name);
const NON_FLAG = new Set(['tally_feature_id', 'company_id', 'created_at', 'updated_at']);
const FLAG_COLUMNS = ALL_COLUMNS.filter((c) => !NON_FLAG.has(c));

// The exact column set a real legacy startup.db shipped with (before the tax /
// payroll / voucher-type flags were added). Anything in the current schema but
// NOT here MUST be added by init()'s ALTER migrations.
const LEGACY_COLUMNS = [
  'tally_feature_id',
  'company_id',
  'maintain_accounts',
  'enable_bill_wise_entry',
  'enable_cost_centres',
  'maintain_inventory',
  'integrate_accounts_with_inventory',
  'enable_multiple_price_levels',
  'enable_batches',
  'maintain_expiry_date_for_batches',
  'use_discount_column_in_invoices',
  'use_separate_actual_billed_qty',
  'enable_gst',
  'set_alter_company_gst_details',
  'enable_tds',
  'enable_tcs',
  'enable_browser_access_for_reports',
  'enable_tally_net_services',
  'enable_payment_request_qr',
  'mark_modified_vouchers',
  'created_at',
  'updated_at',
];

async function tableColumns() {
  const res = await db.execute('PRAGMA table_info(tally_features)');
  return res.rows.map((r) => r.name);
}

describe('tally_features schema drift / upgrade path', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    // Company created against the full schema (also seeds a features row).
    const c = await createTestCompany('Schema Drift Co');
    companyId = c.company_id;

    // Simulate an OLD database: drop the up-to-date table and rebuild it with
    // ONLY the legacy columns, then run the module's boot-time init() — exactly
    // what happens when a user's existing startup.db is opened by new code.
    await db.execute('DROP TABLE IF EXISTS tally_features');
    await db.execute(`
      CREATE TABLE tally_features (
        ${LEGACY_COLUMNS.map((c) => {
          if (c === 'tally_feature_id') return 'tally_feature_id INTEGER PRIMARY KEY AUTOINCREMENT';
          if (c === 'company_id') return 'company_id INTEGER NOT NULL';
          if (c === 'created_at' || c === 'updated_at') return `${c} TEXT`;
          return `${c} INTEGER DEFAULT 0`;
        }).join(',\n        ')}
      )
    `);

    await tallyFeaturesInit.init(db);
  });

  it('legacy table starts out missing the newer flag columns', async () => {
    // Sanity: confirms the fixture actually reproduces the drifted state.
    const missingInLegacy = FLAG_COLUMNS.filter((c) => !LEGACY_COLUMNS.includes(c));
    expect(missingInLegacy).toEqual(
      expect.arrayContaining(['set_alter_tds_details', 'enable_vat']),
    );
  });

  it('init() adds every schema column to a legacy table (no drift left)', async () => {
    const cols = await tableColumns();
    const missing = ALL_COLUMNS.filter((c) => !cols.includes(c));
    // If this fails, a column exists in the schema/service but no ALTER migration
    // adds it — real DBs will reject saves that write it.
    expect(missing).toEqual([]);
  });

  it('a full-flag save round-trips after the upgrade (the actual bug)', async () => {
    // get() lazy-seeds a fresh row into the upgraded table.
    const seeded = await tallyFeaturesService.get(companyId);
    expect(seeded.success).toBe(true);

    // Turn EVERY flag on in one save — the same all-columns UPDATE the F11 popup
    // sends. On a drifted table this returns success:false and persists nothing.
    const payload = { company_id: companyId };
    for (const c of FLAG_COLUMNS) payload[c] = 1;

    const upd = await tallyFeaturesService.update(payload);
    expect(upd.success).toBe(true);

    const res = await tallyFeaturesService.get(companyId);
    expect(res.success).toBe(true);
    for (const c of FLAG_COLUMNS) {
      expect({ column: c, value: Number(res.features[c]) }).toEqual({ column: c, value: 1 });
    }
  });

  it('individually toggling a previously-missing flag persists (No stays No)', async () => {
    // The reported symptom: set a flag, save, reopen -> it reverted. Prove a
    // single flag now both persists as 1 and can be turned back to 0.
    await tallyFeaturesService.update({ company_id: companyId, enable_vat: 1 });
    let res = await tallyFeaturesService.get(companyId);
    expect(Number(res.features.enable_vat)).toBe(1);

    await tallyFeaturesService.update({ company_id: companyId, enable_vat: 0 });
    res = await tallyFeaturesService.get(companyId);
    expect(Number(res.features.enable_vat)).toBe(0);
  });
});
