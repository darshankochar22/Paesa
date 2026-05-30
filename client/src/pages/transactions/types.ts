import type { LedgerType, StockItemType, GodownType, UnitType } from "../../types/api";

export interface BillReference {
    ledger_id?: number;
    bill_name: string;
    bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
    amount: number;
    credit_period?: string;
}

export interface CostCentreAllocation {
    cost_centre_id: number;
    amount: number;
}

export interface ParticularRow {
    id: string;
    type: "Dr" | "Cr";
    ledger: LedgerType | null;
    ledgerBalance: string;
    amountRaw: string;
    costCentres?: CostCentreAllocation[];
    billReferences?: BillReference[];
}

export interface StockEntryRow {
    id: string;
    stockItem: StockItemType | null;
    godown: GodownType | null;
    unit: UnitType | null;
    quantityRaw: string;
    rateRaw: string;
    amountRaw: string;
}

export type ActiveField =
  | { type: "account" }
  | { type: "party" }
  | { type: "salesPurchase" }
  | { type: "particular"; rowId: string }
  | { type: "additional"; rowId: string }
  | { type: "stockItem"; rowId: string }
  | { type: "stockGodown"; rowId: string };

export interface BankDetails {
    ledger_id: number;
    transaction_type: "Cheque" | "e-Fund Transfer" | "Card" | "Others";
    instrument_number: string;
    instrument_date: string;
    bank_name: string;
    branch: string;
    amount: number;
}

export type ActiveAllocation =
  | {
      type: "billWise";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: BillReference[];
    }
  | {
      type: "billWiseParty";
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: BillReference[];
    }
  | {
      type: "costCentre";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: CostCentreAllocation[];
    }
  | {
      type: "bankDetails";
      rowId?: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: BankDetails | null;
    }
  | {
      type: "cashDenomination";
      rowId?: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | null;

export interface DispatchDetail {
    id: string;
    dispatch_date?: string;
    place_of_dispatch?: string;
    port_of_dispatch?: string;
    port_of_shipment?: string;
    port_of_destination?: string;
    shipping_mode?: string;
    vehicle_number?: string;
    awb_or_bill_of_lading?: string;
    additional_notes?: string;

    // Tally fields
    delivery_note_no?: string;
    dispatch_doc_no?: string;
    dispatched_through?: string;
    destination?: string;
    carrier_name?: string;
    bill_of_lading_no?: string;
    bill_of_lading_date?: string;
    motor_vehicle_no?: string;
}

export interface ReceiptDetail {
    id: string;
    receipt_date?: string;
    receipt_reference_number?: string;
    supplier_invoice_number?: string;
    location_received?: string;
    quantity_received?: string;
    condition_status?: string;
    inspection_notes?: string;
    received_by?: string;

    // Tally fields
    receipt_note_no?: string;
    receipt_doc_no?: string;
    dispatched_through?: string;
    destination?: string;
    carrier_name?: string;
    bill_of_lading_no?: string;
    bill_of_lading_date?: string;
    motor_vehicle_no?: string;
}

export type VoucherStatus = "Open" | "Closed" | "Cancelled" | "Post-Dated";

export type VoucherType =
  | "Receipt"
  | "Payment"
  | "Contra"
  | "Journal"
  | "Sales"
  | "Purchase";
