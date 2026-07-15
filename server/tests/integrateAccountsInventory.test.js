// F11 "Integrate Accounts with Inventory" (#4). When ON (default), the closing
// stock valued from inventory appears on the Balance Sheet as a Current Asset and
// lifts profit by the same amount (sheet stays balanced), and it flows into the
// P&L trading account. When OFF, accounts and inventory are separate: no auto
// closing-stock asset on the BS and no inventory closing stock in the P&L.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const stockItemService = require('../stockItem/stockItemService');
const { balanceSheet } = require('../report/services/balanceSheetService');
const { profitLoss } = require('../report/services/profitlossService');

const setFlag = async (companyId, on) =>
  db.execute(
    `UPDATE tally_features SET integrate_accounts_with_inventory = ? WHERE company_id = ?`,
    [on ? 1 : 0, companyId],
  );

describe('integrate accounts with inventory (#4)', () => {
  let companyId, fyId, itemId;
  // 20 purchased @ 750, 5 sold ⇒ 15 left @ 750 = 11,250 closing stock.
  const CLOSING = 15 * 750;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany('Integrate Co');
    companyId = c.company_id;
    fyId = (
      await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [
        companyId,
      ])
    ).rows[0].fy_id;

    const item = await stockItemService.create({ company_id: companyId, name: 'Widget' });
    itemId = item.item?.item_id ?? item.itemId ?? item.id;

    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-01',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [{ stock_item_id: itemId, item_name: 'Widget', quantity: 20, rate: 750 }],
    });
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-05',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [{ stock_item_id: itemId, item_name: 'Widget', quantity: 5, rate: 1000 }],
    });
  });

  // Closing stock is folded into the Current Assets group (matching its drill),
  // not shown as a separate line. This company posts no accounting entries, so
  // Current Assets holds nothing but the folded-in closing stock.
  const bsCurrentAssets = (bs) => {
    const row = (bs.assets || []).find((a) => a.group_name === 'Current Assets');
    return row ? Math.abs(Number(row.balance)) : 0;
  };

  it('ON: closing stock folds into Current Assets and the sheet still balances', async () => {
    await setFlag(companyId, true);
    const bs = await balanceSheet(companyId, fyId);
    expect(bs.success).toBe(true);
    expect(bsCurrentAssets(bs)).toBeCloseTo(CLOSING, 2);
    // No separate Closing Stock line any more.
    expect((bs.assets || []).find((a) => a.isClosingStock)).toBeFalsy();
    expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities, 2);
  });

  it('ON: P&L trading account picks up the closing stock', async () => {
    await setFlag(companyId, true);
    const pl = await profitLoss(companyId, fyId);
    expect(pl.success).toBe(true);
    expect(Number(pl.closingStock)).toBeCloseTo(CLOSING, 2);
  });

  it('OFF: no auto closing-stock on the BS and it still balances', async () => {
    await setFlag(companyId, false);
    const bs = await balanceSheet(companyId, fyId);
    expect(bs.success).toBe(true);
    expect(bsCurrentAssets(bs)).toBe(0);
    expect((bs.assets || []).find((a) => a.isClosingStock)).toBeFalsy();
    expect(bs.totalAssets).toBeCloseTo(bs.totalLiabilities, 2);
  });

  it('OFF: P&L does not integrate inventory closing stock', async () => {
    await setFlag(companyId, false);
    const pl = await profitLoss(companyId, fyId);
    expect(pl.success).toBe(true);
    expect(Number(pl.closingStock)).toBe(0);
  });
});
