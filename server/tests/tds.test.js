const { setupTestDB, createTestCompany } = require("./helpers");
const tdsService = require("../tdsNatureOfPayment/tdsNatureOfPaymentService");

describe("TDS Nature of Payment Service Tests", () => {
  let companyId;
  let tdsId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("TDS Test Co");
    companyId = company.company_id;
  });

  it("should create a new TDS Nature of Payment", async () => {
    const data = {
      company_id: companyId,
      name: "Rent on land or building",
      section: "194I",
      payment_code: "94I",
      remittance_code: "001",
      rate_individual_with_pan: 10,
      rate_other_with_pan: 10,
      is_zero_rated: 0,
      threshold_limit: 240000,
    };

    const result = await tdsService.create(data);
    expect(result.success).toBe(true);
    expect(result.tdsNatureOfPayment).toBeDefined();
    expect(result.tdsNatureOfPayment.tds_id).toBeDefined();
    expect(result.tdsNatureOfPayment.is_zero_rated).toBe(0);
    tdsId = result.tdsNatureOfPayment.tds_id;
  });

  it("should list TDS Nature of Payments for a company", async () => {
    const result = await tdsService.getAll(companyId);
    expect(result.success).toBe(true);
    expect(result.tdsNatureOfPaymentList.length).toBe(1);
  });

  it("should get TDS by id", async () => {
    const result = await tdsService.getById(tdsId);
    expect(result.success).toBe(true);
    expect(result.tdsNatureOfPayment.section).toBe("194I");
  });

  it("should update TDS Nature of Payment", async () => {
    const updateData = {
      tds_id: tdsId,
      rate_other_with_pan: 12,
      is_zero_rated: 1,
    };
    const result = await tdsService.update(updateData);
    expect(result.success).toBe(true);
    expect(result.tdsNatureOfPayment.rate_other_with_pan).toBe(12);
    expect(result.tdsNatureOfPayment.is_zero_rated).toBe(1);
  });

  it("should delete TDS Nature of Payment", async () => {
    const delResult = await tdsService.delete(tdsId);
    expect(delResult.success).toBe(true);

    const listResult = await tdsService.getAll(companyId);
    expect(listResult.success).toBe(true);
    expect(listResult.tdsNatureOfPaymentList.length).toBe(0);
  });
});
