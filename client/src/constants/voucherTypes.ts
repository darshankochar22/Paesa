import type { TallyFeaturesType } from '@/types/entities/TallyFeatures';
import { isFeatureEnabled, type FeatureFlag } from '@/lib/companyFeatures';

/** All supported voucher type names — single source of truth. */
export const VOUCHER_TYPES = {
  // Accounting
  PAYMENT: 'Payment',
  RECEIPT: 'Receipt',
  CONTRA: 'Contra',
  JOURNAL: 'Journal',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
  MEMORANDUM: 'Memorandum',
  REVERSING_JOURNAL: 'Reversing Journal',

  // Inventory
  DELIVERY_NOTE: 'Delivery Note',
  RECEIPT_NOTE: 'Receipt Note',
  REJECTION_IN: 'Rejection In',
  REJECTION_OUT: 'Rejection Out',
  STOCK_JOURNAL: 'Stock Journal',
  PHYSICAL_STOCK: 'Physical Stock',
  MANUFACTURING_JOURNAL: 'Manufacturing Journal',

  // Orders
  SALES_ORDER: 'Sales Order',
  PURCHASE_ORDER: 'Purchase Order',

  // Job Work
  JOB_WORK_IN_ORDER: 'Job Work In Order',
  JOB_WORK_OUT_ORDER: 'Job Work Out Order',
  MATERIAL_IN: 'Material In',
  MATERIAL_OUT: 'Material Out',

  // Payroll
  ATTENDANCE: 'Attendance',
  PAYROLL: 'Payroll',
} as const;

export type VoucherType = (typeof VOUCHER_TYPES)[keyof typeof VOUCHER_TYPES];

/** Voucher types shown in the primary sidebar (F-key shortcuts). */
export const PRIMARY_VOUCHER_TYPES: VoucherType[] = [
  VOUCHER_TYPES.CONTRA,
  VOUCHER_TYPES.PAYMENT,
  VOUCHER_TYPES.RECEIPT,
  VOUCHER_TYPES.JOURNAL,
  VOUCHER_TYPES.SALES,
  VOUCHER_TYPES.PURCHASE,
];

/** Voucher types accessible via the "Other Vouchers" dropdown. */
export const OTHER_VOUCHER_TYPES: VoucherType[] = [
  VOUCHER_TYPES.ATTENDANCE,
  VOUCHER_TYPES.CREDIT_NOTE,
  VOUCHER_TYPES.DEBIT_NOTE,
  VOUCHER_TYPES.DELIVERY_NOTE,
  VOUCHER_TYPES.JOB_WORK_IN_ORDER,
  VOUCHER_TYPES.JOB_WORK_OUT_ORDER,
  VOUCHER_TYPES.MATERIAL_IN,
  VOUCHER_TYPES.MATERIAL_OUT,
  VOUCHER_TYPES.MANUFACTURING_JOURNAL,
  VOUCHER_TYPES.MEMORANDUM,
  VOUCHER_TYPES.PAYROLL,
  VOUCHER_TYPES.PHYSICAL_STOCK,
  VOUCHER_TYPES.PURCHASE_ORDER,
  VOUCHER_TYPES.RECEIPT_NOTE,
  VOUCHER_TYPES.REJECTION_IN,
  VOUCHER_TYPES.REJECTION_OUT,
  VOUCHER_TYPES.REVERSING_JOURNAL,
  VOUCHER_TYPES.SALES_ORDER,
  VOUCHER_TYPES.STOCK_JOURNAL,
];

/** Accounting-only voucher types (no inventory lines). */
export const ACCOUNTING_VOUCHER_TYPES: VoucherType[] = [
  VOUCHER_TYPES.PAYMENT,
  VOUCHER_TYPES.RECEIPT,
  VOUCHER_TYPES.CONTRA,
  VOUCHER_TYPES.JOURNAL,
];

/** Voucher types that carry inventory lines. */
export const INVENTORY_VOUCHER_TYPES: VoucherType[] = [
  VOUCHER_TYPES.SALES,
  VOUCHER_TYPES.PURCHASE,
  VOUCHER_TYPES.CREDIT_NOTE,
  VOUCHER_TYPES.DEBIT_NOTE,
  VOUCHER_TYPES.DELIVERY_NOTE,
  VOUCHER_TYPES.RECEIPT_NOTE,
  VOUCHER_TYPES.REJECTION_IN,
  VOUCHER_TYPES.REJECTION_OUT,
  VOUCHER_TYPES.STOCK_JOURNAL,
  VOUCHER_TYPES.PHYSICAL_STOCK,
  VOUCHER_TYPES.MANUFACTURING_JOURNAL,
];

/**
 * Voucher type → the F11 flag required for it to be AVAILABLE (selectable/creatable).
 * Unlisted types are always available. Sales/Purchase/Credit Note/Debit Note are
 * intentionally NOT gated by maintain_inventory — they remain usable as
 * accounting-only invoices when inventory is off (the stock grid hides instead).
 * enable_job_order_processing depends on maintain_inventory (FEATURE_DEPENDENCIES),
 * so isFeatureEnabled already requires both for the job-work types.
 */
export const VOUCHER_TYPE_FEATURE: Partial<Record<VoucherType, FeatureFlag>> = {
  [VOUCHER_TYPES.DELIVERY_NOTE]: 'maintain_inventory',
  [VOUCHER_TYPES.RECEIPT_NOTE]: 'maintain_inventory',
  [VOUCHER_TYPES.REJECTION_IN]: 'maintain_inventory',
  [VOUCHER_TYPES.REJECTION_OUT]: 'maintain_inventory',
  [VOUCHER_TYPES.STOCK_JOURNAL]: 'maintain_inventory',
  [VOUCHER_TYPES.PHYSICAL_STOCK]: 'maintain_inventory',
  [VOUCHER_TYPES.MANUFACTURING_JOURNAL]: 'maintain_inventory',
  [VOUCHER_TYPES.SALES_ORDER]: 'maintain_inventory',
  [VOUCHER_TYPES.PURCHASE_ORDER]: 'maintain_inventory',
  [VOUCHER_TYPES.JOB_WORK_IN_ORDER]: 'enable_job_order_processing',
  [VOUCHER_TYPES.JOB_WORK_OUT_ORDER]: 'enable_job_order_processing',
  [VOUCHER_TYPES.MATERIAL_IN]: 'enable_job_order_processing',
  [VOUCHER_TYPES.MATERIAL_OUT]: 'enable_job_order_processing',
  [VOUCHER_TYPES.ATTENDANCE]: 'maintain_payroll',
  [VOUCHER_TYPES.PAYROLL]: 'maintain_payroll',
};

/** True when a voucher type is available under the current F11 features. */
export function isVoucherTypeEnabled(
  features: TallyFeaturesType | null | undefined,
  type: VoucherType,
): boolean {
  const flag = VOUCHER_TYPE_FEATURE[type];
  return !flag || isFeatureEnabled(features, flag);
}
