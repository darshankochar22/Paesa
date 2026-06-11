export type TaxRegistrationType = "full" | "panOnly" | "none" | "gstinServiceTaxOnly";

export interface LedgerConfigOptions {
  taxRegistration: TaxRegistrationType;
  mailingDetails: boolean;
  bankingDetails: boolean;
  billwise: boolean;
  interestCalculation: boolean;
  dutyTaxDetails: boolean;
}

// Default fallback configuration
export const DEFAULT_LEDGER_CONFIG: LedgerConfigOptions = {
  taxRegistration: "none",
  mailingDetails: false,
  bankingDetails: false,
  billwise: false,
  interestCalculation: false,
  dutyTaxDetails: false,
};

export const LEDGER_CONFIG: Record<string, LedgerConfigOptions> = {
  // Bank & Cash
 "Bank Accounts": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Bank OCC A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Bank OD A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Cash-in-Hand": { taxRegistration: "none", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },

  // Assets & Liabilities
  "Current Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Current Liabilities": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Fixed Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Capital Account": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Loans (Liability)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Loans & Advances (Asset)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },
  "Investments": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false },

  // Parties (Debtors & Creditors)
  "Sundry Debtors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false },
  "Sundry Creditors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false },
  "Branch/Divisions": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false },

  // Duties & Taxes
  "Duties & Taxes": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: true },

  // Incomes & Expenses
  "Direct Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
  "Indirect Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
  "Direct Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
  "Indirect Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
  
  // Purchases & Sales
  "Purchase Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
  "Sales Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false },
};

export const getLedgerConfig = (groupName: string | null): LedgerConfigOptions => {
  if (!groupName) return DEFAULT_LEDGER_CONFIG;
  return LEDGER_CONFIG[groupName] || DEFAULT_LEDGER_CONFIG;
};