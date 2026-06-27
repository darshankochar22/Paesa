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
  gstApplicabilitySection?: boolean;
}

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
 "Bank Accounts": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, paymentGateway: true },
  "Bank OCC A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, paymentGateway: true },
  "Bank OD A/c": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, paymentGateway: true },
  "Cash-in-Hand": { taxRegistration: "panOnly", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Branch/Divisions": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, serviceTaxDetails: false, vatDetails: true },
"Current Assets": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: true, vatDetails: false, paymentGateway: true },
  "Deposits (Asset)": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, paymentGateway: false },
"Current Liabilities": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: true, vatDetails: false },
"Fixed Assets": { 
  taxRegistration: "full", 
  mailingDetails: true, 
  bankingDetails: false,   
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true,      
  gstApplicabilitySection: true,   
  vatDetails: false,                
},
  "Capital Account": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false, vatDetails: true },
"Loans (Liability)": { 
  taxRegistration: "full", 
  mailingDetails: true, 
  bankingDetails: true, 
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true,  
},
"Loans & Advances (Asset)": { 
  taxRegistration: "full",
  mailingDetails: true, 
  bankingDetails: true, 
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true, 
},
"Investments": { 
  taxRegistration: "panOnly",
  mailingDetails: true, 
  bankingDetails: true, 
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true, 
},
  "Sundry Debtors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
  "Sundry Creditors": { taxRegistration: "full", mailingDetails: true, bankingDetails: true, billwise: true, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },

  "Duties & Taxes": { taxRegistration: "panOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: true, assessableValueCalc: true },
  "Provisions": { taxRegistration: "gstinServiceTaxOnly", mailingDetails: true, bankingDetails: true, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: true, vatDetails: false },

"Direct Expenses": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: true, gstApplicabilitySection: true },
"Indirect Expenses": { taxRegistration: "panOnly", mailingDetails: false, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: true, gstApplicabilitySection: true },
"Direct Incomes": { taxRegistration: "panOnly",  mailingDetails: true,  bankingDetails: false, billwise: false, interestCalculation: true,  dutyTaxDetails: false, assessableValueCalc: true, gstApplicabilitySection: true },
"Indirect Incomes": {  taxRegistration: "panOnly",  mailingDetails: true,  bankingDetails: false, billwise: false, interestCalculation: true,  dutyTaxDetails: false, assessableValueCalc: true, gstApplicabilitySection: true },
"Purchase Accounts": { 
  taxRegistration: "panOnly",   
  mailingDetails: true,         
  bankingDetails: false, 
  billwise: false, 
  interestCalculation: true,   
  dutyTaxDetails: false, 
  assessableValueCalc: true,   
  gstApplicabilitySection: true, 
},
"Sales Accounts": { 
  taxRegistration: "panOnly",   
  mailingDetails: true,        
  bankingDetails: false, 
  billwise: false, 
  interestCalculation: true,   
  dutyTaxDetails: false, 
  assessableValueCalc: true,    
  gstApplicabilitySection: true, 
},
"Loans(Liability)": { 
  taxRegistration: "full", 
  mailingDetails: true, 
  bankingDetails: true, 
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true,  
},
"Loans&Advances(Asset)": { 
  taxRegistration: "full",
  mailingDetails: true, 
  bankingDetails: true, 
  billwise: false, 
  interestCalculation: true, 
  dutyTaxDetails: false, 
  assessableValueCalc: true, 
},

  "Misc. Expenses (Asset)": { taxRegistration: "panOnly", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: true },
  "Misc.Expenses(Asset)": { taxRegistration: "panOnly", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: false, dutyTaxDetails: false, assessableValueCalc: true },
  "Suspense A/c": { taxRegistration: "panOnly", mailingDetails: true, bankingDetails: false, billwise: false, interestCalculation: true, dutyTaxDetails: false, assessableValueCalc: false },
};

export const getLedgerConfig = (groupName: string | null, fallbackGroupName?: string | null): LedgerConfigOptions => {
  if (!groupName) return DEFAULT_LEDGER_CONFIG;
  const config = LEDGER_CONFIG[groupName];
  if (config) return config;
  // Fall back to primary group when sub-group has no explicit config
  if (fallbackGroupName && fallbackGroupName !== groupName) {
    const fallback = LEDGER_CONFIG[fallbackGroupName];
    if (fallback) return fallback;
  }
  console.warn(`NO MATCH: "${groupName}"`);
  return DEFAULT_LEDGER_CONFIG;
};