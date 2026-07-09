// window.api.eInvoice / ewayBill / gstFiling — GST integrations. Credentials are
// developer-side (.env); the UI only triggers actions and reads status/records.

export interface IntegrationStatus {
  success: boolean;
  configured?: boolean;
  provider?: string;
  gstin?: string | null;
  sandbox?: boolean;
  records?: number;
  einvoiceBaseUrl?: string;
  ewaybillBaseUrl?: string;
  gstSession?: boolean;
  einvReady?: boolean;
  ewayReady?: boolean;
  gstReady?: boolean;
  error?: string;
}

export interface ApiResult {
  success: boolean;
  error?: string;
  data?: unknown;
  [k: string]: unknown;
}

export interface EInvoiceRecord {
  irn_id: number;
  voucher_id?: number | null;
  invoice_number: string;
  invoice_date: string;
  buyer_gstin?: string | null;
  irn?: string | null;
  ack_no?: string | null;
  ack_dt?: string | null;
  ewb_no?: string | null;
  status: string;
  created_at: string;
}

export interface EwayRecord {
  ewb_id: number;
  voucher_id?: number | null;
  irn?: string | null;
  ewb_no?: string | null;
  ewb_date?: string | null;
  valid_upto?: string | null;
  status: string;
  created_at: string;
}

export interface GstFilingRecord {
  filing_id: number;
  return_type: string;
  return_period: string;
  status: string;
  arn?: string | null;
  reference_id?: string | null;
  updated_at: string;
}

export interface Transport {
  distance?: number;
  trans_mode?: string;
  trans_id?: string;
  trans_name?: string;
  trans_doc_no?: string;
  trans_doc_dt?: string;
  veh_no?: string;
  veh_type?: string;
}

