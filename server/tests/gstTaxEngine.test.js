// GST tax engine — MANUAL model (the default voucher flow).
//
// Tax ledger SELECTION IS MANUAL. On save the engine keeps exactly the tax ledgers the
// user put on the voucher, validates them, and computes their amounts per item. It never
// auto-creates a tax line from a stock item (bug 1) and never substitutes the user's
// CGST/SGST for IGST or vice-versa (bug 2). Only the opt-in Voucher Type Class GST
// mapping still auto-injects (second describe).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { gstHsnRates } = require("../db/schema");
const ledgerService = require("../ledger/ledgerService");
const stockItemService = require("../stockItem/stockItemService");
const gstRegistrationController = require("../gstRegistration/gstRegistrationController");
const voucherController = require("../voucher/voucherController");
const voucherTypeService = require("../voucherType/voucherTypeService");

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;
const itemId = (res) => res.stockItem?.item_id ?? res.item_id ?? res.id;

const makeTaxLedger = (companyId, name, gstTaxType, rate) =>
  ledgerService.create({
    company_id: companyId, name,
    statutory_details: { type_of_duty_tax: "GST", gst_tax_type: gstTaxType, gst_rate: rate },
  });

const entriesOf = async (voucherId) =>
  (await db.execute(`SELECT ledger_id, ledger_name, type, amount FROM voucher_entries WHERE voucher_id = ?`, [voucherId])).rows;
const taxLinesOf = async (voucherId) =>
  (await db.execute(`SELECT tax_type, amount FROM gst_voucher_tax_lines WHERE voucher_id = ?`, [voucherId])).rows;

