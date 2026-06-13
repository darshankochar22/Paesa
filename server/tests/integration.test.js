const { initDB, db } = require("../db/index");
const companyService = require("../company/companyService");
const taxUnitService = require("../taxUnits/taxUnitServices");
const tdsService = require("../tdsNatureOfPayment/tdsNatureOfPaymentService");
const tcsService = require("../tcsNatureOfGoods/tcsNatureOfGoodsService");
const gstClassificationService = require("../gstClassification/gstClassificationService");
const gstRegistrationService = require("../gstRegistration/gstRegistrationService");

beforeAll(async () => {
  // Run all migrations in-memory
  await initDB();
});

afterAll(async () => {
  // Clean up database connection
  if (db && typeof db.close === "function") {
    await db.close();
  }
});

describe("Startup Backend Integration Tests Suite", () => {
  let companyId;
  let taxUnitId;
  let tdsId;
  let tcsId;

  it("should print all table schemas for diagnostic inspection", async () => {
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("DIAGNOSTIC - TABLES IN DB:", tables.rows.map(r => r.name));
    for (const table of tables.rows) {
      const info = await db.execute(`PRAGMA table_info("${table.name}")`);
      console.log(`DIAGNOSTIC - TABLE ${table.name} COLUMNS:`, info.rows.map(r => r.name));
    }
  });

  // 1. Company Tests
  describe("Company Service", () => {
    it("should successfully create a new company and seed default values", async () => {
      const data = {
        name: "Test Integration Company",
        mailing_name: "Test Integration Co.",
        address1: "123 Test Street",
        address2: "Suite 400",
        state: "Maharashtra",
        country: "India",
        pincode: "400001",
        telephone: "022-1234567",
        mobile: "9876543210",
        fax: "022-7654321",
        email: "test@integration.com",
        website: "www.integration.com",
        base_currency_symbol: "₹",
        formal_name: "INR",
        financial_year_beginning_from: "2026-04-01",
        books_beginning_from: "2026-04-01",
        password: "secure_password",
      };

      const result = await companyService.create(data);
      expect(result.success).toBe(true);
      expect(result.company).toBeDefined();
      expect(result.company.company_id).toBeDefined();
      companyId = result.company.company_id;

      // Verify defaults seeded
      const groups = await db.execute(`SELECT COUNT(*) as count FROM groups WHERE company_id = ?`, [companyId]);
      expect(Number(groups.rows[0].count)).toBeGreaterThan(0);

      const ledgers = await db.execute(`SELECT COUNT(*) as count FROM ledgers WHERE company_id = ?`, [companyId]);
      expect(Number(ledgers.rows[0].count)).toBeGreaterThan(0);

      const currencies = await db.execute(`SELECT COUNT(*) as count FROM currencies WHERE company_id = ?`, [companyId]);
      expect(Number(currencies.rows[0].count)).toBeGreaterThan(0);

      const voucherTypes = await db.execute(`SELECT COUNT(*) as count FROM voucher_types WHERE company_id = ?`, [companyId]);
      expect(Number(voucherTypes.rows[0].count)).toBeGreaterThan(0);
    });

    it("should list all companies", async () => {
      const result = await companyService.getAll();
      expect(result.success).toBe(true);
      expect(result.companies.length).toBeGreaterThanOrEqual(1);
    });

    it("should fetch company by id", async () => {
      const result = await companyService.getById(companyId);
      expect(result.success).toBe(true);
      expect(result.company.name).toBe("Test Integration Company");
    });

    it("should verify company password", async () => {
      const match = await companyService.verifyPassword(companyId, "secure_password");
      expect(match.success).toBe(true);

      const mismatch = await companyService.verifyPassword(companyId, "wrong_password");
      expect(mismatch.success).toBe(false);
    });

    it("should update company information", async () => {
      const updateData = {
        company_id: companyId,
        name: "Updated Integration Company",
        address1: "456 Updated Ave",
      };

      const result = await companyService.update(updateData);
      expect(result.success).toBe(true);
      expect(result.company.name).toBe("Updated Integration Company");
      expect(result.company.address1).toBe("456 Updated Ave");
    });
  });

  // 2. Tax Units Tests
  describe("Tax Units Service", () => {
    it("should create a new tax unit", async () => {
      const data = {
        company_id: companyId,
        name: "Excise Unit Mumbai",
        alias: "EUM",
        address_line1: "Mumbai Port Trust",
        state: "Maharashtra",
        pincode: "400001",
        telephone: "022-1234568",
        registered_for: "Excise",
        set_alter_excise_details: 1,
        registration_type: "Importer",
        ecc_number: "AAACG1234EX001",
        set_alter_excise_tariff: 1,
        set_alter_rule11_book: 0,
      };

      const result = await taxUnitService.create(data);
      expect(result.success).toBe(true);
      expect(result.taxUnit).toBeDefined();
      expect(result.taxUnit.tax_unit_id).toBeDefined();
      taxUnitId = result.taxUnit.tax_unit_id;
    });

    it("should fail creating tax unit with duplicate name", async () => {
      const duplicateData = {
        company_id: companyId,
        name: "Excise Unit Mumbai",
      };
      const result = await taxUnitService.create(duplicateData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });

    it("should get all tax units for a company", async () => {
      const result = await taxUnitService.getAll(companyId);
      expect(result.success).toBe(true);
      expect(result.taxUnits.length).toBe(1);
      expect(result.taxUnits[0].name).toBe("Excise Unit Mumbai");
    });

    it("should get tax unit by id", async () => {
      const result = await taxUnitService.getById(taxUnitId);
      expect(result.success).toBe(true);
      expect(result.taxUnit.alias).toBe("EUM");
    });

    it("should update a tax unit", async () => {
      const updateData = {
        tax_unit_id: taxUnitId,
        alias: "EUM-Updated",
        set_alter_excise_tariff: 0,
      };

      const result = await taxUnitService.update(updateData);
      expect(result.success).toBe(true);
      expect(result.taxUnit.alias).toBe("EUM-Updated");
      expect(result.taxUnit.set_alter_excise_tariff).toBe(0);
    });

    it("should soft delete a tax unit", async () => {
      const delResult = await taxUnitService.delete(taxUnitId);
      expect(delResult.success).toBe(true);

      const listResult = await taxUnitService.getAll(companyId);
      expect(listResult.success).toBe(true);
      expect(listResult.taxUnits.length).toBe(0);
    });
  });

  // 3. TDS Nature of Payment Tests
  describe("TDS Nature of Payment Service", () => {
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
      };
      const result = await tdsService.update(updateData);
      expect(result.success).toBe(true);
      expect(result.tdsNatureOfPayment.rate_other_with_pan).toBe(12);
    });

    it("should delete TDS Nature of Payment", async () => {
      const delResult = await tdsService.delete(tdsId);
      expect(delResult.success).toBe(true);

      const listResult = await tdsService.getAll(companyId);
      expect(listResult.success).toBe(true);
      expect(listResult.tdsNatureOfPaymentList.length).toBe(0);
    });
  });

  // 4. TCS Nature of Goods Tests
  describe("TCS Nature of Goods Service", () => {
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
      };

      const result = await tcsService.create(data);
      expect(result.success).toBe(true);
      expect(result.tcsNatureOfGoods).toBeDefined();
      expect(result.tcsNatureOfGoods.tcs_id).toBeDefined();
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
      };
      const result = await tcsService.update(updateData);
      expect(result.success).toBe(true);
      expect(result.tcsNatureOfGoods.rate_individual_without_pan).toBe(6.0);
    });

    it("should delete TCS Nature of Goods", async () => {
      const delResult = await tcsService.delete(tcsId);
      expect(delResult.success).toBe(true);

      const listResult = await tcsService.getAll(companyId);
      expect(listResult.success).toBe(true);
      expect(listResult.tcsNatureOfGoodsList.length).toBe(0);
    });
  });

  // 5. GST Classification Tests
  describe("GST Classification Service", () => {
    it("should retrieve default gst classifications seeded during company creation", async () => {
      const result = await gstClassificationService.getAll(companyId);
      expect(result.success).toBe(true);
      expect(result.gstClassifications.length).toBeGreaterThan(0);
    });

    it("should create a custom GST classification", async () => {
      const data = {
        company_id: companyId,
        name: "Custom Lux Items 28%",
        nature_of_transaction: "Local",
        taxability: "Taxable",
        reverse_charge: 0,
        ineligible_for_input_tax_credit: 0,
        gst_rate: 28.0,
        cgst_rate: 14.0,
        sgst_rate: 14.0,
        igst_rate: 28.0,
        cess_rate: 0,
      };

      const result = await gstClassificationService.create(data);
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();
    });
  });

  // 6. GST Registration Tests
  describe("GST Registration Service", () => {
    it("should create a GST registration", async () => {
      const data = {
        company_id: companyId,
        registration_type: "Regular",
        registration_status: "Active",
        assessee_of_other_territory: 0,
        periodicity_of_gstr1: "Monthly",
        gstin: "27AAACG1234A1Z1",
        e_way_bill_applicable: 1,
        e_way_bill_applicable_from: "2026-04-01",
        applicable_for_intrastat: 0,
      };

      const result = await gstRegistrationService.create(data);
      expect(result.success).toBe(true);
      expect(result.gstRegistration).toBeDefined();
    });
  });
});
