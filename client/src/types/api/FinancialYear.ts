import type { FYType } from '../entities/FinancialYear';

export interface FinancialYearAPI {
  fy: {
    create: (data: Partial<FYType>) => Promise<{ success: boolean; fy: FYType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; financialYears: FYType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; fy: FYType; error?: string }>;
    setActive: (fy_id: number, company_id: number) => Promise<{ success: boolean; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };
}
