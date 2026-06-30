// voucher.update must FULLY persist an edit (stock lines + accounting entries +
// scalar fields) and recalculate ledger closing balances — previously it dropped
// stock/bank/tax edits and never recalculated balances.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const ledgerService = require("../ledger/ledgerService");
const voucherController = require("../voucher/voucherController");

const lid = (r) => r.ledger?.ledger_id ?? r.ledger_id;

describe("voucher.update full edit", () => {
  let companyId, fyId, partyId, salesId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany("Voucher Update Co");
    companyId = c.company_id;
    fyId = (await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [companyId])).rows[0].fy_id;
    partyId = lid(await ledgerService.create({ company_id: companyId, name: "Cust U" }));
    salesId = lid(await ledgerService.create({ company_id: companyId, name: "Sales U" }));
  });

  it("replaces stock lines + entries, updates scalars, and recalcs balances", async () => {
    const created = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10", status: "Regular",
      party_ledger_id: partyId, party_name: "Cust U",
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
      entries: [
        { ledger_id: partyId, ledger_name: "Cust U", type: "Dr", amount: 1000, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Sales U", type: "Cr", amount: 1000, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 100, hsn_code: "8471" }],
    });
    expect(created.success).toBe(true);
    const vid = created.voucher.voucher_id;

    const upd = await voucherController.update(null, {
      voucher_id: vid, company_id: companyId, fy_id: fyId, voucher_type: "Sales",
      date: "2026-04-15", narration: "edited",
      party_ledger_id: partyId, party_name: "Cust U",
      entries: [
        { ledger_id: partyId, ledger_name: "Cust U", type: "Dr", amount: 2500, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Sales U", type: "Cr", amount: 2500, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Gadget", quantity: 5, rate: 500, hsn_code: "8528" }],
    });
    expect(upd.success).toBe(true);

    const got = await voucherController.getById(null, vid);
    expect(got.success).toBe(true);
    const v = got.voucher;
    expect(v.narration).toBe("edited");
    expect(v.date).toBe("2026-04-15");
    // stock line replaced (was Widget x10 @100, now Gadget x5 @500)
    expect(v.stock_entries.length).toBe(1);
    expect(v.stock_entries[0].item_name).toBe("Gadget");
    expect(v.stock_entries[0].quantity).toBe(5);
    expect(v.stock_entries[0].amount).toBe(2500);
    // accounting entries updated
    expect(v.entries.find((e) => e.type === "Dr").amount).toBe(2500);
    // ledger closing balance recalculated to the NEW amount (not the original 1000)
    const bal = (await db.execute(`SELECT closing_balance FROM ledgers WHERE ledger_id = ?`, [partyId])).rows[0].closing_balance;
    expect(Math.abs(Number(bal))).toBe(2500);
  });

  it("preserves children that are not re-sent (partial update)", async () => {
    const created = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-11", status: "Regular",
      party_ledger_id: partyId, party_name: "Cust U",
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
      entries: [
        { ledger_id: partyId, ledger_name: "Cust U", type: "Dr", amount: 700, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Sales U", type: "Cr", amount: 700, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Keeper", quantity: 7, rate: 100, hsn_code: "8471" }],
    });
    const vid = created.voucher.voucher_id;
    // update only narration; do NOT send stock_entries
    await voucherController.update(null, { voucher_id: vid, narration: "note only" });
    const v = (await voucherController.getById(null, vid)).voucher;
    expect(v.narration).toBe("note only");
    expect(v.stock_entries.length).toBe(1);
    expect(v.stock_entries[0].item_name).toBe("Keeper");
  });
});
