
export interface ParticularRow {
  id: string;
  type: "Dr" | "Cr";
  ledger: import("../../../types/api").LedgerType | null;
  ledgerBalance: string;
  amountRaw: string;
  costCentres?: { cost_centre_id: number; amount: number }[];
  billReferences?: {
    bill_name: string;
    bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
    amount: number;
    credit_period?: string;
    due_date?: string;
  }[];
}

export interface BatchAllocation {
  batch_number: string;
  mfg_date?: string;       // ISO yyyy-mm-dd
  expiry_date?: string;    // ISO yyyy-mm-dd
  quantity: number;
  rate: number;
}

export interface StockEntryRow {
  id: string;
  stockItem: import("../../../types/api").StockItemType | null;
  godown: import("../../../types/api").GodownType | null;
  unit: import("../../../types/api").UnitType | null;
  quantityRaw: string;
  rateRaw: string;
  amountRaw: string;
  billedQtyRaw?: string;
  discPercentRaw?: string;
  batchNo?: string;
  lotNo?: string;
  mfgDate?: string;
  expiryDate?: string;
  /** Multi-batch split for a batch-tracked item (Stock Item Allocations sub-screen). */
  batchAllocations?: BatchAllocation[];
}

export type ActiveField =
  | { type: "account" }
  | { type: "party" }
  | { type: "salesPurchase" }
  | { type: "particular"; rowId: string }
  | { type: "additional"; rowId: string }
  | { type: "stockItem"; rowId: string }
  | { type: "stockGodown"; rowId: string }
  | { type: "employee"; rowId: string }
  | { type: "attendanceType"; rowId: string }
  | { type: "payHead"; rowId: string };

export type ActiveAllocation =
  | {
      type: "billWise";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      dcType?: "Dr" | "Cr";
      initialAllocations?: any[];
    }
  | {
      type: "billWiseParty";
      ledgerId: number;
      ledgerName: string;
      amount: number;
      dcType?: "Dr" | "Cr";
      initialAllocations?: any[];
    }
  | {
      type: "costCentre";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "bankDetails";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
      allowCash?: boolean;
    }
  | {
      type: "partyBankDetails";
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | {
      type: "cashDenomination";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | {
      type: "batch";
      rowId: string;
      itemId: number;
      itemName: string;
      quantity: number;
      rate: number;
      unitSymbol?: string;
      trackMfg: boolean;
      trackExpiry: boolean;
      isInward: boolean;
      initialAllocations?: BatchAllocation[];
    }
  | null;

export interface AttendanceEntryRow {
  id: string;
  employee: import("../../../types/entities/Employee").EmployeeType | null;
  attendanceType: import("../../../types/entities/Payroll").AttendanceTypeType | null;
  valueRaw: string;
}

export interface PayrollEntryRow {
  id: string;
  employee: import("../../../types/entities/Employee").EmployeeType | null;
  payHead: import("../../../types/entities/Payroll").PayHeadType | null;
  amountRaw: string;
}
