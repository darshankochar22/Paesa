// Inventory inward/outward pricing correctness (the audited bug set):
//   - Credit Note is INWARD, Debit Note is OUTWARD (goods flow, not GST side)
//   - Stock Journal legs classify per-entry via is_source (never "everything
//     not inward is outward", which double-counted transfers as outward)
//   - Stock Summary closing qty AND value come from the same engine
//   - Registers value outward consumption at weighted-average COST, never
//     subtract sale revenue from inventory value
//   - Optional vouchers stay out of every report
//   - Group summary rolls child groups into the parent; category summary
//     includes opening stock
//   - stockAgeing buckets age against the report's as-on date, not today

const { setupTestDB, createTestCompany, db } = require('./helpers');
const voucherService = require('../voucher/voucherService');
const stockItemService = require('../stockItem/stockItemService');
const stockGroupService = require('../stockGroup/stockGroupService');
const stockCategoryService = require('../stockCategory/stockCategoryService');
const stockSummaryReportService = require('../report/stockSummaryReportService');
const advancedInventoryReportService = require('../report/advancedInventoryReportService');
const { stockGroupSummary } = require('../report/inventory/stockGroupSummary');
const { stockCategorySummary } = require('../report/inventory/stockCategorySummary');
const { calculateClosingStock } = require('../report/stockValuationEngine');
const { entryDirection, registerDirection } = require('../report/services/stockMovement');

