import type { CostCategoryType } from '../entities/CostCategory';

export interface CostCategoryAPI {
  costCategory: {
    create: (data: Partial<CostCategoryType>) => Promise<{ success: boolean; costCategory: CostCategoryType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; costCategories: CostCategoryType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; costCategory: CostCategoryType; error?: string }>;
    update: (data: Partial<CostCategoryType>) => Promise<{ success: boolean; costCategory: CostCategoryType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };
}
