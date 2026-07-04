import type { CompanyType } from '../entities/Company';

export interface CompanyAPI {
  company: {
    create: (data: Partial<CompanyType>) => Promise<{ success: boolean; company: CompanyType; error?: string }>;
    getAll: () => Promise<{ success: boolean; companies: CompanyType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; company: CompanyType; error?: string }>;
    update: (data: Partial<CompanyType>) => Promise<{ success: boolean; company: CompanyType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    verifyPassword: (data: { id: number; password: string }) => Promise<{ success: boolean; error?: string }>;
    setDefaultGstRegistration: (company_id: number, gst_registration_id: number | null) => Promise<{ success: boolean; current_default_gst_registration_id?: number | null; error?: string }>;
    getDefaultGstRegistration: (company_id: number) => Promise<{ success: boolean; current_default_gst_registration_id?: number | null; error?: string }>;
  };
}
