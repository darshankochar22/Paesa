const { setupTestDB, createTestCompany } = require("./helpers");
const tcsService = require("../tcsNatureOfGoods/tcsNatureOfGoodsService");

describe("TCS Nature of Goods Service Tests", () => {
  let companyId;
  let tcsId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("TCS Test Co");
    companyId = company.company_id;
  });

  it("should create a new TCS Nature of Goods", async () => {
    const data = {
      company_id: companyId,
      name: "Sale of Timber",
      section: "206C",
      payment_code: "206C-T",
      rate_individual_with_pan: 2.5,
      rate_individual_without_pan: 5.0,
      rate_other_with_pan: 2.5,
      rate_other_without_pan: 5.0,
      is_own_status: 1,
      tax_on_receipt_or_realization: "Tax Calculated on Realization",
      threshold_level: 50000,
      is_zero_rated: 0,
    };

    const result = await tcsService.create(data);
    expect(result.success).toBe(true);
    expect(result.tcsNatureOfGoods).toBeDefined();
    expect(result.tcsNatureOfGoods.tcs_id).toBeDefined();
    expect(result.tcsNatureOfGoods.is_zero_rated).toBe(0);
    tcsId = result.tcsNatureOfGoods.tcs_id;
  });

  it("should list TCS Nature of Goods for a company", async () => {
    const result = await tcsService.getAll(companyId);
    expect(result.success).toBe(true);
    expect(result.tcsNatureOfGoodsList.length).toBe(1);
  });

  it("should get TCS by id", async () => {
    const result = await tcsService.getById(tcsId);
    expect(result.success).toBe(true);
    expect(result.tcsNatureOfGoods.section).toBe("206C");
  });

  it("should update TCS Nature of Goods", async () => {
    const updateData = {
      tcs_id: tcsId,
      rate_individual_without_pan: 6.0,
      is_zero_rated: 1,
    };
    const result = await tcsService.update(updateData);
    expect(result.success).toBe(true);
    expect(result.tcsNatureOfGoods.rate_individual_without_pan).toBe(6.0);
    expect(result.tcsNatureOfGoods.is_zero_rated).toBe(1);
  });

  it("should delete TCS Nature of Goods", async () => {
    const delResult = await tcsService.delete(tcsId);
    expect(delResult.success).toBe(true);

    const listResult = await tcsService.getAll(companyId);
    expect(listResult.success).toBe(true);
    expect(listResult.tcsNatureOfGoodsList.length).toBe(0);
  });
});
