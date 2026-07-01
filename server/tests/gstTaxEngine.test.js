// GST tax engine — verifies that computeVoucherTaxLines() posts CGST/SGST/IGST
// against the Duties & Taxes ledger the USER configured (matched via
// ledger_statutory_details.type_of_duty_tax/gst_tax_type), not a hardcoded
// "CGST"/"SGST"/"IGST" name — and never silently creates a duplicate ledger.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const { gstHsnRates } = require("../db/schema");
const ledgerService = require("../ledger/ledgerService");
const voucherController = require("../voucher/voucherController");
const voucherTypeService = require("../voucherType/voucherTypeService");

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;

describe("GST tax engine — Duties & Taxes ledger resolution", () => {
  let companyId, fyId, partyId, salesId, dutiesGroupId, outputCgstId, outputSgstId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Tax Engine Test Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const groupRes = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'Duties & Taxes'`,
      [companyId]
    );
    dutiesGroupId = groupRes.rows[0].group_id;

    // User-created ledgers with real-world names — NOT literally "CGST"/"SGST".
    outputCgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Output CGST @9%", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "CGST" },
    }));
    outputSgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Output SGST @9%", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "SGST/UTGST" },
    }));

    const party = await ledgerService.create({
      company_id: companyId, name: "Tax Engine Customer",
      gstin: "27ABCDE1234F1Z5", state: "Maharashtra", country: "India", registration_type: "Regular",
    });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: "Tax Engine Sales A/c" }));

    // Company-level HSN rate override so voucher.create computes real (nonzero) GST.
    await db.insert(gstHsnRates).values({
      companyId, hsnCode: "8471", effectiveFrom: "2026-01-01",
      gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18,
    });
  });

  const createSalesVoucher = async (extraEntries = []) => {
    return voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10",
      status: "Regular", reference_number: `INV-${Date.now()}-${Math.random()}`, place_of_supply: "Maharashtra",
      party_ledger_id: partyId, party_name: "Tax Engine Customer",
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1, is_order_voucher: 0, is_post_dated: 0,
      entries: [
        { ledger_id: partyId, ledger_name: "Tax Engine Customer", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Tax Engine Sales A/c", type: "Cr", amount: 11800, currency: "INR" },
        ...extraEntries,
      ],
      stock_entries: [
        { item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" },
      ],
    });
  };

  it("posts CGST/SGST to the user's own Duties & Taxes ledgers, not a duplicate", async () => {
    const res = await createSalesVoucher();
    expect(res.success).toBe(true);

    const entriesRes = await db.execute(
      `SELECT ledger_id, ledger_name, type, amount FROM voucher_entries WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    const entries = entriesRes.rows;

    const cgstEntry = entries.find((e) => Number(e.ledger_id) === Number(outputCgstId));
    const sgstEntry = entries.find((e) => Number(e.ledger_id) === Number(outputSgstId));
    expect(cgstEntry).toBeTruthy();
    expect(sgstEntry).toBeTruthy();
    expect(cgstEntry.amount).toBe(900);
    expect(sgstEntry.amount).toBe(900);
    expect(cgstEntry.type).toBe("Cr");
    expect(cgstEntry.ledger_name).toBe("Output CGST @9%");

    // No auto-generated duplicate ledger literally named "CGST"/"SGST" was created.
    const dupes = await db.execute(
      `SELECT name FROM ledgers WHERE company_id = ? AND (LOWER(name) = 'cgst' OR LOWER(name) = 'sgst')`,
      [companyId]
    );
    expect(dupes.rows.length).toBe(0);
  });

  it("reuses the same ledger across multiple vouchers instead of creating a new one each time", async () => {
    const res1 = await createSalesVoucher();
    const res2 = await createSalesVoucher();
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);

    const dutiesLedgers = await db.execute(
      `SELECT ledger_id, name FROM ledgers WHERE company_id = ? AND group_id = ?`,
      [companyId, dutiesGroupId]
    );
    // Only the two ledgers created in beforeAll — still no extra CGST/SGST ledger.
    expect(dutiesLedgers.rows.length).toBe(2);
  });

  it("strips a stray tax-ledger entry the caller sent and injects the correctly computed one instead", async () => {
    // Simulate a client that (incorrectly) already included a CGST line — the
    // engine must strip it by ledger_id and inject one fresh, correct entry —
    // not append a second one. Paired Cr+Dr of the same amount on the same
    // ledger keeps the pre-engine double-entry check balanced.
    const res = await createSalesVoucher([
      { ledger_id: outputCgstId, ledger_name: "Output CGST @9%", type: "Cr", amount: 1, currency: "INR" },
      { ledger_id: outputCgstId, ledger_name: "Output CGST @9%", type: "Dr", amount: 1, currency: "INR" },
    ]);
    expect(res.success).toBe(true);

    const entriesRes = await db.execute(
      `SELECT ledger_id, amount FROM voucher_entries WHERE voucher_id = ? AND ledger_id = ?`,
      [res.voucher.voucher_id, outputCgstId]
    );
    expect(entriesRes.rows.length).toBe(1);
    expect(entriesRes.rows[0].amount).toBe(900);
  });

  it("recomputes GST on the Alter/update path when stock entries change", async () => {
    const created = await createSalesVoucher();
    const voucherId = created.voucher.voucher_id;

    // Double the quantity: 20 * 1000 = 20000 taxable @18% => CGST 1800 + SGST 1800.
    const updateRes = await voucherController.update(null, {
      voucher_id: voucherId,
      company_id: companyId,
      voucher_type: "Sales",
      is_accounting_voucher: 1,
      party_ledger_id: partyId,
      place_of_supply: "Maharashtra",
      date: "2026-04-10",
      entries: [
        { ledger_id: partyId, ledger_name: "Tax Engine Customer", type: "Dr", amount: 23600, currency: "INR" },
        { ledger_id: salesId, ledger_name: "Tax Engine Sales A/c", type: "Cr", amount: 23600, currency: "INR" },
      ],
      stock_entries: [
        { item_name: "Widget", quantity: 20, rate: 1000, hsn_code: "8471" },
      ],
    });
    expect(updateRes.success).toBe(true);

    const entriesRes = await db.execute(
      `SELECT ledger_id, amount FROM voucher_entries WHERE voucher_id = ? AND ledger_id IN (?, ?)`,
      [voucherId, outputCgstId, outputSgstId]
    );
    const cgst = entriesRes.rows.find((r) => Number(r.ledger_id) === Number(outputCgstId));
    const sgst = entriesRes.rows.find((r) => Number(r.ledger_id) === Number(outputSgstId));
    expect(cgst.amount).toBe(1800);
    expect(sgst.amount).toBe(1800);

    // Exactly one CGST row remains — the stale 900 entry from create() wasn't
    // left behind alongside the recomputed 1800 one.
    expect(entriesRes.rows.filter((r) => Number(r.ledger_id) === Number(outputCgstId)).length).toBe(1);
  });
});

