// Renderer-facing types for the Tally integration IPC namespace
// (window.api.tally.*). Mirrors server/integrations/tally/tallyController.js.
//
// Every method accepts EITHER a live Tally endpoint ({ host, port }) or a raw
// { xml } string (parse-only), so the connector works without a live Tally.

// Per-entity outcome returned by the importer.
export interface TallyImportSummary {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

// Dry-run counts (no DB writes).
export interface TallyPreview {
  meta: {
    source: string;
    requestType: string | null;
    collectionType: string | null;
  } | null;
  groups: number;
  units: number;
  ledgers: number;
  stockItems: number;
  vouchers: number;
  balancedVouchers: number;
  unbalancedVouchers: number;
}

export interface TallyTestConnectionResult {
  success: boolean;
  reachable: boolean;
  company?: string | null;
  error?: string;
  code?: string;
  status?: number;
}

export interface TallyPreviewResult {
  success: boolean;
  preview?: TallyPreview;
  error?: string;
  code?: string;
  status?: number;
}

export interface TallyImportMastersResult {
  success: boolean;
  groups?: TallyImportSummary;
  units?: TallyImportSummary;
  ledgers?: TallyImportSummary;
  stockItems?: TallyImportSummary;
  error?: string;
  code?: string;
  status?: number;
}

export interface TallyImportVouchersResult {
  success: boolean;
  vouchers?: TallyImportSummary;
  error?: string;
  code?: string;
  status?: number;
}

// Either a live endpoint or raw XML.
export interface TallyEndpointParams {
  host?: string;
  port?: number;
}
export interface TallyXmlParams {
  xml: string;
}
export interface TallyDateRangeParams extends TallyEndpointParams {
  from_date?: string;
  to_date?: string;
}

export interface TallyAPI {
  tally: {
    testConnection: (params: TallyEndpointParams) => Promise<TallyTestConnectionResult>;
    preview: (
      params: TallyXmlParams | TallyDateRangeParams
    ) => Promise<TallyPreviewResult>;
    importMasters: (
      params: ({ company_id: number; fy_id?: number }) & (TallyXmlParams | TallyEndpointParams)
    ) => Promise<TallyImportMastersResult>;
    importVouchers: (
      params: ({ company_id: number; fy_id: number }) & (TallyXmlParams | TallyDateRangeParams)
    ) => Promise<TallyImportVouchersResult>;
  };
}
