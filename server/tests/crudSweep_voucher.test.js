// CRUD sweep for the "voucher" transaction module — exercised exactly the way the
// real UI uses it (client/src/pages/transactions/hooks/useVoucherForm.ts builds the
// payload and calls window.api.voucher.create; VoucherView.tsx calls
// window.api.voucher.delete; the controller also exposes update()).
//
// We drive everything through voucherController.create/getAll/getById/update/delete
// (same surface as preload's window.api.voucher.*), using the FRONTEND payload shape:
// every meta field, plus entries carrying { ledger_name, currency:"INR", cost_centres },
// plus bill_references. The point is to catch "ignored field" bugs where the service
// silently drops or overrides what the form submitted.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherController = require("../voucher/voucherController");
const costCentreService = require("../costCentre/costCentreService");

describe("crudSweep voucher", () => {
  let companyId;
  let fyId;
  let cashLedgerId;
  let creditorLedgerId; // a bill-wise party-style ledger
  let costCentreId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Voucher Sweep Co");
    companyId = company.company_id;

    // Resolve the active financial year FK from seeded data.
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    // Resolve seeded ledgers (Cash is always seeded). We need two distinct ledgers
    // so a double-entry (Dr/Cr) balances.
    const ledgersResult = await db.execute(
      `SELECT ledger_id, name FROM ledgers WHERE company_id = ?`,
      [companyId]
    );
    const cash = ledgersResult.rows.find((l) => l.name === "Cash");
    cashLedgerId = cash.ledger_id;
    const other = ledgersResult.rows.find(
      (l) => l.ledger_id !== cashLedgerId
    );
    creditorLedgerId = other.ledger_id;

    // A cost centre so we can verify the entry.cost_centres array persists.
    const ccRes = await costCentreService.create({
      company_id: companyId,
      name: "Sweep Cost Centre",
    });
    expect(ccRes.success).toBe(true);
    costCentreId = ccRes.costCentre.cc_id;
  });

  // The exact object useVoucherForm builds for a Payment voucher (single-entry mode),
  // including empty/default values and the entries array with currency + cost_centres.
  const buildCreatePayload = (overrides = {}) => ({
    company_id: companyId,
    fy_id: fyId,
    voucher_type: "Payment",
    date: "2026-04-20",
    status: "Regular",
    supplier_invoice_no: null,
    supplier_invoice_date: null,
    reference_number: "REF-SWEEP-1",
    reference_date: "2026-04-19",
    place_of_supply: null,
    narration: "Payment to creditor (sweep)",
    party_ledger_id: null,
    party_name: null,
    is_accounting_voucher: 1,
    is_invoice: 0,
    is_inventory_voucher: 0,
    is_order_voucher: 0,
    is_post_dated: 0,
    entries: [
      // account ledger (Cr) — the "single" account line
      {
        ledger_id: cashLedgerId,
        ledger_name: "Cash",
        type: "Cr",
        amount: 5000,
      },
      // particular (Dr) with currency + cost_centres array, exactly as the form sends
      {
        ledger_id: creditorLedgerId,
        ledger_name: "Creditor",
        type: "Dr",
        amount: 5000,
        currency: "INR",
        cost_centres: [{ cost_centre_id: costCentreId, amount: 5000 }],
      },
    ],
    stock_entries: [],
    bill_references: [
      {
        ledger_id: creditorLedgerId,
        bill_name: "BILL-SWEEP-1",
        bill_type: "New Ref",
        amount: 5000,
        credit_period: 30,
        due_date: "2026-05-20",
      },
    ],
    bank_details: undefined,
    cash_denominations: undefined,
    receipt_details: undefined,
    party_details: undefined,
    dispatch_details: undefined,
    credit_note_details: undefined,
    debit_note_details: undefined,
    payroll_entries: undefined,
    ...overrides,
  });

  let createdId;

  it("create persists the voucher and the submitted fields (no ignored fields)", async () => {
    const res = await voucherController.create(null, buildCreatePayload());
    expect(res.success).toBe(true);
    expect(res.voucher).toBeDefined();
    createdId = res.voucher.voucher_id;
    expect(createdId).toBeDefined();

    // Read back via getById (same shape VoucherView consumes).
    const got = await voucherController.getById(null, createdId);
    expect(got.success).toBe(true);
    const v = got.voucher;

    // Top-level meta fields the form sent must have persisted verbatim.
    expect(v.voucher_type).toBe("Payment");
    expect(v.date).toBe("2026-04-20");
    expect(v.reference_number).toBe("REF-SWEEP-1");
    expect(v.reference_date).toBe("2026-04-19");
    expect(v.narration).toBe("Payment to creditor (sweep)");
    expect(v.is_accounting_voucher).toBe(1);
    expect(v.is_cancelled).toBe(0);
    // Auto-numbering: Payment prefix is PMT-.
    expect(String(v.voucher_number)).toMatch(/^PMT-\d{5}$/);

    // Entries persisted with ledger_name + currency the form sent.
    expect(Array.isArray(v.entries)).toBe(true);
    expect(v.entries.length).toBe(2);
    const drEntry = v.entries.find((e) => e.type === "Dr");
    const crEntry = v.entries.find((e) => e.type === "Cr");
    expect(drEntry.amount).toBe(5000);
    expect(crEntry.amount).toBe(5000);
    expect(drEntry.ledger_name).toBe("Creditor");
    expect(drEntry.currency).toBe("INR");

    // cost_centres array (object-in-array field) must persist, keyed to the Dr entry.
    expect(Array.isArray(v.cost_centres)).toBe(true);
    expect(v.cost_centres.length).toBe(1);
    expect(v.cost_centres[0].cost_centre_id).toBe(costCentreId);
    expect(Number(v.cost_centres[0].amount)).toBe(5000);
    expect(v.cost_centres[0].entry_id).toBe(drEntry.entry_id);

    // bill_references array must persist with its sub-fields.
    expect(Array.isArray(v.bill_references)).toBe(true);
    expect(v.bill_references.length).toBe(1);
    expect(v.bill_references[0].bill_name).toBe("BILL-SWEEP-1");
    expect(v.bill_references[0].bill_type).toBe("New Ref");
    expect(Number(v.bill_references[0].amount)).toBe(5000);
    expect(Number(v.bill_references[0].credit_period)).toBe(30);
  });

  it("getAll returns the created voucher with computed Dr/Cr totals", async () => {
    const res = await voucherController.getAll(null, {
      company_id: companyId,
      fy_id: fyId,
    });
    expect(res.success).toBe(true);
    const found = res.vouchers.find((v) => v.voucher_id === createdId);
    expect(found).toBeDefined();
    expect(Number(found.debit_amount)).toBe(5000);
    expect(Number(found.credit_amount)).toBe(5000);
  });

  it("update persists changed meta + replaces entries (and keeps balance)", async () => {
    const updateRes = await voucherController.update(null, {
      voucher_id: createdId,
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Payment",
      date: "2026-04-22",
      reference_number: "REF-SWEEP-UPDATED",
      narration: "Updated narration (sweep)",
      entries: [
        { ledger_id: cashLedgerId, ledger_name: "Cash", type: "Cr", amount: 7500 },
        {
          ledger_id: creditorLedgerId,
          ledger_name: "Creditor",
          type: "Dr",
          amount: 7500,
          currency: "INR",
        },
      ],
    });
    expect(updateRes.success).toBe(true);

    const got = await voucherController.getById(null, createdId);
    expect(got.success).toBe(true);
    const v = got.voucher;
    // Changed meta persisted (catch update handlers that no-op or call delete).
    expect(v.date).toBe("2026-04-22");
    expect(v.reference_number).toBe("REF-SWEEP-UPDATED");
    expect(v.narration).toBe("Updated narration (sweep)");
    expect(v.is_cancelled).toBe(0);
    // Entries replaced with new amounts.
    expect(v.entries.length).toBe(2);
    expect(v.entries.find((e) => e.type === "Dr").amount).toBe(7500);
    expect(v.entries.find((e) => e.type === "Cr").amount).toBe(7500);
  });

  it("update rejects an unbalanced edit", async () => {
    const res = await voucherController.update(null, {
      voucher_id: createdId,
      entries: [
        { ledger_id: cashLedgerId, ledger_name: "Cash", type: "Cr", amount: 7500 },
        { ledger_id: creditorLedgerId, ledger_name: "Creditor", type: "Dr", amount: 1 },
      ],
    });
    expect(res.success).toBe(false);
    expect(res.error).toContain("Debit and Credit amounts must be equal");
  });

  it("getNextNumber increments per voucher type", async () => {
    const res = await voucherController.getNextNumber(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: "Payment",
    });
    expect(res.success).toBe(true);
    // One Payment exists (PMT-00001) → next is 2.
    expect(res.nextNumber).toBe(2);
    expect(res.voucher_number).toBe("PMT-00002");
  });

  it("delete removes the voucher (hard delete, cascade entries)", async () => {
    const delRes = await voucherController.delete(null, createdId);
    expect(delRes.success).toBe(true);

    const got = await voucherController.getById(null, createdId);
    expect(got.success).toBe(false);

    const all = await voucherController.getAll(null, {
      company_id: companyId,
      fy_id: fyId,
    });
    expect(all.vouchers.find((v) => v.voucher_id === createdId)).toBeUndefined();
  });
});
