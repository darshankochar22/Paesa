export type TaxRegistrationType = "full" | "panOnly" | "none" | "gstinServiceTaxOnly";

export interface LedgerConfigOptions {
  taxRegistration: TaxRegistrationType;
  mailingDetails: boolean;
  bankingDetails: boolean;
  billwise: boolean;
  interestCalculation: boolean;
  dutyTaxDetails: boolean;
  assessableValueCalc: boolean;
  serviceTaxDetails?: boolean;
  vatDetails?: boolean;     
  paymentGateway?: boolean; 
}

// Default fallback configuration
export const DEFAULT_LEDGER_CONFIG: LedgerConfigOptions = {
  taxRegistration: "none",
  mailingDetails: false,
  bankingDetails: false,
  billwise: false,
  interestCalculation: false,
  dutyTaxDetails: false,
  assessableValueCalc: false,
};

export const LEDGER_CONFIG: Record<string, LedgerConfigOptions> = {
  // Bank & Cash
 "Bank Accounts": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Bank OCC A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Bank OD A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Cash-in-Hand": { taxRegistration: "none", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  "Branch/Divisions": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, serviceTaxDetails: false },

  // Assets & Liabilities
"Current Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: true, vatDetails: false, paymentGateway: true },
"Current Liabilities": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: true, vatDetails: false, paymentGateway: true },
  "Fixed Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Capital Account": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Loans (Liability)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Loans & Advances (Asset)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Investments": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },

  // Parties (Debtors & Creditors)
  "Sundry Debtors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Sundry Creditors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },

  // Duties & Taxes
  "Duties & Taxes": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: true, assessableValueCalc: false },

  // Incomes & Expenses
  "Direct Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  "Indirect Expenses": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  "Direct Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  "Indirect Incomes": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  
  // Purchases & Sales
  "Purchase Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
  "Sales Accounts": { taxRegistration: "none", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: false },
};

export const getLedgerConfig = (groupName: string | null): LedgerConfigOptions => {
  if (!groupName) return DEFAULT_LEDGER_CONFIG;
  return LEDGER_CONFIG[groupName] || DEFAULT_LEDGER_CONFIG;
};