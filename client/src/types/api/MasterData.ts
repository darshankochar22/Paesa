import type { CurrencyType } from '../entities/Currency';
import type { VoucherTypeType } from '../entities/VoucherType';
import type { GSTRegistrationType } from '../entities/GSTRegistration';
import type { GSTClassificationType } from '../entities/GSTClassification';
import type { CompanyGSTDetails } from '../entities/CompanyGSTDetails';
import type { CompanyTDSDetails } from '../entities/CompanyTDSDetails';
import type { CompanyTCSDetails } from '../entities/CompanyTCSDetails';
import type { CompanyPanCinDetails } from '../entities/CompanyPanCinDetails';
import type { PayrollStatutoryDetails } from '../entities/PayrollStatutoryDetails';
import type { ServiceTaxDetails } from '../entities/ServiceTaxDetails';
import type { ExciseRegistrationDetails } from '../entities/ExciseRegistrationDetails';
import type { VATRegistrationDetails } from '../entities/VATRegistrationDetails';
import type { TCSNatureOfGoodsType } from '../entities/TCSNatureOfGoods';
import type { TDSNatureOfPaymentType } from '../entities/TDSNatureOfPayment';

// One row in the GST Rate Setup group-hierarchy view (a sub-group or a ledger).
export interface GstRateSetupNode {
  id: number;
  name: string;
  kind: 'group' | 'ledger' | 'stock_group' | 'stock_item';
  taxability_type: string;
  gst_rate: number;
  hsn: string;
  gst_applicability: string;
  status: string;
}