export interface GstIntegrationsAPI {
  eInvoice: {
    getStatus: (company_id: number) => Promise<IntegrationStatus>;
    getGSTINDetails: (p: { gstin: string }) => Promise<ApiResult>;
    generateIRN: (p: {
      company_id: number;
      voucher_id?: number | null;
      invoice_payload: unknown;
    }) => Promise<ApiResult>;
    generateFromVoucher: (p: { company_id: number; voucher_id: number }) => Promise<ApiResult>;
    getIRNDetails: (p: { irn: string }) => Promise<ApiResult>;
    cancelIRN: (p: {
      company_id: number;
      irn: string;
      cancel_reason: number;
      cancel_remarks: string;
    }) => Promise<ApiResult>;
    getRecords: (
      company_id: number,
    ) => Promise<{ success: boolean; records: EInvoiceRecord[]; error?: string }>;
    getRecordByIRN: (p: { irn: string }) => Promise<ApiResult>;
    getByVoucher: (voucher_id: number) => Promise<{
      success: boolean;
      record?: EInvoiceRecord & { signed_qr_code?: string; ewb_no?: string | null };
      error?: string;
    }>;
  };
  ewayBill: {
    getStatus: (company_id: number) => Promise<IntegrationStatus>;
    generateFromVoucher: (p: {
      company_id: number;
      voucher_id: number;
      transport: Transport;
    }) => Promise<ApiResult>;
    generateByIrn: (p: {
      company_id: number;
      voucher_id?: number | null;
      irn: string;
      transport: Transport;
    }) => Promise<ApiResult>;
    cancel: (p: {
      ewb_no: string;
      cancel_reason: number;
      cancel_remarks: string;
    }) => Promise<ApiResult>;
    get: (p: { ewb_no: string }) => Promise<ApiResult>;
    getByIrn: (irn: string) => Promise<ApiResult>;
    getByVoucher: (voucher_id: number) => Promise<{
      success: boolean;
      record?: EwayRecord & Record<string, unknown>;
      error?: string;
    }>;
    getRecords: (
      company_id: number,
    ) => Promise<{ success: boolean; records: EwayRecord[]; error?: string }>;
    // full e-Way Bill product surface (writes take a NIC-shaped body)
    generate: (body: unknown) => Promise<ApiResult>;
    updatePartB: (body: unknown) => Promise<ApiResult>;
    generateConsolidated: (body: unknown) => Promise<ApiResult>;
    reject: (body: unknown) => Promise<ApiResult>;
    updateTransporter: (body: unknown) => Promise<ApiResult>;
    extendValidity: (body: unknown) => Promise<ApiResult>;
    regenerateConsolidated: (body: unknown) => Promise<ApiResult>;
    initMultiVehicle: (body: unknown) => Promise<ApiResult>;
    addMultiVehicle: (body: unknown) => Promise<ApiResult>;
    changeMultiVehicle: (body: unknown) => Promise<ApiResult>;
    closeEwb: (body: unknown) => Promise<ApiResult>;
    forTransporterByDate: (date: string) => Promise<ApiResult>;
    forTransporterByState: (state_code: string, date: string) => Promise<ApiResult>;
    forTransporterByGstin: (gen_gstin: string, date: string) => Promise<ApiResult>;
    reportByTransporterAssignedDate: (date: string, state_code: string) => Promise<ApiResult>;
    byDate: (date: string) => Promise<ApiResult>;
    rejectedByOthers: (date: string) => Promise<ApiResult>;
    ofOtherParty: (date: string) => Promise<ApiResult>;
    getConsolidated: (trip_sheet_no: string) => Promise<ApiResult>;
    byConsigner: (doc_type: string, doc_no: string) => Promise<ApiResult>;
    getErrorList: () => Promise<ApiResult>;
    getGstinDetails: (gstin: string) => Promise<ApiResult>;
    getTransporterDetails: (trn_no: string) => Promise<ApiResult>;
    getHsnDetails: (hsncode: string) => Promise<ApiResult>;
    ewayRequest: (p: {
      method?: string;
      path: string;
      query?: Record<string, string | number>;
      body?: unknown;
    }) => Promise<ApiResult>;
  };
  gstFiling: {
    getStatus: (company_id: number) => Promise<IntegrationStatus>;
    prepare: (p: {
      company_id: number;
      return_type: string;
      fy_id: number;
      return_period: string;
    }) => Promise<ApiResult>;
    saveToPortal: (p: {
      company_id: number;
      return_type: string;
      fy_id: number;
      return_period: string;
    }) => Promise<ApiResult>;
    fileReturn: (p: {
      company_id: number;
      return_type: string;
      fy_id?: number;
      return_period: string;
      evc_otp: string;
    }) => Promise<ApiResult>;
    requestOtp: (
      company_id: number,
    ) => Promise<{ success: boolean; message?: string; error?: string }>;
    authenticate: (p: {
      company_id: number;
      otp: string;
    }) => Promise<{ success: boolean; error?: string }>;
    requestEvc: (
      company_id: number,
    ) => Promise<{ success: boolean; message?: string; error?: string }>;
    getReturnStatus: (p: { company_id: number; return_period: string }) => Promise<ApiResult>;
    getFilings: (
      company_id: number,
    ) => Promise<{ success: boolean; filings: GstFilingRecord[]; error?: string }>;
    markAsFiled: (p: {
      company_id: number;
      return_type: string;
      fy_id?: number;
      return_period: string;
      arn?: string | null;
      filed_date?: string | null;
    }) => Promise<{
      success: boolean;
      filing_id?: number;
      status?: string;
      arn?: string | null;
      filed_at?: string | null;
      error?: string;
    }>;
    updateArn: (p: {
      company_id: number;
      return_type: string;
      fy_id?: number;
      return_period: string;
      arn: string;
      arn_date?: string | null;
    }) => Promise<{ success: boolean; filing_id?: number; arn?: string | null; error?: string }>;
    getFilingInfo: (p: {
      company_id: number;
      return_type: string;
      return_period: string;
    }) => Promise<{
      success: boolean;
      status?: string;
      arn?: string | null;
      filed_at?: string | null;
      error?: string;
    }>;
    // GST portal read/download surface — the whole /gstapis catalog (needs an OTP session).
    getSection: (
      type: string,
      section: string,
      query?: Record<string, string | number>,
    ) => Promise<ApiResult>;
    getSummary: (type: string, query?: Record<string, string | number>) => Promise<ApiResult>;
    retTrack: (query?: Record<string, string | number>) => Promise<ApiResult>;
    publicSearch: (query?: Record<string, string | number>) => Promise<ApiResult>;
    publicRetTrack: (query?: Record<string, string | number>) => Promise<ApiResult>;
    getPreferences: (query?: Record<string, string | number>) => Promise<ApiResult>;
    urdDetails: (query?: Record<string, string | number>) => Promise<ApiResult>;
    urdValidate: (query?: Record<string, string | number>) => Promise<ApiResult>;
    refreshToken: () => Promise<ApiResult>;
    requestEvcFor: (form_type: string) => Promise<ApiResult>;
    portalRequest: (p: {
      method?: string;
      path: string;
      query?: Record<string, string | number>;
      headers?: Record<string, string>;
      body?: unknown;
    }) => Promise<ApiResult>;
  };
}
