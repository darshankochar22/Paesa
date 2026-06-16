// ---------------------------------------------------------------------------
// Tally connector test (parser + importer) — the correctness oracle.
//
// There is no live Tally on :9000 here, so the parser and importer are validated
// against SAMPLE Tally <ENVELOPE> XML (taken verbatim from the design contract)
// parsed by fast-xml-parser@5, then imported into the in-memory test DB. We
// assert against the snake_case rows the existing services return.
//
//   1. Parser: feed the SAMPLE Ledger and Voucher envelopes to xmlParser and
//      assert the ParsedTally shape (ledger name/parent/opening balance; a
//      voucher with balanced Dr/Cr entries).
//   2. Importer: build a small parsed masters object (groups + ledgers under
//      them), call importer.importMasters(parsed, ctx), and verify via
//      groupService.getAll / ledgerService.getAll that the rows landed. Then
//      import a balanced voucher referencing those ledgers and assert
//      voucherService.getAll shows it with sum(Dr) === sum(Cr).
// ---------------------------------------------------------------------------
const { setupTestDB, createTestCompany, db } = require("./helpers");
const parser = require("../integrations/tally/xmlParser");
const importer = require("../integrations/tally/importer");
const groupService = require("../group/groupService");
const ledgerService = require("../ledger/ledgerService");
const voucherService = require("../voucher/voucherService");

// --- SAMPLE Tally XML (verbatim from the design contract) -------------------

const LEDGER_XML = `
<ENVELOPE>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC><REPORTNAME>Ledger</REPORTNAME></REQUESTDESC>
   <REQUESTDATA>
    <COLLECTION>
     <LEDGER NAME="Acme Supplies Pvt Ltd" RESERVEDNAME="">
      <GUID>a1b2c3d4-0001-1234-9abc-000000000001</GUID>
      <PARENT>Sundry Creditors</PARENT>
      <ISREVENUE>No</ISREVENUE>
      <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
      <OPENINGBALANCE>-15000.00</OPENINGBALANCE>
      <CLOSINGBALANCE>-22500.00</CLOSINGBALANCE>
      <MAILINGNAME>Acme Supplies Pvt Ltd</MAILINGNAME>
      <LEDSTATENAME>Karnataka</LEDSTATENAME>
      <COUNTRYNAME>India</COUNTRYNAME>
      <EMAIL>accounts@acme.example</EMAIL>
      <PARTYGSTIN>29ABCDE1234F1Z5</PARTYGSTIN>
      <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
      <NAME.LIST><NAME>Acme Supplies Pvt Ltd</NAME></NAME.LIST>
     </LEDGER>
    </COLLECTION>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;

const VOUCHER_XML = `
<ENVELOPE>
 <BODY><DATA><COLLECTION>
  <VOUCHER VCHTYPE="Sales" ACTION="Create">
   <GUID>v0000001-0001-0000-0000-000000000abc</GUID>
   <DATE>20260415</DATE>
   <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
   <VOUCHERNUMBER>S-0042</VOUCHERNUMBER>
   <PARTYLEDGERNAME>Acme Supplies Pvt Ltd</PARTYLEDGERNAME>
   <NARRATION>Sale of goods</NARRATION>
   <ISINVOICE>Yes</ISINVOICE>
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
 </COLLECTION></DATA></BODY>
