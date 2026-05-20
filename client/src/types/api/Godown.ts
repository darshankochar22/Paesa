import type { GodownType } from '../entities/Godown';

export interface GodownAPI {
  godown: {
    create: (data: Partial<GodownType>) => Promise<{ success: boolean; godown: GodownType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; godowns: GodownType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; godown: GodownType; error?: string }>;
    update: (data: Partial<GodownType>) => Promise<{ success: boolean; godown: GodownType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getTree: (company_id: number) => Promise<{ success: boolean; tree: GodownType[]; error?: string }>;
  };
}
