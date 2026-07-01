// GST Reports engine — verifies that the report runner path
// (definitions/gst-*.js → universalReportService.getStatutoryReport → gstReportService)
// returns REAL book data shaped to the frontend column contracts, that portal-only
// reports return an honest message instead of unrelated data, and that the dedicated
// GSTR-2A reconciliation + Track-Activities handlers compute from books.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const ledgerService = require("../ledger/ledgerService");
const voucherController = require("../voucher/voucherController");
const gstReportService = require("../report/services/gstReportService");
const reconciliationService = require("../gst/reconciliationService");

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;

describe("GST Reports engine", () => {
  let companyId, fyId, partyId, salesId, creditorId, purchaseId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("GST Reports Test Co");
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );
    fyId = fyResult.rows[0].fy_id;

    const party = await ledgerService.create({ company_id: companyId, name: "GST Customer", gstin: "27ABCDE1234F1Z5", state: "Maharashtra", country: "India", registration_type: "Regular" });
    partyId = ledgerId(party);
    salesId = ledgerId(await ledgerService.create({ company_id: companyId, name: "GST Sales A/c" }));
    const creditor = await ledgerService.create({ company_id: companyId, name: "GST Supplier", gstin: "29ABCDE1234F1Z5", state: "Karnataka", country: "India", registration_type: "Regular" });
    creditorId = ledgerId(creditor);
    purchaseId = ledgerId(await ledgerService.create({ company_id: companyId, name: "GST Purchase A/c" }));

    // Sales invoice — taxable 10000, intra-state 18% → CGST 900 + SGST 900.
    const salesRes = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Sales", date: "2026-04-10",
      status: "Regular", reference_number: "INV-1", place_of_supply: "Maharashtra",
      party_ledger_id: partyId, party_name: "GST Customer",
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1, is_order_voucher: 0, is_post_dated: 0,
      entries: [
        { ledger_id: partyId, ledger_name: "GST Customer", type: "Dr", amount: 11800, currency: "INR" },
        { ledger_id: salesId, ledger_name: "GST Sales A/c", type: "Cr", amount: 11800, currency: "INR" },
      ],
      stock_entries: [
        { item_name: "Widget", quantity: 10, rate: 1000, hsn_code: "8471" },
      ],
    });

    // Purchase invoice — taxable 5000, intra-state 18% → CGST 450 + SGST 450.
    const purchaseRes = await voucherController.create(null, {
      company_id: companyId, fy_id: fyId, voucher_type: "Purchase", date: "2026-04-12",
      status: "Regular", reference_number: "PINV-1", place_of_supply: "Karnataka",
      party_ledger_id: creditorId, party_name: "GST Supplier",
      is_accounting_voucher: 1, is_invoice: 1, is_inventory_voucher: 1, is_order_voucher: 0, is_post_dated: 0,
      entries: [
        { ledger_id: purchaseId, ledger_name: "GST Purchase A/c", type: "Dr", amount: 5900, currency: "INR" },
        { ledger_id: creditorId, ledger_name: "GST Supplier", type: "Cr", amount: 5900, currency: "INR" },
      ],
      stock_entries: [
        { item_name: "Component", quantity: 5, rate: 1000, hsn_code: "8473" },
      ],
    });

    // voucher.create recomputes stock-entry GST from HSN-rate masters (zero in a bare
    // test company), so set the tax fields deterministically here — this test verifies
    // the REPORT layer, not the tax engine.
    const salesVid = salesRes.voucher.voucher_id;
    const purchaseVid = purchaseRes.voucher.voucher_id;
    await db.execute(`UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 900, sgst_amount = 900, igst_amount = 0 WHERE voucher_id = ?`, [salesVid]);
    await db.execute(`UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 450, sgst_amount = 450, igst_amount = 0 WHERE voucher_id = ?`, [purchaseVid]);
  });

  const gst = (gstReport) => gstReportService.getGstReport(companyId, fyId, { statutoryType: "gst", gstReport });

  it("GSTR-1 B2B returns shape-A rows with real tax from the sales invoice", async () => {
    const res = await gst("gstr1_b2b");
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const row = res.rows[0];
    expect(Object.keys(row)).toEqual(expect.arrayContaining(["section_invoice", "party_gstin", "taxable_value", "igst", "cgst", "sgst", "status"]));
    expect(row.taxable_value).toBe(10000);
    expect(row.cgst).toBe(900);
    expect(row.sgst).toBe(900);
    expect(row.status).toBe("B2B");
    expect(String(row.party_gstin)).toContain("27ABCDE1234F1Z5");
  });

  it("liability register nets output tax (1800) against ITC (900) = 900 payable", async () => {
    const res = await gst("liability_register");
    expect(res.success).toBe(true);
    const net = res.rows.find((r) => r.particulars === "Net GST payable");
    expect(net).toBeTruthy();
    expect(net.amount).toBe(900);
    expect(net.status).toBe("Payable");
  });

  it("GSTR-3B summary lists outward category row with real taxable value", async () => {
    const res = await gst("gstr3b_summary");
    expect(res.success).toBe(true);
    const outward = res.rows.find((r) => /Outward/.test(r.section_invoice));
    expect(outward.taxable_value).toBe(10000);
  });

  it("ITC ledger accumulates input tax as a running balance (shape C)", async () => {
    const res = await gst("itc_ledger");
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const last = res.rows[res.rows.length - 1];
    expect(Object.keys(last)).toEqual(expect.arrayContaining(["date_particulars", "vch_type", "vch_no", "debit", "credit", "balance"]));
    expect(last.balance).toBe(900);
    expect(last.debit).toBe(900);
  });

  it("rate-wise sales uses shape-D fields with grouped totals", async () => {
    const res = await gst("rate_wise_sales");
    expect(res.success).toBe(true);
    const row = res.rows[0];
    expect(Object.keys(row)).toEqual(expect.arrayContaining(["party_item", "voucher_order_no", "qty_count", "taxable_gross", "tax_discount", "net_amount", "status"]));
    expect(row.taxable_gross).toBe(10000);
    expect(row.tax_discount).toBe(1800);
    expect(row.net_amount).toBe(11800);
  });

  it("portal-dependent reports return an honest message, not unrelated data", async () => {
    const res = await gst("gstr2b_reconciliation");
    expect(res.success).toBe(true);
    expect(res.rows).toEqual([]);
    expect(res.portal_required).toBe(true);
    expect(res.message).toMatch(/portal/i);
  });

  it("GSTR-2A reconciliation buckets the purchase invoice into B2B (books side)", async () => {
    const res = await reconciliationService.getGSTR2AReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    expect(res.payload.return_view.b2b.vch_count).toBeGreaterThanOrEqual(1);
    expect(res.payload.return_view.b2b.taxable_amount).toBe(5000);
    expect(res.payload.voucher_status.unreconciled).toBeGreaterThanOrEqual(1);
  });

  it("GSTR-1 reconciliation totals real stock-line tax into B2B (books side)", async () => {
    const res = await reconciliationService.getGSTR1Reconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.b2b;
    expect(b2b.vch_count).toBe(1);
    expect(b2b.taxable_amount).toBe(10000);
    expect(b2b.cgst).toBe(900);
    expect(b2b.sgst).toBe(900);
    expect(b2b.tax_amount).toBe(1800);
    expect(b2b.invoice_amount).toBe(11800);
    // No GSTR-1 portal import path exists — books documents are honestly Unreconciled.
    expect(b2b.status).toBe("Unreconciled");
    expect(res.payload.voucher_status.unreconciled).toBe(1);
    expect(res.payload.voucher_status.reconciled).toBe(0);
  });

  it("GSTR-2B reconciliation totals real stock-line tax and matches imported portal invoices", async () => {
    // Before import: books-only, everything Unreconciled with real amounts.
    let res = await reconciliationService.getGSTR2BReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    let itc = res.payload.return_view.itc_available_other;
    expect(itc.vch_count).toBe(1);
    expect(itc.taxable_amount).toBe(5000);
    expect(itc.cgst).toBe(450);
    expect(itc.sgst).toBe(450);
    expect(itc.tax_amount).toBe(900);
    expect(itc.invoice_amount).toBe(5900);
    expect(res.payload.voucher_status.unreconciled).toBe(1);

    // Import a 2B statement containing the supplier invoice → it reconciles.
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, "042026", {
      b2b: [{ ctin: "29ABCDE1234F1Z5", inv: [{ inum: "PINV-1", val: 5900 }] }],
    });
    expect(imp.success).toBe(true);

    res = await reconciliationService.getGSTR2BReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    itc = res.payload.return_view.itc_available_other;
    expect(itc.status).toBe("Reconciled");
    expect(res.payload.voucher_status.reconciled).toBe(1);
    expect(res.payload.voucher_status.unreconciled).toBe(0);
  });

  it("IMS inward supplies derives supplier-filed status from imported 2B data", async () => {
    const res = await reconciliationService.getIMSInwardSupplies(companyId, fyId);
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.b2b;
    expect(b2b.vch_count).toBe(1);
    expect(b2b.taxable_amount).toBe(5000);
    expect(b2b.tax_amount).toBe(900);
    // The 2B import from the previous test marks the invoice as supplier-filed.
    expect(res.payload.voucher_status.filed.uploaded).toBe(1);
    expect(res.payload.voucher_status.yet_filed.total).toBe(0);
  });

  it("GSTR-3B payload keeps the 5-slot GSTN itc_avl order and books ITC in All-other-ITC", async () => {
    const gstr3bService = require("../gst/gstr3bService");
    // Deterministic tax lines for the report layer (the engine has no HSN masters here).
    const salesRow = await db.execute(`SELECT voucher_id FROM vouchers WHERE company_id = ? AND voucher_type = 'Sales'`, [companyId]);
    const purchaseRow = await db.execute(`SELECT voucher_id FROM vouchers WHERE company_id = ? AND voucher_type = 'Purchase'`, [companyId]);
    const salesVid = salesRow.rows[0].voucher_id;
    const purchaseVid = purchaseRow.rows[0].voucher_id;
    for (const [vid, base] of [[salesVid, 10000], [purchaseVid, 5000]]) {
      for (const t of ["CGST", "SGST"]) {
        await db.execute(
          `INSERT INTO gst_voucher_tax_lines (voucher_id, hsn_code, assessable_value, tax_type, rate, amount) VALUES (?, ?, ?, ?, 9, ?)`,
          [vid, "8471", base, t, base * 0.09]
        );
      }
    }

    const res = await gstr3bService.generateGSTR3B(companyId, fyId, "042026");
    expect(res.success).toBe(true);
    const p = res.payload;
    expect(p.itc_elg.itc_avl).toHaveLength(5);
    // Outward: sales 10000 taxable, CGST+SGST 900 each.
    expect(p.sup_details.osup_det.txval).toBe(10000);
    expect(p.sup_details.osup_det.camt).toBe(900);
    expect(p.sup_details.osup_det.samt).toBe(900);
    // Inward domestic purchase lands in All other ITC — slot [4], not the old [3].
    expect(p.itc_elg.itc_avl[4].camt).toBe(450);
    expect(p.itc_elg.itc_avl[4].samt).toBe(450);
    expect(p.itc_elg.itc_avl[3]).toEqual({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 }); // ISD slot present and empty
  });

  it("Track GST Return Activities reports real filing status from books", async () => {
    const res = await reconciliationService.getReturnActivities(companyId, fyId);
    expect(res.success).toBe(true);
    const g1 = res.activities.returns.find((r) => r.name === "GSTR-1");
    expect(g1.pending_file).toBe(1);
    const g2a = res.activities.returns.find((r) => r.name === "GSTR-2A");
    expect(g2a.recon_exceptions).toBeGreaterThanOrEqual(1);
  });
});
