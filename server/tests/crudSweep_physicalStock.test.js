// CRUD sweep for the physicalStock module — exercises the controller exactly
// the way the real UI does. The Physical Stock voucher is created from the
// shared voucher form (client/src/pages/transactions/hooks/useVoucherForm.ts),
// which on save calls window.api.physicalStock.create({...}) with this shape:
//
//   {
//     company_id,
//     voucher_no,                       // meta.voucherNumber (PST-… or null)
//     voucher_date,                     // meta.date
//     reference_no | null,              // meta.referenceNumber || null
//     narration | null,                 // meta.narration || null
//     is_optional: 0,                   // literal 0 from the form
//     is_post_dated: 0 | 1,             // 1 when status === "Post-Dated"
//     lines: [
//       {
//         stock_item_id,                // r.stockItem.item_id
//         godown_id | null,             // r.godown?.godown_id ?? null
//         batch_no | null,
//         lot_no | null,
//         manufacturing_date | null,
//         expiry_date | null,
//         quantity,                     // Number(r.quantityRaw)
//         rate,                         // Number(r.rateRaw) || 0
//         amount,                       // Number(r.amountRaw) || 0  (submitted!)
//         line_order,                   // lineIdx + 1 (1-based, submitted!)
//       }, ...
//     ],
//   }
//
// The module has no update handler (only create/getAll/getById/delete/
// getNextNumber). getAll/getById return the legacy snake_case shape with
// numeric 0/1 booleans. getById LEFT JOINs the line's stock item + godown to
// surface item_name / godown_name.

const { setupTestDB, createTestCompany } = require('./helpers');
const physicalStockController = require('../physicalStock/physicalStockController');
const stockGroupController = require('../stockGroup/stockGroupController');
const unitController = require('../unit/unitController');
const godownController = require('../godown/godownController');
const stockItemController = require('../stockItem/stockItemController');

