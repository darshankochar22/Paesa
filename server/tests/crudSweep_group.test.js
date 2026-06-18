// CRUD sweep for the "group" module, exercising it exactly as the real UI does.
//
// Frontend pages:
//   client/src/pages/master/group/GroupCreate.tsx     -> window.api.group.create(payload)
//   client/src/pages/master/group/GroupAlterEdit.tsx  -> window.api.group.update(payload)
//
// We call groupController.create/update/delete(null, payload) with payloads shaped
// exactly like the forms send (including empty strings, the "[]" slab string, and the
// optional classification ids) and read back via getAll/getById/getTree to assert the
// submitted fields actually PERSISTED.
const { setupTestDB, createTestCompany } = require("./helpers");
const groupController = require("../group/groupController");

describe("crudSweep group", () => {
  let companyId;
  let capitalAccount;       // default parent the Create form uses
  let currentAssets;        // primary that triggers the Statutory Details section

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Group CRUD Sweep Co");
    companyId = company.company_id;

    const all = await groupController.getAll(null, companyId);
    expect(all.success).toBe(true);
    capitalAccount = all.groups.find((g) => g.name === "Capital Account");
    currentAssets = all.groups.find((g) => g.name === "Current Assets");
    expect(capitalAccount).toBeDefined();
    expect(currentAssets).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // CREATE — payload mirrors GroupCreate.tsx handleSubmit (default Capital
  // Account parent, all the flag/empty/array fields the form always sends).
  // -------------------------------------------------------------------------
  it("creates a group under Capital Account and persists the form fields", async () => {
    const payload = {
      company_id: companyId,
      name: "CRUD Reserve",
      alias: "RSV",
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      set_alter_tds_details: 0,
      set_alter_tcs_details: 0,
      set_alter_other_statutory_details: 0,
      set_alter_service_tax_details: 0,
      hsn_sac_source: "As per Company/Group",
      hsn_sac_code: undefined,
      hsn_sac_description: undefined,
      gst_rate_source: "As per Company/Group",
      gst_rate: 0,
      taxability_type: undefined,
      hsn_sac_classification_id: undefined,
      gst_classification_id: undefined,
      slab_based_rates: "[]",
      behaves_like_subledger: 1,
      show_net_debit_credit: 1,
      used_for_calculation: 1,
      allocation_method: "Appropriate by Value",
    };

    const res = await groupController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.group).toBeDefined();
    const id = res.group.group_id;

    const read = await groupController.getById(null, id);
    expect(read.success).toBe(true);
    const g = read.group;

    // Identity / hierarchy.
    expect(g.name).toBe("CRUD Reserve");
    expect(g.alias).toBe("RSV");
    expect(g.parent_group_id).toBe(capitalAccount.group_id);
    expect(g.is_primary).toBe(0);
    expect(g.nature).toBe("Liabilities");

    // The flag fields the form always submits must persist as sent (not be
    // dropped/overridden by the service).
    expect(g.behaves_like_subledger).toBe(1);
    expect(g.show_net_debit_credit).toBe(1);
    expect(g.used_for_calculation).toBe(1);
    expect(g.allocation_method).toBe("Appropriate by Value");

    // The "[]" slab string the form always sends must round-trip.
    expect(g.slab_based_rates).toBe("[]");

    // User-created groups must not be flagged predefined (would block delete).
    expect(g.is_predefined).toBe(0);
  });

  it("rejects a duplicate group name (case-insensitive) like the service guards", async () => {
    const payload = {
      company_id: companyId,
      name: "crud reserve", // same name, different case
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      slab_based_rates: "[]",
      allocation_method: "Not Applicable",
    };
    const res = await groupController.create(null, payload);
    expect(res.success).toBe(false);
  });

  // -------------------------------------------------------------------------
  // CREATE — statutory variant: the form sends real HSN/SAC + GST + slab JSON
  // + classification ids when the parent is "Current Assets". Verify all of
  // those statutory/array/id fields persist (catches "ignored field" bugs).
  // -------------------------------------------------------------------------
  it("persists statutory HSN/SAC, GST rate, slab-rates JSON and classification ids", async () => {
    const slab = JSON.stringify([
      { from: 0, to: 1000, rate: 5 },
      { from: 1000, to: null, rate: 12 },
    ]);
    const payload = {
      company_id: companyId,
      name: "CRUD Statutory Stock",
      alias: "",
      parent_group_id: currentAssets.group_id,
      is_primary: 0,
      nature: "Assets",
      set_alter_tds_details: 0,
      set_alter_tcs_details: 0,
      set_alter_other_statutory_details: 0,
      set_alter_service_tax_details: 0,
      hsn_sac_source: "Specify Details Here",
      hsn_sac_code: "1001",
      hsn_sac_description: "Test goods",
      gst_rate_source: "Specify Slab-Based Rates",
      gst_rate: 18,
      taxability_type: "Taxable",
      hsn_sac_classification_id: 7,
      gst_classification_id: 9,
      slab_based_rates: slab,
      behaves_like_subledger: 0,
      show_net_debit_credit: 0,
      used_for_calculation: 0,
      allocation_method: "Not Applicable",
    };

    const res = await groupController.create(null, payload);
    expect(res.success).toBe(true);
    const read = await groupController.getById(null, res.group.group_id);
    const g = read.group;

    expect(g.hsn_sac_source).toBe("Specify Details Here");
    expect(g.hsn_sac_code).toBe("1001");
    expect(g.hsn_sac_description).toBe("Test goods");
    expect(g.gst_rate_source).toBe("Specify Slab-Based Rates");
    expect(g.gst_rate).toBe(18);
    expect(g.taxability_type).toBe("Taxable");
    expect(g.hsn_sac_classification_id).toBe(7);
    expect(g.gst_classification_id).toBe(9);
    // Slab JSON string must round-trip byte-for-byte and re-parse.
    expect(g.slab_based_rates).toBe(slab);
    expect(JSON.parse(g.slab_based_rates)).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // UPDATE — payload mirrors GroupAlterEdit.tsx handleSubmit. Change several
  // fields and assert the change persisted (catches broken update handlers).
  // -------------------------------------------------------------------------
  it("updates an existing group and persists the changed fields", async () => {
    const created = await groupController.create(null, {
      company_id: companyId,
      name: "CRUD Editable",
      alias: "ED1",
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      slab_based_rates: "[]",
      behaves_like_subledger: 0,
      show_net_debit_credit: 0,
      used_for_calculation: 0,
      allocation_method: "Not Applicable",
    });
    expect(created.success).toBe(true);
    const id = created.group.group_id;

    const updatePayload = {
      group_id: id,
      company_id: companyId,
      name: "CRUD Edited",
      alias: "ED2",
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      set_alter_tds_details: 0,
      set_alter_tcs_details: 0,
      set_alter_other_statutory_details: 0,
      set_alter_service_tax_details: 0,
      hsn_sac_source: "As per Company/Group",
      hsn_sac_code: null,
      hsn_sac_description: null,
      gst_rate_source: "As per Company/Group",
      gst_rate: 0,
      taxability_type: null,
      hsn_sac_classification_id: null,
      gst_classification_id: null,
      slab_based_rates: JSON.stringify([{ from: 0, to: null, rate: 28 }]),
      behaves_like_subledger: 1,
      show_net_debit_credit: 1,
      used_for_calculation: 1,
      allocation_method: "Appropriate by Quantity",
    };

    const upd = await groupController.update(null, updatePayload);
    expect(upd.success).toBe(true);

    const read = await groupController.getById(null, id);
    const g = read.group;
    expect(g.name).toBe("CRUD Edited");
    expect(g.alias).toBe("ED2");
    expect(g.behaves_like_subledger).toBe(1);
    expect(g.show_net_debit_credit).toBe(1);
    expect(g.used_for_calculation).toBe(1);
    expect(g.allocation_method).toBe("Appropriate by Quantity");
    expect(g.slab_based_rates).toBe(JSON.stringify([{ from: 0, to: null, rate: 28 }]));
    // The row must still exist (i.e. update did not delete/deactivate it).
    expect(g.is_active).toBe(1);
  });

  // -------------------------------------------------------------------------
  // TREE — buildTree must nest the created group under its parent.
  // -------------------------------------------------------------------------
  it("includes a created subgroup under its parent in getTree", async () => {
    const tree = await groupController.getTree(null, companyId);
    expect(tree.success).toBe(true);
    const capitalNode = tree.tree.find((n) => n.name === "Capital Account");
    expect(capitalNode).toBeDefined();
    expect(capitalNode.children.some((c) => c.name === "CRUD Reserve")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // DELETE — soft delete (is_active = 0); guards on predefined + subgroups.
  // -------------------------------------------------------------------------
  it("soft-deletes a leaf group (removed from getAll, is_active=0)", async () => {
    const created = await groupController.create(null, {
      company_id: companyId,
      name: "CRUD Deletable",
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      slab_based_rates: "[]",
      allocation_method: "Not Applicable",
    });
    expect(created.success).toBe(true);
    const id = created.group.group_id;

    const del = await groupController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await groupController.getAll(null, companyId);
    expect(all.groups.some((g) => g.group_id === id)).toBe(false);

    const read = await groupController.getById(null, id);
    expect(read.success).toBe(true);
    expect(read.group.is_active).toBe(0);
  });

  it("refuses to delete a predefined group", async () => {
    const del = await groupController.delete(null, capitalAccount.group_id);
    expect(del.success).toBe(false);
  });

  it("refuses to delete a group that still has subgroups", async () => {
    // "CRUD Reserve" is a child of Capital Account; Capital Account has children,
    // so deleting it must fail (also predefined). Build an explicit parent/child.
    const parent = await groupController.create(null, {
      company_id: companyId,
      name: "CRUD Parent",
      parent_group_id: capitalAccount.group_id,
      is_primary: 0,
      nature: "Liabilities",
      slab_based_rates: "[]",
      allocation_method: "Not Applicable",
    });
    const child = await groupController.create(null, {
      company_id: companyId,
      name: "CRUD Child",
      parent_group_id: parent.group.group_id,
      is_primary: 0,
      nature: "Liabilities",
      slab_based_rates: "[]",
      allocation_method: "Not Applicable",
    });
    expect(child.success).toBe(true);

    const del = await groupController.delete(null, parent.group.group_id);
    expect(del.success).toBe(false);
  });
});
