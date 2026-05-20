import type { LedgerType } from '../entities/Ledger';

export interface LedgerAPI {
  ledger: {
    create: (data: Partial<LedgerType>) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>;
    update: (data: Partial<LedgerType>) => Promise<{ success: boolean; ledger: LedgerType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getByGroup: (company_id: number, groupId: number) => Promise<{ success: boolean; ledgers: LedgerType[]; error?: string }>;
  };
}
