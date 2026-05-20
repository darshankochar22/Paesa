import type { UnitType } from '../entities/Unit';

export interface UnitAPI {
  unit: {
    create: (data: Partial<UnitType>) => Promise<{ success: boolean; unit: UnitType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; units: UnitType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; unit: UnitType; error?: string }>;
    update: (data: Partial<UnitType>) => Promise<{ success: boolean; unit: UnitType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };
}
