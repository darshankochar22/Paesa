// CRUD sweep for the "gstClassification" module — exercises the controller
// exactly the way the real UI (GSTClassificationCOA.tsx via
// hooks/useGSTClassificationForm.ts handleSubmit/handleDelete) drives it
// through IPC.
//
// The frontend create payload (useGSTClassificationForm.handleSubmit, mode
// "create") builds `data` with:
//   company_id, name, description (trimmed or undefined),
//   hsn_sac_code (trimmed or undefined), is_non_gst_goods (0/1),
//   nature_of_transaction, taxability, is_reverse_charge (0/1),
//   is_ineligible_for_itc (0/1), rate_type ("Fixed Rate" | "Slab Based"),
//   igst_rate/cgst_rate/sgst_rate/cess_rate (numbers),
//   *_valuation_type, slab_rows (array of {greater_than, up_to, taxability,
//   gst_rate} objects when rate_type === "Slab Based", otherwise undefined),
//   is_predefined (0), is_active (1).
//
// The update payload is the same shape plus gc_id; delete sends just the id.
// We replay these verbatim and assert every submitted field actually persists
// (catches "ignored field" / "dropped flag" bugs and the slab JSON round-trip).

const { setupTestDB, createTestCompany } = require("./helpers");
const gstClassificationController = require("../gstClassification/gstClassificationController");

