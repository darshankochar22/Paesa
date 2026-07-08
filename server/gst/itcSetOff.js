'use strict';

// Statutory ITC set-off order (GST Section 49 + Rule 88A), the single source of truth used
// by both the Annual Computation and the persistent electronic credit ledger.
//
//   1. each head's credit against its own liability (same-head);
//   2. IGST credit surplus → CGST, then SGST;
//   3. CGST surplus → IGST; SGST surplus → IGST (CGST↔SGST can NEVER offset each other);
//   4. Cess credit only against Cess.
//
// `credit` is the full available pool for the period = opening balance + ITC availed. Whatever
// remains after set-off is the closing balance carried forward (across periods AND financial
// years). Excess credit is never dropped.
//
// @param liability {igst,cgst,sgst,cess}  output + RCM tax payable for the period
// @param credit    {igst,cgst,sgst,cess}  opening balance + ITC availed for the period
// @returns { net_liability, closing, utilized }  (utilized = credit consumed, per head)
const HEADS = ['igst', 'cgst', 'sgst', 'cess'];

function computeItcSetOff(liability = {}, credit = {}) {
  const liab = {};
  const cr = {};
  const cr0 = {};
  HEADS.forEach((h) => {
    liab[h] = Math.max(0, Number(liability[h]) || 0);
    cr[h] = Math.max(0, Number(credit[h]) || 0);
    cr0[h] = cr[h];
  });

  const use = (payHead, creditHead) => {
    const u = Math.min(liab[payHead], cr[creditHead]);
    liab[payHead] -= u;
    cr[creditHead] -= u;
  };

  HEADS.forEach((h) => use(h, h)); // 1. same-head
  use('cgst', 'igst'); // 2. IGST surplus → CGST
  use('sgst', 'igst'); //    IGST surplus → SGST
  use('igst', 'cgst'); // 3. CGST surplus → IGST
  use('igst', 'sgst'); //    SGST surplus → IGST

  const r2 = (n) => Number(Math.max(0, n).toFixed(2));
  const net_liability = {};
  const closing = {};
  const utilized = {};
  HEADS.forEach((h) => {
    net_liability[h] = r2(liab[h]);
    closing[h] = r2(cr[h]);
    utilized[h] = r2(cr0[h] - cr[h]);
  });
  return { net_liability, closing, utilized };
}

module.exports = { computeItcSetOff, HEADS };
