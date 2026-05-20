import type { GroupType } from '../entities/Group';

export interface GroupAPI {
  group: {
    create: (data: Partial<GroupType>) => Promise<{ success: boolean; group: GroupType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; groups: GroupType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; group: GroupType; error?: string }>;
    update: (data: Partial<GroupType>) => Promise<{ success: boolean; group: GroupType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getTree: (company_id: number) => Promise<{ success: boolean; tree: GroupType[]; error?: string }>;
  };
}
