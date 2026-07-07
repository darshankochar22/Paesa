const { setupTestDB, createTestCompany } = require("./helpers");
const unitService = require("../unit/unitService");
const stockGroupService = require("../stockGroup/stockGroupService");
const stockCategoryService = require("../stockCategory/stockCategoryService");
const godownService = require("../godown/godownService");
const stockItemService = require("../stockItem/stockItemService");

describe("Inventory Services Tests", () => {
  let companyId;
  let simpleUnitId1;
  let simpleUnitId2;
  let stockGroupId;
  let stockCategoryId;
  let godownId;
  let stockItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Inventory Test Co");
    companyId = company.company_id;
  });

  describe("Unit Service", () => {
    it("starts with no units (units are not pre-seeded)", async () => {
      const res = await unitService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.units.length).toBe(0);
    });

    it("should create simple units of measure", async () => {
      const res1 = await unitService.create({
        company_id: companyId,
        name: "Carton",
        symbol: "Ctn",
        decimal_places: 0,
        unit_type: "Simple",
      });
      expect(res1.success).toBe(true);
      expect(res1.unit.unit_id).toBeDefined();
      simpleUnitId1 = res1.unit.unit_id;

      const res2 = await unitService.create({
        company_id: companyId,
        name: "Dozen",
        symbol: "Dzn",
        decimal_places: 0,
        unit_type: "Simple",
      });
      expect(res2.success).toBe(true);
      simpleUnitId2 = res2.unit.unit_id;
    });

    it("should update a unit to become compound", async () => {
      const res = await unitService.create({
        company_id: companyId,
        unit_type: "Compound",
        first_unit_id: simpleUnitId2, // Dozen
        second_unit_id: simpleUnitId1, // Carton
        conversion_factor: 12,
      });
      expect(res.success).toBe(true);
      expect(res.unit.unit_type).toBe("Compound");
      expect(Number(res.unit.conversion_factor)).toBe(12);
    });
  });

  describe("Stock Group Service", () => {
    it("should create a stock group", async () => {
      const res = await stockGroupService.create({
        company_id: companyId,
        name: "Electronics",
        parent_id: null,
      });
      expect(res.success).toBe(true);
      expect(res.group.sg_id).toBeDefined();
      stockGroupId = res.group.sg_id;
    });
  });

  describe("Stock Category Service", () => {
    it("should create a stock category", async () => {
      const res = await stockCategoryService.create({
        company_id: companyId,
        name: "Smartphones",
        parent_id: null,
      });
      expect(res.success).toBe(true);
      expect(res.category.sc_id).toBeDefined();
      stockCategoryId = res.category.sc_id;
    });
  });

  describe("Godown Service", () => {
    it("should verify default godowns (Main Location) seeded", async () => {
      const res = await godownService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.godowns.length).toBeGreaterThan(0);
    });

    it("should create a custom godown", async () => {
      const res = await godownService.create({
        company_id: companyId,
        name: "Mumbai Warehouse",
        parent_id: null,
      });
      expect(res.success).toBe(true);
      expect(res.godown.godown_id).toBeDefined();
      godownId = res.godown.godown_id;
    });
  });

  describe("Stock Item Service", () => {
    it("should create a stock item with statutory details and godown allocations", async () => {
      const data = {
        company_id: companyId,
        name: "Pixel 9 Pro",
        alias: "P9P",
        group_id: stockGroupId,
        category_id: stockCategoryId,
        unit_id: simpleUnitId1,
        gst_applicable: "Applicable",
        hsn_sac: "85171211",
        taxability_type: "Taxable",
        gst_rate: 18.0,
        cgst_rate: 9.0,
        sgst_rate: 9.0,
        igst_rate: 18.0,
        type_of_supply: "Goods",
        opening_quantity: 10,
        opening_rate: 80000,
        allocations: [
          {
            godown_id: godownId,
            quantity: 10,
            rate: 80000,
          },
        ],
      };

      const res = await stockItemService.create(data);
      expect(res.success).toBe(true);
      expect(res.item.item_id).toBeDefined();
      expect(Number(res.item.opening_value)).toBe(800000);
      expect(res.item.allocations.length).toBe(1);
      stockItemId = res.item.item_id;
    });

    it("should list all stock items", async () => {
      const res = await stockItemService.getAll(companyId);
      expect(res.success).toBe(true);
      expect(res.stockItems.length).toBe(1);
      expect(res.stockItems[0].name).toBe("Pixel 9 Pro");
    });

    it("should get stock item by id", async () => {
      const res = await stockItemService.getById(stockItemId);
      expect(res.success).toBe(true);
      expect(res.item.alias).toBe("P9P");
      expect(res.item.allocations.length).toBe(1);
    });

    it("should update stock item", async () => {
      const updateData = {
        item_id: stockItemId,
        name: "Pixel 9 Pro Max",
        opening_quantity: 12,
        opening_rate: 90000,
        allocations: [
          {
            godown_id: godownId,
            quantity: 12,
            rate: 90000,
          },
        ],
      };

      const res = await stockItemService.update(updateData);
      if (!res.success) console.error("stockItem update failed with error:", res.error);
      expect(res.success).toBe(true);
      expect(res.item.name).toBe("Pixel 9 Pro Max");
      expect(Number(res.item.opening_value)).toBe(1080000);
    });

    it("should fetch stock balances correctly", async () => {
      const res = await stockItemService.getStockBalances(companyId);
      expect(res.success).toBe(true);
      expect(Number(res.balances[stockItemId])).toBe(12);
    });

    it("should soft delete a stock item", async () => {
      const delRes = await stockItemService.delete(stockItemId);
      expect(delRes.success).toBe(true);

      const listRes = await stockItemService.getAll(companyId);
      expect(listRes.success).toBe(true);
      expect(listRes.stockItems.length).toBe(0);
    });
  });
});
