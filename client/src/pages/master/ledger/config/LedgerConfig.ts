export type TaxRegistrationType = "full" | "panOnly" | "none" | "gstinServiceTaxOnly";

export interface LedgerConfigOptions {
  taxRegistration: TaxRegistrationType;
  mailingDetails: boolean;
  bankingDetails: boolean;
  billwise: boolean;
  interestCalculation: boolean;
  dutyTaxDetails: boolean;
  assessableValueDetails: boolean;
  showGstApplicability: boolean;
}

// Default fallback configuration
export const DEFAULT_LEDGER_CONFIG: LedgerConfigOptions = {
  taxRegistration: "none",
  mailingDetails: false,
  bankingDetails: false,
  billwise: false,
  interestCalculation: false,
  dutyTaxDetails: false,
  assessableValueDetails: false,
  showGstApplicability: false,
};

export const LEDGER_CONFIG: Record<string, LedgerConfigOptions> = {
  // Bank & Cash
  "Bank Accounts": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Bank OCC A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Bank OD A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Cash-in-Hand": { taxRegistration: "none", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },

  // Assets & Liabilities
  "Current Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Current Liabilities": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Fixed Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Capital Account": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Loans (Liability)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Loans & Advances (Asset)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Investments": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },

  // Parties (Debtors & Creditors)
  "Sundry Debtors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Sundry Creditors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },
  "Branch/Divisions": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false },

  // Duties & Taxes
  "Duties & Taxes": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: true, assessableValueDetails: false, showGstApplicability: false },

  // Incomes & Expenses
  "Direct Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Indirect Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Direct Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Indirect Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  
  // Purchases & Sales
  "Purchase Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
  "Sales Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true },
};

export const getLedgerConfig = (groupName: string | null): LedgerConfigOptions => {
  if (!groupName) return DEFAULT_LEDGER_CONFIG;
  return LEDGER_CONFIG[groupName] || DEFAULT_LEDGER_CONFIG;
};