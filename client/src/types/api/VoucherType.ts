import type { VoucherTypeType, VoucherTypeConfig, VoucherTypeCreatePayload, VoucherTypeUpdatePayload, VoucherTypeConfigUpdatePayload } from '../entities/VoucherType';

export type VoucherTypeAPI = {
  voucherType: {
    create:       (data: VoucherTypeCreatePayload) => Promise<{ success: boolean; vt_id?: number; error?: string }>;
    getAll:       (company_id: number)             => Promise<{ success: boolean; voucherTypes?: VoucherTypeType[]; error?: string }>;
    getById:      (id: number)                     => Promise<{ success: boolean; voucherType?: VoucherTypeType; error?: string }>;
    update:       (data: VoucherTypeUpdatePayload) => Promise<{ success: boolean; error?: string }>;
    delete:       (id: number)                     => Promise<{ success: boolean; error?: string }>;
    getConfig:    (id: number)                     => Promise<{ success: boolean; config?: VoucherTypeConfig; error?: string }>;
    updateConfig: (data: VoucherTypeConfigUpdatePayload) => Promise<{ success: boolean; error?: string }>;
  };
};