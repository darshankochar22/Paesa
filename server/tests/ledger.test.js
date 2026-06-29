const { setupTestDB, createTestCompany, db } = require("./helpers");
const groupService = require("../group/groupService");
const ledgerService = require("../ledger/ledgerService");

describe("Groups & Ledgers Services Tests", () => {
  let companyId;
  let customGroupId;
  let customLedgerId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Ledgers Test Co");
    companyId = company.company_id;
  });

  describe("Group Service", () => {
    it("should verify default groups were seeded", async () => {
      const res = await groupService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.groups.length).toBeGreaterThan(10); // Check that Tally groups exist
    });

    it("should create a custom group", async () => {
      const data = {
        company_id: companyId,
        name: "Custom Expenses Group",
        nature: "Expenses",
        parent_group_id: null,
        is_primary: 1,
      };
      const res = await groupService.create(data);
      expect(res.success).toBe(true);
      expect(res.group).toBeDefined();
      expect(res.group.group_id).toBeDefined();
      customGroupId = res.group.group_id;
    });

    it("should get group by id", async () => {
      const res = await groupService.getById(customGroupId);
      expect(res.success).toBe(true);
      expect(res.group.name).toBe("Custom Expenses Group");
    });

    it("should update a group", async () => {
      const updateData = {
        group_id: customGroupId,
        name: "Custom Expenses Group Updated",
      };
      const res = await groupService.update(updateData);
      expect(res.success).toBe(true);
      expect(res.group.name).toBe("Custom Expenses Group Updated");
    });
  });

  describe("Ledger Service", () => {
    it("should verify default ledgers (Cash, Profit & Loss) were seeded", async () => {
      const res = await ledgerService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.ledgers.length).toBeGreaterThanOrEqual(2);
      const names = res.ledgers.map(l => l.name);
      expect(names).toContain("Cash");
    });

    it("should create a custom ledger", async () => {
      const data = {
        company_id: companyId,
        group_id: customGroupId,
        name: "Office Stationery Expenses",
        ledger_type: "General",
        nature: "Expenses",
        opening_balance: 0,
        maintain_inventory_values: 0,
      };
      const res = await ledgerService.create(data);
      expect(res.success).toBe(true);
      expect(res.ledger).toBeDefined();
      expect(res.ledger.ledger_id).toBeDefined();
      customLedgerId = res.ledger.ledger_id;
    });

    it("should get ledger by id", async () => {
      const res = await ledgerService.getById(customLedgerId);
      expect(res.success).toBe(true);
      expect(res.ledger.name).toBe("Office Stationery Expenses");
    });

    it("should update a ledger", async () => {
      const updateData = {
        ledger_id: customLedgerId,
        name: "Office Stationery & Printing Expenses",
      };
      const res = await ledgerService.update(updateData);
      expect(res.success).toBe(true);
      expect(res.ledger.name).toBe("Office Stationery & Printing Expenses");
    });

    it("should soft delete a ledger", async () => {
      const delRes = await ledgerService.delete(customLedgerId);
      expect(delRes.success).toBe(true);

      const listRes = await ledgerService.getAll(companyId);
      const ids = listRes.ledgers.map(l => l.ledger_id);
      expect(ids).not.toContain(customLedgerId);
    });
  });

  describe("Duties & Taxes statutory sub-fields (#154)", () => {
    let dutyLedgerId;

    it("persists all Duty/Tax sub-fields on create and reads them back", async () => {
      const groups = await groupService.getAll(companyId);
      const dt = groups.groups.find(g => g.name === "Duties & Taxes");
      expect(dt).toBeDefined();

      const res = await ledgerService.create({
        company_id: companyId,
        group_id: dt.group_id,
        name: "GST Cess Payable",
        statutory_details: {
          type_of_duty_tax: "GST",
          gst_tax_type: "Cess",
          valuation_type: "Based on Quantity",
          rate_per_unit: 12.5,
          duty_head: "Basic Excise Duty",
          service_tax_head: "Service Tax",
          nature_of_goods: "Any",
          percentage_of_calculation: 18,
          statutory_details: "Upward Rounding",
          rounding_limit: 1,
        },
      });
      expect(res.success).toBe(true);
      dutyLedgerId = res.ledger.ledger_id;

      const sd = (await ledgerService.getById(dutyLedgerId)).ledger.statutory_details;
      expect(sd).toBeTruthy();
      expect(sd.type_of_duty_tax).toBe("GST");
      expect(sd.gst_tax_type).toBe("Cess");
      expect(sd.valuation_type).toBe("Based on Quantity");
      expect(sd.rate_per_unit).toBe(12.5);
      expect(sd.duty_head).toBe("Basic Excise Duty");
      expect(sd.service_tax_head).toBe("Service Tax");
      expect(sd.nature_of_goods).toBe("Any");
      expect(sd.percentage_of_calculation).toBe(18);
      expect(sd.statutory_details).toBe("Upward Rounding");
      expect(sd.rounding_limit).toBe(1);
    });

    it("updates the Duty/Tax sub-fields", async () => {
      const res = await ledgerService.update({
        ledger_id: dutyLedgerId,
        statutory_details: { type_of_duty_tax: "TDS", nature_of_goods: "Rent" },
      });
      expect(res.success).toBe(true);
      const sd = (await ledgerService.getById(dutyLedgerId)).ledger.statutory_details;
      expect(sd.type_of_duty_tax).toBe("TDS");
      expect(sd.nature_of_goods).toBe("Rent");
    });
  });
});
