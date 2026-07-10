// GSTR-1 classification edges — month-isolated cases: missing HSN → Uncertain,
// missing rate → "Tax Rate is not specified", booked-ledger tax (never fabricated),
// Optional/Memorandum exclusion. Split from gstReports.test.js; shared company
// fixture in ./gstReportsSeed.

const { seedGstReportsCompany, ledgerId } = require('./gstReportsSeed');
const { db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const reconciliationService = require('../gst/reconciliationService');
const gstr1Service = require('../gst/gstr1Service');

describe('GSTR-1 classification edges', () => {
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
    // (2) Sales to the same party WITH a valid HSN and real GST → Included (Action Pending).
    const okSale = await voucherController.create(null, {
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
    // GST actually charged on (2) — vouchers without any GST are Not Relevant, not Included.
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 90, sgst_amount = 90 WHERE voucher_id = ?`,
      [okSale.voucher.voucher_id],
    );
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

  it('GSTR-1 tax comes from the booked GST ledgers, never fabricated from the item rate', async () => {
    // September, isolated. Create real CGST/SGST duty ledgers so one voucher can book GST.
    await db.execute(
      `INSERT INTO ledgers (company_id, name, is_active) VALUES (?, 'Output CGST', 1), (?, 'Output SGST', 1)`,
      [companyId, companyId],
    );
    const cg = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Output CGST'`,
      [companyId],
    );
    const sg = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Output SGST'`,
      [companyId],
    );
    const cgstId = cg.rows[0].ledger_id;
    const sgstId = sg.rows[0].ledger_id;
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, type_of_duty_tax, gst_tax_type)
       VALUES (?, 'GST', 'CGST'), (?, 'GST', 'SGST/UTGST')`,
      [cgstId, sgstId],
    );

    // (A) Voucher with NO GST ledger → genuinely no tax. Report must show 0 (not amount×rate).
    const noGst = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-09-04',
      status: 'Regular',
      reference_number: 'INV-NOGST',
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
          amount: 10000,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 10000,
          currency: 'INR',
        },
      ],
      // Item rate is 18%, but NO GST ledger was posted — so tax must stay 0.
      stock_entries: [
        { item_name: 'Widget', quantity: 10, rate: 1000, gst_rate: 18, hsn_code: '8471' },
      ],
    });
    const noGstId = noGst.voucher?.voucher_id ?? noGst.voucher_id;

    // (B) Voucher WITH real CGST+SGST postings but zero stored stock-entry tax → report reads
    // the actual booked GST from the ledgers. Post the GST entries directly (mirrors how the
    // real data looks: GST in the accounting entries, not in the stock-entry columns).
    const withGst = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-09-05',
      status: 'Regular',
      reference_number: 'INV-WITHGST',
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
    const withGstId = withGst.voucher?.voucher_id ?? withGst.voucher_id;
    await db.execute(
      `INSERT INTO voucher_entries (voucher_id, ledger_id, ledger_name, type, amount, currency)
       VALUES (?, ?, 'Output CGST', 'Cr', 900, 'INR'), (?, ?, 'Output SGST', 'Cr', 900, 'INR')`,
      [withGstId, cgstId, withGstId, sgstId],
    );
    // Simulate the real-data condition: stored per-line tax amounts absent.
    await db.execute(
      `UPDATE voucher_stock_entries SET cgst_amount = 0, sgst_amount = 0, igst_amount = 0, amount = 10000 WHERE voucher_id IN (?, ?)`,
      [noGstId, withGstId],
    );

    const rows =
      (
        await reconciliationService.getReturnVouchers(companyId, fyId, '092026', {
          bucket: 'included',
          voucher_type: 'Sales',
        })
      ).rows || [];
    const a = rows.find((r) => r.voucher_id === noGstId);
    const b = rows.find((r) => r.voucher_id === withGstId);
    // (A) an 18% item but NO GST ledger posted anywhere (and nothing is fabricated from the
    // item rate) → the tax ledger was never selected, so the sale is a correction (Uncertain),
    // NOT silently Included. This is the case the user flagged from TallyPrime.
    expect(a).toBeUndefined();
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '092026', {
      bucket: 'uncertain',
      voucher_type: 'Sales',
    });
    const aUnc = (unc.rows || []).find((r) => r.voucher_id === noGstId);
    expect(aUnc).toBeDefined();
    expect(aUnc.exceptions).toContain('Applicable Tax Ledger is not selected');
    // (B) real GST booked → the actual 900 + 900 from the ledgers, invoice 11800.
    expect(b.taxable).toBe(10000);
    expect(Math.round(b.cgst)).toBe(900);
    expect(Math.round(b.sgst)).toBe(900);
    expect(Math.round(b.invoice)).toBe(11800);
  });

  it('GSTR-1 excludes Optional and Memorandum vouchers from the return entirely', async () => {
    // October, isolated. One normal sale (counted) + one Optional sale + one Memorandum,
    // both of which are non-posting and must NOT appear in the return at all.
    const mk = async (ref, extra) =>
      voucherController.create(null, {
        company_id: companyId,
        fy_id: fyId,
        voucher_type: 'Sales',
        date: '2026-10-04',
        status: 'Regular',
        reference_number: ref,
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
        stock_entries: [
          { item_name: 'Widget', quantity: 1, rate: 1000, gst_rate: 18, hsn_code: '8471' },
        ],
        ...extra,
      });
    const normal = await mk('OCT-OK', {});
    const opt = await mk('OCT-OPT', {});
    const memo = await mk('OCT-MEMO', {});
    const idOf = (r) => r.voucher?.voucher_id ?? r.voucher_id;
    // GST actually charged on the normal sale — no-GST vouchers are Not Relevant now.
    await db.execute(
      `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 90, sgst_amount = 90 WHERE voucher_id = ?`,
      [idOf(normal)],
    );
    await db.execute(`UPDATE vouchers SET is_optional = 1 WHERE voucher_id = ?`, [idOf(opt)]);
    await db.execute(`UPDATE vouchers SET voucher_type = 'Memorandum' WHERE voucher_id = ?`, [
      idOf(memo),
    ]);

    const stats = await reconciliationService.getReturnStatistics(companyId, fyId, '102026', {
      return_type: 'GSTR1',
    });
    // Only the one normal sale is counted; the Optional + Memorandum are gone from Total.
    expect(stats.statistics.totals.total).toBe(1);
    const sales = stats.statistics.rows.find((r) => r.voucher_type === 'Sales');
    expect(sales.total).toBe(1);
    expect(sales.included_pending).toBe(1);
    expect(stats.statistics.rows.some((r) => r.voucher_type === 'Memorandum')).toBe(false);

    const all = await reconciliationService.getReturnVouchers(companyId, fyId, '102026', {
      bucket: 'all',
    });
    const ids = (all.rows || []).map((r) => r.voucher_id);
    expect(ids).toContain(idOf(normal));
    expect(ids).not.toContain(idOf(opt));
    expect(ids).not.toContain(idOf(memo));
  });

  it('no-GST sale → Not Relevant everywhere; party without (or with junk) GSTIN → B2C, never B2B', async () => {
    // November, isolated. Walk-in consumer parties: one with NO GSTIN, one with a JUNK value.
    const walkIn = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'Walk-in Customer',
        state: 'Maharashtra',
        country: 'India',
        registration_type: 'Unregistered',
      }),
    );
    const junkGstin = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'Junk GSTIN Customer',
        gstin: 'ABC123',
        state: 'Maharashtra',
        country: 'India',
        registration_type: 'Unregistered',
      }),
    );

    const mkSale = async (ref, ledger_id, ledger_name, day) => {
      const r = await voucherController.create(null, {
        company_id: companyId,
        fy_id: fyId,
        voucher_type: 'Sales',
        date: `2026-11-${day}`,
        status: 'Regular',
        reference_number: ref,
        place_of_supply: 'Maharashtra',
        party_ledger_id: ledger_id,
        party_name: ledger_name,
        is_accounting_voucher: 1,
        is_invoice: 1,
        is_inventory_voucher: 1,
        entries: [
          { ledger_id, ledger_name, type: 'Dr', amount: 1180, currency: 'INR' },
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
      expect(r.success).toBe(true);
      return r.voucher.voucher_id;
    };
    const chargeGst = (vid) =>
      db.execute(
        `UPDATE voucher_stock_entries SET gst_rate = 18, cgst_amount = 90, sgst_amount = 90 WHERE voucher_id = ?`,
        [vid],
      );

    // (1) GST charged, valid-GSTIN registered party → B2B.
    const b2bVid = await mkSale('NOV-B2B', partyId, 'GST Customer', '04');
    await chargeGst(b2bVid);
    // (2) GST charged, unregistered party WITHOUT GSTIN → B2C (b2cs), never B2B.
    const b2cVid = await mkSale('NOV-B2C', walkIn, 'Walk-in Customer', '05');
    await chargeGst(b2cVid);
    // (3) GST charged, unregistered party with a JUNK GSTIN value → still B2C.
    const junkVid = await mkSale('NOV-JUNK', junkGstin, 'Junk GSTIN Customer', '06');
    await chargeGst(junkVid);
    // (4) A taxable item but NO GST anywhere (no rate, no tax ledger) → a correction
    // (Uncertain: "Applicable Tax Ledger is not selected"), excluded from the return.
    const noGstVid = await mkSale('NOV-NOGST', partyId, 'GST Customer', '07');

    const sec = async (section) =>
      (
        await reconciliationService.getReturnVouchers(companyId, fyId, '112026', {
          bucket: 'included',
          section,
        })
      ).rows.map((r) => r.voucher_id);
    const b2bIds = await sec('b2b');
    const b2csIds = await sec('b2cs');
    expect(b2bIds).toContain(b2bVid);
    expect(b2bIds).not.toContain(b2cVid);
    expect(b2bIds).not.toContain(junkVid);
    expect(b2bIds).not.toContain(noGstVid);
    expect(b2csIds).toContain(b2cVid);
    expect(b2csIds).toContain(junkVid);

    // No-GST-details sale sits under Uncertain (corrections needed), not under any included
    // section and not silently Not Relevant.
    const unc = await reconciliationService.getReturnVouchers(companyId, fyId, '112026', {
      bucket: 'uncertain',
      voucher_type: 'Sales',
    });
    expect(unc.rows.map((r) => r.voucher_id)).toContain(noGstVid);
    const included = await reconciliationService.getReturnVouchers(companyId, fyId, '112026', {
      bucket: 'included',
    });
    expect(included.rows.map((r) => r.voucher_id)).not.toContain(noGstVid);

    // GSTR-1 payload mirrors the same: B2B has only the valid-GSTIN invoice; the
    // no-GSTIN + junk-GSTIN sales aggregate into B2CS; the no-GST sale is absent.
    const ret = await gstr1Service.generateGSTR1(companyId, fyId, '112026');
    expect(ret.success).toBe(true);
    // inum carries the voucher NUMBER — resolve each created voucher's number.
    const numOf = async (vid) =>
      String(
        (await db.execute(`SELECT voucher_number FROM vouchers WHERE voucher_id = ?`, [vid]))
          .rows[0].voucher_number,
      );
    const b2bInvoices = (ret.payload.b2b || []).flatMap((p) => p.inv.map((i) => String(i.inum)));
    expect(b2bInvoices).toContain(await numOf(b2bVid));
    expect(b2bInvoices).not.toContain(await numOf(b2cVid));
    expect(b2bInvoices).not.toContain(await numOf(junkVid));
    expect(b2bInvoices).not.toContain(await numOf(noGstVid));
    const b2csTaxable = (ret.payload.b2cs || []).reduce((t, r) => t + (r.txval || 0), 0);
    expect(Math.round(b2csTaxable)).toBe(2000); // the two consumer sales, 1000 each
  });

  it('GSTR-1 B2CL threshold is ₹1 lakh: inter-state consumer sale in the ₹1L–₹2.5L band → B2CL, not B2CS', async () => {
    // December, isolated. Notification 12/2024 cut the B2CL threshold from ₹2.5L to ₹1L
    // (w.e.f. 1 Aug 2024). An inter-state (POS Karnataka, company is Maharashtra) sale to an
    // unregistered consumer with invoice value ₹1.77L sits in that band: it MUST be reported
    // invoice-wise under B2CL, not netted into the consolidated B2CS. Under the old ₹2.5L
    // limit this invoice would have (wrongly) fallen into B2CS.
    const walkIn = ledgerId(
      await ledgerService.create({
        company_id: companyId,
        name: 'Dec Walk-in (Inter-state)',
        state: 'Karnataka',
        country: 'India',
        registration_type: 'Unregistered',
      }),
    );

    const sale = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Sales',
      date: '2026-12-04',
      status: 'Regular',
      reference_number: 'DEC-B2CL',
      place_of_supply: 'Karnataka', // inter-state vs Maharashtra home state
      party_ledger_id: walkIn,
      party_name: 'Dec Walk-in (Inter-state)',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        // Party Dr = invoice value = taxable 150000 + IGST 27000 = 177000 (₹1L–₹2.5L band).
        {
          ledger_id: walkIn,
          ledger_name: 'Dec Walk-in (Inter-state)',
          type: 'Dr',
          amount: 177000,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 177000,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 1, rate: 150000, hsn_code: '8471' }],
    });
    // Book real inter-state IGST (18%) on the stock line.
    await db.execute(
      `UPDATE voucher_stock_entries SET amount = 150000, gst_rate = 18, igst_amount = 27000, cgst_amount = 0, sgst_amount = 0 WHERE voucher_id = ?`,
      [sale.voucher.voucher_id],
    );

    const ret = await gstr1Service.generateGSTR1(companyId, fyId, '122026');
    expect(ret.success).toBe(true);
    const num = String(
      (
        await db.execute(`SELECT voucher_number FROM vouchers WHERE voucher_id = ?`, [
          sale.voucher.voucher_id,
        ])
      ).rows[0].voucher_number,
    );
    // Lands invoice-wise under B2CL (POS 29 = Karnataka), NOT in the consolidated B2CS.
    const b2clInvoices = (ret.payload.b2cl || []).flatMap((p) => p.inv.map((i) => String(i.inum)));
    expect(b2clInvoices).toContain(num);
    const b2csTaxable = (ret.payload.b2cs || []).reduce((t, r) => t + (r.txval || 0), 0);
    expect(Math.round(b2csTaxable)).toBe(0);
  });
});
