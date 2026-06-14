const { setupTestDB, createTestCompany } = require("./helpers");
const companyPanCinDetailsService = require("../companyPanCinDetails/companyPanCinDetailsService");

describe("Company PAN/CIN Details Service Tests", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Company PAN/CIN Test Co");
    companyId = company.company_id;
  });

  it("should return exists: false when no PAN/CIN details exist yet", async () => {
    const result = await companyPanCinDetailsService.get(companyId);
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  it("should successfully insert new PAN/CIN details", async () => {
    const data = {
      company_id: companyId,
      pan: "ABCDE1234F",
      cin: "U12345KA2026PTC123456",
    };

    const saveResult = await companyPanCinDetailsService.save(data);
    expect(saveResult.success).toBe(true);

    const getResult = await companyPanCinDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.pan).toBe("ABCDE1234F");
    expect(getResult.data.cin).toBe("U12345KA2026PTC123456");
  });

  it("should successfully update existing PAN/CIN details", async () => {
    const updatedData = {
      company_id: companyId,
      pan: "XYZWX9876A",
      cin: "L12345DL2025PLC987654",
    };

    const saveResult = await companyPanCinDetailsService.save(updatedData);
    expect(saveResult.success).toBe(true);

    const getResult = await companyPanCinDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.pan).toBe("XYZWX9876A");
    expect(getResult.data.cin).toBe("L12345DL2025PLC987654");
  });
});
