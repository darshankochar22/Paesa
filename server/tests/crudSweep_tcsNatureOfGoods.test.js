const { setupTestDB, createTestCompany } = require("./helpers");
const tcsNatureOfGoodsController = require("../tcsNatureOfGoods/tcsNatureOfGoodsController");

// CRUD sweep that mirrors how the real UI (useTCSNatureOfGoodsForm.ts) drives
// the tcsNatureOfGoods module end-to-end, including its empty/optional fields,
// numeric coercions, and the zero-rated / tax-on-realization gotchas.
describe("tcsNatureOfGoods CRUD sweep (UI-shaped payloads)", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("TCS Nature Of Goods Sweep Co");
    companyId = company.company_id;
  });

  // Mirrors the exact object built in useTCSNatureOfGoodsForm.handleSubmit (create mode).
  const buildCreatePayload = (overrides = {}) => ({
    company_id: companyId,
    name: "Timber",
    section: "206C(1)",
    payment_code: "6CC",
    rate_individual_with_pan: 2.5,
    rate_individual_without_pan: 5,
    rate_other_with_pan: 2.5,
    rate_other_without_pan: 5,
    is_own_status: 0,
    tax_on_receipt_or_realization: "Tax Calculated on Receipt",
    threshold_level: 50000,
    is_zero_rated: 0,
    is_predefined: 0,
    is_active: 1,
    ...overrides,
  });

  it("create persists every field the form submits and reads back via getById", async () => {
    const payload = buildCreatePayload({ name: "Timber Logs" });
    const res = await tcsNatureOfGoodsController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.tcsNatureOfGoods).toBeTruthy();

    const id = res.tcsNatureOfGoods.tcs_id;
    const back = await tcsNatureOfGoodsController.getById(null, id);
    expect(back.success).toBe(true);
    const row = back.tcsNatureOfGoods;

    expect(row.name).toBe("Timber Logs");
    expect(row.section).toBe("206C(1)");
    expect(row.payment_code).toBe("6CC");
    expect(row.rate_individual_with_pan).toBe(2.5);
    expect(row.rate_individual_without_pan).toBe(5);
    expect(row.rate_other_with_pan).toBe(2.5);
    expect(row.rate_other_without_pan).toBe(5);
    expect(row.is_own_status).toBe(0);
    expect(row.tax_on_receipt_or_realization).toBe("Tax Calculated on Receipt");
    expect(row.threshold_level).toBe(50000);
    expect(row.is_zero_rated).toBe(0);
    expect(row.is_active).toBe(1);
    expect(row.company_id).toBe(companyId);
  });

  it("create persists is_own_status=1, zero-rated and tax-on-realization variants", async () => {
    const payload = buildCreatePayload({
      name: "Scrap Realization",
      is_own_status: 1,
      tax_on_receipt_or_realization: "Tax Calculated on Realization",
      is_zero_rated: 1,
      // UI zeroes the rates when is_zero_rated is Yes:
      rate_individual_with_pan: 0,
      rate_individual_without_pan: 0,
      rate_other_with_pan: 0,
      rate_other_without_pan: 0,
    });
    const res = await tcsNatureOfGoodsController.create(null, payload);
    expect(res.success).toBe(true);

    const back = await tcsNatureOfGoodsController.getById(null, res.tcsNatureOfGoods.tcs_id);
    const row = back.tcsNatureOfGoods;
    expect(row.is_own_status).toBe(1);
    expect(row.tax_on_receipt_or_realization).toBe("Tax Calculated on Realization");
    expect(row.is_zero_rated).toBe(1);
    expect(row.rate_individual_with_pan).toBe(0);
    expect(row.rate_other_without_pan).toBe(0);
  });

  it("create tolerates the form's optional/undefined section & payment_code", async () => {
    // The form sends `undefined` for empty section/payment_code (`.trim() || undefined`).
    const payload = buildCreatePayload({
      name: "No Section Goods",
      section: undefined,
      payment_code: undefined,
    });
    const res = await tcsNatureOfGoodsController.create(null, payload);
    expect(res.success).toBe(true);

    const back = await tcsNatureOfGoodsController.getById(null, res.tcsNatureOfGoods.tcs_id);
    expect(back.tcsNatureOfGoods.section).toBeNull();
    expect(back.tcsNatureOfGoods.payment_code).toBeNull();
  });

  it("getAll returns active rows scoped to the company", async () => {
    const res = await tcsNatureOfGoodsController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.tcsNatureOfGoodsList)).toBe(true);
    expect(res.tcsNatureOfGoodsList.length).toBeGreaterThanOrEqual(3);
    res.tcsNatureOfGoodsList.forEach((r) => {
      expect(r.company_id).toBe(companyId);
      expect(r.is_active).toBe(1);
    });
  });

  it("rejects duplicate name (case-insensitive) for the same company", async () => {
    await tcsNatureOfGoodsController.create(null, buildCreatePayload({ name: "DupGood" }));
    const dup = await tcsNatureOfGoodsController.create(null, buildCreatePayload({ name: "dupgood" }));
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  it("update persists changed fields (mirrors alter-mode payload, incl. tcs_id)", async () => {
    const created = await tcsNatureOfGoodsController.create(
      null,
      buildCreatePayload({ name: "Editable Goods", threshold_level: 1000 })
    );
    const id = created.tcsNatureOfGoods.tcs_id;

    // Alter mode sends the full object back plus tcs_id.
    const updatePayload = {
      tcs_id: id,
      company_id: companyId,
      name: "Editable Goods Renamed",
      section: "206C(2)",
      payment_code: "6DD",
      rate_individual_with_pan: 1,
      rate_individual_without_pan: 2,
      rate_other_with_pan: 1,
      rate_other_without_pan: 2,
      is_own_status: 1,
      tax_on_receipt_or_realization: "Tax Calculated on Realization",
      threshold_level: 99999,
      is_zero_rated: 0,
      is_predefined: 0,
      is_active: 1,
    };
    const upd = await tcsNatureOfGoodsController.update(null, updatePayload);
    expect(upd.success).toBe(true);

    const back = await tcsNatureOfGoodsController.getById(null, id);
    const row = back.tcsNatureOfGoods;
    expect(row.name).toBe("Editable Goods Renamed");
    expect(row.section).toBe("206C(2)");
    expect(row.payment_code).toBe("6DD");
    expect(row.rate_individual_with_pan).toBe(1);
    expect(row.rate_other_without_pan).toBe(2);
    expect(row.is_own_status).toBe(1);
    expect(row.tax_on_receipt_or_realization).toBe("Tax Calculated on Realization");
    expect(row.threshold_level).toBe(99999);
    // Row must still be the same record (update must not delete+recreate).
    expect(row.tcs_id).toBe(id);
    expect(row.is_active).toBe(1);
  });

  it("delete soft-removes the record (is_active=0, hidden from getAll)", async () => {
    const created = await tcsNatureOfGoodsController.create(
      null,
      buildCreatePayload({ name: "Deletable Goods" })
    );
    const id = created.tcsNatureOfGoods.tcs_id;

    const del = await tcsNatureOfGoodsController.delete(null, id);
    expect(del.success).toBe(true);

    const list = await tcsNatureOfGoodsController.getAll(null, companyId);
    expect(list.tcsNatureOfGoodsList.find((r) => r.tcs_id === id)).toBeUndefined();
  });
});
