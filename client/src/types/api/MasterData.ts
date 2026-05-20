import type { CurrencyType } from '../entities/Currency';
import type { VoucherTypeType } from '../entities/VoucherType';
import type { GSTRegistrationType } from '../entities/GSTRegistration';
import type { GSTClassificationType } from '../entities/GSTClassification';

export interface MasterDataAPI {
  currency: {
    create: (data: Partial<CurrencyType>) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; currencies: CurrencyType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    update: (data: Partial<CurrencyType>) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    setDefault: (company_id: number, id: number) => Promise<{ success: boolean; error?: string }>;
  };

  voucherType: {
    create: (data: Partial<VoucherTypeType>) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; voucherTypes: VoucherTypeType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    update: (data: Partial<VoucherTypeType>) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getConfig: (id: number) => Promise<{ success: boolean; config: { config_id: number; voucher_type_id: number; allow_narration: number; print_after_save: number }; error?: string }>;
    updateConfig: (data: { voucher_type_id: number; [key: string]: unknown }) => Promise<{ success: boolean; config: { config_id: number }; error?: string }>;
  };

  gstRegistration: {
    create: (data: Partial<GSTRegistrationType>) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; gstRegistrations: GSTRegistrationType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    update: (data: Partial<GSTRegistrationType>) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  gstClassification: {
    create: (data: Partial<GSTClassificationType>) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; gstClassifications: GSTClassificationType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    update: (data: Partial<GSTClassificationType>) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  master: {
    getMenu: (company_id?: number) => Promise<{ success: boolean; menu: { title: string; items: string[] }[] }>;
  };
}
