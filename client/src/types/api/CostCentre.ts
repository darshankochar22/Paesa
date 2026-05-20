import type { CostCentreType } from '../entities/CostCentre';

export interface CostCentreAPI {
  costCentre: {
    create: (data: Partial<CostCentreType>) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; costCentres: CostCentreType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>;
    update: (data: Partial<CostCentreType>) => Promise<{ success: boolean; costCentre: CostCentreType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getTree: (company_id: number) => Promise<{ success: boolean; tree: CostCentreType[]; error?: string }>;
  };
}
