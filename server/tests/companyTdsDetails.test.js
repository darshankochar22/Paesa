const { setupTestDB, createTestCompany } = require("./helpers");
const companyTdsDetailsService = require("../companyTdsDetails/companyTdsDetailsService");

describe("Company TDS Details Service Tests", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Company TDS Test Co");
    companyId = company.company_id;
  });

  it("should return exists: false when no TDS details exist yet", async () => {
    const result = await companyTdsDetailsService.get(companyId);
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  it("should successfully insert new TDS details", async () => {
    const data = {
      company_id: companyId,
      tanRegNumber: "TANR12345B",
      tan: "BLRP01234E",
      deductorType: "Company",
      deductorBranch: "Bangalore North",
      setAlterPersonResponsible: true,
      personResponsibleName: "Jane Doe",
      personResponsibleDesignation: "Director",
      personResponsiblePan: "ABCDE1234F",
      personResponsiblePhone: "9876543211",
      personResponsibleEmail: "jane@company.com",
      ignoreItExemption: true,
      activateTdsForItems: false,
    };

    const saveResult = await companyTdsDetailsService.save(data);
    expect(saveResult.success).toBe(true);

    const getResult = await companyTdsDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.tanRegNumber).toBe("TANR12345B");
    expect(getResult.data.tan).toBe("BLRP01234E");
    expect(getResult.data.personResponsibleName).toBe("Jane Doe");
    expect(getResult.data.ignoreItExemption).toBe(true);
    expect(getResult.data.activateTdsForItems).toBe(false);
  });

  it("should successfully update existing TDS details", async () => {
    const updatedData = {
      company_id: companyId,
      tanRegNumber: "TANR12345C",
      tan: "BLRP01234F",
      deductorType: "Individual/HUF",
      deductorBranch: "Bangalore South",
      setAlterPersonResponsible: false,
      personResponsibleName: "",
      personResponsibleDesignation: "",
      personResponsiblePan: "",
      personResponsiblePhone: "",
      personResponsibleEmail: "",
      ignoreItExemption: false,
      activateTdsForItems: true,
    };

    const saveResult = await companyTdsDetailsService.save(updatedData);
    expect(saveResult.success).toBe(true);

    const getResult = await companyTdsDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.tanRegNumber).toBe("TANR12345C");
    expect(getResult.data.tan).toBe("BLRP01234F");
    expect(getResult.data.deductorType).toBe("Individual/HUF");
    expect(getResult.data.deductorBranch).toBe("Bangalore South");
    expect(getResult.data.setAlterPersonResponsible).toBe(false);
    expect(getResult.data.personResponsibleName).toBe("");
    expect(getResult.data.ignoreItExemption).toBe(false);
    expect(getResult.data.activateTdsForItems).toBe(true);
  });
});
