import type { StockGroupType, StockGroupTreeNode } from '../entities/StockGroup';
import type { StockCategoryType } from '../entities/StockCategory';
import type { StockItemType } from '../entities/StockItem';

export interface InventoryAPI {
  stockGroup: {
    create: (data: Partial<StockGroupType>) => Promise<{ success: boolean; group?: StockGroupType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; stockGroups?: StockGroupType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; group?: StockGroupType; error?: string }>;
    update: (data: Partial<StockGroupType>) => Promise<{ success: boolean; group?: StockGroupType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getTree: (company_id: number) => Promise<{ success: boolean; tree?: StockGroupTreeNode[]; error?: string }>;
  };

  stockCategory: {
    create: (data: Partial<StockCategoryType>) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; stockCategories: StockCategoryType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>;
    update: (data: Partial<StockCategoryType>) => Promise<{ success: boolean; category: StockCategoryType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  stockItem: {
    create: (data: Partial<StockItemType>) => Promise<{ success: boolean; item?: StockItemType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; item?: StockItemType; error?: string }>;
    update: (data: Partial<StockItemType>) => Promise<{ success: boolean; item?: StockItemType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getByGroup: (args: { company_id: number; group_id: number }) => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>;
    getByCategory: (args: { company_id: number; category_id: number }) => Promise<{ success: boolean; stockItems?: StockItemType[]; error?: string }>;
  };
}
