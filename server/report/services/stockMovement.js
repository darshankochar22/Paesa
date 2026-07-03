/**
 * stockMovement.js — the ONE place that decides which way stock moves.
 *
 * Every inventory report (Stock Summary, Stock Item Vouchers/Monthly, Godown,
 * Group/Category summaries, Stock Query, Negative Stock, valuation engine)
 * must classify voucher_stock_entries rows through these helpers. Per-report
 * copies of the type lists drift apart (Credit/Debit Note, Stock Journal) and
 * produce reports that disagree with each other.
 *
 * Direction rules:
 *   - STOCK_INWARD_TYPES  → goods physically enter stock
 *       (Credit Note = sales return → inward)
 *   - STOCK_OUTWARD_TYPES → goods physically leave stock
 *       (Debit Note = purchase return → outward)
 *   - DUAL_TYPES (Stock Journal / Manufacturing Journal) → per-ENTRY direction
 *       via voucher_stock_entries.is_source: 1 = source/consumption (outward),
 *       0/NULL = destination/production (inward)
 *   - Anything else (Physical Stock, orders, memos…) is NOT a stock movement
 *       for these reports → direction null.
 *
 * NOTE: these lists are intentionally separate from reportHelpers'
 * INWARD_TYPES/OUTWARD_TYPES — those mean "purchase-side vs sales-side
 * documents" for GST/statutory reports, where a Credit Note belongs with
 * SALES. Here it's physical goods flow, where a Credit Note is INWARD.
 */
const { sql } = require('drizzle-orm');

const STOCK_INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In', 'Credit Note'];
const STOCK_OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note'];
const DUAL_TYPES = ['Stock Journal', 'Manufacturing Journal'];

/** 'in' | 'out' | null for one voucher_stock_entries row. */
const entryDirection = (voucher_type, is_source) => {
  if (STOCK_INWARD_TYPES.includes(voucher_type)) return 'in';
  if (STOCK_OUTWARD_TYPES.includes(voucher_type)) return 'out';
  if (DUAL_TYPES.includes(voucher_type)) {
    return (Number(is_source) || 0) === 1 ? 'out' : 'in';
  }
  return null;
};

/**
 * Register-display direction & sign for a stock entry — how it appears in the
 * Inwards/Outwards columns of Stock Item Vouchers / Monthly Summary.
 *
 * TallyPrime does NOT show a return as a positive movement in its physical-flow
 * column. A Debit Note (purchase return) shows as a NEGATIVE Inward — reducing
 * purchases — and a Credit Note (sales return) shows as a NEGATIVE Outward —
 * reducing sales. Everything else keeps its physical direction (entryDirection)
 * with a positive sign. Physical stock still moves the natural way, so callers
 * apply the running valuation with (dir, sign*qty, sign*amount): a Credit Note
 * of −1 in the Outwards column consumes −1 at average cost (i.e. adds it back),
 * matching Tally's closing balance.
 *
 * Returns { dir: 'in'|'out'|null, sign: 1|-1 }.
 */
const registerDirection = (voucher_type, is_source) => {
  if (voucher_type === 'Debit Note')  return { dir: 'in',  sign: -1 }; // negative Inward
  if (voucher_type === 'Credit Note') return { dir: 'out', sign: -1 }; // negative Outward
  return { dir: entryDirection(voucher_type, is_source), sign: 1 };
};

// The type lists are module-local string constants, so inlining them with
// sql.raw is safe (no user input touches these fragments).
const quoteList = (arr) => arr.map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');

/**
 * Tracking-number reconciliation (TallyPrime): goods received on a Receipt Note
 * (or delivered on a Delivery Note) move stock ONCE. The Purchase/Sales invoice
 * that later BILLS those same goods is linked by tracking number and must be
 * stock-neutral — otherwise the quantity is counted twice (receipt +12, invoice
 * +10 ⇒ a phantom 22). This SQL boolean is TRUE for such a "already-received"
 * invoice line, so callers subtract it from the inward/outward classification.
 *
 * A Purchase/Sales stock line is tracking-billed when its batch carries a
 * tracking number that matches a Receipt/Delivery Note for the SAME item —
 * either the note's own batch tracking number or the note's reference number
 * (the two ways this app links an invoice back to its note).
 *
 * @param v   alias of the vouchers table in the calling query
 * @param vse alias of the voucher_stock_entries table
 */
