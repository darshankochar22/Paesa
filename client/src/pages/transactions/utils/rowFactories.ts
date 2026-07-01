// utils/rowFactories.ts
import type { ParticularRow, StockEntryRow, PayrollPayHeadRow, PayrollEmployeeRow, PayrollGroupRow } from "../types";

let idCounter = 0;
export const nextId = () => `row_${++idCounter}_${Date.now()}`;

export const makeParticularRow = (type: "Dr" | "Cr" = "Dr"): ParticularRow => ({
  id: nextId(),
  type,
  ledger: null,
  ledgerBalance: "",
  amountRaw: "",
});

export const makeStockRow = (): StockEntryRow => ({
  id: nextId(),
  stockItem: null,
  godown: null,
  unit: null,
  quantityRaw: "",
  rateRaw: "",
  amountRaw: "",
});

export const makeAttendanceRow = () => ({
  id: nextId(),
  employee: null,
  attendanceType: null,
  valueRaw: "",
});

export const makePayrollRow = () => ({
  id: nextId(),
  employee: null,
  payHead: null,
  amountRaw: "",
});

export const makePayrollPayHeadRow = (): PayrollPayHeadRow => ({
  id: nextId(),
  payHead: null,
  amountRaw: "",
});

export const makePayrollEmployeeRow = (): PayrollEmployeeRow => ({
  id: nextId(),
  employee: null,
  payHeadRows: [makePayrollPayHeadRow()],
});

export const makePayrollGroupRow = (): PayrollGroupRow => ({
  id: nextId(),
  category: null,
  employeeRows: [makePayrollEmployeeRow()],
});
