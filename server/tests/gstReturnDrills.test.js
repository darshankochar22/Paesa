// GST return drill chain — Statistics, registration-scoped GSTR-1, the shared
// drill engine (sections/buckets/uncertain/Not-Relevant), Mark as Filed, Annual
// Computation and the reconciliation-uncertain + challan drills. Split from
// gstReports.test.js; shared company fixture in ./gstReportsSeed.

const { seedGstReportsCompany, ledgerId } = require('./gstReportsSeed');
const { db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const reconciliationService = require('../gst/reconciliationService');
const gstr1Service = require('../gst/gstr1Service');
const gstFilingService = require('../gstFiling/gstFilingService');

describe('GST return drill chain', () => {
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
    // June sale to a party with NO GSTIN but WITH GST charged → B2C (b2cs), never B2B
    // and never an error (GST law: recipient without GSTIN = unregistered consumer).
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
    // GST actually charged on it (18% → 90 + 90).
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 90, sgst_amount = 90 WHERE voucher_id = ?`,
      [bad.voucher.voucher_id],
    );
    // And a June sale with a BLANK HSN → the Uncertain (corrections needed) case.
    const badHsn = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-06-06',
      status: 'Regular',
      reference_number: 'INV-BADHSN',
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
    expect(badHsn.success ?? !!badHsn.voucher).toBeTruthy();

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

    // June: the blank-HSN invoice is uncertain, with a concrete exception message.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '062026', {
      bucket: 'uncertain',
    });
    expect(unc.success).toBe(true);
    expect(unc.rows).toHaveLength(1);
    expect(unc.rows[0].exceptions.join(' ')).toMatch(/HSN\/SAC/);

    // June: the taxed sale to the no-GSTIN party is INCLUDED under B2C (b2cs) — not B2B,
    // not uncertain (the user's exact scenario: tax charged, buyer has no GSTIN).
    const b2c = await reconciliationService.getReturnVouchers(companyId, fyId, '062026', {
      bucket: 'included',
      section: 'b2cs',
    });
    expect(b2c.rows.map((r) => r.voucher_id)).toContain(bad.voucher.voucher_id);
    const b2bJune = await reconciliationService.getReturnVouchers(companyId, fyId, '062026', {
      bucket: 'included',
      section: 'b2b',
    });
    expect(b2bJune.rows).toHaveLength(0);

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

    // Voucher counts span the whole FY (April sales+purchase, plus the June B2C sale
    // and the June blank-HSN sale added earlier).
    expect(p.voucher_count.total).toBe(4);
    expect(p.voucher_count.uncertain).toBe(1); // June sale with blank HSN
    expect(p.voucher_count.included).toBe(3); // April sales + April purchase + June B2C

    // Included counts here EXACTLY match a full-FY Statistics call (same classifier).
    const statsApr = await reconciliationService.getReturnStatistics(companyId, fyId, '042026', {
      return_type: 'GSTR3B',
      annual: true,
    });
    expect(statsApr.statistics.totals.total).toBe(4);
    expect(statsApr.statistics.totals.uncertain).toBe(1);

    // Outward taxable liability = April sales (10000 + 1800 tax) + June B2C (1000 + 180).
    expect(p.liability.taxable_and_advances.txval).toBe(11000);
    expect(p.liability.taxable_and_advances.camt).toBe(990);
    expect(p.liability.taxable_and_advances.samt).toBe(990);
    // ITC availed = the April purchase (5000 taxable, 900 tax).
    expect(p.itc.availed.txval).toBe(5000);
    expect(p.itc.availed.camt).toBe(450);
    expect(p.itc.availed.samt).toBe(450);
    // Outward/inward supply summaries.
    expect(p.summary_outward.txval).toBe(11000); // April B2B 10000 + June B2C 1000
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
    // B2C carries the June no-GSTIN sale; exports row stays honestly zero.
    expect(payable.rows.find((r) => r.key === 'payable.b2c').txval).toBe(1000);
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
    // Whole FY = April sales (clean B2B), April purchase (inward), June B2C sale
    // (no-GSTIN buyer, taxed) and June blank-HSN sale (uncertain).
    const res = await reconciliationService.getGSTR1Reconciliation(companyId, fyId);
    expect(res.success).toBe(true);
    const { return_view, voucher_status } = res.payload;

    expect(return_view.b2b.vch_count).toBe(1); // only the clean April sale
    expect(return_view.b2b.taxable_amount).toBe(10000);
    expect(return_view.b2c_small.vch_count).toBe(1); // the June no-GSTIN sale
    expect(voucher_status.unreconciled).toBe(2); // both clean outward docs, no portal import
    expect(voucher_status.uncertain).toBe(1); // the June blank-HSN sale
    expect(voucher_status.reconciled).toBe(0);
  });

  it('getReturnVouchers filters the uncertain list down to a single exception', async () => {
    const all = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR1',
      annual: true,
      bucket: 'uncertain',
    });
    expect(all.rows).toHaveLength(1);
    expect(all.rows[0].exceptions).toContain('HSN/SAC is invalid, mismatched, or not specified');

    const matched = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'GSTR1',
      annual: true,
      bucket: 'uncertain',
      exception: 'HSN/SAC is invalid, mismatched, or not specified',
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
    // (return_type ANNUAL = inward + outward). The June blank-HSN sale shows.
    const annualUnc = await reconciliationService.getReturnVouchers(companyId, fyId, null, {
      return_type: 'ANNUAL',
      annual: true,
      bucket: 'uncertain',
    });
    expect(annualUnc.success).toBe(true);
    expect(annualUnc.rows).toHaveLength(1);
    expect(annualUnc.rows[0].exceptions).toContain(
      'HSN/SAC is invalid, mismatched, or not specified',
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
      'GST Registration Details of the Party are invalid or not specified',
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
      'GST Registration Details of the Party are invalid or not specified',
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

  it('Outward Sales + Credit Note to a registered party with no GST details land in Uncertain', async () => {
    // The user's exact TallyPrime scenario: outward vouchers to a *registered* party that
    // carry no GSTIN, no HSN and no tax ledger must appear under "Transactions with
    // Incomplete/Mismatch in Information" (Uncertain) — not silently Not Relevant/Included.
    // February 2027, isolated from every other month used above.
    const regNoGstin = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'Reg Party No GSTIN',
        state: 'Maharashtra',
        country: 'India',
        registration_type: 'Regular', // registered → GSTIN is mandatory
      }),
    );
    const mkOutward = async (type, ref, day) =>
      voucherController.create(null, {
        company_id: companyId,
        fy_id: fyId,
        voucher_type: type,
        date: `2027-02-${day}`,
        status: 'Regular',
        reference_number: ref,
        place_of_supply: 'Maharashtra',
        party_ledger_id: regNoGstin,
        party_name: 'Reg Party No GSTIN',
        is_accounting_voucher: 1,
        is_invoice: 1,
        is_inventory_voucher: 1,
        entries: [
          { ledger_id: regNoGstin, ledger_name: 'Reg Party No GSTIN', type: 'Dr', amount: 1000 },
          { ledger_id: salesId, ledger_name: 'GST Sales A/c', type: 'Cr', amount: 1000 },
        ],
        // Blank HSN, no rate, no tax ledger → HSN + tax-ledger exceptions.
        stock_entries: [{ item_name: 'Widget', quantity: 1, rate: 1000, hsn_code: '' }],
      });
    const sale = await mkOutward('Sales', 'FEB-SALE', '04');
    const cn = await mkOutward('Credit Note', 'FEB-CN', '05');
    expect(sale.success ?? !!sale.voucher).toBeTruthy();
    expect(cn.success ?? !!cn.voucher).toBeTruthy();

    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '022027', {
      bucket: 'uncertain',
    });
    expect(unc.success).toBe(true);
    // Both the Sales and the Credit Note are surfaced for correction.
    expect(unc.rows).toHaveLength(2);
    expect(unc.rows.map((r) => r.voucher_type).sort()).toEqual(['Credit Note', 'Sales']);
    for (const r of unc.rows) {
      expect(r.exceptions).toContain(
        'GST Registration Details of the Party are invalid or not specified',
      );
      expect(r.exceptions).toContain('HSN/SAC is invalid, mismatched, or not specified');
      expect(r.exceptions).toContain('Applicable Tax Ledger is not selected');
    }

    // They are NOT quietly parked in Not Relevant nor counted as Included.
    const nr = await reconciliationService.getReturnVouchers(companyId, fyId, '022027', {
      bucket: 'not_relevant',
    });
    expect(nr.rows).toHaveLength(0);
    const inc = await reconciliationService.getReturnVouchers(companyId, fyId, '022027', {
      bucket: 'included',
    });
    expect(inc.rows).toHaveLength(0);
  });
});

// Registration snapshot on non-GST-computed voucher types (Receipt/Payment/…):
// the entry screen's explicit registration choice must be stored — NULL rows get
// attributed to the primary registration by every per-registration report.
describe('GST registration snapshot on save', () => {
  let companyId, fyId, partyId, salesId;

  beforeAll(async () => {
    ({ companyId, fyId, partyId, salesId } = await seedGstReportsCompany());
  });

  const regId = async (gstin) => {
    const r = await db.execute(
      `SELECT gst_id FROM gst_registrations WHERE company_id = ? AND gstin = ?`,
      [companyId, gstin],
    );
    return r.rows[0].gst_id;
  };

  it('Payment voucher stores the explicitly selected registration (create + explicit change on update)', async () => {
    // A second registration so "wrong attribution" is even possible.
    await db.execute(
      `INSERT INTO gst_registrations (company_id, state_id, gstin, registration_type, registration_status, is_active)
       VALUES (?, 'Karnataka', '29ABCDE1234F1Z5', 'Regular', 'Active', 1)`,
      [companyId],
    );
    const secondRegId = await regId('29ABCDE1234F1Z5');
    const primaryRegId = await regId('27ABCDE1234F1Z5');

    const bankId = ledgerId(
      await ledgerService.create({ company_id: companyId, name: 'Reg Snapshot Bank' }),
    );
    const created = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Payment',
      date: '2026-11-05',
      status: 'Regular',
      is_accounting_voucher: 1,
      gst_registration_id: secondRegId,
      entries: [
        { ledger_id: partyId, ledger_name: 'GST Customer', type: 'Dr', amount: 500 },
        { ledger_id: bankId, ledger_name: 'Reg Snapshot Bank', type: 'Cr', amount: 500 },
      ],
    });
    expect(created.success).toBe(true);
    const vid = created.voucher.voucher_id;

    const saved = await db.execute(
      `SELECT gst_registration_id FROM vouchers WHERE voucher_id = ?`,
      [vid],
    );
    // Not NULL (old bug: only Sales/Purchase/CN/DN snapshotted a registration).
    expect(Number(saved.rows[0].gst_registration_id)).toBe(Number(secondRegId));

    // Explicit registration change on update must be honored too.
    const voucherController2 = require('../voucher/voucherController');
    const upd = await voucherController2.update(null, {
      voucher_id: vid,
      company_id: companyId,
      gst_registration_id: primaryRegId,
    });
    expect(upd.success).toBe(true);
    const after = await db.execute(
      `SELECT gst_registration_id FROM vouchers WHERE voucher_id = ?`,
      [vid],
    );
    expect(Number(after.rows[0].gst_registration_id)).toBe(Number(primaryRegId));
  });

  it("Track Activities + Statistics keep each registration's vouchers separate (no mixing)", async () => {
    const secondRegId = await regId('29ABCDE1234F1Z5');
    const primaryRegId = await regId('27ABCDE1234F1Z5');

    // A December sale explicitly under the SECOND registration (the entry screen's pick).
    const sale = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-12-08',
      status: 'Regular',
      reference_number: 'INV-REG2',
      place_of_supply: 'Karnataka',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      gst_registration_id: secondRegId,
      entries: [
        { ledger_id: partyId, ledger_name: 'GST Customer', type: 'Dr', amount: 2000 },
        { ledger_id: salesId, ledger_name: 'GST Sales A/c', type: 'Cr', amount: 2000 },
      ],
      stock_entries: [{ item_name: 'RegScoped Widget', quantity: 2, rate: 1000, hsn_code: '8471' }],
    });
    expect(sale.success).toBe(true);
    const saved = await db.execute(
      `SELECT gst_registration_id FROM vouchers WHERE voucher_id = ?`,
      [sale.voucher.voucher_id],
    );
    expect(Number(saved.rows[0].gst_registration_id)).toBe(Number(secondRegId));

    // Track GST Return Activities: December's outward count sits under registration 29
    // ONLY — the primary (27) must not absorb it.
    const act = await reconciliationService.getReturnActivities(companyId, fyId);
    expect(act.success).toBe(true);
    const regs = act.activities.registrations;
    const regOf = (id) => regs.find((r) => Number(r.gst_id) === Number(id));
    expect(regOf(secondRegId)).toBeDefined();
    expect(regOf(primaryRegId)).toBeDefined();

    // Statistics scoped per registration: 29 sees the sale, 27 (primary) does not.
    const statSecond = await reconciliationService.getReturnStatistics(companyId, fyId, '122026', {
      return_type: 'GSTR1',
      gst_registration_id: secondRegId,
    });
    const statPrimary = await reconciliationService.getReturnStatistics(companyId, fyId, '122026', {
      return_type: 'GSTR1',
      gst_registration_id: primaryRegId,
    });
    expect(statSecond.success).toBe(true);
    expect(statPrimary.success).toBe(true);
    expect(statSecond.statistics.totals.total).toBe(1);
    expect(statPrimary.statistics.totals.total).toBe(0);
  });
});