describe("GST Classification CRUD sweep (UI-faithful)", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Classification CRUD Sweep Co");
    companyId = company.company_id;
  });

  // ----- Fixed Rate create (the common path) -----
  // Mirrors handleSubmit with gst_rate_details === "Specify Details Here",
  // taxability "Taxable", a custom IGST split, HSN code, reverse charge + ITC
  // flags set, and a non-empty description.
  it("create (Fixed Rate) persists EVERY field the form submits", async () => {
    const payload = {
      company_id: companyId,
      name: "Custom Goods 18%",
      description: "Custom 18% classification",
      hsn_sac_code: "12345678",
      is_non_gst_goods: 0,
      nature_of_transaction: "Sales Taxable",
      taxability: "Taxable",
      is_reverse_charge: 1,
      is_ineligible_for_itc: 1,
      rate_type: "Fixed Rate",
      igst_rate: 18,
      igst_valuation_type: "Based on Value",
      cgst_rate: 9,
      cgst_valuation_type: "Based on Value",
      sgst_rate: 9,
      sgst_valuation_type: "Based on Value",
      cess_rate: 0,
      cess_valuation_type: "Based on Value",
      slab_rows: undefined, // form sends undefined when not slab-based
      is_predefined: 0,
      is_active: 1,
    };

    const res = await gstClassificationController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.classification).toBeDefined();
    const gcId = res.classification.gc_id;
    expect(gcId).toBeTruthy();

    // Read back via getById and assert each submitted field persisted.
    const got = await gstClassificationController.getById(null, gcId);
    expect(got.success).toBe(true);
    const c = got.classification;
    expect(c.name).toBe("Custom Goods 18%");
    expect(c.description).toBe("Custom 18% classification");
    expect(c.hsn_sac_code).toBe("12345678");
    expect(c.is_non_gst_goods).toBe(0);
    expect(c.nature_of_transaction).toBe("Sales Taxable");
    expect(c.taxability).toBe("Taxable");
    expect(c.is_reverse_charge).toBe(1);
    expect(c.is_ineligible_for_itc).toBe(1);
    expect(c.rate_type).toBe("Fixed Rate");
    expect(c.igst_rate).toBe(18);
    expect(c.cgst_rate).toBe(9);
    expect(c.sgst_rate).toBe(9);
    expect(c.cess_rate).toBe(0);
    expect(c.igst_valuation_type).toBe("Based on Value");
    expect(c.is_predefined).toBe(0);
    expect(c.is_active).toBe(1);

    // And it shows up in getAll for the company.
    const all = await gstClassificationController.getAll(null, companyId);
    expect(all.success).toBe(true);
    expect(all.gstClassifications.some((x) => x.gc_id === gcId)).toBe(true);
  });

  // ----- Slab Based create (array/object field that must be JSON-serialized) -----
  // Mirrors handleSubmit with gst_rate_details === "Specify Slab-Based Rates":
  // rate_type "Slab Based", slab_rows is an array of plain objects, igst/cgst/
  // sgst all forced to 0, taxability taken from slabRows[0].taxability.
  it("create (Slab Based) JSON-serializes slab_rows and round-trips them", async () => {
    const slabRows = [
      { greater_than: "0", up_to: "1000", taxability: "Taxable", gst_rate: "5" },
      { greater_than: "1000", up_to: "", taxability: "Taxable", gst_rate: "12" },
    ];
    const payload = {
      company_id: companyId,
      name: "Slab Footwear",
      description: undefined,
      hsn_sac_code: undefined,
      is_non_gst_goods: 0,
      nature_of_transaction: "Not Applicable",
      taxability: "Taxable", // slabRows[0].taxability
      is_reverse_charge: 0,
      is_ineligible_for_itc: 0,
      rate_type: "Slab Based",
      igst_rate: 0,
      igst_valuation_type: "Based on Value",
      cgst_rate: 0,
      cgst_valuation_type: "Based on Value",
      sgst_rate: 0,
      sgst_valuation_type: "Based on Value",
      cess_rate: 0,
      cess_valuation_type: "Based on Value",
      slab_rows: slabRows,
      is_predefined: 0,
      is_active: 1,
    };

    const res = await gstClassificationController.create(null, payload);
    expect(res.success).toBe(true);
    const gcId = res.classification.gc_id;

    const got = await gstClassificationController.getById(null, gcId);
    expect(got.success).toBe(true);
    const c = got.classification;
    expect(c.rate_type).toBe("Slab Based");
    // raw column holds JSON; parseSlabRows exposes the parsed array as slab_rows.
    expect(Array.isArray(c.slab_rows)).toBe(true);
    expect(c.slab_rows).toEqual(slabRows);
  });

  // ----- Duplicate name guard -----
  it("rejects a duplicate active name (case-insensitive)", async () => {
    const dup = await gstClassificationController.create(null, {
      company_id: companyId,
      name: "custom goods 18%", // same as first, different case
      rate_type: "Fixed Rate",
      igst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  // ----- Update (changed fields must persist; predefined block must hold) -----
  it("update persists changed fields and does not delete the row", async () => {
    const created = await gstClassificationController.create(null, {
      company_id: companyId,
      name: "To Be Updated",
      description: "before",
      is_non_gst_goods: 0,
      nature_of_transaction: "Not Applicable",
      taxability: "Taxable",
      is_reverse_charge: 0,
      is_ineligible_for_itc: 0,
      rate_type: "Fixed Rate",
      igst_rate: 12,
      cgst_rate: 6,
      sgst_rate: 6,
      cess_rate: 0,
    });
    expect(created.success).toBe(true);
    const gcId = created.classification.gc_id;

    // Replay an alter-mode handleSubmit payload (same data shape + gc_id).
    const updatePayload = {
      gc_id: gcId,
      company_id: companyId,
      name: "Updated Name",
      description: "after",
      hsn_sac_code: "9988",
      is_non_gst_goods: 1,
      nature_of_transaction: "Sales Exempt",
      taxability: "Exempt",
      is_reverse_charge: 1,
      is_ineligible_for_itc: 1,
      rate_type: "Fixed Rate",
      igst_rate: 0,
      igst_valuation_type: "Based on Value",
      cgst_rate: 0,
      cgst_valuation_type: "Based on Value",
      sgst_rate: 0,
      sgst_valuation_type: "Based on Value",
      cess_rate: 0,
      cess_valuation_type: "Based on Value",
      slab_rows: undefined,
      is_predefined: 0,
      is_active: 1,
    };

    const upd = await gstClassificationController.update(null, updatePayload);
    expect(upd.success).toBe(true);

    const got = await gstClassificationController.getById(null, gcId);
    expect(got.success).toBe(true);
    const c = got.classification;
    expect(c.name).toBe("Updated Name");
    expect(c.description).toBe("after");
    expect(c.hsn_sac_code).toBe("9988");
    expect(c.is_non_gst_goods).toBe(1);
    expect(c.nature_of_transaction).toBe("Sales Exempt");
    expect(c.taxability).toBe("Exempt");
    expect(c.is_reverse_charge).toBe(1);
    expect(c.is_ineligible_for_itc).toBe(1);
    expect(c.igst_rate).toBe(0);
    // The row must still exist and be active (catches update-that-deletes bugs).
    expect(c.is_active).toBe(1);
  });

  // ----- Predefined classifications cannot be altered/deleted -----
  it("refuses to update or delete a predefined (seeded) classification", async () => {
    const all = await gstClassificationController.getAll(null, companyId);
    const predefined = all.gstClassifications.find((x) => x.is_predefined === 1);
    expect(predefined).toBeDefined();

    const upd = await gstClassificationController.update(null, {
      gc_id: predefined.gc_id,
      name: "Hacked Predefined",
    });
    expect(upd.success).toBe(false);
    expect(upd.error).toMatch(/predefined/i);

    const del = await gstClassificationController.delete(null, predefined.gc_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);

    // Still intact + active.
    const got = await gstClassificationController.getById(null, predefined.gc_id);
    expect(got.classification.name).toBe(predefined.name);
    expect(got.classification.is_active).toBe(1);
  });

  // ----- Delete (soft delete via is_active=0) -----
  it("delete soft-removes the classification (is_active=0, gone from getAll)", async () => {
    const created = await gstClassificationController.create(null, {
      company_id: companyId,
      name: "To Be Deleted",
      rate_type: "Fixed Rate",
      igst_rate: 5,
      cgst_rate: 2.5,
      sgst_rate: 2.5,
    });
    expect(created.success).toBe(true);
    const gcId = created.classification.gc_id;

    const del = await gstClassificationController.delete(null, gcId);
    expect(del.success).toBe(true);

    // Soft-deleted: row still readable by id with is_active=0...
    const got = await gstClassificationController.getById(null, gcId);
    expect(got.success).toBe(true);
    expect(got.classification.is_active).toBe(0);

    // ...but excluded from the company's active list.
    const all = await gstClassificationController.getAll(null, companyId);
    expect(all.gstClassifications.some((x) => x.gc_id === gcId)).toBe(false);
  });
});
