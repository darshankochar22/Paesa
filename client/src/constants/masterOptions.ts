// Cross-feature option lists for master forms. Extracted from inline arrays
// duplicated across group/, ledger/, stock-item/, etc. Import the named list:
//   import { YES_NO, NATURES } from "@/constants/masterOptions";

export interface Option {
  value: string;
  label: string;
}

/** Yes/No toggle used in dozens of ledger/master fields. */
export const YES_NO: Option[] = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

/** Fundamental group natures (P&L / Balance Sheet classification). */
export const NATURES = ["Assets", "Liabilities", "Income", "Expenses"] as const;
export type Nature = (typeof NATURES)[number];

/** Cost allocation methods (group / stock). */
export const ALLOC_METHODS = [
  "Not Applicable",
  "Appropriate by Quantity",
  "Appropriate by Value",
] as const;
export type AllocMethod = (typeof ALLOC_METHODS)[number];

/** Stock valuation methods. */
export const VALUATION_METHODS = [
  "At Cost",
  "Avg. Cost",
  "FIFO",
  "LIFO Annual",
  "LIFO Perpetual",
  "Last Purchase Cost",
  "Std. Cost",
  "At Zero Cost",
  "At Zero Price",
  "Avg. Price",
  "Last Sale Price",
] as const;
export type ValuationMethod = (typeof VALUATION_METHODS)[number];

/** Voucher debit/credit side. */
export const DR_CR: Option[] = [
  { value: "Dr", label: "Dr" },
  { value: "Cr", label: "Cr" },
];

/** Helper: turn a readonly string tuple into <Select> options. */
export const toOptions = (values: readonly string[]): Option[] =>
  values.map((v) => ({ value: v, label: v }));
