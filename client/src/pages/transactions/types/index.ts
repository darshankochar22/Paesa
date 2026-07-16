/** A ledger's running balance: raw signed number for logic (negative = balance on
 *  the unnatural side), label = Tally-style display string ("6,800.00 Dr"). */
export interface LedgerBalanceInfo {
  raw: string;
  label: string;
}

export interface ParticularRow {
  id: string;
  type: 'Dr' | 'Cr';
  ledger: import('../../../types/api').LedgerType | null;
  ledgerBalance: string;
  /** Tally-style "Current balance" display label ("6,800.00 Dr"); ledgerBalance keeps the raw signed value. */
  ledgerBalanceLabel?: string;
  amountRaw: string;
  costCentres?: { cost_centre_id: number; amount: number }[];
  billReferences?: {
    bill_name: string;
    bill_type: 'New Ref' | 'Agst Ref' | 'Advance' | 'On Account';
    amount: number;
    credit_period?: string;
    due_date?: string;
  }[];
  /** Journal / Reversing Journal: stock items entered against an inventory-
   *  affecting ledger (Purchase/Sales A/c) via the Inventory Allocations sub-screen. */
  inventoryAllocations?: InventoryAllocationItem[];
}

/** One stock line entered inside the Inventory Allocations sub-screen for an
 *  inventory-affecting ledger. Carries its godown/batch split and per-item cost
 *  centre allocation, plus display fields (unit symbol, cost-centre names). */
export interface InventoryAllocationItem {
  stock_item_id: number;
  item_name: string;
  godown_id?: number | null;
  unit_id?: number | null;
  unit_symbol?: string;
  actual_quantity: number;
  quantity: number; // billed quantity — drives the amount
  rate: number;
  amount: number;
  batches?: BatchAllocation[];
  cost_centres?: { cost_centre_id: number; cost_centre_name?: string; amount: number }[];
}

export interface BatchAllocation {
  batch_number: string;
  /** TallyPrime tracking number linking a Delivery/Receipt Note to its later
   *  invoice. "" or "♦ Not Applicable" means no tracking. */
  tracking_no?: string;
  godown?: string; // godown / location name
  mfg_date?: string; // ISO yyyy-mm-dd
  expiry_date?: string; // ISO yyyy-mm-dd
  quantity: number; // billed quantity (drives amount + line total)
  actual_quantity?: number; // actual quantity (defaults to billed)
  rate: number;
  disc_percent?: number;
  // Material In job-work allocation (order tracking).
  order_no?: string;
  due_on?: string;
  /** Resolved ISO date for a "9 Days"-style due_on entry. */
  due_on_date?: string;
  component_of?: string;
  consider_as_scrap?: string;
  /** Job Work rows: whether the row tracks components ("Yes"/"No"). */
  track_components?: string;
}

/** One component line in the Job Work Components Allocation popup. */
export interface ComponentAllocationRow {
  item_name: string;
  track: 'Pending to Issue' | 'Pending to Receive' | '';
  due_on: string;
  godown: string;
  batch_lot?: string;
  mfg_date?: string;
  expiry_date?: string;
  actual_qty: number;
  as_per_bom: number;
  rate: number;
  unit_symbol?: string;
  amount: number;
}

/** One godown/qty allocation line in the Job Work Stock Item Allocations popup. */
export interface JobWorkItemAllocationRow {
  due_on: string;
  godown: string;
  /** Batch / Lot allocation — batch-tracked parent items only. */
  batch_lot?: string;
  mfg_date?: string;
  expiry_date?: string;
  quantity: number;
  rate: number;
  unit_symbol?: string;
  amount: number;
  components?: ComponentAllocationRow[];
}

export interface StockEntryRow {
  id: string;
  stockItem: import('../../../types/api').StockItemType | null;
  godown: import('../../../types/api').GodownType | null;
  unit: import('../../../types/api').UnitType | null;
  /** Optional free-text line description shown under the item (e.g. "80 Red"). */
  descriptionRaw?: string;
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
  /** Job Work In/Out Order: godown+qty split with optional component sub-allocations. */
  jobWorkAllocations?: JobWorkItemAllocationRow[];
  /** Per-item Excise Details (Credit Note, excise-applicable items). */
  exciseItemDetails?: import('../components/popups/ItemExciseDetailsPopup').ExciseItemDetails;
}

export type ActiveField =
  | { type: 'account' }
  | { type: 'party' }
  | { type: 'salesPurchase' }
  | { type: 'particular'; rowId: string }
  | { type: 'additional'; rowId: string }
  | { type: 'stockItem'; rowId: string }
  | { type: 'stockGodown'; rowId: string }
  | { type: 'employee'; rowId: string }
  | { type: 'attendanceType'; rowId: string }
  | { type: 'payHead'; rowId: string }
  | { type: 'payrollCategory'; groupId: string }
  | { type: 'payrollEmployee'; groupId: string; empRowId: string }
  | { type: 'payrollPayHead'; groupId: string; empRowId: string; phRowId: string };

export type ActiveAllocation =
  | {
      type: 'billWise';
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      dcType?: 'Dr' | 'Cr';
      initialAllocations?: any[];
    }
  | {
      type: 'billWiseParty';
      ledgerId: number;
      ledgerName: string;
      amount: number;
      dcType?: 'Dr' | 'Cr';
      initialAllocations?: any[];
    }
  | {
      type: 'costCentre';
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      dcType?: 'Dr' | 'Cr';
      initialAllocations?: any[];
    }
  | {
      type: 'bankDetails';
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
      allowCash?: boolean;
    }
  | {
      type: 'partyBankDetails';
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | {
      type: 'cashDenomination';
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | {
      type: 'batch';
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
      /** Opened on item selection (Tally-style): quantity & rate are entered
       *  inside the popup, then written back to the line. */
      quantityDriven?: boolean;
      /** Show Batch/Lot columns (batch item) vs godown-only allocation. */
      showBatch?: boolean;
    }
  | {
      type: 'materialIn';
      rowId: string;
      itemId: number;
      itemName: string;
      rate: number;
      unitSymbol?: string;
      showBatch?: boolean;
      trackMfg?: boolean;
      trackExpiry?: boolean;
      initialAllocations?: BatchAllocation[];
    }
  | {
      type: 'jobWork';
      rowId: string;
      itemId: number;
      itemName: string;
      unitSymbol?: string;
      orderNo?: string;
      initialAllocations?: JobWorkItemAllocationRow[];
    }
  | null;

export interface AttendanceEntryRow {
  id: string;
  employee: import('../../../types/entities/Employee').EmployeeType | null;
  attendanceType: import('../../../types/entities/Payroll').AttendanceTypeType | null;
  valueRaw: string;
}

export interface PayrollEntryRow {
  id: string;
  employee: import('../../../types/entities/Employee').EmployeeType | null;
  payHead: import('../../../types/entities/Payroll').PayHeadType | null;
  amountRaw: string;
  category?: import('../../../types/entities/CostCategory').CostCategoryType | null;
}

export interface PayrollPayHeadRow {
  id: string;
  payHead: import('../../../types/entities/Payroll').PayHeadType | null;
  amountRaw: string;
}

export interface PayrollEmployeeRow {
  id: string;
  employee: import('../../../types/entities/Employee').EmployeeType | null;
  payHeadRows: PayrollPayHeadRow[];
}

export interface PayrollGroupRow {
  id: string;
  category: import('../../../types/entities/CostCategory').CostCategoryType | null;
  employeeRows: PayrollEmployeeRow[];
}
