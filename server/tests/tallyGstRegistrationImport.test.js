// Tally import — GST Registration master pipeline.
//
// Regression guard for the bug where importing a TallyPrime company created no
// GST Registration unless it happened to have sales invoices carrying a seller
// GSTIN (it was inferred from vouchers, not read from the registration master).
// The importer now reads the company's own registration master(s) directly
// (passed as opts.gstRegistrations), with the invoice-inferred GSTIN only as a
// fallback. These tests drive importParsed() with synthetic inputs (no binary
// fixture) and assert the gst_registrations rows that land in the DB.

const { setupTestDB, db } = require('./helpers');
const { importParsed } = require('../integrations/tally/binImportRunner');

const emptyParsed = () => ({
  meta: { source: 'test' },
  groups: [],
  ledgers: [],
  stockItems: [],
  vouchers: [],
});

const regsFor = async (companyId) => {
  const r = await db.execute({
    sql: 'SELECT gstin, state_id, is_active FROM gst_registrations WHERE company_id = ? ORDER BY gst_id',
    args: [companyId],
  });
  return r.rows;
};

const defaultRegOf = async (companyId) => {
  const r = await db.execute({
    sql: 'SELECT current_default_gst_registration_id AS d FROM companies WHERE company_id = ?',
    args: [companyId],
  });
  return r.rows[0] && r.rows[0].d;
};

describe('Tally import → GST Registration master', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  it('creates a registration row from the registration master (not from vouchers)', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'RegMaster Co',
      fyStart: '2025-04-01',
      gstRegistrations: [
        { name: 'Chhattisgarh Registration', gstin: '22AAACI1681G1ZZ', state: 'Chhattisgarh' },
      ],
    });
    const rows = await regsFor(summary.company.company_id);
    expect(rows).toHaveLength(1);
    expect(rows[0].gstin).toBe('22AAACI1681G1ZZ');
    expect(rows[0].state_id).toBe('Chhattisgarh');
    expect(Number(rows[0].is_active)).toBe(1);
    // First registration becomes the company default.
    expect(await defaultRegOf(summary.company.company_id)).toBeTruthy();
  });

  it('imports MULTIPLE registrations (multi-state company)', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'MultiState Co',
      fyStart: '2025-04-01',
      gstRegistrations: [{ gstin: '22AAACI1681G1ZZ' }, { gstin: '24AEJFS5902G1Z2' }],
    });
    const rows = await regsFor(summary.company.company_id);
    const byState = Object.fromEntries(rows.map((r) => [r.state_id, r.gstin]));
    expect(byState).toEqual({
      Chhattisgarh: '22AAACI1681G1ZZ',
      Gujarat: '24AEJFS5902G1Z2',
    });
  });

  it('derives state from the GSTIN prefix when the master omits it', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'StateDerive Co',
      fyStart: '2025-04-01',
      gstRegistrations: [{ gstin: '27AAGCB1286Q1Z4' }],
    });
    const rows = await regsFor(summary.company.company_id);
    expect(rows[0].state_id).toBe('Maharashtra'); // 27 → Maharashtra
  });

  it('falls back to the invoice-inferred GSTIN only when no registration master exists', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'FallbackOnly Co',
      fyStart: '2025-04-01',
      gstRegistrations: [],
      companyGstin: '29ABCDE1234F2Z5',
    });
    const rows = await regsFor(summary.company.company_id);
    expect(rows).toHaveLength(1);
    expect(rows[0].gstin).toBe('29ABCDE1234F2Z5');
    expect(rows[0].state_id).toBe('Karnataka'); // 29 → Karnataka
  });

  it('prefers the registration master over the invoice-inferred fallback', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'PreferMaster Co',
      fyStart: '2025-04-01',
      gstRegistrations: [{ gstin: '22AAACI1681G1ZZ' }],
      companyGstin: '29ABCDE1234F2Z5', // ignored when a registration master exists
    });
    const rows = await regsFor(summary.company.company_id);
    expect(rows.map((r) => r.gstin)).toEqual(['22AAACI1681G1ZZ']);
  });

  it('is idempotent — re-importing the same company adds no duplicate rows', async () => {
    const opts = {
      company: 'Idempotent Co',
      fyStart: '2025-04-01',
      gstRegistrations: [{ gstin: '22AAACI1681G1ZZ' }],
    };
    const first = await importParsed(emptyParsed(), opts);
    await importParsed(emptyParsed(), opts);
    const rows = await regsFor(first.company.company_id);
    expect(rows).toHaveLength(1);
  });

  it('ignores malformed GSTINs', async () => {
    const summary = await importParsed(emptyParsed(), {
      company: 'BadGstin Co',
      fyStart: '2025-04-01',
      gstRegistrations: [{ gstin: 'NOTAGSTIN' }, { gstin: '22AAACI1681G1ZZ' }],
    });
    const rows = await regsFor(summary.company.company_id);
    expect(rows.map((r) => r.gstin)).toEqual(['22AAACI1681G1ZZ']);
  });
});