const trackingBilledExpr = (v = 'v', vse = 'vse') =>
  `(${v}.voucher_type IN ('Purchase', 'Sales') AND EXISTS (` +
    `SELECT 1 FROM voucher_batches vb_lnk ` +
    `WHERE vb_lnk.stock_entry_id = ${vse}.stock_entry_id ` +
      // The invoice line must carry SOME link back to a note — a tracking
      // number, or (when tracking wasn't stamped) the order number.
      `AND ((vb_lnk.tracking_no IS NOT NULL AND vb_lnk.tracking_no <> '') ` +
        `OR (vb_lnk.order_no IS NOT NULL AND vb_lnk.order_no <> '')) ` +
      `AND EXISTS (` +
        `SELECT 1 FROM voucher_batches vb_note ` +
        `JOIN vouchers v_note ON v_note.voucher_id = vb_note.voucher_id ` +
        `JOIN voucher_stock_entries vse_note ON vse_note.stock_entry_id = vb_note.stock_entry_id ` +
        `WHERE v_note.voucher_type IN ('Receipt Note', 'Delivery Note') ` +
          `AND vse_note.stock_item_id = ${vse}.stock_item_id ` +
          // Same goods if linked by tracking number (batch tracking or the
          // note's reference), OR — when no tracking was stamped — by a shared
          // order number. This stops a Purchase/Sales that only carries the
          // order number from double-counting the note's goods.
          `AND ((vb_lnk.tracking_no IS NOT NULL AND vb_lnk.tracking_no <> '' ` +
                `AND (vb_note.tracking_no = vb_lnk.tracking_no OR v_note.reference_number = vb_lnk.tracking_no)) ` +
            `OR (vb_lnk.order_no IS NOT NULL AND vb_lnk.order_no <> '' ` +
                `AND vb_note.order_no = vb_lnk.order_no)) ` +
          `AND v_note.is_cancelled = 0 AND COALESCE(v_note.is_optional, 0) = 0` +
      `)` +
  `))`;

/** SQL boolean fragment form of trackingBilledExpr (for standalone use). */
const trackingBilledSql = (v = 'v', vse = 'vse') => sql.raw(trackingBilledExpr(v, vse));

/**
 * SQL boolean fragment: is this stock-entry row an inward movement?
 * @param v   alias of the vouchers table in the calling query
 * @param vse alias of the voucher_stock_entries table
 */
const inwardCondSql = (v = 'v', vse = 'vse') => sql.raw(
  `((${v}.voucher_type IN (${quoteList(STOCK_INWARD_TYPES)}) ` +
  `OR (${v}.voucher_type IN (${quoteList(DUAL_TYPES)}) AND COALESCE(${vse}.is_source, 0) = 0)) ` +
  `AND NOT ${trackingBilledExpr(v, vse)})`
);

/** SQL boolean fragment: is this stock-entry row an outward movement? */
const outwardCondSql = (v = 'v', vse = 'vse') => sql.raw(
  `((${v}.voucher_type IN (${quoteList(STOCK_OUTWARD_TYPES)}) ` +
  `OR (${v}.voucher_type IN (${quoteList(DUAL_TYPES)}) AND COALESCE(${vse}.is_source, 0) = 1)) ` +
  `AND NOT ${trackingBilledExpr(v, vse)})`
);

/**
 * Weighted-average running valuation state. Inward adds book cost; outward
 * consumes at the current average COST (never at the voucher's sales value),
 * so the running closing value stays a true inventory cost.
 *
 * Matches stockValuationEngine's Weighted Average semantics, including
 * flooring at zero when stock goes negative.
 */
const newWAState = (opening_qty = 0, opening_value = 0) => ({
  qty: Number(opening_qty) || 0,
  value: Number(opening_value) || 0,
});

/** Apply one movement; returns the COST consumed for outward entries. */
const applyWA = (state, dir, qty, amount) => {
  const q = Number(qty) || 0;
  if (dir === 'in') {
    state.qty += q;
    state.value += Number(amount) || 0;
    return 0;
  }
  if (dir === 'out') {
    const avgRate = state.qty > 0 ? state.value / state.qty : 0;
    const cost = q * avgRate;
    state.qty -= q;
    state.value -= cost;
    if (state.qty <= 0) {
      // Negative/zero stock carries no value (same rule as the engine).
      state.value = 0;
    }
    return cost;
  }
  return 0;
};

module.exports = {
  STOCK_INWARD_TYPES,
  STOCK_OUTWARD_TYPES,
  DUAL_TYPES,
  entryDirection,
  registerDirection,
  inwardCondSql,
  outwardCondSql,
  trackingBilledExpr,
  trackingBilledSql,
  newWAState,
  applyWA,
};
