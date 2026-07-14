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
  // Pooled weighted-average valuation — the SAME method as the Stock Item
  // Monthly Summary (stockBalanceReports.stockItemMonthly). Closing value =
  // running quantity × average cost of (opening + every inward); outwards
  // consume at that average and never change it. Unlike a zero-floored running
  // average, this still values NEGATIVE stock at cost, so the closing column
  // matches TallyPrime (e.g. −63 kg × ₹30 = −1,890) instead of collapsing to
  // the last voucher's own amount when stock dips to/through zero.
  let runQty = Number(wa.qty) || 0;
  let cumInQty = runQty; // opening counts as the first inward lot
  let cumInVal = Number(wa.value) || 0;
  const rate = () => (cumInQty !== 0 ? cumInVal / cumInQty : 0);
  const apply = (dir, qty, amt) => {
    if (dir === 'in') {
      runQty += qty;
      cumInQty += qty;
      cumInVal += amt;
    } else if (dir === 'out') {
      runQty -= qty;
    }
  };

  for (const e of entries) {
    if (!from_date || !e.date || e.date >= from_date) continue;
    const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
    if (dir) apply(dir, sign * (Number(e.quantity) || 0), sign * (Number(e.amount) || 0));
  }
  const openingQty = runQty;
  const openingValue = runQty * rate();

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
        closing_qty: runQty,
        closing_value: runQty * rate(),
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
    apply(dir, qty, amt);
    current.closing_qty = runQty;
    current.closing_value = runQty * rate();
  }
  flush();
  return { openingQty, openingValue, rows };
};

module.exports = { buildVoucherRegister };
