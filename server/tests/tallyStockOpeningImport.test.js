// Tally import — stock item opening balance (quantity / rate / value).
//
// Regression guard for the bug where imported stock items always landed with
// zero opening balance. The extractor read the opening quantity from the wrong
// field id and never read rate or value at all; the binary stores all three at
// field 0xeda on the item master (verified end-to-end against a real folder).
//
// The binary decode is covered by that manual verification (no committable
// fixture); this test guards the import WIRING — that opening qty/rate/value on
// a parsed stock item flow through adapt() + the importer into stock_items,
// where the stock valuation/summary reports read them.

const { setupTestDB, db } = require('./helpers');
const { adapt, importParsed } = require('../integrations/tally/binImportRunner');

const mastersWith = (stockItems) => ({
  groups: [],
  ledgers: [],
  stockItems,
  units: [],
  godowns: [],
  voucherTypes: [],
  registrations: [],
});

const itemRow = async (companyId, name) => {
  const r = await db.execute({
    sql: 'SELECT opening_quantity, opening_rate, opening_value FROM stock_items WHERE company_id = ? AND name = ?',
    args: [companyId, name],
  });
  return r.rows[0];
};

describe('Tally import → stock item opening balance', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  it('imports opening quantity, rate and value onto the stock item', async () => {
    const { parsed } = adapt(
      mastersWith([
        {
          name: 'Nonwoven Fabrics 70-150',
          base_unit: 'kg',
          type_of_supply: 'Goods',
          opening_quantity: 30,
          opening_rate: 50,
          opening_value: 1500,
        },
      ]),
      { vouchers: [] },
      {},
    );
    const summary = await importParsed(parsed, { company: 'StockOpen Co', fyStart: '2025-04-01' });

    const row = await itemRow(summary.company.company_id, 'Nonwoven Fabrics 70-150');
    expect(Number(row.opening_quantity)).toBe(30);
    expect(Number(row.opening_rate)).toBe(50);
    expect(Number(row.opening_value)).toBe(1500);
  });

  it('leaves opening balance at zero for items without one', async () => {
    const { parsed } = adapt(
      mastersWith([{ name: 'No Opening Item', base_unit: 'pcs', type_of_supply: 'Goods' }]),
      { vouchers: [] },
      {},
    );
    const summary = await importParsed(parsed, { company: 'NoOpen Co', fyStart: '2025-04-01' });

    const row = await itemRow(summary.company.company_id, 'No Opening Item');
    expect(Number(row.opening_quantity)).toBe(0);
    expect(Number(row.opening_value)).toBe(0);
  });
});
