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
  otherStatutoryOnly: boolean;
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
  otherStatutoryOnly: false,
};

export const LEDGER_CONFIG: Record<string, LedgerConfigOptions> = {
  // Bank & Cash
  "Bank Accounts": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },
  "Bank OCC A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },
  "Bank OD A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },
  "Cash-in-Hand": { taxRegistration: "none", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },

  // Assets & Liabilities
  "Current Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: false, otherStatutoryOnly: false },
  "Current Liabilities": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: false, otherStatutoryOnly: false },
  "Fixed Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
  "Capital Account": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },
  "Loans (Liability)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },
  "Loans & Advances (Asset)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false,otherStatutoryOnly: false },
  "Investments": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },

  // Parties (Debtors & Creditors)
  "Sundry Debtors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false,otherStatutoryOnly: true },
  "Sundry Creditors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: true },
  "Branch/Divisions": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueDetails: false, showGstApplicability: false, otherStatutoryOnly: false },

  // Duties & Taxes
  "Duties & Taxes": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: true, assessableValueDetails: true, showGstApplicability: false, otherStatutoryOnly: true },

  // Incomes & Expenses
  "Direct Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
  "Indirect Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
  "Direct Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
  "Indirect Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },

  // Purchases & Sales
  "Purchase Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
  "Sales Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueDetails: true, showGstApplicability: true, otherStatutoryOnly: false },
};

export const getLedgerConfig = (groupName: string | null): LedgerConfigOptions => {
  if (!groupName) return DEFAULT_LEDGER_CONFIG;
  return LEDGER_CONFIG[groupName] || DEFAULT_LEDGER_CONFIG;
};