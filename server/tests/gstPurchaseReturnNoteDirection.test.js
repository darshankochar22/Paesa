'use strict';

// Regression for the note-direction bug in the PAYLOAD BUILDERS (gstr1Service / gstr3bService).
// A Credit Note booked against a party under "Sundry Creditors" is a PURCHASE RETURN (inward).
// It must NOT file into GSTR-1 outward (CDNR) and must NOT reduce GSTR-3B outward liability
// (3.1a) — it belongs on the ITC side. Previously both builders keyed direction on voucher_type
// alone, so every Credit Note filed outward regardless of the party.

const { seedGstReportsCompany } = require('./gstReportsSeed');
const { db } = require('./helpers');
const ledgerService = require('../ledger/ledgerService');
const voucherController = require('../voucher/voucherController');
const gstr1Service = require('../gst/gstr1Service');
const gstr3bService = require('../gst/gstr3bService');

describe('Purchase-return Credit Note (Sundry Creditors) is INWARD, not outward', () => {
  let companyId, fyId, purchaseId, supplierGstin;

  beforeAll(async () => {
    ({ companyId, fyId, purchaseId } = await seedGstReportsCompany());
    supplierGstin = '29ZZZZZ1234F1Z5';

    // A supplier ledger explicitly under "Sundry Creditors" so noteDirection resolves inward.
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'Sundry Creditors', 1)`,
      [companyId],
    );
    const grp = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'Sundry Creditors'`,
      [companyId],
    );
    const supplier = await ledgerService.create({
      company_id: companyId,
      name: 'Return Supplier',
      gstin: supplierGstin,
      state: 'Karnataka',
      country: 'India',
      registration_type: 'Regular',
      group_id: grp.rows[0].group_id,
    });
    const supplierId = supplier.ledger?.ledger_id ?? supplier.ledger_id ?? supplier.id;

    // Purchase-return Credit Note against the creditor, isolated month (June 2026).
    const cn = await voucherController.create(null, {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Credit Note',
      date: '2026-06-10',
      status: 'Regular',
      reference_number: 'PRET-1',
      place_of_supply: 'Karnataka',
      party_ledger_id: supplierId,
      party_name: 'Return Supplier',
      is_accounting_voucher: 1,
      is_invoice: 1,
      is_inventory_voucher: 1,
      entries: [
        {
          ledger_id: supplierId,
          ledger_name: 'Return Supplier',
          type: 'Dr',
          amount: 2360,
          currency: 'INR',
        },
        {
          ledger_id: purchaseId,
          ledger_name: 'GST Purchase A/c',
          type: 'Cr',
          amount: 2360,
          currency: 'INR',
        },
      ],
      stock_entries: [{ item_name: 'Widget', quantity: 2, rate: 1000, hsn_code: '8471' }],
    });
    if (!cn.voucher) throw new Error('Credit Note create failed: ' + JSON.stringify(cn));
    for (const t of ['IGST']) {
      await db.execute(
        `INSERT INTO gst_voucher_tax_lines (voucher_id, hsn_code, assessable_value, tax_type, rate, amount) VALUES (?, ?, ?, ?, 18, ?)`,
        [cn.voucher.voucher_id, '8471', 2000, t, 360],
      );
    }
  });

  it('excludes the purchase-return CN from GSTR-1 CDNR (outward)', async () => {
    const res = await gstr1Service.generateGSTR1(companyId, fyId, '062026');
    expect(res.success).toBe(true);
    const cdnrForSupplier = (res.payload.cdnr || []).find((c) => c.ctin === supplierGstin);
    expect(cdnrForSupplier).toBeUndefined(); // never files outward
  });

  it('does NOT reduce GSTR-3B outward supplies (3.1a)', async () => {
    const res = await gstr3bService.generateGSTR3B(companyId, fyId, '062026');
    expect(res.success).toBe(true);
    // Outward stays zero — the inward note did not net down outward liability.
    expect(res.payload.sup_details.osup_det.txval).toBe(0);
    // Payload now carries the GSTN return header required for filing.
    expect(res.payload.gstin).toBe('27ABCDE1234F1Z5');
    expect(res.payload.ret_period).toBe('062026');
  });
});
