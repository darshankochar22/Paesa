// GST Reports engine — verifies that the report runner path
// (definitions/gst-*.js → universalReportService.getStatutoryReport → gstReportService)
// returns REAL book data shaped to the frontend column contracts, that portal-only
// reports return an honest message instead of unrelated data, and that the dedicated
// GSTR-2A reconciliation + Track-Activities handlers compute from books.

const { setupTestDB, createTestCompany, db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const gstReportService = require('../report/services/gstReportService');
const reconciliationService = require('../gst/reconciliationService');
const gstr1Service = require('../gst/gstr1Service');
const gstFilingService = require('../gstFiling/gstFilingService');
const tdsReportService = require('../tds/tdsReportService');
const tcsReportService = require('../tcs/tcsReportService');

const ledgerId = (res) => res.ledger?.ledger_id ?? res.ledger_id ?? res.id;

describe('GST Reports engine', () => {
  let companyId, fyId, partyId, salesId, creditorId, purchaseId, noGstCustomerId, noGstSupplierId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Reports Test Co');
    companyId = company.company_id;
    const fyResult = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [companyId],
    );
    fyId = fyResult.rows[0].fy_id;

    // A configured company owns a valid GST registration; its NULL-registration legacy
    // vouchers (the sales/purchase below) attach to it as primary. Without this the shared
    // classifier correctly marks every outward voucher Uncertain (invalid company GSTIN).
    await db.execute(
      `INSERT INTO gst_registrations (company_id, state_id, gstin, registration_type, registration_status, is_active) VALUES (?, ?, ?, 'Regular', 'Active', 1)`,
      [companyId, 'Maharashtra', '27ABCDE1234F1Z5'],
    );

    const party = await ledgerService.create({
      company_id: companyId,
      name: 'GST Customer',
      gstin: '27ABCDE1234F1Z5',
      state: 'Maharashtra',
      country: 'India',
      registration_type: 'Regular',
    });
    partyId = ledgerId(party);
    salesId = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'GST Sales A/c' }),
    );
    const creditor = await ledgerService.create({
      company_id: companyId,
      name: 'GST Supplier',
      gstin: '29ABCDE1234F1Z5',
      state: 'Karnataka',
      country: 'India',
      registration_type: 'Regular',
    });
    creditorId = ledgerId(creditor);
    purchaseId = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'GST Purchase A/c' }),
    );

    // Registered parties whose GSTIN is left blank — the real "corrections needed" case
    // (place-of-supply is no longer flagged, so these drive the uncertain-voucher tests).
    noGstCustomerId = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'No-GSTIN Customer',
        state: 'Maharashtra',
        country: 'India',
        registration_type: 'Regular',
      }),
    );
    noGstSupplierId = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'No-GSTIN Supplier',
        state: 'Karnataka',
        country: 'India',
        registration_type: 'Regular',
      }),
    );

    // Sales invoice — taxable 10000, intra-state 18% → CGST 900 + SGST 900.
    const salesRes = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-04-10',
      status: 'Regular',
      reference_number: 'INV-1',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 11800,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 11800,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 10, rate: 1000, hsn_code: '8471' }],
    });

    // Purchase invoice — taxable 5000, intra-state 18% → CGST 450 + SGST 450.
    const purchaseRes = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-04-12',
      status: 'Regular',
      reference_number: 'PINV-1',
      place_of_supply: 'Karnataka',
      party_ledger_id: creditorId,
      party_name: 'GST Supplier',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: purchaseId,
          ledger_name: 'GST Purchase A/c',
          type: 'Dr',
          amount: 5900,
          currency: 'INR',
        },
        {
          ledger_id: creditorId,
          ledger_name: 'GST Supplier',
          type: 'Cr',
          amount: 5900,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Component', quantity: 5, rate: 1000, hsn_code: '8473' }],
    });

    // voucher.create recomputes stock-entry GST from HSN-rate masters (zero in a bare
    // test company), so set the tax fields deterministically here — this test verifies
    // the REPORT layer, not the tax engine.
    const salesVid = salesRes.voucher.voucher_id;
    const purchaseVid = purchaseRes.voucher.voucher_id;
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 900, sgst_amount = 900, igst_amount = 0 WHERE voucher_id = ?`,
      [salesVid],
    );
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 450, sgst_amount = 450, igst_amount = 0 WHERE voucher_id = ?`,
      [purchaseVid],
    );
  });

  const gst = (gstReport) =>
    gstReportService.getGstReport(companyId, fyId, { statutoryType: 'gst', gstReport });

  it('GSTR-1 B2B returns shape-A rows with real tax from the sales invoice', async () => {
    const res = await gst('gstr1_b2b');
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const row = res.rows[0];
    expect(Object.keys(row)).toEqual(
      expect.arrayContaining([
        'section_invoice',
        'party_gstin',
        'taxable_value',
        'igst',
        'cgst',
        'sgst',
        'status',
      ]),
    );
    expect(row.taxable_value).toBe(10000);
    expect(row.cgst).toBe(900);
    expect(row.sgst).toBe(900);
    expect(row.status).toBe('B2B');
    expect(String(row.party_gstin)).toContain('27ABCDE1234F1Z5');
  });

  it('liability register nets output tax (1800) against ITC (900) = 900 payable', async () => {
    const res = await gst('liability_register');
    expect(res.success).toBe(true);
    const net = res.rows.find((r) => r.particulars === 'Net GST payable');
    expect(net).toBeTruthy();
    expect(net.amount).toBe(900);
    expect(net.status).toBe('Payable');
  });

  it('GSTR-3B summary lists outward category row with real taxable value', async () => {
    const res = await gst('gstr3b_summary');
    expect(res.success).toBe(true);
    const outward = res.rows.find((r) => /Outward/.test(r.section_invoice));
    expect(outward.taxable_value).toBe(10000);
  });

  it('ITC ledger accumulates input tax as a running balance (shape C)', async () => {
    const res = await gst('itc_ledger');
    expect(res.success).toBe(true);
    expect(res.rows.length).toBeGreaterThanOrEqual(1);
    const last = res.rows[res.rows.length - 1];
    expect(Object.keys(last)).toEqual(
      expect.arrayContaining([
        'date_particulars',
        'vch_type',
        'vch_no',
        'debit',
        'credit',
        'balance',
      ]),
    );
    expect(last.balance).toBe(900);
    expect(last.debit).toBe(900);
  });

  it('rate-wise sales uses shape-D fields with grouped totals', async () => {
    const res = await gst('rate_wise_sales');
    expect(res.success).toBe(true);
    const row = res.rows[0];
    expect(Object.keys(row)).toEqual(
      expect.arrayContaining([
        'party_item',
        'voucher_order_no',
        'qty_count',
        'taxable_gross',
        'tax_discount',
        'net_amount',
        'status',
      ]),
    );
    expect(row.taxable_gross).toBe(10000);
    expect(row.tax_discount).toBe(1800);
    expect(row.net_amount).toBe(11800);
  });

  it('reads tax from gst_voucher_tax_lines when stock entries carry no tax (manual-flow save)', async () => {
    // Reproduces a real manual-flow save: an inter-state B2B sale whose tax lives ONLY in
    // gst_voucher_tax_lines while voucher_stock_entries.*_amount stay 0 (voucher.create
    // leaves them 0 without HSN masters). The report must still surface the IGST — this is
    // exactly the case that read from the wrong (zeroed) table before. Isolated in its own
    // company so it doesn't perturb the shared suite's exact-count assertions.
    const co = await createTestCompany('GVTL Only Co');
    const cid = co.company_id;
    const fy = (
      await db.execute(`SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`, [
        cid,
      ])
    ).rows[0].fy_id;
    await db.execute(
      `INSERT INTO gst_registrations (company_id, state_id, gstin, registration_type, registration_status, is_active) VALUES (?, 'Maharashtra', '27ABCDE1234F1Z5', 'Regular', 'Active', 1)`,
      [cid],
    );
    const igstParty = ledgerId(
      await ledgerService.create({
        company_id: cid,
        name: 'IGST Customer',
        gstin: '29ABCDE9999F1Z5',
        state: 'Karnataka',
        country: 'India',
        registration_type: 'Regular',
      }),
    );
    const salesA = ledgerId(await ledgerService.create({ company_id: cid, name: 'Sales A/c' }));
    const res = await voucherController.create(null, {
      company_id: cid,
      fy_id: fy,
      voucher_type: 'Sales',
      date: '2026-04-20',
      status: 'Regular',
      reference_number: 'INV-IGST-1',
      place_of_supply: 'Karnataka',
      party_ledger_id: igstParty,
      party_name: 'IGST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: igstParty,
          ledger_name: 'IGST Customer',
          type: 'Dr',
          amount: 23600,
          currency: 'INR',
        },
        { ledger_id: salesA, ledger_name: 'Sales A/c', type: 'Cr', amount: 23600, currency: 'INR' },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 20, rate: 1000, hsn_code: '8471' }],
    });
    const vid = res.voucher.voucher_id;
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 0, sgst_amount = 0, igst_amount = 0 WHERE voucher_id = ?`,
      [vid],
    );
    await db.execute(
      `INSERT INTO gst_voucher_tax_lines (voucher_id, hsn_code, assessable_value, tax_type, rate, amount, is_inter_state) VALUES (?, '8471', 20000, 'IGST', 18, 3600, 1)`,
      [vid],
    );

    const b2b = await gstReportService.getGstReport(cid, fy, {
      statutoryType: 'gst',
      gstReport: 'gstr1_b2b',
    });
    const igstRow = b2b.rows.find((r) => String(r.party_gstin).includes('29ABCDE9999F1Z5'));
    expect(igstRow).toBeTruthy();
    expect(igstRow.igst).toBe(3600); // sourced from gvtl, not the zeroed stock entry
    expect(igstRow.cgst).toBe(0);
    expect(igstRow.sgst).toBe(0);
    expect(igstRow.taxable_value).toBe(20000);

    // Exclusivity holds across every B2B row: none carries both IGST and CGST/SGST.
    for (const r of b2b.rows) {
      expect(r.igst > 0 && (r.cgst > 0 || r.sgst > 0)).toBe(false);
    }
  });

  it('portal-dependent reports return an honest message, not unrelated data', async () => {
    const res = await gst('gstr2b_reconciliation');
    expect(res.success).toBe(true);
    expect(res.rows).toEqual([]);
    expect(res.portal_required).toBe(true);
    expect(res.message).toMatch(/portal/i);
  });

  it('GSTR-2A reconciliation buckets the purchase invoice into B2B (books side)', async () => {
    const res = await reconciliationService.getGSTR2AReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    expect(res.payload.return_view.b2b.vch_count).toBeGreaterThanOrEqual(1);
    expect(res.payload.return_view.b2b.taxable_amount).toBe(5000);
    expect(res.payload.voucher_status.unreconciled).toBeGreaterThanOrEqual(1);
  });

  it('GSTR-1 reconciliation totals real stock-line tax into B2B (books side)', async () => {
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
    expect(b2b.status).toBe('Unreconciled');
    expect(res.payload.voucher_status.unreconciled).toBe(1);
    expect(res.payload.voucher_status.reconciled).toBe(0);
  });

  it('GSTR-2B reconciliation totals real stock-line tax and matches imported portal invoices', async () => {
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
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, '042026', {
      b2b: [{ ctin: '29ABCDE1234F1Z5', inv: [{ inum: 'PINV-1', val: 5900 }] }],
    });
    expect(imp.success).toBe(true);

    res = await reconciliationService.getGSTR2BReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    itc = res.payload.return_view.itc_available_other;
    expect(itc.status).toBe('Reconciled');
    expect(res.payload.voucher_status.reconciled).toBe(1);
    expect(res.payload.voucher_status.unreconciled).toBe(0);
  });

  it('IMS inward supplies derives supplier-filed status from imported 2B data', async () => {
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

  it('GSTR-3B payload keeps the 5-slot GSTN itc_avl order and books ITC in All-other-ITC', async () => {
    const gstr3bService = require('../gst/gstr3bService');
    // Deterministic tax lines for the report layer (the engine has no HSN masters here).
    const salesRow = await db.execute(
      `SELECT voucher_id FROM vouchers WHERE company_id = ? AND voucher_type = 'Sales'`,
      [companyId],
    );
    const purchaseRow = await db.execute(
      `SELECT voucher_id FROM vouchers WHERE company_id = ? AND voucher_type = 'Purchase'`,
      [companyId],
    );
    const salesVid = salesRow.rows[0].voucher_id;
    const purchaseVid = purchaseRow.rows[0].voucher_id;
    for (const [vid, base] of [
      [salesVid, 10000],
      [purchaseVid, 5000],
    ]) {
      for (const t of ['CGST', 'SGST']) {
        await db.execute(
          `INSERT INTO gst_voucher_tax_lines (voucher_id, hsn_code, assessable_value, tax_type, rate, amount) VALUES (?, ?, ?, ?, 9, ?)`,
          [vid, '8471', base, t, base * 0.09],
        );
      }
    }

    const res = await gstr3bService.generateGSTR3B(companyId, fyId, '042026');
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

  it('GSTR-9C reconciles annual-return turnover/tax/ITC and exposes the turnover gap', async () => {
    const gstr9cService = require('../gst/gstr9cService');
    const res = await gstr9cService.generateGSTR9C(companyId, fyId);
    expect(res.success).toBe(true);
    const p = res.payload;
    // Return-side turnover = the 10000 taxable outward supply.
    expect(p.table5_turnover.return_turnover).toBe(10000);
    // 5Q is internally consistent: audited − return.
    expect(p.table5_turnover.unreconciled).toBe(
      Number((p.table5_turnover.audited_turnover - p.table5_turnover.return_turnover).toFixed(2)),
    );
    // Tax reconciliation is head-wise, books == return in this single-source system.
    const cgstTax = p.table9_tax.find((r) => r.head === 'CGST');
    expect(cgstTax.as_per_books).toBe(900);
    expect(cgstTax.as_per_return).toBe(900);
    expect(cgstTax.difference).toBe(0);
    // ITC reconciliation: purchase gave CGST 450.
    const cgstItc = p.table12_itc.find((r) => r.head === 'CGST');
    expect(cgstItc.as_per_books).toBe(450);
  });

  it('persistent credit ledger: rebuild sets off ITC against liability and persists per head', async () => {
    const gstCreditLedgerService = require('../gst/gstCreditLedgerService');
    const rb = await gstCreditLedgerService.rebuild(companyId);
    expect(rb.success).toBe(true);

    const led = await gstCreditLedgerService.getLedger(companyId);
    expect(led.success).toBe(true);
    // Period 042026, CGST: liability 900, credit 450 → utilise 450, net payable 450, closing 0.
    const cgst = led.rows.find((r) => r.return_period === '042026' && r.head === 'CGST');
    expect(cgst).toBeTruthy();
    expect(cgst.opening).toBe(0);
    expect(cgst.credit).toBe(450);
    expect(cgst.liability).toBe(900);
    expect(cgst.utilized).toBe(450);
    expect(cgst.closing).toBe(0); // full credit consumed, nothing carried forward
  });

  it('Track GST Return Activities reports real filing status from books', async () => {
    const res = await reconciliationService.getReturnActivities(companyId, fyId);
    expect(res.success).toBe(true);
    const g1 = res.activities.returns.find((r) => r.name === 'GSTR-1');
    expect(g1.pending_file).toBe(1);
    const g2a = res.activities.returns.find((r) => r.name === 'GSTR-2A');
    expect(g2a.recon_exceptions).toBeGreaterThanOrEqual(1);
  });

  it('Track GST Return Activities builds a per-registration, per-month matrix from books', async () => {
    // The valid Maharashtra registration is seeded once in beforeAll.
    const res = await reconciliationService.getReturnActivities(companyId, fyId);
    expect(res.success).toBe(true);

    const regs = res.activities.registrations;
    expect(Array.isArray(regs)).toBe(true);
    expect(regs.length).toBeGreaterThanOrEqual(1);

    const reg = regs[0];
    expect(reg.name).toBe('Maharashtra Registration');
    expect(reg.months).toHaveLength(12);
    // Each month carries all four returns.
    expect(reg.months[0].returns.map((r) => r.name)).toEqual([
      'GSTR-1',
      'GSTR-2A',
      'GSTR-2B',
      'GSTR-3B',
    ]);

    // Apr-2026 holds the seeded sales + purchase vouchers.
    const apr = reg.months.find((m) => m.period === '042026');
    expect(apr).toBeTruthy();
    const g1 = apr.returns.find((r) => r.name === 'GSTR-1');
    const g2a = apr.returns.find((r) => r.name === 'GSTR-2A');
    const g3b = apr.returns.find((r) => r.name === 'GSTR-3B');

    // Nothing is filed → Pending to Be Filed = Yes(1) for GSTR-1/3B; 2A is not filable (null).
    expect(g1.pending_file).toBe(1);
    expect(g3b.pending_file).toBe(1);
    expect(g2a.pending_file).toBeNull();
    expect(g2a.pending_upload).toBeNull();

    // Company GSTIN valid + party GSTIN valid + place of supply set → no corrections.
    expect(g1.corrections).toBe(0);

    // A month with no transactions is entirely clear.
    const may = reg.months.find((m) => m.period === '052026');
    expect(may.returns.find((r) => r.name === 'GSTR-1').corrections).toBe(0);
    expect(may.returns.find((r) => r.name === 'GSTR-1').pending_file).toBe(1);
  });

  it('Return Statistics classifies vouchers by type for the drill from Total Vouchers', async () => {
    // Runs after the matrix test, so a valid company registration exists.
    const res = await reconciliationService.getReturnStatistics(companyId, fyId, '042026', {
      return_type: 'GSTR1',
    });
    expect(res.success).toBe(true);
    const { rows, totals } = res.statistics;

    const sales = rows.find((r) => r.voucher_type === 'Sales');
    const purchase = rows.find((r) => r.voucher_type === 'Purchase');

    // Outward sales with valid party GSTIN + place of supply → Included. Until uploaded to
    // the portal an Included voucher is "Action Pending" (offline clone has no upload path),
    // so it counts under included_pending, not included_ok.
    expect(sales.total).toBe(1);
    expect(sales.included_pending).toBe(1);
    expect(sales.included_ok).toBe(0);
    expect(sales.uncertain).toBe(0);
    // Purchase is inward → Not Relevant for GSTR-1.
    expect(purchase.total).toBe(1);
    expect(purchase.not_relevant).toBe(1);

    expect(totals.total).toBe(2);
    expect(totals.included_pending).toBe(1);
    expect(totals.included_ok).toBe(0);
    expect(totals.not_relevant).toBe(1);
  });

  it("GSTR-1 scoped to a registration computes live (not persisted) with that reg's outward supplies", async () => {
    const reg = await db.execute(
      `SELECT gst_id FROM gst_registrations WHERE company_id = ? AND is_active = 1 ORDER BY gst_id ASC LIMIT 1`,
      [companyId],
    );
    const regId = reg.rows[0].gst_id;

    const res = await gstr1Service.generateGSTR1(companyId, fyId, '042026', regId);
    expect(res.success).toBe(true);
    // A registration-scoped computation must NOT persist a snapshot (would corrupt the
    // company-wide gstr1_exports row keyed without a registration).
    expect(res.export_id).toBeNull();

    // The seeded April sales invoice (party "GST Customer", valid GSTIN) is a B2B invoice,
    // picked up for the primary registration via the NULL-gst_registration_id fallback.
    const invoiceCount = (res.payload.b2b || []).reduce((n, p) => n + (p.inv?.length || 0), 0);
    expect(invoiceCount).toBeGreaterThanOrEqual(1);

    // A month with no outward supplies for this registration computes to an empty return.
    const empty = await gstr1Service.generateGSTR1(companyId, fyId, '062026', regId);
    expect(empty.success).toBe(true);
    const juneInvoices = (empty.payload.b2b || []).reduce((n, p) => n + (p.inv?.length || 0), 0);
    expect(juneInvoices).toBe(0);
  });

  it('Return drill engine: sections, buckets, uncertain exceptions and Not-Relevant breakdown', async () => {
    // Seed a June sales invoice to a registered party with NO GSTIN → must land in 'uncertain'.
    const bad = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-06-05',
      status: 'Regular',
      reference_number: 'INV-BAD',
      place_of_supply: 'Maharashtra',
      party_ledger_id: noGstCustomerId,
      party_name: 'No-GSTIN Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: noGstCustomerId,
          ledger_name: 'No-GSTIN Customer',
          type: 'Dr',
          amount: 1180,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 1180,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 1, rate: 1000, hsn_code: '8471' }],
    });
    expect(bad.success ?? !!bad.voucher).toBeTruthy();

    // April: the valid B2B sales invoice lands in section 'b2b' with its real tax sums.
    const b2b = await reconciliationService.getReturnVouchers(companyId, fyId, '042026', {
      bucket: 'included',
      section: 'b2b',
    });
    expect(b2b.success).toBe(true);
    expect(b2b.rows).toHaveLength(1);
    expect(b2b.rows[0].taxable).toBe(10000);
    expect(b2b.rows[0].tax).toBe(1800);
    expect(b2b.rows[0].invoice).toBe(11800);

    // April: Not-Relevant bucket holds the purchase (GSTR-1 → other GST returns).
    const nr = await reconciliationService.getNotRelevantBreakdown(companyId, fyId, '042026', {});
    expect(nr.success).toBe(true);
    expect(nr.breakdown.other_returns.count).toBe(1);

    // June: the bad invoice is uncertain, with a concrete exception message.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '062026', {
      bucket: 'uncertain',
    });
    expect(unc.success).toBe(true);
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].exceptions.join(' ')).toMatch(/Party is registered/);

    // HSN summary aggregates included vouchers' stock lines by HSN code.
    const hsn = await reconciliationService.getReturnVouchers(companyId, fyId, '042026', {
      section: 'hsn',
    });
    expect(hsn.success).toBe(true);
    expect(hsn.view).toBe('hsn');
    expect(hsn.rows).toHaveLength(1);
    expect(hsn.rows[0].hsn).toBe('8471');
    expect(hsn.rows[0].taxable).toBe(10000);

    // Document summary reports the outward voucher-number range.
    const docs = await reconciliationService.getReturnVouchers(companyId, fyId, '042026', {
      section: 'docs',
    });
    expect(docs.success).toBe(true);
    expect(docs.view).toBe('docs');
    expect(docs.rows.find((r) => r.nature === 'Sales')?.count).toBe(1);
  });

  it("Mark as Filed records the return and flips Track Activities 'Pending to Be Filed' to No", async () => {
    // April GSTR-1 starts unfiled.
    let before = await gstFilingService.getFilingInfo(companyId, {
      return_type: 'GSTR1',
      return_period: '042026',
    });
    expect(before.status).toBe('Not Filed');

    const marked = await gstFilingService.markAsFiled(companyId, {
      return_type: 'GSTR1',
      fy_id: fyId,
      return_period: '042026',
      arn: 'AA270426000001X',
    });
    expect(marked.success).toBe(true);
    expect(marked.status).toBe('FILED');

    const after = await gstFilingService.getFilingInfo(companyId, {
      return_type: 'GSTR1',
      return_period: '042026',
    });
    expect(after.status).toBe('Filed');
    expect(after.arn).toBe('AA270426000001X');

    // Track GST Return Activities reads gst_filings → April GSTR-1 now shows filed (0).
    const act = await reconciliationService.getReturnActivities(companyId, fyId);
    const apr = act.activities.registrations[0].months.find((m) => m.period === '042026');
    expect(apr.returns.find((r) => r.name === 'GSTR-1').pending_file).toBe(0);
    // A different period is untouched.
    const may = act.activities.registrations[0].months.find((m) => m.period === '052026');
    expect(may.returns.find((r) => r.name === 'GSTR-1').pending_file).toBe(1);
  });

  it('Annual Computation aggregates the whole FY on the shared classifier, matching Statistics', async () => {
    const ann = await reconciliationService.getAnnualComputation(companyId, fyId, {});
    expect(ann.success).toBe(true);
    const p = ann.payload;

    // Voucher counts span the whole FY (April sales+purchase, plus the June bad sales
    // added earlier). Company GSTIN is valid → the clean April docs are Included.
    expect(p.voucher_count.total).toBe(3);
    expect(p.voucher_count.uncertain).toBe(1); // June sales, missing place of supply
    expect(p.voucher_count.included).toBe(2); // April sales + April purchase

    // Included counts here EXACTLY match a full-FY Statistics call (same classifier).
    const statsApr = await reconciliationService.getReturnStatistics(companyId, fyId, '042026', {
      return_type: 'GSTR3B',
      annual: true,
    });
    expect(statsApr.statistics.totals.total).toBe(3);
    expect(statsApr.statistics.totals.uncertain).toBe(1);

    // Outward taxable liability = the April sales (10000 taxable, 1800 tax).
    expect(p.liability.taxable_and_advances.txval).toBe(10000);
    expect(p.liability.taxable_and_advances.camt).toBe(900);
    expect(p.liability.taxable_and_advances.samt).toBe(900);
    // ITC availed = the April purchase (5000 taxable, 900 tax).
    expect(p.itc.availed.txval).toBe(5000);
    expect(p.itc.availed.camt).toBe(450);
    expect(p.itc.availed.samt).toBe(450);
    // Outward/inward supply summaries.
    expect(p.summary_outward.txval).toBe(10000);
    expect(p.summary_inward.txval).toBe(5000);
    // Header shows All Registrations when unscoped.
    expect(p.gstin).toBe('All Registrations');
  });

  it('Annual drill tree: section → sub-category → monthly → register, all consistent', async () => {
    // Level 1: payable — the April B2B sales (registered party) lands under B2B.
    const payable = await reconciliationService.getAnnualSectionBreakdown(companyId, fyId, {
      path: 'payable',
    });
    expect(payable.success).toBe(true);
    const b2b = payable.rows.find((r) => r.key === 'payable.b2b');
    expect(b2b.txval).toBe(10000);
    expect(b2b.tax).toBe(1800);
    expect(b2b.has_children).toBe(true);
    // B2C and exports rows exist but are honestly zero.
    expect(payable.rows.find((r) => r.key === 'payable.b2c').txval).toBe(0);
    expect(payable.rows.find((r) => r.key === 'payable.exports_pay').txval).toBe(0);

    // Level 2: the CN/DN split — sales land in 'supplies', notes rows are zero.
    const b2bSplit = await reconciliationService.getAnnualSectionBreakdown(companyId, fyId, {
      path: 'payable.b2b',
    });
    expect(b2bSplit.rows.find((r) => r.key === 'payable.b2b.supplies').txval).toBe(10000);
    expect(b2bSplit.rows.find((r) => r.key === 'payable.b2b.cn').txval).toBe(0);

    // ITC: purchases land in All Other ITC.
    const itc = await reconciliationService.getAnnualSectionBreakdown(companyId, fyId, {
      path: 'itc',
    });
    expect(itc.rows.find((r) => r.key === 'itc.all_other_itc').txval).toBe(5000);
    expect(itc.rows.find((r) => r.key === 'itc.impg').txval).toBe(0);

    // Reversal + interest sections render all their rows, honestly zero.
    const rev = await reconciliationService.getAnnualSectionBreakdown(companyId, fyId, {
      path: 'itc_reversal',
    });
    expect(rev.rows).toHaveLength(8);
    expect(rev.rows.every((r) => r.txval === 0 && r.tax === 0)).toBe(true);

    // Monthly: April carries the B2B amount, every other month is zero.
    const monthly = await reconciliationService.getAnnualMonthly(companyId, fyId, {
      category: 'payable.b2b.supplies',
    });
    expect(monthly.view).toBe('monthly');
    expect(monthly.rows).toHaveLength(12);
    const apr = monthly.rows.find((r) => r.period === '042026');
    expect(apr.txval).toBe(10000);
    expect(monthly.rows.filter((r) => r.txval !== 0)).toHaveLength(1);

    // Month breakup (not-payable style): intra/interstate × registered/unregistered.
    const breakup = await reconciliationService.getAnnualMonthly(companyId, fyId, {
      category: 'payable.b2b',
      month: '042026',
    });
    expect(breakup.view).toBe('breakup');
    expect(breakup.rows).toHaveLength(4);
    expect(breakup.rows.reduce((n, r) => n + r.txval, 0)).toBe(10000);

    // Register leaf: annual_category + the clicked month → exactly the April invoice.
    const reg = await reconciliationService.getReturnVouchers(companyId, fyId, '042026', {
      return_type: 'ANNUAL',
      bucket: 'included',
      annual_category: 'payable.b2b',
    });
    expect(reg.rows).toHaveLength(1);
    expect(reg.rows[0].taxable).toBe(10000);
    // Same category in a month with no B2B docs → empty.
    const regJune = await reconciliationService.getReturnVouchers(companyId, fyId, '062026', {
      return_type: 'ANNUAL',
      bucket: 'included',
      annual_category: 'payable.b2b',
    });
    expect(regJune.rows).toHaveLength(0);
  });

  it('GSTR-1 Reconciliation counts uncertain vouchers separately and excludes them from the Return View', async () => {
    // Whole FY = April sales (clean B2B), April purchase (inward), June sales (missing
    // place of supply → uncertain). The bad voucher must NOT inflate B2B/unreconciled.
    const res = await reconciliationService.getGSTR1Reconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    const { return_view, voucher_status } = res.payload;

    expect(return_view.b2b.vch_count).toBe(1); // only the clean April sale
    expect(return_view.b2b.taxable_amount).toBe(10000);
    expect(voucher_status.unreconciled).toBe(1); // clean outward doc, no portal import
    expect(voucher_status.uncertain).toBe(1); // the June bad sale
    expect(voucher_status.reconciled).toBe(0);
  });

  it('getReturnVouchers filters the uncertain list down to a single exception', async () => {
    const all = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR1',
      annual: true,
      bucket: 'uncertain',
    });
    expect(all.rows).toHaveLength(1);
    expect(all.rows[0].exceptions).toContain(
      'Party is registered but its GSTIN/UIN is missing or invalid',
    );

    const matched = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR1',
      annual: true,
      bucket: 'uncertain',
      exception: 'Party is registered but its GSTIN/UIN is missing or invalid',
    });
    expect(matched.rows).toHaveLength(1);

    const unmatched = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR1',
      annual: true,
      bucket: 'uncertain',
      exception: 'GST Registration Details of the Company are invalid or not specified',
    });
    expect(unmatched.rows).toHaveLength(0);
  });

  it('Annual Computation uncertain drill lists the same bad voucher with its exception', async () => {
    // The Annual Computation "Uncertain Transactions" breakdown drills through this call
    // (return_type ANNUAL = inward + outward). The June sale to a no-GSTIN party shows.
    const annualUnc = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'ANNUAL',
      annual: true,
      bucket: 'uncertain',
    });
    expect(annualUnc.success).toBe(true);
    expect(annualUnc.rows).toHaveLength(1);
    expect(annualUnc.rows[0].exceptions).toContain(
      'Party is registered but its GSTIN/UIN is missing or invalid',
    );
  });

  it('GSTR-2A Reconciliation counts uncertain inward vouchers and excludes them from the Return View', async () => {
    // A purchase from a registered supplier with NO GSTIN → uncertain for GSTR-2A (inward).
    const badP = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-07-08',
      status: 'Regular',
      reference_number: 'PINV-BAD',
      place_of_supply: 'Karnataka',
      party_ledger_id: noGstSupplierId,
      party_name: 'No-GSTIN Supplier',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: purchaseId,
          ledger_name: 'GST Purchase A/c',
          type: 'Dr',
          amount: 2000,
          currency: 'INR',
        },
        {
          ledger_id: noGstSupplierId,
          ledger_name: 'No-GSTIN Supplier',
          type: 'Cr',
          amount: 2000,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Component', quantity: 2, rate: 1000, hsn_code: '8473' }],
    });
    expect(badP.success ?? !!badP.voucher).toBeTruthy();

    const res = await reconciliationService.getGSTR2AReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    // The clean April purchase stays in B2B; the bad one is Uncertain, not unreconciled.
    expect(res.payload.return_view.b2b.vch_count).toBe(1);
    expect(res.payload.return_view.b2b.taxable_amount).toBe(5000);
    expect(res.payload.voucher_status.uncertain).toBe(1);

    // Drill: the GSTR-2A uncertain list surfaces the bad purchase with its exception.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR2A',
      annual: true,
      bucket: 'uncertain',
    });
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].voucher_type).toBe('Purchase');
    expect(unc.rows[0].exceptions).toContain(
      'Party is registered but its GSTIN/UIN is missing or invalid',
    );
  });

  it('GSTR-2B Reconciliation counts uncertain inward vouchers and excludes them from the Return View', async () => {
    // The bad July purchase (missing place of supply, seeded in the 2A test above) is
    // Uncertain for GSTR-2B too; the clean April purchase stays in All-other-ITC.
    const res = await reconciliationService.getGSTR2BReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    expect(res.payload.return_view.itc_available_other.vch_count).toBe(1);
    expect(res.payload.voucher_status.uncertain).toBe(1);

    // Drill: the GSTR-2B uncertain list surfaces the bad purchase with its exception.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR2B',
      annual: true,
      bucket: 'uncertain',
    });
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].voucher_type).toBe('Purchase');
    expect(unc.rows[0].exceptions).toContain(
      'Party is registered but its GSTIN/UIN is missing or invalid',
    );
  });

  it('Challan Reconciliation lists only GST tax payments with the real amount from entries', async () => {
    // A Duties & Taxes ledger tagged GST, a bank, and an ordinary expense ledger.
    const cgstLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'CGST Payable' }),
    );
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, type_of_duty_tax, gst_tax_type) VALUES (?, 'GST', 'CGST')`,
      [cgstLedger],
    );
    const bankLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'HDFC Bank' }),
    );
    const rentLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Rent A/c' }),
    );

    // A GST tax payment: Dr CGST Payable 500, Cr Bank 500 → one challan of 500.
    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-08-10',
      status: 'Regular',
      party_ledger_id: bankLedger,
      party_name: 'HDFC Bank',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: cgstLedger,
          ledger_name: 'CGST Payable',
          type: 'Dr',
          amount: 500,
          currency: 'INR',
        },
        {
          ledger_id: bankLedger,
          ledger_name: 'HDFC Bank',
          type: 'Cr',
          amount: 500,
          currency: 'INR',
        },
      ],
    });

    // An ordinary (non-GST) payment that must NOT appear as a challan.
    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-08-11',
      status: 'Regular',
      party_ledger_id: bankLedger,
      party_name: 'HDFC Bank',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: rentLedger,
          ledger_name: 'Rent A/c',
          type: 'Dr',
          amount: 1000,
          currency: 'INR',
        },
        {
          ledger_id: bankLedger,
          ledger_name: 'HDFC Bank',
          type: 'Cr',
          amount: 1000,
          currency: 'INR',
        },
      ],
    });

    const res = await reconciliationService.getChallanReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    expect(res.payload.challans).toHaveLength(1);
    const ch = res.payload.challans[0];
    expect(ch.amount).toBe(500);
    expect(ch.type_of_tax_payment).toBe('GST');
    expect(ch.vch_type).toBe('Payment');
  });

  it('GST Rate Setup buckets each master by its GST rate status', async () => {
    await db.execute(
      `INSERT INTO stock_items (company_id, name, gst_applicable, taxability_type, gst_rate, hsn_sac, is_active)
       VALUES (?, 'RS Taxable Item', 'Applicable', 'Taxable', 18, '9401', 1),
              (?, 'RS Exempt Item', 'Applicable', 'Exempt', 0, '1234', 1),
              (?, 'RS Blank Item', 'Applicable', NULL, 0, NULL, 1),
              (?, 'RS NA Item', 'Not Applicable', NULL, 0, NULL, 1)`,
      [companyId, companyId, companyId, companyId],
    );

    const res = await reconciliationService.getGstRateSetup(companyId, 'stock_item');
    expect(res.success).toBe(true);
    const byName = Object.fromEntries(res.masters.map((m) => [m.name, m]));
    expect(byName['RS Taxable Item'].status).toBe('GST Rate-18%');
    expect(byName['RS Taxable Item'].hsn).toBe('9401');
    expect(byName['RS Exempt Item'].status).toBe('Exempt');
    // An Applicable item with no rate is "Not Provided"; one explicitly Not Applicable is NA.
    // (New items default to Applicable, so Not Applicable is a deliberate choice.)
    expect(byName['RS Blank Item'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RS NA Item'].status).toBe('GST Not Applicable');

    // Ledgers resolve their GST status from ledger_statutory_details (CGST Payable was
    // tagged type_of_duty_tax='GST' in the challan test — its statutory row exists).
    const led = await reconciliationService.getGstRateSetup(companyId, 'ledger');
    expect(led.success).toBe(true);
    expect(led.masters.length).toBeGreaterThan(0);

    // Unknown master type is a clean error, not a throw.
    const bad = await reconciliationService.getGstRateSetup(companyId, 'nonsense');
    expect(bad.success).toBe(false);
  });

  it('GST Rate Setup tree drills Primary → group → ledgers and hides empty groups', async () => {
    // A two-level group tree with one ledger at the leaf, plus an empty top-level group.
    await db.execute(
      `INSERT INTO groups (company_id, name, parent_group_id, is_primary, is_active)
       VALUES (?, 'RT Parent', NULL, 1, 1), (?, 'RT Empty Top', NULL, 1, 1)`,
      [companyId, companyId],
    );
    const parent = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'RT Parent'`,
      [companyId],
    );
    const parentId = parent.rows[0].group_id;
    await db.execute(
      `INSERT INTO groups (company_id, name, parent_group_id, is_active) VALUES (?, 'RT Child', ?, 1)`,
      [companyId, parentId],
    );
    const child = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'RT Child'`,
      [companyId],
    );
    const childId = child.rows[0].group_id;
    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, is_active) VALUES
         (?, ?, 'RT Leaf Ledger', 1),
         (?, ?, 'RT App No Rate', 1),
         (?, ?, 'RT Unconfigured', 1),
         (?, ?, 'RT Explicit NA', 1)`,
      [companyId, childId, companyId, childId, companyId, childId, companyId, childId],
    );
    const led = (name) =>
      db
        .execute(`SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = ?`, [
          companyId,
          name,
        ])
        .then((r) => r.rows[0].ledger_id);
    // Rate specified here → real rate bucket.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability, taxability_type, gst_rate, gst_rate_source, hsn_sac_code)
       VALUES (?, 'Applicable', 'Taxable', 12, 'Specify Details Here', '9403')`,
      [await led('RT Leaf Ledger')],
    );
    // Applicable but rate INHERITED (As per Company/Group) → not provided, despite the
    // placeholder taxability_type='Taxable'.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability, taxability_type, gst_rate, gst_rate_source)
       VALUES (?, 'Applicable', 'Taxable', 0, 'As per Company/Group')`,
      [await led('RT App No Rate')],
    );
    // 'RT Unconfigured' has NO statutory row → GST applies but rate not entered.
    // 'RT Explicit NA' is explicitly marked Not Applicable.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability) VALUES (?, 'Not Applicable')`,
      [await led('RT Explicit NA')],
    );

    // Root (Primary): shows RT Parent (has a ledger descendant), hides RT Empty Top.
    const root = await reconciliationService.getGstRateSetupTree(companyId, null);
    expect(root.success).toBe(true);
    expect(root.ledgers).toHaveLength(0);
    const rootNames = root.groups.map((g) => g.name);
    expect(rootNames).toContain('RT Parent');
    expect(rootNames).not.toContain('RT Empty Top');
    expect(root.groups.every((g) => g.kind === 'group')).toBe(true);

    // Drill into RT Parent → its sub-group RT Child, still no direct ledgers.
    const lvl1 = await reconciliationService.getGstRateSetupTree(companyId, parentId);
    expect(lvl1.success).toBe(true);
    expect(lvl1.group.name).toBe('RT Parent');
    expect(lvl1.groups.map((g) => g.name)).toContain('RT Child');
    expect(lvl1.ledgers).toHaveLength(0);

    // Drill into RT Child → the leaf ledger with its resolved rate status.
    const lvl2 = await reconciliationService.getGstRateSetupTree(companyId, childId);
    expect(lvl2.success).toBe(true);
    const byName = Object.fromEntries(lvl2.ledgers.map((l) => [l.name, l]));
    expect(byName['RT Leaf Ledger'].kind).toBe('ledger');
    expect(byName['RT Leaf Ledger'].status).toBe('GST Rate-12%');
    expect(byName['RT Leaf Ledger'].hsn).toBe('9403');
    // Applicable-but-inherited-rate and unconfigured ledgers are both "not provided";
    // only an explicit Not Applicable ledger falls in that bucket.
    expect(byName['RT App No Rate'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RT Unconfigured'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RT Explicit NA'].status).toBe('GST Not Applicable');
  });

  it('GST Rate Setup stock tree drills Primary → stock group → items, excluding the Primary group', async () => {
    // A Primary stock group (must be excluded) + a real top-level group with a child.
    await db.execute(
      `INSERT INTO stock_groups (company_id, name, parent_group_id, is_primary, is_active)
       VALUES (?, 'ST Primary', NULL, 1, 1), (?, 'ST Parent', NULL, 0, 1)`,
      [companyId, companyId],
    );
    const parent = await db.execute(
      `SELECT sg_id FROM stock_groups WHERE company_id = ? AND name = 'ST Parent'`,
      [companyId],
    );
    const parentId = parent.rows[0].sg_id;
    await db.execute(
      `INSERT INTO stock_groups (company_id, name, parent_group_id, is_primary, is_active) VALUES (?, 'ST Child', ?, 0, 1)`,
      [companyId, parentId],
    );
    const child = await db.execute(
      `SELECT sg_id FROM stock_groups WHERE company_id = ? AND name = 'ST Child'`,
      [companyId],
    );
    const childId = child.rows[0].sg_id;
    // One item directly under Primary (group_id NULL), one inside ST Child.
    await db.execute(
      `INSERT INTO stock_items (company_id, name, group_id, gst_applicable, taxability_type, gst_rate, hsn_sac, is_active) VALUES
         (?, 'ST Root Item', NULL, 'Applicable', 'Taxable', 5, '1905', 1),
         (?, 'ST Child Item', ?, 'Applicable', 'Taxable', 18, '9403', 1)`,
      [companyId, companyId, childId],
    );

    // Root: top-level group ST Parent shows (ST Primary excluded); ST Root Item is a leaf.
    const root = await reconciliationService.getGstRateSetupStockTree(companyId, null);
    expect(root.success).toBe(true);
    const rootGroups = root.groups.map((g) => g.name);
    expect(rootGroups).toContain('ST Parent');
    expect(rootGroups).not.toContain('ST Primary');
    expect(root.groups.every((g) => g.kind === 'stock_group')).toBe(true);
    const rootItem = root.ledgers.find((l) => l.name === 'ST Root Item');
    expect(rootItem).toBeTruthy();
    expect(rootItem.kind).toBe('stock_item');
    expect(rootItem.status).toBe('GST Rate-5%');

    // Drill ST Parent → sub-group ST Child, no direct items.
    const lvl1 = await reconciliationService.getGstRateSetupStockTree(companyId, parentId);
    expect(lvl1.group.name).toBe('ST Parent');
    expect(lvl1.groups.map((g) => g.name)).toContain('ST Child');
    expect(lvl1.ledgers).toHaveLength(0);

    // Drill ST Child → its item.
    const lvl2 = await reconciliationService.getGstRateSetupStockTree(companyId, childId);
    const childItem = lvl2.ledgers.find((l) => l.name === 'ST Child Item');
    expect(childItem).toBeTruthy();
    expect(childItem.status).toBe('GST Rate-18%');
    expect(childItem.hsn).toBe('9403');
  });

  it('Validate Party GSTIN/UIN flags registered parties with missing/malformed GSTIN', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'VP Parties', 1)`,
      [companyId],
    );
    const grp = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'VP Parties'`,
      [companyId],
    );
    const groupId = grp.rows[0].group_id;

    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, state, country, registration_type, gstin, pan, is_active)
       VALUES (?, ?, 'VP Valid Co', 'Maharashtra', 'India', 'Regular', '27ABCDE1234F1Z5', 'ABCDE1234F', 1),
              (?, ?, 'VP Missing Co', 'Chhattisgarh', 'India', 'Regular', NULL, NULL, 1),
              (?, ?, 'VP Bad Co', 'Karnataka', 'India', 'Regular', 'NOTAGSTIN', NULL, 1),
              (?, ?, 'VP Unreg Co', 'Delhi', 'India', 'Unregistered', NULL, NULL, 1)`,
      [companyId, groupId, companyId, groupId, companyId, groupId, companyId, groupId],
    );

    const res = await reconciliationService.validatePartyGstin(companyId, {
      group_name: 'VP Parties',
    });
    expect(res.success).toBe(true);
    const byName = Object.fromEntries(res.parties.map((p) => [p.name, p]));
    expect(byName['VP Valid Co'].valid).toBe(true);
    expect(byName['VP Valid Co'].status).toBe('Valid');
    expect(byName['VP Missing Co'].valid).toBe(false);
    expect(byName['VP Missing Co'].status).toMatch(/not specified/i);
    expect(byName['VP Bad Co'].valid).toBe(false);
    expect(byName['VP Bad Co'].status).toMatch(/invalid/i);
    // An unregistered party without a GSTIN is not an exception.
    expect(byName['VP Unreg Co'].valid).toBe(true);
  });

  it('Validate Party GSTIN/UIN → Update Details saves values as entered (no silent PAN derivation)', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'VP Update', 1)`,
      [companyId],
    );
    const grp = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'VP Update'`,
      [companyId],
    );
    const groupId = grp.rows[0].group_id;

    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, registration_type, is_active)
       VALUES (?, ?, 'VP Fix Me', 'Regular', 1)`,
      [companyId, groupId],
    );
    const led = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'VP Fix Me'`,
      [companyId],
    );
    const ledgerId = led.rows[0].ledger_id;

    // Save the GSTIN without a PAN — PAN must stay blank, never auto-filled from the GSTIN.
    const upd = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      gstin: '22AAACJ1681G1ZZ',
      state: 'Chhattisgarh',
    });
    expect(upd.success).toBe(true);
    expect(upd.ledger.gstin).toBe('22AAACJ1681G1ZZ');
    expect(upd.ledger.state).toBe('Chhattisgarh');
    expect(upd.ledger.pan).toBe(''); // left blank — not derived from the GSTIN

    // Re-validate reflects the saved GSTIN with no PAN.
    const res = await reconciliationService.validatePartyGstin(companyId, {
      group_name: 'VP Update',
    });
    const row = res.parties.find((p) => p.name === 'VP Fix Me');
    expect(row.gstin).toBe('22AAACJ1681G1ZZ');
    expect(row.pan).toBe('');

    // An explicitly entered PAN is persisted as-is.
    const upd2 = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      gstin: '22AAACJ1681G1ZZ',
      pan: 'AAACJ1681G',
    });
    expect(upd2.success).toBe(true);
    expect(upd2.ledger.pan).toBe('AAACJ1681G');

    // A malformed PAN (e.g. "7") is rejected with the PAN-format message.
    const badPan = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      pan: '7',
    });
    expect(badPan.success).toBe(false);
    expect(badPan.error).toMatch(/PAN/i);

    // A malformed GSTIN is rejected without touching the ledger.
    const bad = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      gstin: 'NOTAGSTIN',
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toMatch(/invalid/i);
  });

  it('Create Party Using GSTIN derives State/PAN and creates a party ledger per GSTIN', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'CP Debtors', 1)`,
      [companyId],
    );

    const res = await reconciliationService.createPartiesFromGstin(companyId, {
      group_name: 'CP Debtors',
      gstins: ['22AAACI1681G1ZZ', 'not-a-gstin'],
    });
    expect(res.success).toBe(true);
    const byGstin = Object.fromEntries(res.results.map((r) => [r.gstin, r]));
    expect(byGstin['22AAACI1681G1ZZ'].success).toBe(true);
    expect(byGstin['22AAACI1681G1ZZ'].state).toBe('Chhattisgarh'); // state code 22
    expect(byGstin['NOT-A-GSTIN'].success).toBe(false); // uppercased, malformed

    // The ledger was actually created with State/PAN/registration derived from the GSTIN.
    const led = await db.execute(
      `SELECT name, state, gstin, pan, registration_type FROM ledgers WHERE company_id = ? AND gstin = '22AAACI1681G1ZZ'`,
      [companyId],
    );
    expect(led.rows).toHaveLength(1);
    expect(led.rows[0].state).toBe('Chhattisgarh');
    expect(led.rows[0].pan).toBe('AAACI1681G'); // chars 3-12
    expect(led.rows[0].registration_type).toBe('Regular');
  });

  it('GST Advances - Opening Balance stores, lists and deletes an unadjusted advance', async () => {
    const create = await reconciliationService.createGstOpeningAdvance(companyId, {
      registration_name: 'Maharashtra Registration',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      type_of_advance: 'Receipt',
      place_of_supply: 'Maharashtra',
      reverse_charge: false,
      date: '2026-04-01',
      taxability: 'Taxable',
      gst_rate: 18,
      advance_amount: 11800,
      taxable_amount: 10000,
      cgst: 900,
      sgst: 900,
    });
    expect(create.success).toBe(true);

    const list = await reconciliationService.getGstOpeningAdvances(companyId);
    expect(list.success).toBe(true);
    const adv = list.advances.find(
      (a) => a.party_name === 'GST Customer' && a.type_of_advance === 'Receipt',
    );
    expect(adv).toBeTruthy();
    expect(adv.advance_amount).toBe(11800);
    expect(adv.taxable_amount).toBe(10000);
    expect(adv.cgst).toBe(900);
    expect(adv.sgst).toBe(900);

    const del = await reconciliationService.deleteGstOpeningAdvance(adv.advance_id, companyId);
    expect(del.success).toBe(true);
    const after = await reconciliationService.getGstOpeningAdvances(companyId);
    expect(after.advances.find((a) => a.advance_id === adv.advance_id)).toBeFalsy();
  });

  it('Other Reports: Marked Vouchers register, Advance report and Reverse Charge', async () => {
    // Marked Vouchers = full voucher register; a sale shows the party's Debit amount.
    const mv = await reconciliationService.getMarkedVouchers(companyId, fyId);
    expect(mv.success).toBe(true);
    expect(mv.vouchers.length).toBeGreaterThan(0);
    const sale = mv.vouchers.find((v) => v.voucher_type === 'Sales');
    expect(sale).toBeTruthy();
    expect(sale.debit).toBeGreaterThan(0);

    // Advance report Opening Balance comes from the GST Advances - Opening Balance utility.
    await reconciliationService.createGstOpeningAdvance(companyId, {
      party_name: 'Adv Party',
      type_of_advance: 'Receipt',
      taxability: 'Taxable',
      gst_rate: 18,
      advance_amount: 1180,
      taxable_amount: 1000,
      cgst: 90,
      sgst: 90,
    });
    const rcpt = await reconciliationService.getGstAdvancesReport(companyId, fyId, 'Receipt');
    expect(rcpt.success).toBe(true);
    const row = rcpt.parties.find((p) => p.party_name === 'Adv Party');
    expect(row).toBeTruthy();
    expect(row.opening.taxable).toBe(1000);
    expect(row.opening.tax).toBe(180);
    // A Receipt advance does not appear under Advance Paid.
    const paid = await reconciliationService.getGstAdvancesReport(companyId, fyId, 'Payment');
    expect(paid.parties.find((p) => p.party_name === 'Adv Party')).toBeFalsy();

    // Reverse Charge Supplies is honestly empty (no RCM voucher tracking).
    const rcm = await reconciliationService.getReverseChargeSupplies(companyId, fyId);
    expect(rcm.success).toBe(true);
    expect(rcm.rows).toEqual([]);
  });

  it('TDS Challan Reconciliation lists Payment vouchers hitting a TDS ledger', async () => {
    const tdsLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'TDS Payable' }),
    );
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, type_of_duty_tax) VALUES (?, 'TDS')`,
      [tdsLedger],
    );
    const bank = ledgerId(await ledgerService.create({ company_id: companyId, name: 'TDS Bank' }));

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-07-15',
      status: 'Regular',
      party_ledger_id: bank,
      party_name: 'TDS Bank',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: tdsLedger,
          ledger_name: 'TDS Payable',
          type: 'Dr',
          amount: 300,
          currency: 'INR',
        },
        { ledger_id: bank, ledger_name: 'TDS Bank', type: 'Cr', amount: 300, currency: 'INR' },
      ],
    });

    const res = await tdsReportService.getChallanReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    const ch = res.payload.challans.find((c) => c.amount === 300);
    expect(ch).toBeTruthy();
    expect(ch.vch_no).toBeTruthy();
    // A July payment belongs to E-TDS quarter Q2 (Jul-Sep).
    expect(ch.quarter_from).toBe('2026-07-01');
    expect(ch.quarter_to).toBe('2026-09-30');
  });

  it('Form 26Q classifies TDS-relevant vouchers and sums the TDS challan payment', async () => {
    // A TDS-deductable expense ledger + a Journal booking it against a PAN-less vendor.
    const feeLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Professional Fees' }),
    );
    await db.execute(`UPDATE ledgers SET is_tds_deductable = 1 WHERE ledger_id = ?`, [feeLedger]);
    const vendor = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'F26Q Vendor' }),
    );

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Journal',
      date: '2026-05-10',
      status: 'Regular',
      party_ledger_id: vendor,
      party_name: 'F26Q Vendor',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: feeLedger,
          ledger_name: 'Professional Fees',
          type: 'Dr',
          amount: 10000,
          currency: 'INR',
        },
        {
          ledger_id: vendor,
          ledger_name: 'F26Q Vendor',
          type: 'Cr',
          amount: 10000,
          currency: 'INR',
        },
      ],
    });

    const res = await tdsReportService.getForm26Q(companyId, fyId);
    expect(res.success).toBe(true);
    const vs = res.payload.voucher_status;
    expect(vs.total).toBeGreaterThan(0);
    // The TDS-deductable voucher is relevant; no valid TAN / no deductee PAN → Uncertain.
    expect(vs.uncertain).toBeGreaterThanOrEqual(1);
    expect(res.payload.deduction_details).toHaveLength(6);
    // Payment side picks up the TDS challan from the previous test (TDS Payable, 300).
    expect(res.payload.payment.paid_amount).toBe(300);
  });

  it('Form 27Q classifies by deductee residency and drills breakdown/uncertain/resolution', async () => {
    // Non-resident vendor with PAN → Included (once TAN would be valid it stays included;
    // with no TAN the classifier reports it under tds_applicability — still uncertain).
    const nriVendor = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'F27Q NRI Vendor' }),
    );
    await db.execute(
      `UPDATE ledgers SET deductee_type = 'Non-Resident Indian', pan = 'ABCDE1234F' WHERE ledger_id = ?`,
      [nriVendor],
    );
    const royaltyLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Royalty Paid' }),
    );
    await db.execute(`UPDATE ledgers SET is_tds_deductable = 1 WHERE ledger_id = ?`, [
      royaltyLedger,
    ]);

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Journal',
      date: '2026-06-01',
      status: 'Regular',
      party_ledger_id: nriVendor,
      party_name: 'F27Q NRI Vendor',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: royaltyLedger,
          ledger_name: 'Royalty Paid',
          type: 'Dr',
          amount: 5000,
          currency: 'INR',
        },
        {
          ledger_id: nriVendor,
          ledger_name: 'F27Q NRI Vendor',
          type: 'Cr',
          amount: 5000,
          currency: 'INR',
        },
      ],
    });

    const res = await tdsReportService.getForm27Q(companyId, fyId);
    expect(res.success).toBe(true);
    const vs = res.payload.voucher_status;
    expect(vs.total).toBeGreaterThan(0);
    // The 26Q test's resident/PAN-less vendor voucher must NOT be 27Q-included.
    expect(vs.included).toBe(0);
    expect(vs.uncertain).toBeGreaterThanOrEqual(1);
    // 27Q swaps the 6th deduction bucket for DTAA.
    const labels = res.payload.deduction_details.map((d) => d.label);
    expect(labels).toContain('DTAA Rated Taxable Expenses');

    // Drill: not-relevant breakdown + register agree with the summary count.
    const nr = await tdsReportService.getForm27QDrill(companyId, fyId, { view: 'not_relevant' });
    expect(nr.success).toBe(true);
    expect(nr.payload.total).toBe(vs.not_relevant);
    // Drill: uncertain taxonomy counts sum to the uncertain bucket.
    const un = await tdsReportService.getForm27QDrill(companyId, fyId, { view: 'uncertain' });
    const counted = un.payload.taxonomy
      .flatMap((s) => s.groups)
      .flatMap((g) => g.items)
      .reduce((s, it) => s + (it.count || 0), 0);
    expect(counted).toBe(vs.uncertain);
    // Drill: deductee-type resolution lists offending ledgers (26Q vendor has no type).
    const reso = await tdsReportService.getForm27QDrill(companyId, fyId, {
      view: 'resolution',
      exception: 'deductee_type',
    });
    expect(reso.success).toBe(true);
    expect(reso.payload.mode).toBe('ledgers');
  });

  it('TCS Challan Reconciliation lists Payment vouchers hitting a TCS ledger', async () => {
    const tcsLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'TCS Payable' }),
    );
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, type_of_duty_tax) VALUES (?, 'TCS')`,
      [tcsLedger],
    );
    const bank = ledgerId(await ledgerService.create({ company_id: companyId, name: 'TCS Bank' }));

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-11-20',
      status: 'Regular',
      party_ledger_id: bank,
      party_name: 'TCS Bank',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: tcsLedger,
          ledger_name: 'TCS Payable',
          type: 'Dr',
          amount: 450,
          currency: 'INR',
        },
        { ledger_id: bank, ledger_name: 'TCS Bank', type: 'Cr', amount: 450, currency: 'INR' },
      ],
    });

    const res = await tcsReportService.getChallanReconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    const ch = res.payload.challans.find((c) => c.amount === 450);
    expect(ch).toBeTruthy();
    expect(ch.vch_no).toBeTruthy();
    // A November payment belongs to E-TCS quarter Q3 (Oct-Dec).
    expect(ch.quarter_from).toBe('2026-10-01');
    expect(ch.quarter_to).toBe('2026-12-31');
    // The TDS challan (300) must NOT leak into the TCS report.
    expect(res.payload.challans.find((c) => c.amount === 300)).toBeFalsy();
  });

  it('Form 27EQ classifies TCS-applicable vouchers and drills breakdown/uncertain', async () => {
    // A TCS-applicable sales ledger + a Receipt from a buyer with no collectee type.
    const scrapLedger = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Scrap Sales TCS' }),
    );
    await db.execute(`UPDATE ledgers SET is_tcs_applicable = 1 WHERE ledger_id = ?`, [scrapLedger]);
    const buyer = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'F27EQ Buyer' }),
    );

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Receipt',
      date: '2026-08-05',
      status: 'Regular',
      party_ledger_id: buyer,
      party_name: 'F27EQ Buyer',
      is_accounting_voucher: 1,
      is_invoice: 0,
      is_inventory_voucher: 0,
      is_order_voucher: 0,
      is_post_dated: 0,
      entries: [
        {
          ledger_id: scrapLedger,
          ledger_name: 'Scrap Sales TCS',
          type: 'Cr',
          amount: 8000,
          currency: 'INR',
        },
        { ledger_id: buyer, ledger_name: 'F27EQ Buyer', type: 'Dr', amount: 8000, currency: 'INR' },
      ],
    });

    const res = await tcsReportService.getForm27EQ(companyId, fyId);
    expect(res.success).toBe(true);
    const vs = res.payload.voucher_status;
    expect(vs.total).toBeGreaterThan(0);
    // Buyer has no collectee type → the TCS voucher lands in Uncertain, not Included.
    expect(vs.uncertain).toBeGreaterThanOrEqual(1);
    // 27EQ has the 4 collection rate buckets.
    expect(res.payload.collection_details.map((r) => r.label)).toEqual([
      'Collection at Normal Rate',
      'Collection at Higher Rate',
      'Collection at Zero/Lower Rate',
      'Under Exemption limit',
    ]);
    // Payment side picks up the TCS challan from the previous test (450).
    expect(res.payload.payment.paid_amount).toBe(450);

    // Drills agree with the summary.
    const nr = await tcsReportService.getForm27EQDrill(companyId, fyId, { view: 'not_relevant' });
    expect(nr.payload.total).toBe(vs.not_relevant);
    const un = await tcsReportService.getForm27EQDrill(companyId, fyId, { view: 'uncertain' });
    const counted = un.payload.taxonomy
      .flatMap((s) => s.groups)
      .flatMap((g) => g.items)
      .reduce((s, it) => s + (it.count || 0), 0);
    expect(counted).toBe(vs.uncertain);
    const reso = await tcsReportService.getForm27EQDrill(companyId, fyId, {
      view: 'resolution',
      exception: 'collectee_type',
    });
    expect(reso.payload.mode).toBe('ledgers');
    expect(reso.payload.ledgers.length).toBeGreaterThanOrEqual(1);
  });

  it('GSTR-1: missing HSN → Uncertain (excluded from Return View); purchase Debit Note → Not Relevant', async () => {
    // July, kept separate from every other month so these three vouchers stand alone.
    // (1) Sales to a valid GSTIN party but with a BLANK HSN on its stock line → Uncertain.
    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-07-04',
      status: 'Regular',
      reference_number: 'INV-NOHSN',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 1180,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 1180,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 1, rate: 1000, hsn_code: '' }],
    });
    // (2) Sales to the same party WITH a valid HSN → Included (Action Pending).
    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-07-05',
      status: 'Regular',
      reference_number: 'INV-OK',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 1180,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 1180,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 1, rate: 1000, hsn_code: '8471' }],
    });
    // (3) Debit Note against the supplier (a purchase return) → inward, so Not Relevant
    //     for GSTR-1 and grouped under "Transactions of Other GST Returns".
    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Debit Note',
      date: '2026-07-06',
      status: 'Regular',
      reference_number: 'DN-1',
      party_ledger_id: creditorId,
      party_name: 'GST Supplier',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: creditorId,
          ledger_name: 'GST Supplier',
          type: 'Dr',
          amount: 1180,
          currency: 'INR',
        },
        {
          ledger_id: purchaseId,
          ledger_name: 'GST Purchase A/c',
          type: 'Cr',
          amount: 1180,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Component', quantity: 1, rate: 1000, hsn_code: '8473' }],
    });

    // Statistics: 2 Sales (1 Action-Pending, 1 Uncertain) + 1 Debit Note (Not Relevant).
    const stats = await reconciliationService.getReturnStatistics(companyId, fyId, '072026', {
      return_type: 'GSTR1',
    });
    const sales = stats.statistics.rows.find((r) => r.voucher_type === 'Sales');
    const dn = stats.statistics.rows.find((r) => r.voucher_type === 'Debit Note');
    expect(sales.total).toBe(2);
    expect(sales.included_pending).toBe(1);
    expect(sales.uncertain).toBe(1);
    expect(dn.not_relevant).toBe(1);

    // Uncertain drill surfaces the HSN reason for the blank-HSN sale.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '072026', {
      bucket: 'uncertain',
    });
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].exceptions.join(' ')).toMatch(/HSN\/SAC/);

    // Not-Relevant breakdown: the purchase Debit Note lands under "Transactions of Other
    // GST Returns", NOT under Non-GST (it carries ITC and belongs to GSTR-2/3B).
    const nrDn = await reconciliationService.getReturnVouchers(companyId, fyId, '072026', {
      bucket: 'not_relevant',
      category: 'Transactions of Other GST Returns',
      voucher_type: 'Debit Note',
    });
    expect(nrDn.rows).toHaveLength(1);
    expect(nrDn.rows[0].voucher_type).toBe('Debit Note');

    // Return View (generateGSTR1): only the valid-HSN B2B invoice appears — the blank-HSN
    // sale and the inward Debit Note are excluded, so the section total == Included (1).
    const reg = await db.execute(
      `SELECT gst_id FROM gst_registrations WHERE company_id = ? AND is_active = 1 ORDER BY gst_id ASC LIMIT 1`,
      [companyId],
    );
    const regId = reg.rows[0].gst_id;
    const g1 = await gstr1Service.generateGSTR1(companyId, fyId, '072026', regId);
    const b2bInv = (g1.payload.b2b || []).reduce((n, p) => n + (p.inv?.length || 0), 0);
    expect(b2bInv).toBe(1);
  });

  it('GSTR-1 Uncertain: a taxable item with no rate → "Tax Rate is not specified"', async () => {
    // A Taxable stock-item master with no rate defined; the voucher line references it and
    // carries a valid HSN, so ONLY the tax-rate reason fires (not the HSN reason) — proving
    // the detection is independent. August, isolated from every other month.
    await db.execute(
      `INSERT INTO stock_items (company_id, name, gst_applicable, taxability_type, gst_rate, hsn_sac, is_active)
       VALUES (?, 'No-Rate Taxable Item', 'Applicable', 'Taxable', 0, '8471', 1)`,
      [companyId],
    );
    const si = await db.execute(
      `SELECT item_id FROM stock_items WHERE company_id = ? AND name = 'No-Rate Taxable Item'`,
      [companyId],
    );
    const itemId = si.rows[0].item_id;

    await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-08-04',
      status: 'Regular',
      reference_number: 'INV-NORATE',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 1000,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 1000,
          currency: 'INR',
        },
      ],
      // Valid HSN, but the item is Taxable with gst_rate 0 → "Tax Rate is not specified".
      stock_entries: [
        {
          item_name: 'No-Rate Taxable Item',
          stock_item_id: itemId,
          quantity: 1,
          rate: 1000,
          gst_rate: 0,
          hsn_code: '8471',
        },
      ],
    });

    const stats = await reconciliationService.getReturnStatistics(companyId, fyId, '082026', {
      return_type: 'GSTR1',
    });
    const sales = stats.statistics.rows.find((r) => r.voucher_type === 'Sales');
    expect(sales.uncertain).toBe(1);

    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '082026', {
      bucket: 'uncertain',
    });
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].exceptions).toContain('Tax Rate is not specified');
    expect(unc.rows[0].exceptions.join(' ')).not.toMatch(/HSN\/SAC/);
  });

  it('GSTR-1: report derives tax from rate when a voucher stored no CGST/SGST/IGST amounts', async () => {
    // Real-data condition: a voucher persists the line RATE but not the computed tax amounts,
    // so the stored cgst/sgst/igst are 0. The report must still show tax (amount × rate),
    // else the tax column is blank and Invoice == Taxable. September, isolated.
    const created = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-09-04',
      status: 'Regular',
      reference_number: 'INV-RATEONLY',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 11800,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 11800,
          currency: 'INR',
        },
      ],
      stock_entries: [
        { item_name: 'Widget', quantity: 10, rate: 1000, gst_rate: 18, hsn_code: '8471' },
      ],
    });
    const vid = created.voucher?.voucher_id ?? created.voucher_id;
    // Force the "rate present, amounts absent" condition regardless of how create computed it.
    await db.execute(
      `UPDATE voucher_stock_entries SET cgst_amount = 0, sgst_amount = 0, igst_amount = 0, gst_rate = 18, amount = 10000 WHERE voucher_id = ?`,
      [vid],
    );

    const rows =
      (
        await reconciliationService.getReturnVouchers(companyId, fyId, '092026', {
          bucket: 'included',
          voucher_type: 'Sales',
        })
      ).rows || [];
    const row = rows.find((r) => r.voucher_id === vid);
    expect(row).toBeTruthy();
    expect(row.taxable).toBe(10000);
    // 18% of 10000 = 1800 total tax, and the invoice reflects it (10000 + 1800).
    expect(Math.round(row.cgst + row.sgst + row.igst)).toBe(1800);
    expect(Math.round(row.invoice)).toBe(11800);
  });
});
