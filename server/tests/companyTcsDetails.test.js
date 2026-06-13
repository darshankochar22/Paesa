const { setupTestDB, createTestCompany } = require("./helpers");
const companyTcsDetailsService = require("../companyTcsDetails/companyTcsDetailsService");

describe("Company TCS Details Service Tests", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Company TCS Test Co");
    companyId = company.company_id;
  });

  it("should return exists: false when no TCS details exist yet", async () => {
    const result = await companyTcsDetailsService.get(companyId);
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.data).toBeNull();
  });

  it("should successfully insert new TCS details", async () => {
    const data = {
      company_id: companyId,
      tanRegNumber: "TANR98765B",
      tan: "BLRP98765E",
      collectorType: "Company",
      collectorBranch: "Bangalore North",
      setAlterPersonResponsible: true,
      personResponsibleName: "John Doe",
      personResponsibleDesignation: "Manager",
      personResponsiblePan: "WXYZD9876F",
      personResponsiblePhone: "9876543212",
      personResponsibleEmail: "john@company.com",
      ignoreItExemption: true,
    };

    const saveResult = await companyTcsDetailsService.save(data);
    expect(saveResult.success).toBe(true);

    const getResult = await companyTcsDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.tanRegNumber).toBe("TANR98765B");
    expect(getResult.data.tan).toBe("BLRP98765E");
    expect(getResult.data.personResponsibleName).toBe("John Doe");
    expect(getResult.data.ignoreItExemption).toBe(true);
  });

  it("should successfully update existing TCS details", async () => {
    const updatedData = {
      company_id: companyId,
      tanRegNumber: "TANR98765C",
      tan: "BLRP98765F",
      collectorType: "Individual/HUF",
      collectorBranch: "Bangalore South",
      setAlterPersonResponsible: false,
      personResponsibleName: "",
      personResponsibleDesignation: "",
      personResponsiblePan: "",
      personResponsiblePhone: "",
      personResponsibleEmail: "",
      ignoreItExemption: false,
    };

    const saveResult = await companyTcsDetailsService.save(updatedData);
    expect(saveResult.success).toBe(true);

    const getResult = await companyTcsDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.tanRegNumber).toBe("TANR98765C");
    expect(getResult.data.tan).toBe("BLRP98765F");
    expect(getResult.data.collectorType).toBe("Individual/HUF");
    expect(getResult.data.collectorBranch).toBe("Bangalore South");
    expect(getResult.data.setAlterPersonResponsible).toBe(false);
    expect(getResult.data.personResponsibleName).toBe("");
    expect(getResult.data.ignoreItExemption).toBe(false);
  });
});
