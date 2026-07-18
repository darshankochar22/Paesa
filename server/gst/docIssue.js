'use strict';

// GSTR-1 Table 13 — "Documents issued during the tax period".
//
// Per nature of document, the portal wants every voucher-number SERIES issued in the
// period: its first/last number, how many were issued, and how many were cancelled.
// Shape (matches a real portal-accepted TallyPrime export):
//   doc_issue: { doc_det: [ { doc_num, docs: [ { num, from, to, totnum, cancel, net_issue } ] } ] }
//
// Only OUTWARD documents belong in GSTR-1, so direction is resolved with the shared
// isOutwardVoucher/isNote helpers rather than voucher_type alone (a Debit Note booked
// against a supplier is an inward purchase return and must not be counted here).

const { isOutwardVoucher, isNote } = require('./reconciliation/direction');

// GSTN "Nature of Document" codes. Only 1/4/5 have a data source today — receipt,
// payment, refund and delivery-challan series need GST-specific document classes we
// do not model, so they are omitted rather than guessed.
const DOC_NUM = { INVOICE: 1, DEBIT_NOTE: 4, CREDIT_NOTE: 5 };

const DOC_NUM_LABEL = {
  1: 'Invoices for outward supply',
  2: 'Invoices for inward supply from unregistered person',
  3: 'Revised Invoice',
  4: 'Debit Note',
  5: 'Credit Note',
  6: 'Receipt Voucher',
  7: 'Payment Voucher',
  8: 'Refund Voucher',
  9: 'Delivery Challan for job work',
  10: 'Delivery Challan for supply on approval',
  11: 'Delivery Challan in case of liquid gas',
  12: 'Delivery Challan in cases other than by way of supply (excluding at S no. 9 to 11)',
};

const docNumFor = (v) => {
  if (!isOutwardVoucher(v)) return null;
  if (isNote(v.voucher_type))
    return v.voucher_type === 'Credit Note' ? DOC_NUM.CREDIT_NOTE : DOC_NUM.DEBIT_NOTE;
  return v.voucher_type === 'Sales' ? DOC_NUM.INVOICE : null;
};

// "LE/24-25/96" → { prefix: 'LE/24-25/', seq: 96 }; "12" → { prefix: '', seq: 12 }.
// The numeric tail drives ordering so from/to are the series' true first/last — a plain
// string sort would place "LE/24-25/9" after "LE/24-25/113".
const splitSeries = (raw) => {
  const s = String(raw ?? '').trim();
  const m = s.match(/^(.*?)(\d+)$/);
  return m ? { prefix: m[1], seq: Number(m[2]), raw: s } : { prefix: s, seq: null, raw: s };
};

/**
 * @param rows voucher rows for the period — MUST include cancelled ones, since table 13
 *             reports them; each row needs voucher_number, voucher_type, is_cancelled and
 *             party_group (for note direction).
 * @returns { doc_det: [...] } or null when nothing was issued.
 */
function buildDocIssue(rows = []) {
  const byDocNum = new Map();
  for (const v of rows) {
    const docNum = docNumFor(v);
    if (!docNum) continue;
    const parsed = splitSeries(v.voucher_number);
    if (!parsed.raw) continue;
    if (!byDocNum.has(docNum)) byDocNum.set(docNum, new Map());
    const series = byDocNum.get(docNum);
    if (!series.has(parsed.prefix)) series.set(parsed.prefix, []);
    series.get(parsed.prefix).push({ ...parsed, cancelled: Number(v.is_cancelled) === 1 });
  }

  const doc_det = [];
  for (const docNum of [...byDocNum.keys()].sort((a, b) => a - b)) {
    const seriesMap = byDocNum.get(docNum);
    const docs = [];
    for (const prefix of [...seriesMap.keys()].sort()) {
      const list = seriesMap
        .get(prefix)
        .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.raw.localeCompare(b.raw));
      const totnum = list.length;
      const cancel = list.filter((x) => x.cancelled).length;
      docs.push({
        num: docs.length + 1,
        from: list[0].raw,
        to: list[list.length - 1].raw,
        totnum,
        cancel,
        net_issue: totnum - cancel,
      });
    }
    if (docs.length) doc_det.push({ doc_num: docNum, docs });
  }
  return doc_det.length ? { doc_det } : null;
}

module.exports = { buildDocIssue, DOC_NUM_LABEL, DOC_NUM };
