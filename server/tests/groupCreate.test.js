const { setupTestDB, createTestCompany, db } = require("./helpers");
const { rawDb } = require("../db/index");
const { reconcileSchema } = require("../db/reconcile");
const groupController = require("../group/groupController");

describe("Group create + schema-drift healing", () => {
  let companyId, parentId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany("Group Create Co");
    companyId = c.company_id;
    parentId = (await db.execute(`SELECT group_id FROM groups WHERE company_id=? AND name='Capital Account' LIMIT 1`, [companyId])).rows[0].group_id;
  });

  it("creates a group with the real UI payload (slab_based_rates as a JSON string)", async () => {
    const res = await groupController.create(null, {
      company_id: companyId, name: "Hame", parent_group_id: parentId, nature: "Liabilities",
      behaves_like_subledger: 1, show_net_debit_credit: 1, used_for_calculation: 1,
      allocation_method: "Not Applicable", slab_based_rates: "[]",
    });
    expect(res.success).toBe(true);
    expect(res.group.group_id).toBeDefined();
  });

  it("still works if a form ever sends slab_based_rates as an array (defensive serialize)", async () => {
    const res = await groupController.create(null, {
      company_id: companyId, name: "ArrSlab", parent_group_id: parentId, nature: "Liabilities",
      slab_based_rates: [{ from: 0, to: 100000, rate: 5 }],
    });
    expect(res.success).toBe(true);
  });

  // The actual bug the user hit: an older startup.db missing a newer column. CREATE TABLE
  // IF NOT EXISTS won't add it; the reconciler must.
  it("reconciler adds a missing column so inserts stop failing (schema drift)", async () => {
    await rawDb.execute(`ALTER TABLE groups DROP COLUMN slab_based_rates`);

    // Sanity: the insert now fails (column missing) — exactly the user's error.
    const broken = await groupController.create(null, {
      company_id: companyId, name: "Drifted", parent_group_id: parentId, nature: "Liabilities", slab_based_rates: "[]",
    });
    expect(broken.success).toBe(false);
    expect(broken.error).toMatch(/slab_based_rates|no column|Failed query/i);

    // Heal it.
    const added = await reconcileSchema(rawDb);
    expect(added).toContain("groups.slab_based_rates");

    // Now it works again.
    const fixed = await groupController.create(null, {
      company_id: companyId, name: "Healed", parent_group_id: parentId, nature: "Liabilities", slab_based_rates: "[]",
    });
    expect(fixed.success).toBe(true);
  });
});
