'use strict';

// Tally-style 2A/2B recon drill: dual books-vs-portal comparison, party summary,
// and the voucher register grouped by match status. Seeds one Purchase (PINV-1,
// GST Supplier 29ABCDE1234F1Z5, taxable 5000 + CGST/SGST 450) and imports a GSTR-2A
// payload that reconciles it and adds one portal-only invoice.

const reconciliationService = require('../gst/reconciliationService');
const { seedGstReportsCompany } = require('./gstReportsSeed');

describe('recon detail drill (2A dual comparison)', () => {
  let companyId, fyId;

  beforeAll(async () => {
    ({ companyId, fyId } = await seedGstReportsCompany());
    // Portal 2A: PINV-1 matches the books purchase; EXTRA-9 is filed by the vendor
    // but absent from books (Available Only on Portal).
    const payload = {
      b2b: [
        {
          ctin: '29ABCDE1234F1Z5',
          inv: [
            {
              inum: 'PINV-1',
              val: 5900,
              itms: [{ itm_det: { txval: 5000, iamt: 0, camt: 450, samt: 450 } }],
            },
            {
              inum: 'EXTRA-9',
              val: 1180,
              itms: [{ itm_det: { txval: 1000, iamt: 0, camt: 90, samt: 90 } }],
            },
          ],
        },
      ],
    };
    const imp = await reconciliationService.importGSTR2A(companyId, fyId, '042026', payload);
    expect(imp.success).toBe(true);
  });

  it('summary: B2B section shows both books and portal totals + counts', async () => {
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2A');
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(b2b).toBeTruthy();
    // Books: the single seeded purchase. Portal: two invoices filed by the vendor.
    expect(b2b.books.count).toBe(1);
    expect(b2b.books.taxable).toBe(5000);
    expect(b2b.books.tax).toBe(900);
    expect(b2b.portal.count).toBe(2);
    expect(b2b.portal.taxable).toBe(6000);
    expect(b2b.status).toBe('Unreconciled'); // the portal-only invoice keeps it open

    const vs = res.payload.voucher_status;
    expect(vs.reconciled).toBe(1);
    expect(vs.only_in_portal).toBe(1);
    expect(vs.only_in_books).toBe(0);
    expect(vs.mismatch).toBe(0);
  });

  it('party summary: one supplier with books-vs-portal rows', async () => {
    const res = await reconciliationService.getReconPartySummary(companyId, fyId, '2A', 'b2b');
    expect(res.success).toBe(true);
    const party = res.payload.parties.find((p) => p.gstin === '29ABCDE1234F1Z5');
    expect(party).toBeTruthy();
    expect(party.party_name).toBe('GST Supplier');
    expect(party.books.count).toBe(1);
    expect(party.portal.count).toBe(2);
    expect(party.status).toBe('Unreconciled');
  });

  it('voucher register: PINV-1 reconciled, EXTRA-9 available only on portal', async () => {
    const res = await reconciliationService.getReconVoucherRegister(
      companyId,
      fyId,
      '2A',
      'b2b',
      '29ABCDE1234F1Z5',
    );
    expect(res.success).toBe(true);
    const g = res.payload.groups;
    expect(g.reconciled).toHaveLength(1);
    expect(g.reconciled[0].book.doc_no).toBe('PINV-1');
    expect(g.reconciled[0].portal.doc_no).toBe('PINV-1');
    expect(g.only_portal).toHaveLength(1);
    expect(g.only_portal[0].portal.doc_no).toBe('EXTRA-9');
    expect(g.only_portal[0].book).toBeNull();
    expect(g.mismatch).toHaveLength(0);
    expect(g.only_books).toHaveLength(0);
  });

  it('books-only when no portal imported: everything reads as one-sided, not crash', async () => {
    const fresh = await seedGstReportsCompany();
    const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2A');
    expect(res.success).toBe(true);
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    expect(b2b.books.count).toBe(1);
    expect(b2b.portal.count).toBe(0);
  });
});
