// Stock Group Summary report (Inventory Books → Stock Group Summary, issue #110)
// integration test.
//
// Mirrors the body-screenshot chain end-to-end against the real services:
//   1. A stock group "Ceiling Fan" with item "Fan".
//   2. Purchase 50 @ 1000 in, Sales 30 @ 2000 out → closing 20.
//   3. Assert the report queries return what the screens render:
//        stockGroupItems   → Stock Group Summary (closing qty/rate/value per item)
//        stockItemMonthly  → 12-month running closing + opening (Level 3 + chart)
//        stockItemVouchers → opening row + running closing per voucher (Level 4)
//
// Layers 3-4 reuse the #107 services; this asserts the group-scoped path.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const stockItemService = require('../stockItem/stockItemService');
const stockGroupService = require('../stockGroup/stockGroupService');
const stockSummaryReportService = require('../report/stockSummaryReportService');

describe('Stock Group Summary Report (Inventory Books)', () => {
  let companyId, fyId, groupId, fanItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Stock Group Report Co');
    companyId = company.company_id;

    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    const grp = await stockGroupService.create({ company_id: companyId, name: 'Ceiling Fan' });
    expect(grp.success).toBe(true);
    groupId = grp.group?.sg_id ?? grp.group?.id ?? grp.id;

    const fan = await stockItemService.create({
      company_id: companyId,
      name: 'Fan',
      group_id: groupId,
    });
    expect(fan.success).toBe(true);
    fanItemId = fan.item?.item_id ?? fan.itemId ?? fan.id;

    const purchase = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-10',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: 'Fan', quantity: 50, rate: 1000 }],
    });
    expect(purchase.success).toBe(true);

    const sale = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-20',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [{ stock_item_id: fanItemId, item_name: 'Fan', quantity: 30, rate: 2000 }],
    });
    expect(sale.success).toBe(true);
  });

  it('stockGroupItems lists items in the group with net closing', async () => {
    const res = await stockSummaryReportService.stockGroupItems(companyId, fyId, groupId);
    expect(res.success).toBe(true);
    const fan = res.items.find((i) => i.item_name === 'Fan');
    expect(fan).toBeDefined();
    expect(fan.closing_qty).toBe(20); // 50 in − 30 out
    expect(fan.closing_value).toBe(20000); // 20 on hand × avg cost 1,000 (never in − out-REVENUE)
  });

  it('stockItemMonthly returns opening + 12 months with running closing', async () => {
    const res = await stockSummaryReportService.stockItemMonthly(companyId, fyId, fanItemId);
    expect(res.success).toBe(true);
    expect(res.opening_qty).toBe(0);
    expect(res.months.length).toBe(12);
    // April: 50 in, 30 out → closing 20; carried to March.
    expect(res.months[res.months.length - 1].closing_qty).toBe(20);
  });

  it("stockItemVouchers gives running closing per voucher for the group's item", async () => {
    const res = await stockSummaryReportService.stockItemVouchers(
      companyId,
      fyId,
      fanItemId,
      '2026-04-01',
      '2027-03-31',
    );
    expect(res.success).toBe(true);
    const purchase = res.rows.find((r) => r.voucher_type === 'Purchase');
    const sale = res.rows.find((r) => r.voucher_type === 'Sales');
    expect(purchase.inwards_qty).toBe(50);
    expect(sale.outwards_qty).toBe(30);
    expect(res.rows[res.rows.length - 1].closing_qty).toBe(20);
  });
});

// Reproduces the Fund-Flow / Stock-Group-Summary period bug (Non Woven Bags):
// a Credit Note (sales return) of 1,077 in April and a Sales of 10 the next
// March. Full year nets to 1,067; but selecting a single month must show that
// month alone — April closes at 1,077, and March opens at 1,077 (the prior
// close) then sells 10 to close at 1,067. Before period support the group
// summary always reported the full-year net (1,067) for every period.
describe('Stock Group Summary — F2 Period (per-period Opening/In/Out/Closing)', () => {
  let companyId, fyId, groupId, itemId;

  beforeAll(async () => {
    const company = await createTestCompany('Stock Group Period Co');
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    const grp = await stockGroupService.create({ company_id: companyId, name: 'Profit Loss Main' });
    groupId = grp.group?.sg_id ?? grp.group?.id ?? grp.id;
    const item = await stockItemService.create({
      company_id: companyId,
      name: 'Non Woven Bags',
      group_id: groupId,
    });
    itemId = item.item?.item_id ?? item.itemId ?? item.id;

    // Credit Note (sales return) 1,077 @ 10 in April → negative Outward, +1,077 stock.
    const cn = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-04-15',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: 'Non Woven Bags', quantity: 1077, rate: 10 },
      ],
    });
    expect(cn.success).toBe(true);

    // Sales 10 @ 300 the next March → Outward, −10 stock.
    const sale = await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2027-03-15',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: itemId, item_name: 'Non Woven Bags', quantity: 10, rate: 300 },
      ],
    });
    expect(sale.success).toBe(true);
  });

  const find = async (from, to) => {
    const res = await stockSummaryReportService.stockGroupItems(companyId, fyId, groupId, from, to);
    expect(res.success).toBe(true);
    return res.items.find((i) => i.item_name === 'Non Woven Bags');
  };

  it('full year nets the return and the later sale (1,077 − 10 = 1,067)', async () => {
    const row = await find(undefined, undefined);
    expect(row.opening_qty).toBe(0);
    expect(row.out_qty).toBe(-1067); // −1,077 return + 10 sale
    expect(row.closing_qty).toBe(1067);
  });

  it('April period shows only the return: closing 1,077', async () => {
    const row = await find('2026-04-01', '2026-04-30');
    expect(row.opening_qty).toBe(0);
    expect(row.out_qty).toBe(-1077); // credit note as a negative Outward
    expect(row.closing_qty).toBe(1077);
  });

  it('March period opens at the prior close (1,077), sells 10, closes 1,067', async () => {
    const row = await find('2027-03-01', '2027-03-31');
    expect(row.opening_qty).toBe(1077); // April's close carried into Opening
    expect(row.in_qty).toBe(0);
    expect(row.out_qty).toBe(10);
    expect(row.closing_qty).toBe(1067);
  });
});
