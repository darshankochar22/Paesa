import type { CurrencyType } from '../entities/Currency';
import type { VoucherTypeType } from '../entities/VoucherType';
import type { GSTRegistrationType } from '../entities/GSTRegistration';
import type { GSTClassificationType } from '../entities/GSTClassification';
import type { CompanyGSTDetails } from '../entities/CompanyGSTDetails';
import type { TCSNatureOfGoodsType } from '../entities/TCSNatureOfGoods';
import type { TDSNatureOfPaymentType } from '../entities/TDSNatureOfPayment';

export interface MasterDataAPI {
  companyGstDetails: {
    get: (company_id: number) => Promise<{ success: boolean; exists: boolean; data: CompanyGSTDetails | null; error?: string }>;
    save: (data: CompanyGSTDetails & { company_id: number }) => Promise<{ success: boolean; record?: any; error?: string }>;
  };

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

  tcsNatureOfGoods: {
    create: (data: Partial<TCSNatureOfGoodsType>) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; tcsNatureOfGoodsList: TCSNatureOfGoodsType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    update: (data: Partial<TCSNatureOfGoodsType>) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  tdsNatureOfPayment: {
    create: (data: Partial<TDSNatureOfPaymentType>) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
    getAll: (company_id: number) => Promise<{ success: boolean; tdsNatureOfPaymentList: TDSNatureOfPaymentType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
    update: (data: Partial<TDSNatureOfPaymentType>) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  gst: {
    computeTax: (payload: any) => Promise<{
      success: boolean;
      is_inter_state: number;
      party_gstin: string;
      party_state: string;
      total_cgst: number;
      total_sgst: number;
      total_igst: number;
      total_cess: number;
      stock_entries: any[];
      entries: any[];
      taxLinesBreakdown: any[];
      error?: string;
    }>;
    generateGSTR1: (data: { company_id: number; fy_id: number; return_period: string }) => Promise<{ success: boolean; export_id: number; payload: any; errors: any[]; error?: string }>;
    getGSTR1: (data: { company_id: number; fy_id: number; return_period: string }) => Promise<{ success: boolean; export_id: number; status: string; filed_date?: string; payload: any; errors: any[]; error?: string }>;
    getHSNRates: (company_id: number) => Promise<{ success: boolean; hsnRates: any[]; error?: string }>;
    upsertHSNRate: (data: any) => Promise<{ success: boolean; error?: string }>;
    deleteHSNRate: (data: { rate_id: number; company_id: number }) => Promise<{ success: boolean; error?: string }>;
  };

  master: {
    getMenu: (company_id?: number) => Promise<{ success: boolean; menu: { title: string; items: string[] }[] }>;
  };
}
