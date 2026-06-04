// utils/rowFactories.ts
import type { ParticularRow, StockEntryRow } from "../types";

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
