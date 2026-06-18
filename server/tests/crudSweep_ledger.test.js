// CRUD sweep for the "ledger" module, mirroring exactly how the real UI
// (client/src/pages/master/ledger + hooks/useLedgerForm.ts) builds and submits
// its payload through window.api.ledger.* -> ledgerController.* -> ledgerService.
//
// The form sends nested object fields (bank_details, statutory_details) and a
// set of top-level flags/defaults. This sweep asserts those actually PERSIST
// (catching "ignored field" bugs) and that update/delete behave.
const { setupTestDB, createTestCompany, db } = require("./helpers");
const groupService = require("../group/groupService");
const ledgerController = require("../ledger/ledgerController");

describe("Ledger CRUD sweep (UI-faithful)", () => {
  let companyId;
  let groups;

  const groupByName = (name) =>
    groups.find((g) => g.name === name && g.company_id === companyId);

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Ledger CRUD Sweep Co");
    companyId = company.company_id;
    const res = await groupService.getAll(companyId);
    expect(res.success).toBe(true);
    groups = res.groups;
  });

  // ---------------------------------------------------------------------------
  // 1) Plain ledger with the full set of top-level fields the create form sends.
  //    useLedgerForm.handleSubmit builds this payload object for a non-bank,
  //    non-tax group. We assert every submitted field persists (read-back).
  // ---------------------------------------------------------------------------
  describe("create: plain ledger persists all top-level form fields", () => {
    let createdId;
    const sundryDebtors = () => groupByName("Sundry Debtors");

    // EXACT shape produced by the create form (mode === "create"):
    const buildPayload = () => ({
      company_id: companyId,
      name: "Acme Distributors",
      alias: "ACME",
      group_id: sundryDebtors().group_id,
      ledger_type: "General",
      opening_balance: 1500.5,
      closing_balance: 0, // create form hardcodes 0
      is_bill_wise: 1,
      maintain_inventory_values: 0,
      mailing_name: "Acme Distributors Pvt Ltd",
      address1: "12 Market Road",
      address2: "Unit 9",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      pincode: "411001",
      phone: "020-555-0100",
      email: "billing@acme.example",
      gstin: "27ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      registration_type: "Regular",
      default_credit_period: 30,
      check_credit_days: 1,
      allow_cost_centres: 1,
      invoice_rounding: 0,
      rounding_method: undefined,
      rounding_limit: 0,
      additional_gst_details: 0,
      service_tax_details: 0,
    });

    it("creates successfully", async () => {
      const res = await ledgerController.create(null, buildPayload());
      expect(res.success).toBe(true);
      expect(res.ledger).toBeDefined();
      expect(res.ledger.ledger_id).toBeDefined();
      createdId = res.ledger.ledger_id;
    });

    it("persists every submitted top-level field (read-back)", async () => {
      const res = await ledgerController.getById(null, createdId);
      expect(res.success).toBe(true);
      const l = res.ledger;
      const p = buildPayload();
      expect(l.name).toBe(p.name);
      expect(l.alias).toBe(p.alias);
      expect(l.group_id).toBe(p.group_id);
      expect(l.ledger_type).toBe(p.ledger_type);
      expect(l.opening_balance).toBe(p.opening_balance);
      expect(l.is_bill_wise).toBe(1);
      expect(l.maintain_inventory_values).toBe(0);
      expect(l.mailing_name).toBe(p.mailing_name);
      expect(l.address1).toBe(p.address1);
      expect(l.address2).toBe(p.address2);
      expect(l.city).toBe(p.city);
      expect(l.state).toBe(p.state);
      expect(l.country).toBe(p.country);
      expect(l.pincode).toBe(p.pincode);
      expect(l.phone).toBe(p.phone);
      expect(l.email).toBe(p.email);
      expect(l.gstin).toBe(p.gstin);
      expect(l.pan).toBe(p.pan);
      expect(l.registration_type).toBe(p.registration_type);
      expect(l.default_credit_period).toBe(p.default_credit_period);
      expect(l.check_credit_days).toBe(1);
      expect(l.allow_cost_centres).toBe(1);
      expect(l.is_active).toBe(1);
      expect(l.is_predefined).toBe(0);
    });

    it("appears in getAll with the group_name join alias", async () => {
      const res = await ledgerController.getAll(null, companyId);
      expect(res.success).toBe(true);
      const row = res.ledgers.find((x) => x.ledger_id === createdId);
      expect(row).toBeDefined();
      expect(row.group_name).toBe("Sundry Debtors");
    });
  });

  // ---------------------------------------------------------------------------
  // 2) Bank ledger: the form attaches a nested bank_details OBJECT.
  //    This must be JSON-serialized into ledger_bank_details and read back
  //    by getById as ledger.bank_details. Catches dropped nested-object bugs.
  // ---------------------------------------------------------------------------
  describe("create: bank ledger persists nested bank_details object", () => {
    let createdId;

    const buildPayload = () => ({
      company_id: companyId,
      name: "HDFC Current A/c",
      group_id: groupByName("Bank Accounts").group_id,
      ledger_type: "Bank",
      opening_balance: 25000,
      closing_balance: 0,
      is_bill_wise: 0,
      maintain_inventory_values: 0,
      registration_type: "Unregistered",
      default_credit_period: 0,
      check_credit_days: 0,
      allow_cost_centres: 0,
      invoice_rounding: 0,
      rounding_limit: 0,
      additional_gst_details: 0,
      service_tax_details: 0,
      // nested object the form sends when group is a bank group:
      bank_details: {
        account_holder_name: "Ledger Sweep Co",
        account_number: "001122334455",
        ifsc_code: "HDFC0001234",
        swift_code: "HDFCINBB",
        bank_name: "HDFC Bank",
        branch_name: "Pune MG Road",
        bank_configuration: undefined,
        cheque_book_start_no: "100001",
        cheque_book_end_no: "100100",
        enable_cheque_printing: 1,
        cheque_printing_configuration: undefined,
        od_limit: 50000,
        transaction_type: "NEFT",
        cross_using: "A/c Payee",
        company_bank: "Yes",
      },
    });

    it("creates successfully", async () => {
      const res = await ledgerController.create(null, buildPayload());
      expect(res.success).toBe(true);
      createdId = res.ledger.ledger_id;
    });

    it("persists nested bank_details (read-back via getById)", async () => {
      const res = await ledgerController.getById(null, createdId);
      expect(res.success).toBe(true);
      const b = res.ledger.bank_details;
      expect(b).toBeTruthy();
      const p = buildPayload().bank_details;
      expect(b.account_holder_name).toBe(p.account_holder_name);
      expect(b.account_number).toBe(p.account_number);
      expect(b.ifsc_code).toBe(p.ifsc_code);
      expect(b.swift_code).toBe(p.swift_code);
      expect(b.bank_name).toBe(p.bank_name);
      expect(b.branch_name).toBe(p.branch_name);
      expect(b.cheque_book_start_no).toBe(p.cheque_book_start_no);
      expect(b.cheque_book_end_no).toBe(p.cheque_book_end_no);
      expect(b.enable_cheque_printing).toBe(1);
      expect(b.od_limit).toBe(50000);
      expect(b.transaction_type).toBe("NEFT");
      expect(b.cross_using).toBe("A/c Payee");
      expect(b.company_bank).toBe("Yes");
    });
  });

  // ---------------------------------------------------------------------------
  // 3) Tax ledger: the form attaches a nested statutory_details OBJECT.
  //    Must persist into ledger_statutory_details and read back.
  // ---------------------------------------------------------------------------
  describe("create: tax ledger persists nested statutory_details object", () => {
    let createdId;

    const buildPayload = () => ({
      company_id: companyId,
      name: "Output CGST",
      group_id: groupByName("Duties & Taxes").group_id,
      ledger_type: "General",
      opening_balance: 0,
      closing_balance: 0,
      is_bill_wise: 0,
      maintain_inventory_values: 0,
      registration_type: "Unregistered",
      default_credit_period: 0,
      check_credit_days: 0,
      allow_cost_centres: 0,
      invoice_rounding: 0,
      rounding_limit: 0,
      additional_gst_details: 0,
      service_tax_details: 0,
      statutory_details: {
        gst_applicability: "Applicable",
        hsn_sac_code: "9983",
        hsn_sac_description: "Tax services",
        gst_rate: 18,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        type_of_duty_tax: "GST",
        percentage_of_calculation: 9,
        statutory_details: undefined,
        include_in_assessable_value_calculation: "Not Applicable",
        appropriate_to: "Goods",
        method_of_calculation: "Based on Value",
      },
    });

    it("creates successfully", async () => {
      const res = await ledgerController.create(null, buildPayload());
      expect(res.success).toBe(true);
      createdId = res.ledger.ledger_id;
    });

    it("persists nested statutory_details (read-back via getById)", async () => {
      const res = await ledgerController.getById(null, createdId);
      expect(res.success).toBe(true);
      const s = res.ledger.statutory_details;
      expect(s).toBeTruthy();
      const p = buildPayload().statutory_details;
      expect(s.gst_applicability).toBe(p.gst_applicability);
      expect(s.hsn_sac_code).toBe(p.hsn_sac_code);
      expect(s.hsn_sac_description).toBe(p.hsn_sac_description);
      expect(s.gst_rate).toBe(18);
      expect(s.cgst_rate).toBe(9);
      expect(s.sgst_rate).toBe(9);
      expect(s.type_of_duty_tax).toBe("GST");
      expect(s.percentage_of_calculation).toBe(9);
      expect(s.appropriate_to).toBe("Goods");
      expect(s.method_of_calculation).toBe("Based on Value");
    });
  });

  // ---------------------------------------------------------------------------
  // 4) getByGroup: the form uses ledger lists per group elsewhere.
  // ---------------------------------------------------------------------------
  it("getByGroup returns only ledgers in that group", async () => {
    const grp = groupByName("Sundry Debtors").group_id;
    const res = await ledgerController.getByGroup(null, {
      company_id: companyId,
      group_id: grp,
    });
    expect(res.success).toBe(true);
    expect(res.ledgers.every((l) => l.group_id === grp)).toBe(true);
    expect(res.ledgers.some((l) => l.name === "Acme Distributors")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5) update: the alter form sends the same shape + ledger_id. Changing fields
  //    (incl. a nested bank_details object) must persist; update must NOT delete.
  // ---------------------------------------------------------------------------
  describe("update: changed fields persist (and row is not deleted)", () => {
    let ledgerId;

    beforeAll(async () => {
      const res = await ledgerController.create(null, {
        company_id: companyId,
        name: "Ledger To Alter",
        group_id: groupByName("Sundry Creditors").group_id,
        ledger_type: "General",
        opening_balance: 100,
        closing_balance: 0,
        registration_type: "Unregistered",
      });
      expect(res.success).toBe(true);
      ledgerId = res.ledger.ledger_id;
    });

    it("persists changed scalar fields", async () => {
      const res = await ledgerController.update(null, {
        ledger_id: ledgerId,
        company_id: companyId,
        name: "Ledger Altered Name",
        group_id: groupByName("Sundry Creditors").group_id,
        ledger_type: "General",
        opening_balance: 999,
        closing_balance: 0,
        mailing_name: "Altered Mailing",
        registration_type: "Composition",
        default_credit_period: 45,
      });
      expect(res.success).toBe(true);
      expect(res.ledger.name).toBe("Ledger Altered Name");

      const back = await ledgerController.getById(null, ledgerId);
      expect(back.success).toBe(true);
      expect(back.ledger.name).toBe("Ledger Altered Name");
      expect(back.ledger.opening_balance).toBe(999);
      expect(back.ledger.mailing_name).toBe("Altered Mailing");
      expect(back.ledger.registration_type).toBe("Composition");
      expect(back.ledger.default_credit_period).toBe(45);
      // still present (update must not delete the row):
      expect(back.ledger.is_active).toBe(1);
    });

    it("attaches a nested bank_details object on update", async () => {
      const res = await ledgerController.update(null, {
        ledger_id: ledgerId,
        company_id: companyId,
        name: "Ledger Altered Name",
        group_id: groupByName("Sundry Creditors").group_id,
        bank_details: {
          account_holder_name: "Altered Holder",
          account_number: "999888777",
          bank_name: "ICICI",
          od_limit: 0,
        },
      });
      expect(res.success).toBe(true);

      const back = await ledgerController.getById(null, ledgerId);
      expect(back.ledger.bank_details).toBeTruthy();
      expect(back.ledger.bank_details.account_holder_name).toBe("Altered Holder");
      expect(back.ledger.bank_details.bank_name).toBe("ICICI");
    });

    it("refuses to edit predefined ledgers", async () => {
      const all = await ledgerController.getAll(null, companyId);
      const cash = all.ledgers.find((l) => l.name === "Cash");
      expect(cash).toBeDefined();
      const res = await ledgerController.update(null, {
        ledger_id: cash.ledger_id,
        name: "Hacked Cash",
      });
      expect(res.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 6) delete: soft-delete (is_active = 0); disappears from getAll.
  // ---------------------------------------------------------------------------
  describe("delete: soft-deletes the ledger", () => {
    let ledgerId;

    beforeAll(async () => {
      const res = await ledgerController.create(null, {
        company_id: companyId,
        name: "Ledger To Delete",
        group_id: groupByName("Sundry Debtors").group_id,
        registration_type: "Unregistered",
      });
      expect(res.success).toBe(true);
      ledgerId = res.ledger.ledger_id;
    });

    it("removes it from getAll after delete", async () => {
      const del = await ledgerController.delete(null, ledgerId);
      expect(del.success).toBe(true);

      const all = await ledgerController.getAll(null, companyId);
      expect(all.ledgers.some((l) => l.ledger_id === ledgerId)).toBe(false);

      // soft delete: row still exists with is_active = 0
      const raw = await db.all(
        require("drizzle-orm").sql`SELECT is_active FROM ledgers WHERE ledger_id = ${ledgerId}`,
      );
      expect(raw[0].is_active).toBe(0);
    });

    it("refuses to delete predefined ledgers", async () => {
      const all = await ledgerController.getAll(null, companyId);
      const cash = all.ledgers.find((l) => l.name === "Cash");
      const res = await ledgerController.delete(null, cash.ledger_id);
      expect(res.success).toBe(false);
    });
  });
});
