'use strict';

// Pure GST document-direction helpers — NO db/module dependencies, so payload builders
// (gstr1Service / gstr3bService) and the classifier (core.js) can all share ONE definition
// without creating a require cycle through the reconciliation package (portalRecon → gstr3b).
//
// Credit / Debit notes are directional. A note booked against a customer (Sundry Debtors) is an
// outward sales return → GSTR-1 (CDN). A note against a supplier (Sundry Creditors) is an inward
// purchase return → GSTR-2/3B ITC side, NOT GSTR-1 outward. Resolve by the party ledger's group
// name; fall back to the Tally convention (Credit Note = outward, Debit Note = inward) when no
// group name decides it.
const noteDirection = (v) => {
  const grp = String(v.party_group || '');
  if (/creditor/i.test(grp)) return 'inward';
  if (/debtor/i.test(grp)) return 'outward';
  return v.voucher_type === 'Credit Note' ? 'outward' : 'inward';
};
const isNote = (t) => t === 'Credit Note' || t === 'Debit Note';
const isOutwardVoucher = (v) =>
  v.voucher_type === 'Sales' || (isNote(v.voucher_type) && noteDirection(v) === 'outward');
const isInwardVoucher = (v) =>
  v.voucher_type === 'Purchase' || (isNote(v.voucher_type) && noteDirection(v) === 'inward');

module.exports = { noteDirection, isNote, isOutwardVoucher, isInwardVoucher };