describe('Stock movement classification + valuation', () => {
  let companyId, fyId;
  let widgetId, gadgetId;
  let parentGroupId, childGroupId, categoryId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Stock Movement Co');
    companyId = company.company_id;

    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fy.rows[0].fy_id;

    // Group tree: Parent > Child. Widget sits in the CHILD group.
    const parent = await stockGroupService.create({
      company_id: companyId,
      name: 'Parent Grp',
      parent_group_id: null,
    });
    parentGroupId = parent.group.sg_id;
    const child = await stockGroupService.create({
      company_id: companyId,
      name: 'Child Grp',
      parent_group_id: parentGroupId,
    });
    childGroupId = child.group.sg_id;

    const cat = await stockCategoryService.create({
      company_id: companyId,
      name: 'Widgets Cat',
      parent_id: null,
    });
    categoryId = cat.category.sc_id;

    // Widget: opening 10 @ 100 = 1,000.
    const widget = await stockItemService.create({
      company_id: companyId,
      name: 'Widget',
      group_id: childGroupId,
      category_id: categoryId,
      opening_quantity: 10,
      opening_rate: 100,
      opening_value: 1000,
    });
    widgetId = widget.item?.item_id ?? widget.itemId ?? widget.id;

    // Gadget: no opening; produced via Manufacturing-style Stock Journal.
    const gadget = await stockItemService.create({
      company_id: companyId,
      name: 'Gadget',
      group_id: parentGroupId,
    });
    gadgetId = gadget.item?.item_id ?? gadget.itemId ?? gadget.id;

    // 1. Purchase 10 @ 100 = 1,000 (inward at cost).
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-05',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: widgetId, item_name: 'Widget', quantity: 10, rate: 100, amount: 1000 },
      ],
    });

    // 2. Sales 5 @ 200 = 1,000 (outward; amount is REVENUE, cost is 500).
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-10',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: widgetId, item_name: 'Widget', quantity: 5, rate: 200, amount: 1000 },
      ],
    });

    // 3. Credit Note 2 @ 200 = 400 (sales return → goods come BACK: inward).
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-04-15',
      party_name: 'Customer',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: widgetId, item_name: 'Widget', quantity: 2, rate: 200, amount: 400 },
      ],
    });

    // 4. Stock Journal transfer: 3 out (source) + 3 in (destination), same item.
    //    Net stock change must be ZERO — the old code summed the whole voucher
    //    (6 qty) and booked it as outward.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Stock Journal',
      date: '2026-04-20',
      is_accounting_voucher: 0,
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        {
          stock_item_id: widgetId,
          item_name: 'Widget',
          quantity: 3,
          rate: 100,
          amount: 300,
          is_source: 1,
        },
        {
          stock_item_id: widgetId,
          item_name: 'Widget',
          quantity: 3,
          rate: 100,
          amount: 300,
          is_source: 0,
        },
      ],
    });

    // 5. Optional Purchase 50 @ 100 — must be excluded everywhere.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-25',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      is_optional: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: widgetId, item_name: 'Widget', quantity: 50, rate: 100, amount: 5000 },
      ],
    });

    // 6. Production: Stock Journal destination-only 5 Gadgets @ 60.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Stock Journal',
      date: '2026-04-22',
      is_accounting_voucher: 0,
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        {
          stock_item_id: gadgetId,
          item_name: 'Gadget',
          quantity: 5,
          rate: 60,
          amount: 300,
          is_source: 0,
        },
      ],
    });
  });

  // Widget closing qty: 10 open + 10 purch − 5 sales + 2 CN − 3 SJ-out + 3 SJ-in = 17.
  const WIDGET_CLOSING_QTY = 17;
  // Closing value — TallyPrime Avg. Cost (same as the drill-down register):
  // pooled avg cost = (open 1,000 + purch 1,000 + SJ-in 300) / (10+10+3) = ₹100.
  // Credit Note returns at cost (not its ₹200 sale rate). 17 × 100 = 1,700.
  const WIDGET_WA_VALUE = 1700;

  it('entryDirection classifies every voucher type correctly', () => {
    expect(entryDirection('Purchase', null)).toBe('in');
    expect(entryDirection('Credit Note', null)).toBe('in'); // sales return
    expect(entryDirection('Debit Note', null)).toBe('out'); // purchase return
    expect(entryDirection('Sales', null)).toBe('out');
    expect(entryDirection('Stock Journal', 1)).toBe('out');
    expect(entryDirection('Stock Journal', 0)).toBe('in');
    expect(entryDirection('Manufacturing Journal', 0)).toBe('in');
    expect(entryDirection('Physical Stock', null)).toBe(null);
  });

  it('registerDirection shows returns as a negative movement in the opposite column', () => {
    // Physical flow is unchanged (entryDirection), but the register DISPLAY
    // follows TallyPrime: Debit Note = negative Inward, Credit Note = negative
    // Outward. Everything else keeps its physical direction, positive.
    expect(registerDirection('Debit Note', null)).toEqual({ dir: 'in', sign: -1 });
    expect(registerDirection('Credit Note', null)).toEqual({ dir: 'out', sign: -1 });
    expect(registerDirection('Purchase', null)).toEqual({ dir: 'in', sign: 1 });
    expect(registerDirection('Sales', null)).toEqual({ dir: 'out', sign: 1 });
    expect(registerDirection('Stock Journal', 1)).toEqual({ dir: 'out', sign: 1 });
    expect(registerDirection('Stock Journal', 0)).toEqual({ dir: 'in', sign: 1 });
  });

  it('valuation engine: Credit Note and Stock Journal move qty; optional excluded', async () => {
    const res = await calculateClosingStock(companyId, fyId, null, 'FIFO');
    expect(res.success).toBe(true);
    const widget = res.items.find((i) => i.item_id === widgetId);
    expect(widget.closing_qty).toBe(WIDGET_CLOSING_QTY);
    expect(widget.closing_value).toBeCloseTo(WIDGET_WA_VALUE, 2);

    const gadget = res.items.find((i) => i.item_id === gadgetId);
    expect(gadget.closing_qty).toBe(5); // production via is_source = 0
    expect(gadget.closing_value).toBeCloseTo(300, 2);
  });

  it('stockSummary: closing qty and value from the SAME engine (rate is sane)', async () => {
    const res = await stockSummaryReportService.stockSummary(companyId, fyId, null, 'FIFO');
    expect(res.success).toBe(true);
    const widget = (res.items || []).find((i) => i.item_id === widgetId);
    expect(widget).toBeDefined();
    expect(widget.closing_qty).toBe(WIDGET_CLOSING_QTY); // was 15 with the old lists
    expect(widget.closing_value).toBeCloseTo(WIDGET_WA_VALUE, 2);
    expect(widget.rate).toBeCloseTo(WIDGET_WA_VALUE / WIDGET_CLOSING_QTY, 2);

    const gadget = (res.items || []).find((i) => i.item_id === gadgetId);
    expect(gadget.closing_qty).toBe(5);
  });

  it('stockItemVouchers: SJ shows both legs, CN is a negative Outward, closing at WA cost', async () => {
    const res = await stockSummaryReportService.stockItemVouchers(
      companyId,
      fyId,
      widgetId,
      null,
      null,
    );
    expect(res.success).toBe(true);
    const rows = res.rows;

    const opening = rows.find((r) => r.particulars === 'Opening Balance');
    expect(opening.inwards_qty).toBe(10);
    expect(opening.inwards_value).toBe(1000);

    const purchase = rows.find((r) => r.voucher_type === 'Purchase');
    expect(purchase.inwards_qty).toBe(10);
    expect(purchase.outwards_qty).toBeNull();

    const sales = rows.find((r) => r.voucher_type === 'Sales');
    expect(sales.outwards_qty).toBe(5);
    expect(sales.outwards_value).toBe(1000); // book (sale) value shown
    expect(sales.closing_qty).toBe(15);
    expect(sales.closing_value).toBeCloseTo(1500, 2); // consumed at cost 100, NOT revenue 200

    // TallyPrime shows a sales return (Credit Note) as a NEGATIVE Outward —
    // reducing sales — not as a positive Inward. Stock still physically comes
    // back, so closing rises to 17 at weighted-average cost.
    const cn = rows.find((r) => r.voucher_type === 'Credit Note');
    expect(cn.outwards_qty).toBe(-2);
    expect(cn.outwards_value).toBe(-400);
    expect(cn.inwards_qty).toBeNull();
    expect(cn.closing_qty).toBe(17);

    const sj = rows.find((r) => r.voucher_type === 'Stock Journal');
    expect(sj.inwards_qty).toBe(3); // both legs, not 6-out
    expect(sj.outwards_qty).toBe(3);
    expect(sj.closing_qty).toBe(WIDGET_CLOSING_QTY);

    // No row for the optional purchase.
    expect(rows.filter((r) => r.voucher_type === 'Purchase').length).toBe(1);

    const last = rows[rows.length - 1];
    expect(last.closing_qty).toBe(WIDGET_CLOSING_QTY);
    expect(last.closing_value).toBeGreaterThan(1500); // cost-based, not 900 (cost-minus-revenue)
  });

  it('stockItemMonthly: month buckets classify per entry and close at WA cost', async () => {
    const res = await stockSummaryReportService.stockItemMonthly(companyId, fyId, widgetId);
    expect(res.success).toBe(true);
    const april = res.months.find((m) => m.month === 'April');
    expect(april.in_qty).toBe(13); // 10 purchase + 3 SJ-in
    expect(april.out_qty).toBe(6); // 5 sales − 2 CN (neg Outward) + 3 SJ-out
    expect(april.closing_qty).toBe(WIDGET_CLOSING_QTY);
    expect(april.closing_value).toBeGreaterThan(1500);
    // March (FY end) carries the same closing forward.
    const march = res.months[res.months.length - 1];
    expect(march.closing_qty).toBe(WIDGET_CLOSING_QTY);
  });

  it('stockGroupItems drill matches the engine (no sales-revenue subtraction)', async () => {
    const res = await stockSummaryReportService.stockGroupItems(companyId, fyId, childGroupId);
    expect(res.success).toBe(true);
    const widget = res.items.find((i) => i.item_id === widgetId);
    expect(widget.closing_qty).toBe(WIDGET_CLOSING_QTY);
    expect(widget.closing_value).toBeCloseTo(WIDGET_WA_VALUE, 2);
  });

  it('stockGroupSummary: parent group rolls up child-group items', async () => {
    const res = await stockGroupSummary(companyId, fyId);
    expect(res.success).toBe(true);
    const parentRow = res.rows.find((r) => r.group_name === 'Parent Grp');
    const childRow = res.rows.find((r) => r.group_name === 'Child Grp');
    expect(childRow.qty).toBe(WIDGET_CLOSING_QTY);
    expect(childRow.value).toBeCloseTo(WIDGET_WA_VALUE, 2);
    // Parent = its own Gadget (5 @ 300) + child subtree (Widget).
    expect(parentRow.qty).toBe(WIDGET_CLOSING_QTY + 5);
    expect(parentRow.value).toBeCloseTo(WIDGET_WA_VALUE + 300, 2);
  });

  it('stockCategorySummary includes opening stock and excludes optional vouchers', async () => {
    const res = await stockCategorySummary(companyId, fyId);
    expect(res.success).toBe(true);
    const row = res.rows.find((r) => r.category_name === 'Widgets Cat');
    expect(row.qty).toBe(WIDGET_CLOSING_QTY); // old code reported 15 tx-only qty (no opening)
    expect(row.value).toBeCloseTo(WIDGET_WA_VALUE, 2);
  });

  it('stockAgeing ages against the as-on date, not today', async () => {
    // As on 2026-05-20: purchase (5-Apr) is 45 days old → 31–60 bucket;
    // SJ-in (20-Apr) is 30 days old → ≤30 bucket. Nothing is >60 days yet,
    // although against TODAY everything would be.
    const res = await advancedInventoryReportService.stockAgeing(companyId, fyId, '2026-05-20');
    expect(res.success).toBe(true);
    const widget = res.rows.find((r) => r.item_id === widgetId);
    expect(widget).toBeDefined();
    expect(widget.daysOver).toBe(0);
    expect(widget.days30).toBeCloseTo(300, 2); // SJ-in leg
    expect(widget.days60).toBeCloseTo(1400, 2); // purchase 1000 + CN 400
  });
});

