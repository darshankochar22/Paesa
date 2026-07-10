// TDS / TCS statutory reports — challan reconciliations and Form 26Q / 27Q /
// 27EQ classification + drills. Split from gstReports.test.js; shared company
// fixture in ./gstReportsSeed (tests create their own TDS/TCS ledgers+vouchers).

const { seedGstReportsCompany, ledgerId } = require('./gstReportsSeed');
const { db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const tdsReportService = require('../tds/tdsReportService');
const tcsReportService = require('../tcs/tcsReportService');

describe('TDS/TCS statutory reports', () => {
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
});
