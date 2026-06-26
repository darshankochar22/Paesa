// Shared field validators — replaces ~100 inline `.trim()` / regex checks across
// master forms. Each returns an error string, or null when valid.

export type Validator = (value: string) => string | null;

export const required =
  (label = "This field"): Validator =>
  (v) =>
    v == null || String(v).trim() === "" ? `${label} is required.` : null;

export const decimal =
  (places = 2, label = "Value"): Validator =>
  (v) => {
    if (String(v).trim() === "") return null;
    if (!/^-?\d*\.?\d*$/.test(v)) return `${label} must be a number.`;
    const dec = v.split(".")[1];
    if (dec && dec.length > places) return `${label} allows max ${places} decimals.`;
    return null;
  };

export const maxLen =
  (n: number, label = "Value"): Validator =>
  (v) =>
    v.length > n ? `${label} must be ≤ ${n} characters.` : null;

// PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
export const pan: Validator = (v) =>
  v.trim() === "" || /^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(v.trim())
    ? null
    : "Invalid PAN (format ABCDE1234F).";

// GSTIN: 2-digit state + 10-char PAN + 3 chars
export const gstin: Validator = (v) =>
  v.trim() === "" ||
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/i.test(v.trim())
    ? null
    : "Invalid GSTIN.";

export const email: Validator = (v) =>
  v.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
    ? null
    : "Invalid email address.";

/** Run validators in order; return the first error or null. */
export const validate = (value: string, ...checks: Validator[]): string | null => {
  for (const c of checks) {
    const err = c(value);
    if (err) return err;
  }
  return null;
};
