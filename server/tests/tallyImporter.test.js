const { setupTestDB, createTestCompany, db } = require("./helpers");
const parser = require("../integrations/tally/xmlParser");
const importer = require("../integrations/tally/importer");
const groupService = require("../group/groupService");
const ledgerService = require("../ledger/ledgerService");
const stockItemService = require("../stockItem/stockItemService");
const voucherService = require("../voucher/voucherService");

// Sample Tally XML envelopes (the correctness oracle — no live Tally on :9000).
const GROUPS_XML = `
<ENVELOPE><BODY><DATA><COLLECTION>
  <GROUP NAME="Sundry Creditors">
    <PARENT>Current Liabilities</PARENT>
    <ISREVENUE>No</ISREVENUE>
  </GROUP>
  <GROUP NAME="Local Suppliers">
    <PARENT>Sundry Creditors</PARENT>
    <ISREVENUE>No</ISREVENUE>
  </GROUP>
  <GROUP NAME="Sales Account">
    <PARENT>Sales Accounts</PARENT>
    <ISREVENUE>Yes</ISREVENUE>
  </GROUP>
</COLLECTION></DATA></BODY></ENVELOPE>`;

const LEDGERS_XML = `
<ENVELOPE><BODY><DATA><COLLECTION>
  <LEDGER NAME="Acme Supplies Pvt Ltd">
    <GUID>a1b2c3d4-0001</GUID>
    <PARENT>Sundry Creditors</PARENT>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <OPENINGBALANCE>-15000.00</OPENINGBALANCE>
    <CLOSINGBALANCE>-22500.00</CLOSINGBALANCE>
    <MAILINGNAME>Acme Supplies Pvt Ltd</MAILINGNAME>
    <LEDSTATENAME>Karnataka</LEDSTATENAME>
    <COUNTRYNAME>India</COUNTRYNAME>
    <EMAIL>accounts@acme.example</EMAIL>
    <PARTYGSTIN>29ABCDE1234F1Z5</PARTYGSTIN>
    <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
  </LEDGER>
  <LEDGER NAME="Sales Account">
    <PARENT>Sales Account</PARENT>
    <ISREVENUE>Yes</ISREVENUE>
    <OPENINGBALANCE>0</OPENINGBALANCE>
  </LEDGER>
  <LEDGER NAME="Output IGST">
    <PARENT>Current Liabilities</PARENT>
    <OPENINGBALANCE>0</OPENINGBALANCE>
  </LEDGER>
</COLLECTION></DATA></BODY></ENVELOPE>`;

const STOCK_XML = `
<ENVELOPE><BODY><DATA><COLLECTION>
  <STOCKITEM NAME="Widget A">
    <BASEUNITS>Nos</BASEUNITS>
    <OPENINGBALANCE>100 Nos</OPENINGBALANCE>
    <OPENINGRATE>50.00</OPENINGRATE>
    <OPENINGVALUE>5000.00</OPENINGVALUE>
    <INFGSTHSNCODE>8471</INFGSTHSNCODE>
    <INFGSTIGSTRATE>18</INFGSTIGSTRATE>
    <GSTMSTTYPEOFSUPPLY>Goods</GSTMSTTYPEOFSUPPLY>
    <INFGSTTAXABLILITY>Taxable</INFGSTTAXABLILITY>
  </STOCKITEM>
  <STOCKITEM NAME="Gadget B">
    <BASEUNITS>BoxOf12</BASEUNITS>
    <OPENINGBALANCE>5 BoxOf12</OPENINGBALANCE>
    <OPENINGRATE>200</OPENINGRATE>
  </STOCKITEM>
</COLLECTION></DATA></BODY></ENVELOPE>`;

const VOUCHER_XML = `
<ENVELOPE><BODY><DATA><COLLECTION>
  <VOUCHER VCHTYPE="Sales">
    <GUID>v0000001</GUID>
    <DATE>20260415</DATE>
    <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
    <VOUCHERNUMBER>S-0042</VOUCHERNUMBER>
    <PARTYLEDGERNAME>Acme Supplies Pvt Ltd</PARTYLEDGERNAME>
    <NARRATION>Sale of goods</NARRATION>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Acme Supplies Pvt Ltd</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>-11800.00</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Sales Account</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>10000.00</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Output IGST</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>1800.00</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
  <VOUCHER>
    <DATE>20260416</DATE>
    <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Ghost Ledger</LEDGERNAME>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <AMOUNT>-500</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>Sales Account</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>500</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  </VOUCHER>
</COLLECTION></DATA></BODY></ENVELOPE>`;