// Voucher Type Class ("Name of Class" → "Use Class for GST Details") — a class's
// explicitly mapped ledgers must win over the normal auto-resolve/auto-create lookup,
// and a voucher with no class selected must be byte-identical to today's behavior.
describe("GST tax engine — Voucher Type Class ledger override", () => {
  let companyId, fyId, partyId, salesId, salesVtId;
  let autoCgstId, autoSgstId, classCgstId, classSgstId;
  const CLASS_NAME = "GST Sales Class";

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Voucher Class Test Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const groupRes = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'Duties & Taxes'`,
      [companyId]
    );
    const dutiesGroupId = groupRes.rows[0].group_id;

    // The ledgers the engine would auto-resolve when no class is involved.
    autoCgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Auto CGST @9%", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "CGST" },
    }));
    autoSgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Auto SGST @9%", group_id: dutiesGroupId,
      statutory_details: { type_of_duty_tax: "GST", gst_tax_type: "SGST/UTGST" },
    }));
    // Distinct ledgers ONLY reachable via the Class mapping — untagged, so the normal
    // ledger_statutory_details lookup would never pick them on its own.
    classCgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Class-Mapped CGST", group_id: dutiesGroupId,
    }));
    classSgstId = ledgerId(await ledgerService.create({
      company_id: companyId, name: "Class-Mapped SGST", group_id: dutiesGroupId,
    }));

    const party = await ledgerService.create({
      company_id: companyId, name: "Voucher Class Customer",
      gstin: "27ABCDE1234F1Z5", state: "Maharashtra", country: "India", registration_type: "Regular",
    });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: "Voucher Class Sales A/c" }));

    await db.insert(gstHsnRates).values({
      companyId, hsnCode: "8472", effectiveFrom: "2026-01-01",
      gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18,
    });

    // Find the predefined "Sales" voucher type seeded for this company, and attach a
    // Class to it via voucher_type_configs.voucher_classes.
    const vtRes = await voucherTypeService.getAll(companyId);
    salesVtId = vtRes.voucherTypes.find((vt) => vt.name === "Sales").vt_id;
    const configRes = await voucherTypeService.updateConfig({
      voucher_type_id: salesVtId,
      voucher_classes: [{
        id: "vc-test-1",
        name: CLASS_NAME,
        use_for_gst_details: "Yes",
        cgst_ledger_id: classCgstId,
        sgst_ledger_id: classSgstId,
        igst_ledger_id: null,
      }],
    });
    expect(configRes.success).toBe(true);
  });

  const createSalesVoucher = (voucher_class) => voucherController.create(null, {
    company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10",
    status: "Regular", reference_number: `INV-CLS-${Date.now()}-${Math.random()}`, place_of_supply: "Maharashtra",
    party_ledger_id: partyId, party_name: "Voucher Class Customer",
    is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1, is_order_voucher: 0, is_post_dated: 0,
    voucher_class: voucher_class || null,
    entries: [
      { ledger_id: partyId, ledger_name: "Voucher Class Customer", type: "Dr", amount: 11800, currency: "INR" },
      { ledger_id: salesId, ledger_name: "Voucher Class Sales A/c", type: "Cr", amount: 11800, currency: "INR" },
    ],
    stock_entries: [
      { item_name: "Gadget", quantity: 10, rate: 1000, hsn_code: "8472" },
    ],
  });

  it("posts to the Class-mapped ledgers when a Class with Use Class for GST Details=Yes is selected", async () => {
    const res = await createSalesVoucher(CLASS_NAME);
    expect(res.success).toBe(true);

    const entriesRes = await db.execute(
      `SELECT ledger_id, amount FROM voucher_entries WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    const entries = entriesRes.rows;

    const classCgst = entries.find((e) => Number(e.ledger_id) === Number(classCgstId));
    const classSgst = entries.find((e) => Number(e.ledger_id) === Number(classSgstId));
    expect(classCgst).toBeTruthy();
    expect(classSgst).toBeTruthy();
    expect(classCgst.amount).toBe(900);
    expect(classSgst.amount).toBe(900);

    // The auto-resolved ledgers were NOT used for this voucher.
    expect(entries.find((e) => Number(e.ledger_id) === Number(autoCgstId))).toBeFalsy();
    expect(entries.find((e) => Number(e.ledger_id) === Number(autoSgstId))).toBeFalsy();

    // The voucher row remembers which Class was used.
    const voucherRow = await db.execute(
      `SELECT voucher_class FROM vouchers WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    expect(voucherRow.rows[0].voucher_class).toBe(CLASS_NAME);
  });

  it("falls back to normal auto-resolution when no Class is selected (regression guard)", async () => {
    const res = await createSalesVoucher(null);
    expect(res.success).toBe(true);

    const entriesRes = await db.execute(
      `SELECT ledger_id, amount FROM voucher_entries WHERE voucher_id = ?`,
      [res.voucher.voucher_id]
    );
    const entries = entriesRes.rows;

    expect(entries.find((e) => Number(e.ledger_id) === Number(autoCgstId))?.amount).toBe(900);
    expect(entries.find((e) => Number(e.ledger_id) === Number(autoSgstId))?.amount).toBe(900);
    expect(entries.find((e) => Number(e.ledger_id) === Number(classCgstId))).toBeFalsy();
    expect(entries.find((e) => Number(e.ledger_id) === Number(classSgstId))).toBeFalsy();
  });
});
