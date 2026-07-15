'use strict';

// Real-world 2B reconciliation: import an ACTUAL GSTN GSTR-2B download JSON (the nested
// data.docdata shape with items/igst-cgst-sgst flat keys the portal returns — NOT the app's
// internal normalized shape) via the same importGSTR2B the "Load from file" button uses, with
// the return period DERIVED FROM THE FILE (return_period: null). Proves a taxpayer can download
// their 2B from the GST portal and reconcile it against booked purchases with no GSP/OTP.
//
// Seeded books (gstReportsSeed): Purchase PINV-1, supplier 29ABCDE1234F1Z5, taxable 5000 +
// CGST 450 + SGST 450, period 042026.

const reconciliationService = require('../gst/reconciliationService');
const { seedGstReportsCompany } = require('./gstReportsSeed');

describe('GSTR-2B reconciliation from a real portal-downloaded JSON', () => {
  let companyId, fyId;

  // The real GSTN 2B envelope: chksum + data.{gstin,rtnprd,docdata.{b2b,cdnr}}, items carry
  // flat igst/cgst/sgst keys. PINV-1 matches the booked purchase; EXTRA-9 is vendor-filed but
  // absent from books (→ "Available only on portal").
  const portalJson = {
    chksum: 'TEST',
    data: {
      gstin: '27ABCDE1234F1Z5',
      rtnprd: '042026',
      docdata: {
        b2b: [
          {
            ctin: '29ABCDE1234F1Z5',
            trdnm: 'GST Supplier',
            supprd: '042026',
            inv: [
              {
                inum: 'PINV-1',
                dt: '12-04-2026',
                val: 5900,
                items: [{ num: 1, txval: 5000, rt: 18, igst: 0, cgst: 450, sgst: 450, cess: 0 }],
              },
              {
                inum: 'EXTRA-9',
                dt: '20-04-2026',
                val: 1180,
                items: [{ num: 1, txval: 1000, rt: 18, igst: 0, cgst: 90, sgst: 90, cess: 0 }],
              },
            ],
          },
        ],
        cdnr: [],
      },
    },
  };

  beforeAll(async () => {
    ({ companyId, fyId } = await seedGstReportsCompany());
    // return_period: null → the server MUST derive 042026 from data.rtnprd in the file.
    const imp = await reconciliationService.importGSTR2B(companyId, fyId, null, portalJson);
    expect(imp.success).toBe(true);
    expect(imp.return_period).toBe('042026'); // derived from the file, not passed in
    expect(imp.documents).toBe(2); // PINV-1 + EXTRA-9
  });

  it('reconciles the booked purchase against the portal invoice', async () => {
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2B');
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(b2b).toBeTruthy();
    // Books: the single seeded purchase (5000). Portal: two invoices (5000 + 1000 = 6000).
    expect(b2b.books.count).toBe(1);
    expect(b2b.books.taxable).toBe(5000);
    expect(b2b.portal.count).toBe(2);
    expect(b2b.portal.taxable).toBe(6000);
  });

  it('marks PINV-1 reconciled and flags the portal-only invoice', async () => {
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2B');
    const vs = res.payload.voucher_status;
    expect(vs.reconciled).toBe(1); // PINV-1 matched book↔portal
  });
});
