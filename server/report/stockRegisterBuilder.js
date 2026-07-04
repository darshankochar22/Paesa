// Shared row-builder for the voucher registers (Stock Item Vouchers / Godown
// Vouchers). Extracted verbatim from stockSummaryReportService.js.
const {
  entryDirection,
  registerDirection,
  inwardCondSql,
  outwardCondSql,
  trackingBilledSql,
  newWAState,
  applyWA,
} = require('./services/stockMovement');

const buildVoucherRegister = (entries, wa, from_date, to_date, includeOpeningRow) => {
  for (const e of entries) {
    if (!from_date || !e.date || e.date >= from_date) continue;
    const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
    if (dir) applyWA(wa, dir, sign * (Number(e.quantity) || 0), sign * (Number(e.amount) || 0));
  }
  const openingQty = wa.qty;
  const openingValue = wa.value;

  const rows = [];
  if (includeOpeningRow && (openingQty !== 0 || openingValue !== 0)) {
    rows.push({
      voucher_id: null,
      date: from_date || null,
      particulars: 'Opening Balance',
      voucher_type: '',
      voucher_number: '',
      inwards_qty: openingQty,
      inwards_value: openingValue,
      outwards_qty: null,
      outwards_value: null,
      addl_cost: 0,
      closing_qty: openingQty,
      closing_value: openingValue,
    });
  }

  let current = null;
  const flush = () => {
    if (current) {
      rows.push(current);
      current = null;
    }
  };
  for (const e of entries) {
    if (from_date && e.date && e.date < from_date) continue;
    if (to_date && e.date && e.date > to_date) continue;
    const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
    if (!dir) continue;
    if (!current || current.voucher_id !== e.voucher_id) {
      flush();
      current = {
        voucher_id: e.voucher_id,
        date: e.date,
        particulars: e.particulars,
        voucher_type: e.voucher_type,
        voucher_number: e.voucher_number,
        inwards_qty: null,
        inwards_value: null,
        outwards_qty: null,
        outwards_value: null,
        addl_cost: 0,
        closing_qty: wa.qty,
        closing_value: wa.value,
      };
    }
    // sign is -1 for returns (Debit/Credit Note), which show as a negative
    // movement in the opposite column (neg Inward / neg Outward) and unwind
    // the running valuation accordingly.
    const qty = (Number(e.quantity) || 0) * sign;
    const amt = (Number(e.amount) || 0) * sign;
    current.addl_cost += Number(e.additional_amount) || 0;
    if (dir === 'in') {
      current.inwards_qty = (current.inwards_qty || 0) + qty;
      current.inwards_value = (current.inwards_value || 0) + amt;
    } else {
      current.outwards_qty = (current.outwards_qty || 0) + qty;
      current.outwards_value = (current.outwards_value || 0) + amt;
    }
    applyWA(wa, dir, qty, amt);
    current.closing_qty = wa.qty;
    current.closing_value = wa.value;
  }
  flush();
  return { openingQty, openingValue, rows };
};

module.exports = { buildVoucherRegister };