// Inventory Books REGISTERS: Delivery Note / Receipt Note / Rejection In/Out
// must classify by voucher TYPE, not by is_source. is_source defaults to 0, so
// the old register wrongly showed Delivery Note (outward) as Inwards.
describe('Voucher-type registers direction (Inventory Books)', () => {
  let companyId, fyId, boltId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Register Direction Co');
    companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fy.rows[0].fy_id;

    const bolt = await stockItemService.create({
      company_id: companyId,
      name: 'Bolt',
      opening_quantity: 100,
      opening_rate: 10,
    });
    boltId = bolt.item?.item_id ?? bolt.itemId ?? bolt.id;

    const mk = (voucher_type, date, qty) =>
      voucherService.create({
        company_id: companyId,
        fy_id: fyId,
        voucher_type,
        date,
        is_accounting_voucher: 0,
        is_inventory_voucher: 1,
        entries: [],
        stock_entries: [
          { stock_item_id: boltId, item_name: 'Bolt', quantity: qty, rate: 10, amount: qty * 10 },
        ],
      });
    await mk('Receipt Note', '2026-04-03', 20); // inward
    await mk('Delivery Note', '2026-04-06', 8); // outward
    await mk('Rejection In', '2026-04-09', 4); // inward
    await mk('Rejection Out', '2026-04-12', 3); // outward
  });

  const regRow = async (voucher_type) => {
    const res = await stockSummaryReportService.inventoryRegisterVouchers(
      companyId,
      fyId,
      voucher_type,
    );
    expect(res.success).toBe(true);
    expect(res.rows.length).toBe(1);
    return res.rows[0];
  };

  it('Receipt Note is inward', async () => {
    const r = await regRow('Receipt Note');
    expect(r.inwards_qty).toBe(20);
    expect(r.outwards_qty).toBe(0);
  });

  it('Delivery Note is outward (not inward as the is_source split gave)', async () => {
    const r = await regRow('Delivery Note');
    expect(r.outwards_qty).toBe(8);
    expect(r.inwards_qty).toBe(0);
  });

  // TallyPrime's Voucher Register shows rejection notes as reversing entries:
  // Rejection In (return of a sale) is a NEGATIVE Outward; Rejection Out (return
  // of a purchase) is a NEGATIVE Inward.
  it('Rejection In is a negative Outward, Rejection Out is a negative Inward', async () => {
    const rin = await regRow('Rejection In');
    expect(rin.inwards_qty).toBe(0);
    expect(rin.outwards_qty).toBe(-4);
    const rout = await regRow('Rejection Out');
    expect(rout.outwards_qty).toBe(0);
    expect(rout.inwards_qty).toBe(-3);
  });
});