describe("Tally Importer", () => {
  let companyId;
  let fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Tally Import Test Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;
  });

  it("preview() counts without writing", () => {
    const parsed = parser.parse(VOUCHER_XML);
    const pv = importer.preview(parsed);
    expect(pv.vouchers).toBe(2);
    expect(pv.balancedVouchers).toBe(2);
  });

  it("imports groups with parent resolution and inherited nature", async () => {
    const parsed = parser.parse(GROUPS_XML);
    const ctx = { company_id: companyId, fy_id: fyId };
    const { groups } = await importer.importMasters(parsed, ctx);
    // 3 groups created (Sundry Creditors already seeded -> skipped not created)
    expect(groups.created + groups.skipped).toBeGreaterThanOrEqual(2);
    expect(groups.failed).toBe(0);

    const all = await groupService.getAll(companyId);
    const local = all.groups.find((g) => g.name === "Local Suppliers");
    expect(local).toBeDefined();
    // parent (Sundry Creditors) is Liabilities -> child inherits via Tally map
    expect(local.nature).toBe("Liabilities");
    const salesAcc = all.groups.find((g) => g.name === "Sales Account");
    expect(salesAcc.nature).toBe("Income");
  });

  it("imports ledgers with signed opening balance, gstin and group_id", async () => {
    const parsed = parser.parse(LEDGERS_XML);
    const ctx = { company_id: companyId, fy_id: fyId };
    const { ledgers } = await importer.importMasters(parsed, ctx);
    expect(ledgers.failed).toBe(0);

    const all = await ledgerService.getAll(companyId);
    const acme = all.ledgers.find((l) => l.name === "Acme Supplies Pvt Ltd");
    expect(acme).toBeDefined();
    expect(acme.opening_balance).toBe(-15000);
    expect(acme.gstin).toBe("29ABCDE1234F1Z5");
    expect(acme.registration_type).toBe("Regular");
    expect(acme.group_id).not.toBeNull();
    expect(acme.nature).toBe("Liabilities");
  });

  it("imports stock items, creating missing units", async () => {
    const parsed = parser.parse(STOCK_XML);
    const ctx = { company_id: companyId, fy_id: fyId };
    const { units, stockItems } = await importer.importMasters(parsed, ctx);
    expect(stockItems.failed).toBe(0);
    // BoxOf12 unit did not exist -> created; Nos was seeded.
    expect(units.created).toBeGreaterThanOrEqual(1);

    const all = await stockItemService.getAll(companyId);
    const widget = all.stockItems.find((s) => s.name === "Widget A");
    expect(widget).toBeDefined();
    expect(widget.opening_quantity).toBe(100);
    expect(widget.opening_rate).toBe(50);
    expect(widget.opening_value).toBe(5000);
    expect(widget.gst_rate).toBe(18);
    expect(widget.unit_id).not.toBeNull();
  });

  it("imports balanced vouchers and fails unresolved-ledger ones", async () => {
    const parsed = parser.parse(VOUCHER_XML);
    const ctx = { company_id: companyId, fy_id: fyId };
    // Masters already imported above; resolve against existing rows.
    const { vouchers } = await importer.importVouchers(parsed, ctx);
    expect(vouchers.created).toBe(1); // the balanced Sales/Receipt voucher
    expect(vouchers.failed).toBe(1); // Ghost Ledger unresolved
    expect(vouchers.errors.join(" ")).toMatch(/Ghost Ledger/);

    // Verify the voucher's entries balanced (sum Dr === sum Cr).
    const all = await voucherService.getAll(companyId, fyId);
    const v = all.vouchers.find((x) => x.narration === "Sale of goods");
    expect(v).toBeDefined();
    const full = await voucherService.getById(v.voucher_id);
    const dr = full.voucher.entries.filter((e) => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
    const cr = full.voucher.entries.filter((e) => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
    expect(Math.abs(dr - cr)).toBeLessThan(0.01);
    expect(dr).toBe(11800);
  });

  it("importAll runs the full pipeline and is idempotent (re-run => skipped)", async () => {
    const parsed = parser.parse(GROUPS_XML);
    const ctx = { company_id: companyId, fy_id: fyId };
    const summary = await importer.importAll(parsed, ctx);
    // second run of the same groups -> everything already exists.
    expect(summary.groups.created).toBe(0);
    expect(summary.groups.failed).toBe(0);
    expect(summary.groups.skipped).toBeGreaterThanOrEqual(3);
  });
});