describe("GST tax engine — manual tax ledger model", () => {
  let companyId, fyId, partyId, partyKAId, salesId, cgstId, sgstId, igstId, exemptItemId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Manual Model Co");
    companyId = company.company_id;
    fyId = (await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [companyId])).rows[0].fy_id;

    const reg = await gstRegistrationController.create(null, {
      company_id: companyId, registration_type: "Regular", state_id: "Maharashtra", gstin: "27ABCDE1234F1Z5", registration_status: "Active",
    });
    await db.execute(`UPDATE companies SET current_default_gst_registration_id = ? WHERE company_id = ?`, [reg.gstRegistration.gst_id, companyId]);

    const party = await ledgerService.create({
      company_id: companyId, name: "Manual Customer", gstin: "27ZZZZZ1234F1Z5", state: "Maharashtra", country: "India", registration_type: "Regular",
    });
    partyId = ledgerId(party);
    const partyKA = await ledgerService.create({
      company_id: companyId, name: "Manual Customer KA", gstin: "29ZZZZZ1234F1Z5", state: "Karnataka", country: "India", registration_type: "Regular",
    });
    partyKAId = ledgerId(partyKA);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: "Manual Sales A/c" }));
    cgstId = ledgerId(await makeTaxLedger(companyId, "Output CGST @9%", "CGST", 9));
    sgstId = ledgerId(await makeTaxLedger(companyId, "Output SGST @9%", "SGST/UTGST", 9));
    igstId = ledgerId(await makeTaxLedger(companyId, "Output IGST @18%", "IGST", 18));

    const exempt = await stockItemService.create({
      company_id: companyId, name: "Exempt Widget", gst_applicable: "Not Applicable", taxability_type: "Exempt", gst_rate: 0,
    });
    exemptItemId = itemId(exempt);

    await db.insert(gstHsnRates).values({ companyId, hsnCode: "8471", effectiveFrom: "2026-01-01", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 });
    await db.insert(gstHsnRates).values({ companyId, hsnCode: "6109", effectiveFrom: "2026-01-01", gstRate: 12, cgstRate: 6, sgstRate: 6, igstRate: 12 });
  });

  const createVoucher = (extra) => voucherController.create(null, {
    company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10",
    status: "Regular", reference_number: `INV-${Date.now()}-${Math.random()}`,
    party_ledger_id: partyId, party_name: "Manual Customer",
    is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
    place_of_supply: "Maharashtra",
    ...extra,
  });

  it("BUG 1: adding a stock item and not touching tax saves ZERO tax lines", async () => {
    const res = await createVoucher({
      entries: [
        { ledger_id: partyId, ledger_name: "Manual Customer", type: "Dr", amount: 10000, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(res.success).toBe(true);

    expect(await taxLinesOf(res.voucher.voucher_id)).toHaveLength(0);
    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(cgstId))).toBeFalsy();
    expect(entries.find((e) => Number(e.ledger_id) === Number(sgstId))).toBeFalsy();
    expect(entries.find((e) => Number(e.ledger_id) === Number(igstId))).toBeFalsy();
  });

  it("BUG 2: manually selected CGST+SGST are saved AS-IS on an intra-state supply, not swapped to IGST", async () => {
    const res = await createVoucher({
      entries: [
        { ledger_id: partyId, ledger_name: "Manual Customer", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
        { ledger_id: cgstId, ledger_name: "Output CGST @9%", type: "Cr", amount: 900, currency: "INR" },
        { ledger_id: sgstId, ledger_name: "Output SGST @9%", type: "Cr", amount: 900, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(res.success).toBe(true);

    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(cgstId))?.amount).toBe(900);
    expect(entries.find((e) => Number(e.ledger_id) === Number(sgstId))?.amount).toBe(900);
    expect(entries.find((e) => Number(e.ledger_id) === Number(igstId))).toBeFalsy();
    expect((await taxLinesOf(res.voucher.voucher_id)).map((r) => r.tax_type).sort()).toEqual(["CGST", "SGST"]);
  });

  it("BUG 3: blocks an IGST ledger on an intra-state supply", async () => {
    const res = await createVoucher({
      entries: [
        { ledger_id: partyId, ledger_name: "Manual Customer", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
        { ledger_id: igstId, ledger_name: "Output IGST @18%", type: "Cr", amount: 1800, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/IGST/i);
  });

  it("BUG 3: inter-state supply blocks CGST/SGST and accepts a single IGST", async () => {
    // Blocked: CGST/SGST on an inter-state supply (Karnataka party vs Maharashtra company).
    const blocked = await createVoucher({
      party_ledger_id: partyKAId, party_name: "Manual Customer KA", place_of_supply: "Karnataka",
      entries: [
        { ledger_id: partyKAId, ledger_name: "Manual Customer KA", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
        { ledger_id: cgstId, ledger_name: "Output CGST @9%", type: "Cr", amount: 900, currency: "INR" },
        { ledger_id: sgstId, ledger_name: "Output SGST @9%", type: "Cr", amount: 900, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(blocked.success).toBe(false);
    expect(blocked.error).toMatch(/CGST\/SGST|IGST/i);

    // Accepted: a single IGST ledger on the same inter-state supply.
    const ok = await createVoucher({
      party_ledger_id: partyKAId, party_name: "Manual Customer KA", place_of_supply: "Karnataka",
      entries: [
        { ledger_id: partyKAId, ledger_name: "Manual Customer KA", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
        { ledger_id: igstId, ledger_name: "Output IGST @18%", type: "Cr", amount: 1800, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(ok.success).toBe(true);
    const entries = await entriesOf(ok.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(igstId))?.amount).toBe(1800);
    expect((await taxLinesOf(ok.voucher.voucher_id)).map((r) => r.tax_type)).toEqual(["IGST"]);
  });

  it("BUG 4: blocks a GST ledger when the item is Exempt / Nil Rated", async () => {
    const res = await createVoucher({
      entries: [
        { ledger_id: partyId, ledger_name: "Manual Customer", type: "Dr", amount: 1090, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 1000, currency: "INR" },
        { ledger_id: cgstId, ledger_name: "Output CGST @9%", type: "Cr", amount: 45, currency: "INR" },
        { ledger_id: sgstId, ledger_name: "Output SGST @9%", type: "Cr", amount: 45, currency: "INR" },
      ],
      stock_entries: [{ stock_item_id: exemptItemId, item_name: "Exempt Widget", quantity: 1, rate: 1000 }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Exempt|Nil/i);
  });

  it("inter-state multi-item invoice posts exactly ONE IGST = sum of per-item 18% (user's 9594 case)", async () => {
    // Office Chair 6x500=3000, Notebook 6x50=300, Desktop 1x50000=50000 → 53300 @18% = 9594.
    const res = await createVoucher({
      party_ledger_id: partyKAId, party_name: "Manual Customer KA", place_of_supply: "Karnataka",
      entries: [
        { ledger_id: partyKAId, ledger_name: "Manual Customer KA", type: "Dr", amount: 62894, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 53300, currency: "INR" },
        { ledger_id: igstId, ledger_name: "Output IGST @18%", type: "Cr", amount: 9594, currency: "INR" },
      ],
      stock_entries: [
        { item_name: "Office Chair", quantity: 6, rate: 500, hsn_code: "8471" },
        { item_name: "Notebook", quantity: 6, rate: 50, hsn_code: "8471" },
        { item_name: "Desktop Computer", quantity: 1, rate: 50000, hsn_code: "8471" },
      ],
    });
    expect(res.success).toBe(true);
    const igstEntries = (await entriesOf(res.voucher.voucher_id)).filter((e) => Number(e.ledger_id) === Number(igstId));
    expect(igstEntries).toHaveLength(1);           // exactly ONE IGST, never two
    expect(igstEntries[0].amount).toBe(9594);      // per-item summed, correct total
    const taxLines = await taxLinesOf(res.voucher.voucher_id);
    expect(taxLines.filter((r) => r.tax_type === "IGST")).toHaveLength(1);
  });

  it("classifies a GST ledger named 'IGST' even when gst_tax_type is null (name fallback)", async () => {
    // A Duties&Taxes ledger tagged type_of_duty_tax='GST' but WITHOUT a gst_tax_type,
    // literally named "IGST" (matches a real user's data). It must still be recognised.
    const igstNoTag = ledgerId(await ledgerService.create({
      company_id: companyId, name: "IGST",
      statutory_details: { type_of_duty_tax: "GST" }, // no gst_tax_type
    }));
    const res = await createVoucher({
      party_ledger_id: partyKAId, party_name: "Manual Customer KA", place_of_supply: "Karnataka",
      entries: [
        { ledger_id: partyKAId, ledger_name: "Manual Customer KA", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 10000, currency: "INR" },
        { ledger_id: igstNoTag, ledger_name: "IGST", type: "Cr", amount: 1800, currency: "INR" },
      ],
      stock_entries: [{ item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" }],
    });
    expect(res.success).toBe(true); // not rejected as "requires exactly one IGST"
    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(igstNoTag))?.amount).toBe(1800);
    expect((await taxLinesOf(res.voucher.voucher_id)).map((r) => r.tax_type)).toEqual(["IGST"]);
  });

  it("BUG 7: multi-rate invoice computes CGST per item then sums (not one flat rate on the subtotal)", async () => {
    // Item A: 10 x 1000 @18% ⇒ CGST 900. Item B: 5 x 1000 @12% ⇒ CGST 300. Total CGST 1200.
    // A flat 9% on the 15000 subtotal would wrongly be 1350.
    const res = await createVoucher({
      entries: [
        { ledger_id: partyId, ledger_name: "Manual Customer", type: "Dr", amount: 17400, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Manual Sales A/c", type: "Cr", amount: 15000, currency: "INR" },
        { ledger_id: cgstId, ledger_name: "Output CGST @9%", type: "Cr", amount: 1200, currency: "INR" },
        { ledger_id: sgstId, ledger_name: "Output SGST @9%", type: "Cr", amount: 1200, currency: "INR" },
      ],
      stock_entries: [
        { item_name: "Widget18", quantity: 10, rate: 1000, hsn_code: "8471" },
        { item_name: "Shirt12", quantity: 5, rate: 1000, hsn_code: "6109" },
      ],
    });
    expect(res.success).toBe(true);
    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(cgstId))?.amount).toBe(1200);
    expect(entries.find((e) => Number(e.ledger_id) === Number(sgstId))?.amount).toBe(1200);
  });
});

// Voucher Type Class ("Name of Class" → "Use Class for GST Details") — the OPT-IN
// auto-inject path. A class's explicitly mapped ledgers are injected; a voucher with no
// class and no manual tax ledgers gets NO GST (manual model).
describe("GST tax engine — Voucher Type Class ledger override (opt-in auto-inject)", () => {
  let companyId, fyId, partyId, salesId, classCgstId, classSgstId;
  const CLASS_NAME = "GST Sales Class";

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Voucher Class Test Co");
    companyId = company.company_id;
    fyId = (await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [companyId])).rows[0].fy_id;

    const groupRes = await db.execute(`SELECT group_id FROM groups WHERE company_id = ? AND name = 'Duties & Taxes'`, [companyId]);
    const dutiesGroupId = groupRes.rows[0].group_id;

    classCgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Class-Mapped CGST", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "CGST", gst_rate: 9 },
    }));
    classSgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Class-Mapped SGST", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "SGST/UTGST", gst_rate: 9 },
    }));

    const party = await ledgerService.create({
      company_id: companyId, name: "Voucher Class Customer", gstin: "27ABCDE1234F1Z5", state: "Maharashtra", country: "India", registration_type: "Regular",
    });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: "Voucher Class Sales A/c" }));

    await db.insert(gstHsnRates).values({ companyId, hsnCode: "8472", effectiveFrom: "2026-01-01", gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18 });

    const vtRes = await voucherTypeService.getAll(companyId);
    const salesVtId = vtRes.voucherTypes.find((vt) => vt.name === "Sales").vt_id;
    const configRes = await voucherTypeService.updateConfig({
      voucher_type_id: salesVtId,
      voucher_classes: [{ id: "vc-test-1", name: CLASS_NAME, use_for_gst_details: "Yes", gst_ledger_ids: [classCgstId, classSgstId] }],
    });
    expect(configRes.success).toBe(true);
  });

  const createSalesVoucher = (voucher_class) => voucherController.create(null, {
    company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10",
    status: "Regular", reference_number: `INV-CLS-${Date.now()}-${Math.random()}`, place_of_supply: "Maharashtra",
    party_ledger_id: partyId, party_name: "Voucher Class Customer",
    is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1,
    voucher_class: voucher_class || null,
    entries: [
      { ledger_id: partyId, ledger_name: "Voucher Class Customer", type: "Dr", amount: 11800, currency: "INR" },
      { ledger_id: salesId, ledger_name: "Voucher Class Sales A/c", type: "Cr", amount: 11800, currency: "INR" },
    ],
    stock_entries: [{ item_name: "Gadget", quantity: 10, rate: 1000, hsn_code: "8472" }],
  });

  it("auto-injects the Class-mapped ledgers when a GST-details Class is selected", async () => {
    const res = await createSalesVoucher(CLASS_NAME);
    expect(res.success).toBe(true);
    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(classCgstId))?.amount).toBe(900);
    expect(entries.find((e) => Number(e.ledger_id) === Number(classSgstId))?.amount).toBe(900);
  });

  it("injects NO GST when no Class is selected and no tax ledger was manually added (manual model)", async () => {
    const res = await createSalesVoucher(null);
    expect(res.success).toBe(true);
    const entries = await entriesOf(res.voucher.voucher_id);
    expect(entries.find((e) => Number(e.ledger_id) === Number(classCgstId))).toBeFalsy();
    expect(entries.find((e) => Number(e.ledger_id) === Number(classSgstId))).toBeFalsy();
    expect(await taxLinesOf(res.voucher.voucher_id)).toHaveLength(0);
  });
});
