const { setupTestDB, createTestCompany, db } = require("./helpers");
const groupController = require("../group/groupController");

// Regression: the Create Group UI sends slab_based_rates as a JS array ([]), which libsql
// cannot bind to a TEXT column. The service must JSON-serialize it on write (and parse on read).
describe("Group create with array/object fields (libsql bind regression)", () => {
  let companyId, parentId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany("Group Create Co");
    companyId = c.company_id;
    parentId = (await db.execute(`SELECT group_id FROM groups WHERE company_id=? AND name='Capital Account' LIMIT 1`, [companyId])).rows[0].group_id;
  });

  it("creates a group when slab_based_rates is an array", async () => {
    const res = await groupController.create(null, {
      company_id: companyId, name: "Hame", alias: "", parent_group_id: parentId, nature: "Liabilities",
      behaves_like_subledger: 1, show_net_debit_credit: 1, used_for_calculation: 1,
      allocation_method: "Not Applicable", slab_based_rates: [], statutory_details: 0,
    });
    expect(res.success).toBe(true);
    expect(res.group.group_id).toBeDefined();
    // round-trips back as an array, not a "[]" string
    expect(Array.isArray(res.group.slab_based_rates)).toBe(true);
  });

  it("creates a group with a non-empty slab_based_rates array", async () => {
    const res = await groupController.create(null, {
      company_id: companyId, name: "Slabbed", parent_group_id: parentId, nature: "Liabilities",
      slab_based_rates: [{ from: 0, to: 100000, rate: 5 }],
    });
    expect(res.success).toBe(true);
    expect(res.group.slab_based_rates[0].rate).toBe(5);
  });
});