describe('physicalStock CRUD sweep (UI-faithful)', () => {
  let companyId;
  let itemId;
  let item2Id;
  let godownId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('PhysicalStock CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();

    // Resolve FK parents the way the voucher form dropdowns do: a stock group +
    // unit are needed to create a stock item, and a godown for the line.
    const grp = await stockGroupController.create(null, {
      company_id: companyId,
      name: 'Finished Goods',
      alias: null,
      parent_group_id: null,
      should_quantities_be_added: 1,
      taxability_type: 'Taxable',
    });
    expect(grp.success).toBe(true);
    const groupId = grp.group.sg_id;

    const unit = await unitController.create(null, {
      company_id: companyId,
      name: 'Sweep Nos',
      symbol: 'SNOS',
      formal_name: 'Sweep Nos',
      unit_type: 'Simple',
    });
    expect(unit.success).toBe(true);
    const unitId = unit.unit.unit_id;

    const gd = await godownController.create(null, {
      company_id: companyId,
      name: 'Physical Stock WH',
    });
    expect(gd.success).toBe(true);
    godownId = gd.godown.godown_id;

    const si = await stockItemController.create(null, {
      company_id: companyId,
      name: 'PS Laptop',
      group_id: groupId,
      unit_id: unitId,
      allocations: [],
    });
    expect(si.success).toBe(true);
    itemId = si.item.item_id;

    const si2 = await stockItemController.create(null, {
      company_id: companyId,
      name: 'PS Mouse',
      group_id: groupId,
      unit_id: unitId,
      allocations: [],
    });
    expect(si2.success).toBe(true);
    item2Id = si2.item.item_id;
  });

  test('getNextNumber returns the first PST- number', async () => {
    const res = await physicalStockController.getNextNumber(null, { company_id: companyId });
    expect(res.success).toBe(true);
    expect(res.nextNumber).toBe('PST-00001');
    expect(res.voucher_number).toBe('PST-00001');
  });

  test('create persists every submitted header + line field (no ignored fields)', async () => {
    // Payload exactly as useVoucherForm.ts builds it for a Physical Stock voucher.
    const payload = {
      company_id: companyId,
      voucher_no: 'PST-00001',
      voucher_date: '2026-06-16',
      reference_no: 'REF-PS-1',
      narration: 'Stock count Q1',
      is_optional: 0,
      is_post_dated: 0,
      lines: [
        {
          stock_item_id: itemId,
          godown_id: godownId,
          batch_no: 'BATCH-001',
          lot_no: 'LOT-9',
          manufacturing_date: '2026-01-01',
          expiry_date: '2027-01-01',
          quantity: 5,
          rate: 100,
          // amount intentionally != quantity*rate to catch the "ignored field"
          // bug where the service recomputes amount and drops the submitted one.
          amount: 510,
          line_order: 1,
        },
        {
          stock_item_id: item2Id,
          godown_id: godownId,
          batch_no: null,
          lot_no: null,
          manufacturing_date: null,
          expiry_date: null,
          quantity: 3,
          rate: 50,
          amount: 150,
          line_order: 2,
        },
      ],
    };

    const res = await physicalStockController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.physical_stock_entry_id).toBeTruthy();
    expect(res.voucher_no).toBe('PST-00001');
    const entryId = res.physical_stock_entry_id;

    // Read back the header via getAll (the list shape the module exposes).
    const all = await physicalStockController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const header = all.entries.find((e) => e.physical_stock_entry_id === entryId);
    expect(header).toBeTruthy();
    expect(header.company_id).toBe(companyId);
    expect(header.voucher_no).toBe('PST-00001');
    expect(header.voucher_date).toBe('2026-06-16');
    expect(header.reference_no).toBe('REF-PS-1'); // must not be dropped
    expect(header.narration).toBe('Stock count Q1');
    expect(header.is_optional).toBe(0);
    expect(header.is_post_dated).toBe(0);

    // Read back the full entry (header + lines) via getById.
    const got = await physicalStockController.getById(null, entryId);
    expect(got.success).toBe(true);
    expect(got.entry).toBeTruthy();
    expect(got.entry.physical_stock_entry_id).toBe(entryId);
    expect(Array.isArray(got.entry.lines)).toBe(true);
    expect(got.entry.lines.length).toBe(2);

    const lines = got.entry.lines;
    // Lines come back ordered by line_order ASC.
    expect(lines[0].line_order).toBe(1);
    expect(lines[1].line_order).toBe(2);

    const l1 = lines[0];
    expect(l1.stock_item_id).toBe(itemId);
    expect(l1.godown_id).toBe(godownId);
    expect(l1.batch_no).toBe('BATCH-001'); // array/line fields must persist
    expect(l1.lot_no).toBe('LOT-9');
    expect(l1.manufacturing_date).toBe('2026-01-01');
    expect(l1.expiry_date).toBe('2027-01-01');
    expect(l1.quantity).toBe(5);
    expect(l1.rate).toBe(100);
    // The submitted amount (510) must persist, NOT be overwritten by qty*rate (500).
    expect(l1.amount).toBe(510);
    // getById join surfaces the related names.
    expect(l1.item_name).toBe('PS Laptop');
    expect(l1.godown_name).toBe('Physical Stock WH');

    const l2 = lines[1];
    expect(l2.stock_item_id).toBe(item2Id);
    expect(l2.quantity).toBe(3);
    expect(l2.rate).toBe(50);
    expect(l2.amount).toBe(150);
    expect(l2.item_name).toBe('PS Mouse');
  });

  test('create auto-generates the next PST- number when voucher_no is null', async () => {
    const res = await physicalStockController.create(null, {
      company_id: companyId,
      voucher_no: null, // form may pass null; service must number it
      voucher_date: '2026-06-17',
      reference_no: null,
      narration: null,
      is_optional: 0,
      is_post_dated: 1, // Post-Dated status from the form
      lines: [
        {
          stock_item_id: itemId,
          godown_id: godownId,
          batch_no: null,
          lot_no: null,
          manufacturing_date: null,
          expiry_date: null,
          quantity: 2,
          rate: 0,
          amount: 0,
          line_order: 1,
        },
      ],
    });
    expect(res.success).toBe(true);
    expect(res.voucher_no).toBe('PST-00002'); // sequential numbering

    const got = await physicalStockController.getById(null, res.physical_stock_entry_id);
    expect(got.success).toBe(true);
    expect(got.entry.is_post_dated).toBe(1); // 1 must persist
    expect(got.entry.reference_no).toBeNull();
    expect(got.entry.narration).toBeNull();
    // amount falls back to qty*rate (0) when both rate and amount are 0.
    expect(got.entry.lines[0].amount).toBe(0);
  });

  test('getNextNumber advances after entries exist', async () => {
    const res = await physicalStockController.getNextNumber(null, { company_id: companyId });
    expect(res.success).toBe(true);
    expect(res.nextNumber).toBe('PST-00003');
  });

  test('delete removes the entry', async () => {
    const created = await physicalStockController.create(null, {
      company_id: companyId,
      voucher_no: null,
      voucher_date: '2026-06-18',
      reference_no: null,
      narration: 'to be deleted',
      is_optional: 0,
      is_post_dated: 0,
      lines: [
        {
          stock_item_id: itemId,
          godown_id: godownId,
          quantity: 1,
          rate: 10,
          amount: 10,
          line_order: 1,
        },
      ],
    });
    expect(created.success).toBe(true);
    const id = created.physical_stock_entry_id;

    const del = await physicalStockController.delete(null, id);
    expect(del.success).toBe(true);

    // Hard delete: gone from getAll and getById.
    const all = await physicalStockController.getAll(null, companyId);
    expect(all.entries.some((e) => e.physical_stock_entry_id === id)).toBe(false);

    const got = await physicalStockController.getById(null, id);
    expect(got.success).toBe(false);
    expect(got.error).toMatch(/not found/i);
  });
});
