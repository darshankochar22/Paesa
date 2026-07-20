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

  it('period filter: the selected month narrows both sides; other months are empty', async () => {
    // The seeded purchase is dated 2026-04-10 and the portal statement is 042026.
    const apr = await reconciliationService.getReconSummary(companyId, fyId, '2A', null, '042026');
    expect(apr.success).toBe(true);
    const aprB2b = apr.payload.return_view.find((r) => r.key === 'b2b');
    expect(aprB2b.books.count).toBe(1);
    expect(aprB2b.portal.count).toBe(2);
    expect(apr.payload.return_period).toBe('042026');

    // May has neither a books voucher nor an imported statement.
    const may = await reconciliationService.getReconSummary(companyId, fyId, '2A', null, '052026');
    expect(may.success).toBe(true);
    const mayB2b = may.payload.return_view.find((r) => r.key === 'b2b');
    expect(mayB2b.books.count).toBe(0);
    expect(mayB2b.portal.count).toBe(0);
  });

  it('period list: 12 FY months, only the fetched one marked', async () => {
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2A');
    expect(res.payload.return_period).toBeNull();
    const periods = res.payload.periods;
    expect(periods).toHaveLength(12);
    expect(periods[0].period).toBe('042026');
    expect(periods.filter((p) => p.fetched).map((p) => p.period)).toEqual(['042026']);
  });

  it('period outside the open FY falls back to the whole year rather than returning nothing', async () => {
    const res = await reconciliationService.getReconSummary(companyId, fyId, '2A', null, '011999');
    expect(res.success).toBe(true);
    expect(res.payload.return_period).toBeNull();
    expect(res.payload.return_view.find((r) => r.key === 'b2b').books.count).toBe(1);
  });

  it('a vendor CREDIT note reduces the portal side and lands in the CDN section', async () => {
    const fresh = await seedGstReportsCompany();
    // Portal filed one B2B invoice and one credit note against the same supplier.
    const imp = await reconciliationService.importGSTR2A(fresh.companyId, fresh.fyId, '042026', {
      b2b: [
        {
          ctin: '29ABCDE1234F1Z5',
          inv: [
            {
              inum: 'PINV-1',
              val: 5900,
              itms: [{ itm_det: { txval: 5000, iamt: 0, camt: 450, samt: 450 } }],
            },
          ],
        },
      ],
      cdnr: [
        {
          ctin: '29ABCDE1234F1Z5',
          nt: [
            {
              ntnum: 'CN-5',
              ntty: 'C',
              val: 1180,
              itms: [{ itm_det: { txval: 1000, iamt: 0, camt: 90, samt: 90 } }],
            },
          ],
        },
      ],
    });
    expect(imp.success).toBe(true);

    const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2A');
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    const cdn = res.payload.return_view.find((r) => r.key === 'cdn');

    // The note is NOT in B2B — B2B carries only the invoice.
    expect(b2b.portal.taxable).toBeCloseTo(5000, 2);
    // ...and in the CDN section it REDUCES the portal totals rather than adding to them.
    expect(cdn).toBeTruthy();
    expect(cdn.portal.taxable).toBeCloseTo(-1000, 2);
    expect(cdn.portal.tax).toBeCloseTo(-180, 2);
  });

  it('cess counts toward tax on the portal side, as it always has on the books side', async () => {
    const fresh = await seedGstReportsCompany();
    await reconciliationService.importGSTR2A(fresh.companyId, fresh.fyId, '042026', {
      b2b: [
        {
          ctin: '29ZZZZZ9999Z1Z5',
          inv: [
            {
              inum: 'CESS-1',
              val: 1200,
              itms: [{ itm_det: { txval: 1000, iamt: 100, camt: 0, samt: 0, csamt: 50 } }],
            },
          ],
        },
      ],
    });
    const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2A');
    const b2b = res.payload.return_view.find((r) => r.key === 'b2b');
    // 100 IGST + 50 cess. Excluding cess here (the old behaviour) made every cess
    // invoice read as a books-vs-portal gap even when it reconciled perfectly.
    expect(b2b.portal.tax).toBeCloseTo(150, 2);
  });

  it('carries GSTR-2B ITC eligibility through to the voucher register', async () => {
    const fresh = await seedGstReportsCompany();
    await reconciliationService.importGSTR2B(fresh.companyId, fresh.fyId, '042026', {
      b2b: [
        {
          ctin: '29ABCDE1234F1Z5',
          inv: [
            {
              inum: 'PINV-1',
              val: 5900,
              idt: '10-04-2026',
              itcavl: 'N',
              rsn: 'P', // POS and supplier state are the same — ITC not available
              itms: [{ itm_det: { txval: 5000, iamt: 0, camt: 450, samt: 450 } }],
            },
          ],
        },
      ],
    });
    const res = await reconciliationService.getReconVoucherRegister(
      fresh.companyId,
      fresh.fyId,
      '2B',
      // ITC-ineligible documents live in the ITC-unavailable section, not plain b2b.
      'u_b2b',
      '29ABCDE1234F1Z5',
    );
    expect(res.success).toBe(true);
    const matched = res.payload.groups.reconciled[0];
    expect(matched.portal.itc_available).toBe('N');
    expect(matched.portal.itc_reason).toBe('P');
    expect(matched.portal.doc_date).toBe('10-04-2026');
  });

  it('pairs an abbreviated book number with the portal full format (trailing digits)', async () => {
    const fresh = await seedGstReportsCompany();
    // Books hold "PINV-1"; the portal carries the supplier's own format ending in the
    // same number. The exact key cannot join these — the tail key must.
    await reconciliationService.importGSTR2A(fresh.companyId, fresh.fyId, '042026', {
      b2b: [
        {
          ctin: '29ABCDE1234F1Z5',
          inv: [
            {
              inum: 'NN/25-26/1',
              val: 5900,
              itms: [{ itm_det: { txval: 5000, iamt: 0, camt: 450, samt: 450 } }],
            },
          ],
        },
      ],
    });
    const res = await reconciliationService.getReconVoucherRegister(
      fresh.companyId,
      fresh.fyId,
      '2A',
      'b2b',
      '29ABCDE1234F1Z5',
    );
    const g = res.payload.groups;
    expect(g.reconciled).toHaveLength(1);
    expect(g.reconciled[0].portal.doc_no).toBe('NN/25-26/1');
    // The inferred join is flagged, not silently presented as an exact match.
    expect(g.reconciled[0].portal.matched_on).toBe('trailing-digits');
    expect(g.only_portal).toHaveLength(0);
    expect(g.only_books).toHaveLength(0);
  });

  it('refuses to pair when two portal documents share the same trailing digits', async () => {
    const fresh = await seedGstReportsCompany();
    const itms = [{ itm_det: { txval: 5000, iamt: 0, camt: 450, samt: 450 } }];
    await reconciliationService.importGSTR2A(fresh.companyId, fresh.fyId, '042026', {
      b2b: [
        {
          ctin: '29ABCDE1234F1Z5',
          // Both end in "1" — which of the two is PINV-1? Unknowable, so neither pairs.
          inv: [
            { inum: 'NN/25-26/1', val: 5900, itms },
            { inum: 'SN/1', val: 5900, itms },
          ],
        },
      ],
    });
    const res = await reconciliationService.getReconVoucherRegister(
      fresh.companyId,
      fresh.fyId,
      '2A',
      'b2b',
      '29ABCDE1234F1Z5',
    );
    const g = res.payload.groups;
    expect(g.reconciled).toHaveLength(0);
    expect(g.only_books).toHaveLength(1);
    expect(g.only_portal).toHaveLength(2);
  });

  it('an exact number match still wins and is not flagged as inferred', async () => {
    const res = await reconciliationService.getReconVoucherRegister(
      companyId,
      fyId,
      '2A',
      'b2b',
      '29ABCDE1234F1Z5',
    );
    expect(res.payload.groups.reconciled[0].portal.matched_on).toBe('number');
  });

  describe('GSTR-2B ITC availability', () => {
    const itms = [{ itm_det: { txval: 1000, iamt: 180, camt: 0, samt: 0 } }];
    const rowsOf = (payload) => {
      const byKey = {};
      for (const r of payload.return_view) if (r.key) byKey[r.key] = r;
      return byKey;
    };

    it('routes an ITC-ineligible document to Unavailable, not Available', async () => {
      const fresh = await seedGstReportsCompany();
      await reconciliationService.importGSTR2B(fresh.companyId, fresh.fyId, '042026', {
        b2b: [
          {
            ctin: '29AAAAA1111A1Z5',
            inv: [{ inum: 'OK-1', val: 1180, itcavl: 'Y', itms }],
          },
          {
            ctin: '29BBBBB2222B1Z5',
            // POS and buyer state differ — the portal says this credit cannot be claimed.
            inv: [{ inum: 'NO-1', val: 1180, itcavl: 'N', rsn: 'P', itms }],
          },
        ],
      });
      const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2B');
      const r = rowsOf(res.payload);
      expect(r.b2b.portal.taxable).toBeCloseTo(1000, 2);
      // The ineligible one must NOT inflate claimable ITC.
      expect(r.u_b2b.portal.taxable).toBeCloseTo(1000, 2);
      expect(r.u_b2b.portal.tax).toBeCloseTo(180, 2);
    });

    it('a purchase-return note REDUCES net available ITC (no double negation)', async () => {
      const fresh = await seedGstReportsCompany();
      await reconciliationService.importGSTR2B(fresh.companyId, fresh.fyId, '042026', {
        b2b: [{ ctin: '29AAAAA1111A1Z5', inv: [{ inum: 'OK-1', val: 1180, itcavl: 'Y', itms }] }],
        cdnr: [
          {
            ctin: '29AAAAA1111A1Z5',
            nt: [{ ntnum: 'CN-1', ntty: 'C', val: 590, itcavl: 'Y', itms }],
          },
        ],
      });
      const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2B');
      const r = rowsOf(res.payload);
      // Reversal row is negative...
      expect(r.cdn.portal.taxable).toBeCloseTo(-1000, 2);
      // ...and the subtotal SUBTRACTS it. Signing at both the document and the row level
      // (the old behaviour) turned the reversal back into an addition.
      const net = res.payload.return_view.find((x) => x.label === 'Net ITC Available');
      expect(net.portal.taxable).toBeCloseTo(0, 2);
    });

    it('treats an unknown note direction as a reversal and marks it assumed', async () => {
      const fresh = await seedGstReportsCompany();
      await reconciliationService.importGSTR2B(fresh.companyId, fresh.fyId, '042026', {
        // Real Sandbox 2B notes have arrived with no note-type key at all. Guessing
        // "debit" would overstate claimable ITC, so the safe direction is a reversal.
        cdnr: [{ ctin: '29AAAAA1111A1Z5', nt: [{ ntnum: 'CN-2', val: 590, itms }] }],
      });
      const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2B');
      expect(rowsOf(res.payload).cdn.portal.taxable).toBeCloseTo(-1000, 2);

      const reg = await reconciliationService.getReconVoucherRegister(
        fresh.companyId,
        fresh.fyId,
        '2B',
        'cdn',
        '29AAAAA1111A1Z5',
      );
      expect(reg.payload.groups.only_portal[0].portal.note_type_assumed).toBe(true);
    });

    it('an explicit debit note keeps its positive direction', async () => {
      const fresh = await seedGstReportsCompany();
      await reconciliationService.importGSTR2B(fresh.companyId, fresh.fyId, '042026', {
        cdnr: [
          {
            ctin: '29AAAAA1111A1Z5',
            nt: [{ ntnum: 'DN-1', ntty: 'D', val: 590, itms }],
          },
        ],
      });
      const res = await reconciliationService.getReconSummary(fresh.companyId, fresh.fyId, '2B');
      expect(rowsOf(res.payload).cdn.portal.taxable).toBeCloseTo(1000, 2);
    });
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