// Stock Item Vouchers register: TallyPrime shows a purchase return (Debit Note)
// as a NEGATIVE Inward — on the purchase side, reducing purchases — mirroring
// the way a sales return (Credit Note) shows as a negative Outward.
describe('Stock Item Vouchers: Debit Note is a negative Inward', () => {
  let companyId, fyId, pipeId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Debit Note Co');
    companyId = company.company_id;
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fy.rows[0].fy_id;

    const pipe = await stockItemService.create({ company_id: companyId, name: 'Pipe' });
    pipeId = pipe.item?.item_id ?? pipe.itemId ?? pipe.id;

    // Purchase 10 @ 100, then a purchase return (Debit Note) of 4 @ 100.
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-05',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: pipeId, item_name: 'Pipe', quantity: 10, rate: 100, amount: 1000 },
      ],
    });
    await voucherService.create({
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Debit Note',
      date: '2026-04-10',
      party_name: 'Supplier',
      is_inventory_voucher: 1,
      entries: [],
      stock_entries: [
        { stock_item_id: pipeId, item_name: 'Pipe', quantity: 4, rate: 100, amount: 400 },
      ],
    });
  });

  it('Debit Note shows on the Inwards side with a negative sign', async () => {
    const res = await stockSummaryReportService.stockItemVouchers(
      companyId,
      fyId,
      pipeId,
      null,
      null,
    );
    expect(res.success).toBe(true);

    const purchase = res.rows.find((r) => r.voucher_type === 'Purchase');
    expect(purchase.inwards_qty).toBe(10);

    const dn = res.rows.find((r) => r.voucher_type === 'Debit Note');
    expect(dn.inwards_qty).toBe(-4); // negative Inward, not positive Outward
    expect(dn.inwards_value).toBe(-400);
    expect(dn.outwards_qty).toBeNull();
    expect(dn.closing_qty).toBe(6); // 10 purchased − 4 returned
  });

  it('Monthly summary nets the Debit Note into the Inwards column', async () => {
    const res = await stockSummaryReportService.stockItemMonthly(companyId, fyId, pipeId);
    expect(res.success).toBe(true);
    const april = res.months.find((m) => m.month === 'April');
    expect(april.in_qty).toBe(6); // 10 purchase − 4 Debit Note
    expect(april.out_qty).toBe(0);
    expect(april.closing_qty).toBe(6);
  });
});
