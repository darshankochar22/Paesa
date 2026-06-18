/**
 * CRUD sweep for the stockGroup module, exercised the way the real UI uses it.
 *
 * Frontend pages:
 *   client/src/pages/master/inventory/stock-group/StockGroupCreate.tsx
 *   client/src/pages/master/inventory/stock-group/StockGroupAlter.tsx
 *
 * The Create form computes a `gst` object via calculateStockGroupGstDetails() and
 * sends exactly these keys to window.api.stockGroup.create:
 *   company_id, name, alias, parent_group_id, should_quantities_be_added,
 *   hsn_sac_code, hsn_sac_description, gst_rate, cgst_rate, sgst_rate,
 *   taxability_type   (the taxability the user picked)
 *
 * The Alter form reads taxability back from the `taxability_type` COLUMN
 * (g.taxability_type ?? "as_per_company"), so the round trip must persist the
 * user's taxability selection into taxability_type.
 */
const { setupTestDB, createTestCompany } = require("./helpers");
const stockGroupController = require("../stockGroup/stockGroupController");

describe("stockGroup CRUD sweep (UI parity)", () => {
  let company;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany("StockGroup Sweep Co");
  });

  // Mirrors calculateStockGroupGstDetails for a "specify" GST + Taxable selection.
  const buildCreatePayload = (overrides = {}) => ({
    company_id: company.company_id,
    name: "Electronics",
    alias: "Elec",
    parent_group_id: null,
    should_quantities_be_added: 1,
    hsn_sac_code: "8517",
    hsn_sac_description: "Telephone sets",
    gst_rate: 18,
    cgst_rate: 9,
    sgst_rate: 9,
    taxability_type: "Taxable",
    ...overrides,
  });

  test("create persists every field the Create form submits", async () => {
    const payload = buildCreatePayload();
    const res = await stockGroupController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.group).toBeTruthy();

    const id = res.group.sg_id;

    // Read back via getById.
    const byId = await stockGroupController.getById(null, id);
    expect(byId.success).toBe(true);
    const g = byId.group;

    expect(g.name).toBe("Electronics");
    expect(g.alias).toBe("Elec");
    expect(g.company_id).toBe(company.company_id);
    expect(g.should_quantities_be_added).toBe(1);
    expect(g.hsn_sac_code).toBe("8517");
    expect(g.hsn_sac_description).toBe("Telephone sets");
    expect(g.gst_rate).toBe(18);
    expect(g.cgst_rate).toBe(9);
    expect(g.sgst_rate).toBe(9);
    // The taxability the user picked MUST survive into taxability_type,
    // because the Alter form reads it back from that column.
    expect(g.taxability_type).toBe("Taxable");
    expect(g.is_active).toBe(1);
    expect(g.is_primary).toBe(0);
    expect(g.is_predefined).toBe(0);

    // And it must show up in getAll for the company.
    const all = await stockGroupController.getAll(null, company.company_id);
    expect(all.success).toBe(true);
    expect(all.stockGroups.some((row) => row.sg_id === id && row.name === "Electronics")).toBe(true);
  });

  test("create with the EXACT StockGroupCreate.tsx payload persists taxability the UI can read back", async () => {
    // This mirrors StockGroupCreate.tsx handleSubmit verbatim: it spreads the
    // computed `gst` object and sends `taxability_type` from it. The Alter form
    // later reads taxability from the taxability_type column, so a stock group
    // created here must round-trip its taxability selection.
    const gst = {
      hsn_sac_code: "9403",
      hsn_sac_description: "Furniture",
      gst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      taxability_type: "Taxable",
    };
    const formCreatePayload = {
      company_id: company.company_id,
      name: "Furniture",
      alias: "Furn",
      parent_group_id: null,
      should_quantities_be_added: 1,
      hsn_sac_code: gst.hsn_sac_code,
      hsn_sac_description: gst.hsn_sac_description,
      gst_rate: gst.gst_rate,
      cgst_rate: gst.cgst_rate,
      sgst_rate: gst.sgst_rate,
      taxability_type: gst.taxability_type,
    };

    const res = await stockGroupController.create(null, formCreatePayload);
    expect(res.success).toBe(true);

    const byId = await stockGroupController.getById(null, res.group.sg_id);
    expect(byId.success).toBe(true);
    // The taxability picked on the Create form must be readable from the same
    // column the Alter form reads from.
    expect(byId.group.taxability_type).toBe("Taxable");
  });

  test("create rejects duplicate names (case-insensitive)", async () => {
    const dup = await stockGroupController.create(null, buildCreatePayload({ name: "electronics" }));
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test("create supports a parent group (tree / under)", async () => {
    const parent = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Appliances", alias: null })
    );
    expect(parent.success).toBe(true);
    const parentId = parent.group.sg_id;

    const child = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Refrigerators", alias: null, parent_group_id: parentId })
    );
    expect(child.success).toBe(true);
    expect(child.group.parent_group_id).toBe(parentId);

    const tree = await stockGroupController.getTree(null, company.company_id);
    expect(tree.success).toBe(true);
    const parentNode = tree.tree.find((n) => n.sg_id === parentId);
    expect(parentNode).toBeTruthy();
    expect(parentNode.children.some((c) => c.sg_id === child.group.sg_id)).toBe(true);
  });

  test("update persists changed fields the Alter form submits", async () => {
    const created = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Stationery", alias: "Stat", taxability_type: "Taxable", gst_rate: 12, cgst_rate: 6, sgst_rate: 6 })
    );
    expect(created.success).toBe(true);
    const id = created.group.sg_id;

    const updateRes = await stockGroupController.update(null, {
      sg_id: id,
      company_id: company.company_id,
      name: "Stationery & Office",
      alias: "SO",
      parent_group_id: null,
      should_quantities_be_added: 0,
      hsn_sac_code: "4820",
      hsn_sac_description: "Registers",
      gst_rate: 5,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
      taxability_type: "Exempt",
      statutory_details: null,
    });
    expect(updateRes.success).toBe(true);

    const after = await stockGroupController.getById(null, id);
    expect(after.success).toBe(true);
    expect(after.group.name).toBe("Stationery & Office");
    expect(after.group.alias).toBe("SO");
    expect(after.group.should_quantities_be_added).toBe(0);
    expect(after.group.hsn_sac_code).toBe("4820");
    expect(after.group.gst_rate).toBe(5);
    expect(after.group.cgst_rate).toBe(2.5);
    expect(after.group.sgst_rate).toBe(2.5);
    expect(after.group.taxability_type).toBe("Exempt");
    // Update must not have deleted the row.
    expect(after.group.is_active).toBe(1);
  });

  test("update refuses predefined groups", async () => {
    const all = await stockGroupController.getAll(null, company.company_id);
    const predefined = all.stockGroups.find((g) => g.is_predefined === 1);
    expect(predefined).toBeTruthy();
    const res = await stockGroupController.update(null, {
      sg_id: predefined.sg_id,
      name: "Hacked Primary",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/predefined/i);
  });

  test("delete soft-deletes (is_active=0) and removes from getAll", async () => {
    const created = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Temp Group", alias: null })
    );
    const id = created.group.sg_id;

    const del = await stockGroupController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await stockGroupController.getAll(null, company.company_id);
    expect(all.stockGroups.some((g) => g.sg_id === id)).toBe(false);

    const byId = await stockGroupController.getById(null, id);
    expect(byId.success).toBe(true);
    expect(byId.group.is_active).toBe(0);
  });

  test("delete refuses a group that still has subgroups", async () => {
    const parent = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Has Children", alias: null })
    );
    const child = await stockGroupController.create(
      null,
      buildCreatePayload({ name: "Child One", alias: null, parent_group_id: parent.group.sg_id })
    );
    expect(child.success).toBe(true);

    const del = await stockGroupController.delete(null, parent.group.sg_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/subgroup/i);
  });
});
