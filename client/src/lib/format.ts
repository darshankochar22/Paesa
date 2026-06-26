// Centralised number/date/currency formatters (Indian locale).
// Replaces the ~42 local `fmt`/`fmtQty`/`formatINR` redefinitions scattered
// across report and voucher screens. Import from here everywhere:
//   import { fmt, fmtQty, currency, fmtINR, fmtDate } from "@/lib/format";

const INR = (digits = 2) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Plain number, en-IN grouping. Returns "" for 0 (Tally convention). */
export const fmt = (val: number | null | undefined, digits = 2): string => {
  const n = Number(val ?? 0);
  if (!n) return "";
  return INR(digits).format(n);
};

/** Quantity — same as fmt but always shows even when 0 would be blank elsewhere. */
export const fmtQty = (val: number | null | undefined, digits = 2): string => {
  const n = Number(val ?? 0);
  if (!n) return "";
  return INR(digits).format(n);
};

/** Absolute value, no sign — for Dr/Cr style ledgers where side is shown separately. */
export const fmtAbs = (val: number | null | undefined, digits = 2): string => {
  const n = Number(val ?? 0);
  if (!n) return "";
  return INR(digits).format(Math.abs(n));
};

/** With ₹ prefix. */
export const fmtINR = (val: number | null | undefined, digits = 2): string => {
  const n = Number(val ?? 0);
  return `₹${INR(digits).format(Math.abs(n))}`;
};

/** Full currency style (₹ + grouping), keeps sign. */
export const currency = (val: number | null | undefined): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(val ?? 0));

/** 02-Apr-2025 style date. Accepts Date | ISO string | epoch. */
export const fmtDate = (val: string | number | Date | null | undefined): string => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Back-compat alias for the old transactions/ui `formatINR` export. */
export const formatINR = fmtINR;
