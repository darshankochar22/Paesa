// Voucher-type groupings shared across the voucher entry screen (Vouchers.tsx)
// and its popups (VoucherPopups.tsx).

// Voucher types whose entry screen is titled "Inventory Voucher Creation" — they
// share the centered company name + GST Registration header.
export const INVENTORY_CREATION_TYPES = [
  'Delivery Note',
  'Receipt Note',
  'Rejection In',
  'Rejection Out',
  'Material In',
  'Material Out',
  'Physical Stock',
  'Stock Journal',
  'Manufacturing Journal',
];

// Order vouchers — titled "Order Voucher Creation" but share the same centered
// company name + GST Registration / Tax Unit header as inventory vouchers.
export const ORDER_CREATION_TYPES = [
  'Purchase Order',
  'Sales Order',
  'Job Work In Order',
  'Job Work Out Order',
];
