// GST Reports engine — verifies that the report runner path
// (definitions/gst-*.js → universalReportService.getStatutoryReport → gstReportService)
// returns REAL book data shaped to the frontend column contracts, that portal-only
// reports return an honest message instead of unrelated data, and that the dedicated
// reconciliation + Track-Activities handlers compute from books.
// Shared company fixture lives in ./gstReportsSeed (suite split: drills →
// gstReturnDrills, utilities → gstUtilitiesReports, TDS/TCS → tdsTcsReports,
// GSTR-1 classification edges → gstr1Classification).

const { seedGstReportsCompany, ledgerId } = require('./gstReportsSeed');
const { createTestCompany, db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const gstReportService = require('../report/services/gstReportService');
const reconciliationService = require('../gst/reconciliationService');

describe('GST Reports engine', () => {
  let companyId, fyId, partyId, salesId, creditorId, purchaseId, noGstCustomerId, noGstSupplierId;

  beforeAll(async () => {
    ({
      companyId,
      fyId,
      partyId,
      salesId,
      creditorId,
      purchaseId,
      noGstCustomerId,
      noGstSupplierId,
    } = await seedGstReportsCompany());
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
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2A');
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(b2b.books.count).toBeGreaterThanOrEqual(1);
    expect(b2b.books.taxable).toBe(5000);
    expect(res.payload.voucher_status.unreconciled).toBeGreaterThanOrEqual(1);
    // Nothing imported → the book document is unverifiable, not a proven discrepancy.
    expect(res.payload.voucher_status.no_portal).toBeGreaterThanOrEqual(1);
    expect(res.payload.voucher_status.only_in_books).toBe(0);
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
    let res = await reconciliationService.getReconSummary(companyId, fyId, '2B');
    expect(res.success).toBe(true);
    let itc = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(itc.books.count).toBe(1);
    expect(itc.books.taxable).toBe(5000);
    expect(itc.books.cgst).toBe(450);
    expect(itc.books.sgst).toBe(450);
    expect(itc.books.tax).toBe(900);
    expect(itc.books.invoice).toBe(5900);
    expect(res.payload.voucher_status.unreconciled).toBe(1);

    // Import a 2B statement containing the supplier invoice → it reconciles.
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, '042026', {
      b2b: [{ ctin: '29ABCDE1234F1Z5', inv: [{ inum: 'PINV-1', val: 5900 }] }],
    });
    expect(imp.success).toBe(true);

    res = await reconciliationService.getReconSummary(companyId, fyId, '2B');
    expect(res.success).toBe(true);
    itc = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(itc.status).toBe('Reconciled');
    expect(res.payload.voucher_status.reconciled).toBe(1);
    expect(res.payload.voucher_status.unreconciled).toBe(0);
    expect(res.payload.last_gst_activity).toMatch(/imported on/);
  });

  it('rejects an import whose return period falls outside the financial year', async () => {
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, '042031', {
      b2b: [{ ctin: '29ABCDE1234F1Z5', inv: [{ inum: 'X-1', val: 100 }] }],
    });
    expect(imp.success).toBe(false);
    expect(imp.error).toMatch(/outside the financial year/i);
  });

  it('normalizes an official-shaped GSTR-2B file (data.docdata, flat igst/cgst keys) on import', async () => {
    const official = {
      data: {
        rtnprd: '052026',
        docdata: {
          b2b: [
            {
              ctin: '29ABCDE1234F1Z5',
              inv: [
                {
                  inum: 'OFF-1',
                  val: 2360,
                  items: [{ txval: 2000, igst: 0, cgst: 180, sgst: 180 }],
                },
              ],
            },
          ],
        },
      },
    };
    // No explicit period → derived from the file's rtnprd.
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, null, official);
    expect(imp.success).toBe(true);
    expect(imp.return_period).toBe('052026');
    expect(imp.documents).toBe(1);

    // The normalized invoice is now visible to the reconciliation as portal data.
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2B');
    const itc = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(itc.portal.count).toBeGreaterThanOrEqual(2); // PINV-1 + OFF-1
    expect(res.payload.voucher_status.only_in_portal).toBeGreaterThanOrEqual(1);
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

  it('Not-Relevant "Transactions of Other GST Returns" drill lists only GST-bearing vouchers', async () => {
    // December, isolated. A Purchase (carries ITC → Other GST Returns) and a plain Payment
    // with no GST ledger (→ Non-GST). The group='other_returns' drill must return ONLY the
    // purchase — not every not-relevant voucher.
    const purchase = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      date: '2026-12-04',
      status: 'Regular',
      reference_number: 'PUR-DEC',
      party_ledger_id: creditorId,
      party_name: 'GST Supplier',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: purchaseId,
          ledger_name: 'GST Purchase A/c',
          type: 'Dr',
          amount: 1000,
          currency: 'INR',
        },
        {
          ledger_id: creditorId,
          ledger_name: 'GST Supplier',
          type: 'Cr',
          amount: 1000,
          currency: 'INR',
        },
      ],
      stock_entries: [
        { item_name: 'Component', quantity: 1, rate: 1000, gst_rate: 18, hsn_code: '8473' },
      ],
    });
    const payment = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-12-05',
      status: 'Regular',
      reference_number: 'PAY-DEC',
      party_ledger_id: creditorId,
      party_name: 'GST Supplier',
      is_accounting_voucher: 1,
      entries: [
        {
          ledger_id: creditorId,
          ledger_name: 'GST Supplier',
          type: 'Dr',
          amount: 500,
          currency: 'INR',
        },
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Cr',
          amount: 500,
          currency: 'INR',
        },
      ],
    });
    const pid = (r) => r.voucher?.voucher_id ?? r.voucher_id;

    const other = await reconciliationService.getReturnVouchers(companyId, fyId, '122026', {
      bucket: 'not_relevant',
      group: 'other_returns',
    });
    const otherIds = (other.rows || []).map((r) => r.voucher_id);
    expect(otherIds).toContain(pid(purchase));
    expect(otherIds).not.toContain(pid(payment));
    expect((other.rows || []).every((r) => r.voucher_type === 'Purchase')).toBe(true);

    const nonGst = await reconciliationService.getReturnVouchers(companyId, fyId, '122026', {
      bucket: 'not_relevant',
      group: 'non_gst',
    });
    const nonIds = (nonGst.rows || []).map((r) => r.voucher_id);
    expect(nonIds).toContain(pid(payment));
    expect(nonIds).not.toContain(pid(purchase));
  });
});
