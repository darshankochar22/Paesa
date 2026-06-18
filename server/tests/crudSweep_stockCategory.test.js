/**
 * CRUD sweep for the stockCategory module, exercised the way the real UI uses it.
 *
 * Frontend page:
 *   client/src/pages/master/inventory/stock-category/StockCategoryCreate.tsx
 *
 * The Create form (StockCategoryCreate.tsx handleSubmit) sends EXACTLY these keys
 * to window.api.stockCategory.create:
 *   {
 *     company_id,
 *     name,                         // trimmed, required
 *     alias: form.alias.trim() || undefined,                    // undefined when empty
 *     parent_category_id: form.parent_category_id ? Number(..) : undefined,  // undefined for "Primary"
 *   }
 * Note: the form NEVER sends `description`. It does send `undefined` for alias /
 * parent when those fields are blank, so the service must tolerate undefined.
 *
 * StockCategoryCreate also reads categories back via getAll and renders
 * c.sc_id / c.name, so those snake_case fields must round-trip.
 *
 * There is no dedicated Alter page wired yet, but the controller exposes
 * update + delete, so we exercise them here to catch broken handlers.
 */
const { setupTestDB, createTestCompany } = require("./helpers");
const stockCategoryController = require("../stockCategory/stockCategoryController");

describe("stockCategory CRUD sweep (UI parity)", () => {
  let company;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany("StockCategory Sweep Co");
  });

  // Mirrors StockCategoryCreate.tsx handleSubmit verbatim: blank alias/parent
  // are sent as `undefined`, and `description` is never included.
  const buildCreatePayload = (overrides = {}) => ({
    company_id: company.company_id,
    name: "Raw Materials",
    alias: "RM",
    parent_category_id: undefined,
    ...overrides,
  });

  test("create persists every field the Create form submits", async () => {
    const payload = buildCreatePayload();
    const res = await stockCategoryController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.category).toBeTruthy();

    const id = res.category.sc_id;

    // Read back via getById in the exact snake_case shape the UI consumes.
    const byId = await stockCategoryController.getById(null, id);
    expect(byId.success).toBe(true);
    const c = byId.category;

    expect(c.name).toBe("Raw Materials");
    expect(c.alias).toBe("RM");
    expect(c.company_id).toBe(company.company_id);
    expect(c.parent_category_id).toBeFalsy(); // Primary => null
    expect(c.is_active).toBe(1);

    // And it must show up in getAll for the company (StockCategoryCreate lists these).
    const all = await stockCategoryController.getAll(null, company.company_id);
    expect(all.success).toBe(true);
    expect(
      all.stockCategories.some((row) => row.sc_id === id && row.name === "Raw Materials")
    ).toBe(true);
  });

  test("create tolerates blank alias/parent sent as undefined (UI default)", async () => {
    // The form sends alias: undefined and parent_category_id: undefined when blank.
    const res = await stockCategoryController.create(null, {
      company_id: company.company_id,
      name: "Consumables",
      alias: undefined,
      parent_category_id: undefined,
    });
    expect(res.success).toBe(true);

    const byId = await stockCategoryController.getById(null, res.category.sc_id);
    expect(byId.success).toBe(true);
    expect(byId.category.alias).toBeFalsy();
    expect(byId.category.parent_category_id).toBeFalsy();
  });

  test("create rejects duplicate names (case-insensitive)", async () => {
    const dup = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "raw materials" })
    );
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test("create supports a parent category (tree / under)", async () => {
    const parent = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Finished Goods", alias: undefined })
    );
    expect(parent.success).toBe(true);
    const parentId = parent.category.sc_id;

    // Mirrors the panel selecting a parent: form.parent_category_id => Number(...)
    const child = await stockCategoryController.create(
      null,
      buildCreatePayload({
        name: "Packaged Goods",
        alias: undefined,
        parent_category_id: Number(parentId),
      })
    );
    expect(child.success).toBe(true);
    expect(child.category.parent_category_id).toBe(parentId);

    // getAll should include both, in snake_case shape.
    const all = await stockCategoryController.getAll(null, company.company_id);
    expect(all.stockCategories.some((c) => c.sc_id === parentId)).toBe(true);
    expect(
      all.stockCategories.some(
        (c) => c.sc_id === child.category.sc_id && c.parent_category_id === parentId
      )
    ).toBe(true);
  });

  test("update persists changed fields and does NOT delete the row", async () => {
    const created = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Spares", alias: "SP" })
    );
    expect(created.success).toBe(true);
    const id = created.category.sc_id;

    const updateRes = await stockCategoryController.update(null, {
      sc_id: id,
      name: "Spare Parts",
      alias: "SPN",
      description: "All spare parts",
      parent_category_id: null,
    });
    expect(updateRes.success).toBe(true);

    const after = await stockCategoryController.getById(null, id);
    expect(after.success).toBe(true);
    expect(after.category.name).toBe("Spare Parts");
    expect(after.category.alias).toBe("SPN");
    expect(after.category.description).toBe("All spare parts");
    // Update must NOT have soft-deleted the row.
    expect(after.category.is_active).toBe(1);

    // The renamed category must still surface in getAll.
    const all = await stockCategoryController.getAll(null, company.company_id);
    expect(all.stockCategories.some((c) => c.sc_id === id && c.name === "Spare Parts")).toBe(true);
  });

  test("update rejects renaming onto an existing name (case-insensitive)", async () => {
    const a = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Tools", alias: undefined })
    );
    await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Hardware", alias: undefined })
    );
    const res = await stockCategoryController.update(null, {
      sc_id: a.category.sc_id,
      name: "hardware",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  test("delete soft-deletes (is_active=0) and removes from getAll", async () => {
    const created = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Temp Category", alias: undefined })
    );
    const id = created.category.sc_id;

    const del = await stockCategoryController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await stockCategoryController.getAll(null, company.company_id);
    expect(all.stockCategories.some((c) => c.sc_id === id)).toBe(false);

    const byId = await stockCategoryController.getById(null, id);
    expect(byId.success).toBe(true);
    expect(byId.category.is_active).toBe(0);
  });

  test("delete refuses a category that still has subcategories", async () => {
    const parent = await stockCategoryController.create(
      null,
      buildCreatePayload({ name: "Has Children Cat", alias: undefined })
    );
    const child = await stockCategoryController.create(
      null,
      buildCreatePayload({
        name: "Child Cat One",
        alias: undefined,
        parent_category_id: Number(parent.category.sc_id),
      })
    );
    expect(child.success).toBe(true);

    const del = await stockCategoryController.delete(null, parent.category.sc_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/subcategor/i);
  });
});