export interface MasterDataAPI {
  companyGstDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: CompanyGSTDetails | null;
      error?: string;
    }>;
    save: (
      data: CompanyGSTDetails & { company_id: number },
    ) => Promise<{ success: boolean; record?: any; error?: string }>;
  };

  payrollStatutoryDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: PayrollStatutoryDetails | null;
      error?: string;
    }>;
    save: (
      data: PayrollStatutoryDetails & { company_id: number },
    ) => Promise<{ success: boolean; error?: string }>;
  };

  serviceTaxDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: ServiceTaxDetails | null;
      error?: string;
    }>;
    save: (
      data: ServiceTaxDetails & { company_id: number },
    ) => Promise<{ success: boolean; error?: string }>;
  };

  exciseRegistrationDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: ExciseRegistrationDetails | null;
      error?: string;
    }>;
    save: (
      data: ExciseRegistrationDetails & { company_id: number },
    ) => Promise<{ success: boolean; error?: string }>;
  };

  vatRegistrationDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: VATRegistrationDetails | null;
      error?: string;
    }>;
    save: (
      data: VATRegistrationDetails & { company_id: number },
    ) => Promise<{ success: boolean; error?: string }>;
  };

  companyTdsDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: CompanyTDSDetails | null;
      error?: string;
    }>;
    save: (
      data: CompanyTDSDetails & { company_id: number },
    ) => Promise<{ success: boolean; record?: any; error?: string }>;
  };

  companyTcsDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: CompanyTCSDetails | null;
      error?: string;
    }>;
    save: (
      data: CompanyTCSDetails & { company_id: number },
    ) => Promise<{ success: boolean; record?: any; error?: string }>;
  };

  companyPanCinDetails: {
    get: (company_id: number) => Promise<{
      success: boolean;
      exists: boolean;
      data: CompanyPanCinDetails | null;
      error?: string;
    }>;
    save: (
      data: CompanyPanCinDetails & { company_id: number },
    ) => Promise<{ success: boolean; record?: any; error?: string }>;
  };

  currency: {
    create: (
      data: Partial<CurrencyType>,
    ) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    getAll: (
      company_id: number,
    ) => Promise<{ success: boolean; currencies: CurrencyType[]; error?: string }>;
    getById: (id: number) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    update: (
      data: Partial<CurrencyType>,
    ) => Promise<{ success: boolean; currency: CurrencyType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    setDefault: (company_id: number, id: number) => Promise<{ success: boolean; error?: string }>;
  };

  voucherType: {
    create: (
      data: Partial<VoucherTypeType>,
    ) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    getAll: (
      company_id: number,
    ) => Promise<{ success: boolean; voucherTypes: VoucherTypeType[]; error?: string }>;
    getById: (
      id: number,
    ) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    update: (
      data: Partial<VoucherTypeType>,
    ) => Promise<{ success: boolean; voucherType: VoucherTypeType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    getConfig: (id: number) => Promise<{
      success: boolean;
      config: {
        config_id: number;
        voucher_type_id: number;
        allow_narration: number;
        print_after_save: number;
      };
      error?: string;
    }>;
    updateConfig: (data: {
      voucher_type_id: number;
      [key: string]: unknown;
    }) => Promise<{ success: boolean; config: { config_id: number }; error?: string }>;
  };

  gstRegistration: {
    create: (
      data: Partial<GSTRegistrationType>,
    ) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    getAll: (
      company_id: number,
    ) => Promise<{ success: boolean; gstRegistrations: GSTRegistrationType[]; error?: string }>;
    getById: (
      id: number,
    ) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    update: (
      data: Partial<GSTRegistrationType>,
    ) => Promise<{ success: boolean; gstRegistration: GSTRegistrationType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  gstClassification: {
    create: (
      data: Partial<GSTClassificationType>,
    ) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    getAll: (
      company_id: number,
    ) => Promise<{ success: boolean; gstClassifications: GSTClassificationType[]; error?: string }>;
    getById: (
      id: number,
    ) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    update: (
      data: Partial<GSTClassificationType>,
    ) => Promise<{ success: boolean; classification: GSTClassificationType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  tcsNatureOfGoods: {
    create: (
      data: Partial<TCSNatureOfGoodsType>,
    ) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    getAll: (company_id: number) => Promise<{
      success: boolean;
      tcsNatureOfGoodsList: TCSNatureOfGoodsType[];
      error?: string;
    }>;
    getById: (
      id: number,
    ) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    update: (
      data: Partial<TCSNatureOfGoodsType>,
    ) => Promise<{ success: boolean; tcsNatureOfGoods: TCSNatureOfGoodsType; error?: string }>;
    delete: (id: number) => Promise<{ success: boolean; error?: string }>;
  };

  tdsNatureOfPayment: {
    create: (
      data: Partial<TDSNatureOfPaymentType>,
    ) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
    getAll: (company_id: number) => Promise<{
      success: boolean;
      tdsNatureOfPaymentList: TDSNatureOfPaymentType[];
      error?: string;
    }>;
    getById: (
      id: number,
    ) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
    update: (
      data: Partial<TDSNatureOfPaymentType>,
    ) => Promise<{ success: boolean; tdsNatureOfPayment: TDSNatureOfPaymentType; error?: string }>;
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
    generateGSTR1: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      gst_registration_id?: number | null;
    }) => Promise<{
      success: boolean;
      export_id: number | null;
      payload: any;
      errors: any[];
      error?: string;
    }>;
    getGSTR1: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      gst_registration_id?: number | null;
    }) => Promise<{
      success: boolean;
      export_id: number | null;
      status?: string;
      filed_date?: string;
      payload: any;
      errors: any[];
      error?: string;
    }>;
    generateGSTR3B: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      gst_registration_id?: number | null;
    }) => Promise<{ success: boolean; payload: any; error?: string }>;
    getGSTR3B: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      gst_registration_id?: number | null;
    }) => Promise<{ success: boolean; payload: any; error?: string }>;
    getHSNRates: (
      company_id: number,
    ) => Promise<{ success: boolean; hsnRates: any[]; error?: string }>;
    upsertHSNRate: (data: any) => Promise<{ success: boolean; error?: string }>;
    deleteHSNRate: (data: {
      rate_id: number;
      company_id: number;
    }) => Promise<{ success: boolean; error?: string }>;
    getAnnualComputation: (data: {
      company_id: number;
      fy_id: number;
      gst_registration_id?: number | null;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getGSTR1Reconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getRegistrationResolution: (data: {
      company_id: number;
      fy_id: number;
      gst_registration_id?: number | null;
    }) => Promise<{
      success: boolean;
      rows: Array<{
        gst_id: number;
        name: string;
        voucher_count: number;
        address: string;
        state_id: string;
        registration_status: string;
        address_type: string;
        registration_type: string;
        assessee_of_other_territory: number;
        periodicity_of_gstr1: string;
        gstin: string;
        place_of_supply: string;
      }>;
      address: string;
      error?: string;
    }>;
    getGSTR2AReconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getGSTR2BReconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    importGSTR2B: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      payload: any;
    }) => Promise<{ success: boolean; error?: string }>;
    getIMSInwardSupplies: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getChallanReconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getReturnActivities: (data: { company_id: number; fy_id: number }) => Promise<{
      success: boolean;
      activities?: {
        period_label: string;
        returns: {
          name: string;
          corrections: number;
          pending_upload: number | null;
          recon_exceptions: number;
          pending_file: number | null;
        }[];
        registrations: {
          gst_id: number;
          state_id: string | null;
          gstin: string | null;
          name: string;
          months: {
            period: string;
            label: string;
            returns: {
              name: string;
              corrections: number | null;
              pending_upload: number | null;
              recon_exceptions: number | null;
              pending_file: number | null;
            }[];
          }[];
        }[];
      };
      error?: string;
    }>;
    getReturnStatistics: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      return_type?: string;
      gst_registration_id?: number | null;
      annual?: boolean;
    }) => Promise<{
      success: boolean;
      statistics?: {
        return_type: string;
        rows: {
          voucher_type: string;
          total: number;
          included_pending: number;
          included_ok: number;
          not_relevant: number;
          uncertain: number;
        }[];
        totals: {
          total: number;
          included_pending: number;
          included_ok: number;
          not_relevant: number;
          uncertain: number;
        };
      };
      error?: string;
    }>;
    getReturnVouchers: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      return_type?: string;
      gst_registration_id?: number | null;
      bucket?: string;
      category?: string;
      voucher_type?: string;
      section?: string;
      annual?: boolean;
      direction?: string;
      annual_category?: string;
    }) => Promise<{
      success: boolean;
      view?: 'vouchers' | 'hsn' | 'docs';
      rows?: any[];
      error?: string;
    }>;
    getNotRelevantBreakdown: (data: {
      company_id: number;
      fy_id: number;
      return_period: string;
      return_type?: string;
      gst_registration_id?: number | null;
      annual?: boolean;
    }) => Promise<{
      success: boolean;
      breakdown?: {
        non_gst: {
          label: string;
          count: number;
          categories: {
            label: string;
            count: number;
            types: { voucher_type: string; count: number }[];
          }[];
        };
        other_returns: { label: string; count: number } | null;
        total: number;
      };
      error?: string;
    }>;
    getAnnualSectionBreakdown: (data: {
      company_id: number;
      fy_id: number;
      gst_registration_id?: number | null;
      path: string;
    }) => Promise<{
      success: boolean;
      label?: string;
      rows?: {
        key: string;
        label: string;
        has_children: boolean;
        txval: number;
        iamt: number;
        camt: number;
        samt: number;
        cess: number;
        tax: number;
      }[];
      error?: string;
    }>;
    getAnnualMonthly: (data: {
      company_id: number;
      fy_id: number;
      gst_registration_id?: number | null;
      category: string;
      month?: string;
    }) => Promise<{
      success: boolean;
      view?: 'monthly' | 'breakup';
      rows?: {
        period?: string;
        label: string;
        txval: number;
        iamt: number;
        camt: number;
        samt: number;
        cess: number;
        tax: number;
      }[];
      error?: string;
    }>;
    getGstRateSetup: (data: {
      company_id: number;
      master_type: 'group' | 'ledger' | 'stock_group' | 'stock_item';
    }) => Promise<{
      success: boolean;
      masters?: {
        id: number;
        name: string;
        taxability_type: string;
        gst_rate: number;
        hsn: string;
        gst_applicability: string;
        status: string;
      }[];
      error?: string;
    }>;
    getGstRateSetupTree: (data: {
      company_id: number;
      group_id?: number | null;
    }) => Promise<{
      success: boolean;
      group?: { id: number; name: string } | null;
      groups?: GstRateSetupNode[];
      ledgers?: GstRateSetupNode[];
      error?: string;
    }>;
    getGstRateSetupStockTree: (data: {
      company_id: number;
      stock_group_id?: number | null;
    }) => Promise<{
      success: boolean;
      group?: { id: number; name: string } | null;
      groups?: GstRateSetupNode[];
      ledgers?: GstRateSetupNode[];
      error?: string;
    }>;
    validatePartyGstin: (data: {
      company_id: number;
      group_name?: string;
      ledger_name?: string;
    }) => Promise<{
      success: boolean;
      parties?: Array<{
        id: number;
        name: string;
        address: string;
        state: string;
        country: string;
        registration_type: string;
        gstin: string;
        pan: string;
        valid: boolean;
        status: string;
      }>;
      error?: string;
    }>;
    createPartiesFromGstin: (data: {
      company_id: number;
      group_name?: string;
      gstins: string[];
    }) => Promise<{ success: boolean; results?: any[]; error?: string }>;
    updatePartyGstDetails: (data: {
      ledger_id: number;
      registration_type?: string;
      gstin?: string;
      pan?: string;
      state?: string;
      country?: string;
    }) => Promise<{ success: boolean; ledger?: any; error?: string }>;
  };

  tds: {
    getChallanReconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getForm26Q: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getForm27Q: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getForm27QDrill: (data: {
      company_id: number;
      fy_id: number;
      view: 'not_relevant' | 'register' | 'uncertain' | 'resolution';
      bucket?: string;
      voucher_type?: string;
      exception?: string;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getReturnTransactionBook: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getOutstandings: (data: {
      company_id: number;
      fy_id: number;
      by?: 'nature' | 'party';
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getLedgersWithoutPan: (data: {
      company_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
  };
  msme: {
    getForm1: (
      company_id: number,
      fy_id: number,
      to_date?: string,
      group_id?: number | null,
    ) => Promise<{
      success: boolean;
      payload: { rows: any[]; total: number; as_on: string };
      error?: string;
    }>;
    getPartyList: (
      company_id: number,
      group_id?: number | null,
      ledger_id?: number | null,
    ) => Promise<{
      success: boolean;
      party_ledgers: Array<{
        ledger_id: number;
        name: string;
        is_bill_wise: number;
        default_credit_period: number | null;
        state: string | null;
        country: string | null;
        type_of_enterprise: string | null;
        udyam_reg_no: string | null;
        activity_type: string | null;
        effective_date: string | null;
      }>;
      group_id: number | null;
      last_entry_date?: string | null;
      error?: string;
    }>;
    updateDetails: (payload: {
      ledger_id: number;
      type_of_enterprise: string;
      udyam_reg_no?: string | null;
      activity_type?: string | null;
      effective_date?: string | null;
    }) => Promise<{ success: boolean; ledger?: any; error?: string }>;
  };
  tcs: {
    getChallanReconciliation: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getForm27EQ: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getForm27EQDrill: (data: {
      company_id: number;
      fy_id: number;
      view: 'not_relevant' | 'register' | 'uncertain' | 'resolution' | 'collection_details';
      bucket?: string;
      voucher_type?: string;
      exception?: string;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getReturnTransactionBook: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getOutstandings: (data: {
      company_id: number;
      fy_id: number;
      by?: 'nature' | 'party';
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getLedgersWithoutPan: (data: {
      company_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getChallanDetailsOfBuyer: (data: {
      company_id: number;
      fy_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
  };
  payrollStatutory: {
    getSummary: (data: {
      company_id: number;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getPayHeadDetails: (data: {
      company_id: number;
      component?: string;
      row_label?: string;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getPFForm5: (data: {
      company_id: number;
      from?: string;
      to?: string;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getPFForm10: (data: {
      company_id: number;
      from?: string;
      to?: string;
    }) => Promise<{ success: boolean; payload?: any; error?: string }>;
  };
  master: {
    getMenu: (
      company_id?: number,
    ) => Promise<{ success: boolean; menu: { title: string; items: string[] }[] }>;
  };
}
