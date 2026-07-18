'use strict';

// GSTR-1 Table 13 (Documents Issued). The expected shapes here are taken from a real
// portal-accepted TallyPrime export:
//   doc_issue: { doc_det: [ { doc_num, docs: [ { num, from, to, totnum, cancel, net_issue } ] } ] }

const { buildDocIssue } = require('../gst/docIssue');

const sale = (voucher_number, extra = {}) => ({
  voucher_number,
  voucher_type: 'Sales',
  is_cancelled: 0,
  party_group: 'Sundry Debtors',
  ...extra,
});

describe('docIssue.buildDocIssue', () => {
  it('groups each voucher-number series under nature-of-document 1 (reference shape)', () => {
    const out = buildDocIssue([sale('1'), sale('LE/24-25/01'), sale('LE/24-25/02')]);
    expect(out).toEqual({
      doc_det: [
        {
          doc_num: 1,
          docs: [
            { num: 1, from: '1', to: '1', totnum: 1, cancel: 0, net_issue: 1 },
            { num: 2, from: 'LE/24-25/01', to: 'LE/24-25/02', totnum: 2, cancel: 0, net_issue: 2 },
          ],
        },
      ],
    });
  });

  it('orders from/to by the numeric tail, not as strings', () => {
    // A plain string sort would report from "LE/113" to "LE/9".
    const out = buildDocIssue([sale('LE/113'), sale('LE/9')]);
    expect(out.doc_det[0].docs[0]).toMatchObject({ from: 'LE/9', to: 'LE/113', totnum: 2 });
  });

  it('counts cancelled documents and nets them out of net_issue', () => {
    const out = buildDocIssue([sale('S/1'), sale('S/2', { is_cancelled: 1 })]);
    expect(out.doc_det[0].docs[0]).toMatchObject({ totnum: 2, cancel: 1, net_issue: 1 });
  });

  it('maps outward credit notes to 5 and outward debit notes to 4', () => {
    const out = buildDocIssue([
      {
        voucher_number: 'CN/1',
        voucher_type: 'Credit Note',
        is_cancelled: 0,
        party_group: 'Sundry Debtors',
      },
      {
        voucher_number: 'DN/1',
        voucher_type: 'Debit Note',
        is_cancelled: 0,
        party_group: 'Sundry Debtors',
      },
    ]);
    expect(out.doc_det.map((d) => d.doc_num)).toEqual([4, 5]);
  });

  it('excludes inward notes — a debit note against a supplier is a purchase return, not a GSTR-1 document', () => {
    const out = buildDocIssue([
      {
        voucher_number: 'DN/9',
        voucher_type: 'Debit Note',
        is_cancelled: 0,
        party_group: 'Sundry Creditors',
      },
    ]);
    expect(out).toBeNull();
  });

  it('ignores voucher types with no table-13 source (Purchase, Receipt, …)', () => {
    const out = buildDocIssue([
      {
        voucher_number: 'P/1',
        voucher_type: 'Purchase',
        is_cancelled: 0,
        party_group: 'Sundry Creditors',
      },
      {
        voucher_number: 'R/1',
        voucher_type: 'Receipt',
        is_cancelled: 0,
        party_group: 'Sundry Debtors',
      },
    ]);
    expect(out).toBeNull();
  });

  it('returns null when nothing was issued (portal rejects an empty doc_issue node)', () => {
    expect(buildDocIssue([])).toBeNull();
  });
});
