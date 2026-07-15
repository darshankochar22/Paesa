'use strict';

// Regression for the Credit/Debit-Note DIRECTION fix in GSTR-3B (gstr3bService).
// A sales-return Credit Note to a REGISTERED customer must reduce OUTWARD liability
// (table 3.1a, sign -1) — it must NOT be routed into ITC (table 4 / itc_avl) just
// because the party is registered. (The old code keyed direction on isRegistered.)

const { seedGstReportsCompany } = require('./gstReportsSeed');
const { db } = require('./helpers');
const voucherController = require('../voucher/voucherController');
const gstr3bService = require('../gst/gstr3bService');

describe('GSTR-3B: Credit Note to a registered party is OUTWARD, not ITC', () => {
  let companyId, fyId, partyId, salesId;

  beforeAll(async () => {
    ({ companyId, fyId, partyId, salesId } = await seedGstReportsCompany());
    // Sales-return Credit Note to the registered customer (same state → intra-state),
    // in an isolated month (May 2026) so the assertions see only this document.
    const cn = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-05-10',
      status: 'Regular',
      reference_number: 'CN-1',
      place_of_supply: 'Maharashtra',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      // The engine forces a Credit Note's party entry to Dr, so the balancing sales entry is Cr.
      entries: [
        {
          ledger_id: partyId,
          ledger_name: 'GST Customer',
          type: 'Dr',
          amount: 2360,
          currency: 'INR',
        },
        {
          ledger_id: salesId,
          ledger_name: 'GST Sales A/c',
          type: 'Cr',
          amount: 2360,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 2, rate: 1000, hsn_code: '8471' }],
    });
    if (!cn.voucher) throw new Error('Credit Note create failed: ' + JSON.stringify(cn));
    const vid = cn.voucher.voucher_id;
    // 3B reads gst_voucher_tax_lines first; insert deterministic lines (engine has no masters).
    // Intra-state 18% on 2000 → CGST 180 + SGST 180.
    for (const t of ['CGST', 'SGST']) {
      await db.execute(
        `INSERT INTO gst_voucher_tax_lines (voucher_id, hsn_code, assessable_value, tax_type, rate, amount) VALUES (?, ?, ?, ?, 9, ?)`,
        [vid, '8471', 2000, t, 180],
      );
    }
  });

  it('nets the credit note DOWN in outward supplies (3.1a), not into ITC', async () => {
    const res = await gstr3bService.generateGSTR3B(companyId, fyId, '052026');
    expect(res.success).toBe(true);
    const p = res.payload;
    // Outward taxable supplies reduced by the credit note (sign -1).
    expect(p.sup_details.osup_det.txval).toBe(-2000);
    expect(p.sup_details.osup_det.camt).toBe(-180);
    expect(p.sup_details.osup_det.samt).toBe(-180);
    // It must NOT appear as available ITC (the old registration-based bug).
    expect(p.itc_elg.itc_avl[4]).toEqual({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 });
  });
});