</ENVELOPE>`;

describe("Tally connector — parser (pure)", () => {
  it("parses the SAMPLE Ledger envelope into the ParsedTally ledger contract", () => {
    const parsed = parser.parse(LEDGER_XML);

    expect(parsed.meta.source).toBe("tally-xml");
    expect(parsed.meta.collectionType).toBe("Ledger");
    expect(parsed.meta.requestType).toBe("Ledger"); // from REQUESTDESC/REPORTNAME

    expect(parsed.ledgers).toHaveLength(1);
    const led = parsed.ledgers[0];
    expect(led.name).toBe("Acme Supplies Pvt Ltd");
    expect(led.parent).toBe("Sundry Creditors");
    // <OPENINGBALANCE>-15000.00</OPENINGBALANCE> -> signed number (Cr => negative)
    expect(led.openingBalance).toBe(-15000);
    expect(led.closingBalance).toBe(-22500);
    expect(led.gstin).toBe("29ABCDE1234F1Z5");
    expect(led.registrationType).toBe("Regular");
    expect(led.state).toBe("Karnataka");
    expect(led.country).toBe("India");
    expect(led.email).toBe("accounts@acme.example");
    expect(led.isDeemedPositive).toBe(true);
    expect(led.guid).toBe("a1b2c3d4-0001-1234-9abc-000000000001");
  });

  it("parses the SAMPLE Voucher envelope with balanced Dr/Cr entries", () => {
    const parsed = parser.parse(VOUCHER_XML);

    expect(parsed.meta.collectionType).toBe("Voucher");
    expect(parsed.vouchers).toHaveLength(1);

    const v = parsed.vouchers[0];
    expect(v.date).toBe("2026-04-15"); // Tally YYYYMMDD -> ISO
    expect(v.voucherType).toBe("Sales");
    expect(v.number).toBe("S-0042");
    expect(v.party).toBe("Acme Supplies Pvt Ltd");
    expect(v.narration).toBe("Sale of goods");
    expect(v.isAccounting).toBe(true);
    expect(v.entries).toHaveLength(3);

    // Dr/Cr derivation (§2.3): ISDEEMEDPOSITIVE=Yes OR rawAmount<0 => Dr.
    const party = v.entries.find((e) => e.ledgerName === "Acme Supplies Pvt Ltd");
    expect(party.type).toBe("Dr"); // ISDEEMEDPOSITIVE=Yes, amount -11800
    expect(party.amount).toBe(11800); // absolute value

    const sales = v.entries.find((e) => e.ledgerName === "Sales Account");
    expect(sales.type).toBe("Cr");
    expect(sales.amount).toBe(10000);

    const igst = v.entries.find((e) => e.ledgerName === "Output IGST");
    expect(igst.type).toBe("Cr");
    expect(igst.amount).toBe(1800);

    // The voucher must balance: sum(Dr) === sum(Cr).
    const dr = v.entries.filter((e) => e.type === "Dr").reduce((s, e) => s + e.amount, 0);
    const cr = v.entries.filter((e) => e.type === "Cr").reduce((s, e) => s + e.amount, 0);
    expect(dr).toBe(11800);
    expect(cr).toBe(11800);
    expect(Math.abs(dr - cr)).toBeLessThan(0.01);
    expect(importer.entriesBalanced(v.entries)).toBe(true);
  });
});

describe("Tally connector — importer (in-memory DB oracle)", () => {
  let companyId;
  let fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Tally Import Oracle Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;
  });

  it("imports a small parsed masters object (groups + ledgers) into the DB", async () => {
    // A small, hand-built parsed masters object: two user groups under seeded
    // primary groups, plus ledgers that live under those groups.
    const parsed = {
      meta: { source: "tally-xml", requestType: null, collectionType: null },
      groups: [
        { name: "Trade Creditors", parent: "Sundry Creditors", nature: null },
        { name: "Domestic Sales", parent: "Sales Accounts", nature: null },
      ],
      ledgers: [
        {
          name: "Beta Traders",
          parent: "Trade Creditors",
          openingBalance: -8000,
          gstin: "27ABCDE1234F1Z9",
          registrationType: "Regular",
          state: "Maharashtra",
          country: "India",
        },
        {
          name: "Domestic Sales A/c",
          parent: "Domestic Sales",
          openingBalance: 0,
        },
      ],
      stockItems: [],
      vouchers: [],
    };

    const ctx = { company_id: companyId, fy_id: fyId };
    const { groups, ledgers } = await importer.importMasters(parsed, ctx);

    expect(groups.failed).toBe(0);
    expect(groups.created).toBe(2);
    expect(ledgers.failed).toBe(0);
    expect(ledgers.created).toBe(2);

    // Verify the groups landed and inherited nature from their seeded parents.
    const allGroups = await groupService.getAll(companyId);
    const creditors = allGroups.groups.find((g) => g.name === "Trade Creditors");
    const sales = allGroups.groups.find((g) => g.name === "Domestic Sales");
    expect(creditors).toBeDefined();
    expect(creditors.nature).toBe("Liabilities"); // Sundry Creditors -> Liabilities
    expect(creditors.parent_group_id).not.toBeNull();
    expect(sales).toBeDefined();
    expect(sales.nature).toBe("Income"); // Sales Accounts -> Income

    // Verify the ledgers landed, grouped and with signed opening balance.
    const allLedgers = await ledgerService.getAll(companyId);
    const beta = allLedgers.ledgers.find((l) => l.name === "Beta Traders");
    expect(beta).toBeDefined();
    expect(beta.group_id).toBe(creditors.group_id);
    expect(beta.opening_balance).toBe(-8000);
    expect(beta.gstin).toBe("27ABCDE1234F1Z9");
    expect(beta.registration_type).toBe("Regular");
    expect(beta.nature).toBe("Liabilities"); // inherited from resolved group

    const domestic = allLedgers.ledgers.find((l) => l.name === "Domestic Sales A/c");
    expect(domestic).toBeDefined();
    expect(domestic.group_id).toBe(sales.group_id);
  });

  it("imports a balanced voucher referencing the imported ledgers", async () => {
    // A simple two-line balanced voucher between the two ledgers created above.
    const parsed = {
      meta: { source: "tally-xml", requestType: null, collectionType: null },
      groups: [],
      ledgers: [],
      stockItems: [],
      vouchers: [
        {
          date: "2026-05-10",
          voucherType: "Journal",
          number: "J-0001",
          narration: "Tally import balanced journal",
          party: "Beta Traders",
          reference: null,
          isAccounting: true,
          isInventory: false,
          entries: [
            { ledgerName: "Domestic Sales A/c", type: "Dr", amount: 5000 },
            { ledgerName: "Beta Traders", type: "Cr", amount: 5000 },
          ],
          inventoryEntries: [],
          guid: null,
        },
      ],
    };

    const ctx = { company_id: companyId, fy_id: fyId };
    const { vouchers } = await importer.importVouchers(parsed, ctx);

    expect(vouchers.failed).toBe(0);
    expect(vouchers.created).toBe(1);

    // voucherService.getAll shows it.
    const all = await voucherService.getAll(companyId, fyId);
    const v = all.vouchers.find((x) => x.narration === "Tally import balanced journal");
    expect(v).toBeDefined();
    expect(v.voucher_type).toBe("Journal");

    // Its entries balance (sum Dr === sum Cr) per the service's double-entry rule.
    const full = await voucherService.getById(v.voucher_id);
    const dr = full.voucher.entries
      .filter((e) => e.type === "Dr")
      .reduce((s, e) => s + e.amount, 0);
    const cr = full.voucher.entries
      .filter((e) => e.type === "Cr")
      .reduce((s, e) => s + e.amount, 0);
    expect(dr).toBe(5000);
    expect(cr).toBe(5000);
    expect(Math.abs(dr - cr)).toBeLessThan(0.01);
  });
});
