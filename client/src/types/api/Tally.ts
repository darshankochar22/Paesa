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

// ---- TallyPrime native-folder (.1800) import --------------------------------

export interface TallyFolderPickResult {
  success: boolean;
  canceled?: boolean;
  folder?: string;
  dataDir?: string | null;
  valid?: boolean;
  error?: string | null;
}

export interface TallyFolderPreviewResult {
  success: boolean;
  dataDir?: string;
  preview?: TallyPreview;
  error?: string;
}

export interface TallyFolderImportSummary {
  company: { company_id: number; name: string; created: boolean };
  financialYears: { start: string; fy_id: number }[];
  masters: Record<string, TallyImportSummary>;
  vouchers: TallyImportSummary;
}

export interface TallyFolderImportResult {
  success: boolean;
  summary?: TallyFolderImportSummary;
  error?: string;
}

export interface TallyFolderImportProgress {
  phase: 'extract' | 'extracted' | 'company' | 'masters' | 'vouchers';
  done?: number;
  total?: number;
  fyStart?: string;
  name?: string;
  preview?: TallyPreview;
}

export interface TallyAPI {
  tally: {
    testConnection: (params: TallyEndpointParams) => Promise<TallyTestConnectionResult>;
    preview: (params: TallyXmlParams | TallyDateRangeParams) => Promise<TallyPreviewResult>;
    importMasters: (
      params: { company_id: number; fy_id?: number } & (TallyXmlParams | TallyEndpointParams),
    ) => Promise<TallyImportMastersResult>;
    importVouchers: (
      params: { company_id: number; fy_id: number } & (TallyXmlParams | TallyDateRangeParams),
    ) => Promise<TallyImportVouchersResult>;
    // TallyPrime native-folder (.1800) import
    pickFolder: () => Promise<TallyFolderPickResult>;
    previewFolder: (params: { folder: string }) => Promise<TallyFolderPreviewResult>;
    importFolder: (params: {
      folder: string;
      company_name: string;
      fy_start: string;
      preserve_numbers?: boolean;
    }) => Promise<TallyFolderImportResult>;
    onImportProgress: (cb: (info: TallyFolderImportProgress) => void) => () => void;
    /**
     * Repairs the GST fields a Tally import leaves empty (unit UQC, GST tax-ledger
     * tagging, per-line gst_rate). New imports fill these inline — this is for companies
     * imported earlier. `dry_run` reports what would change without writing.
     */
    repairImportedGst: (params: {
      company_id: number;
      fy_id: number;
      dry_run?: boolean;
    }) => Promise<{
      success: boolean;
      dryRun?: boolean;
      uqc?: { mapped: number; unmapped: string[] };
      ledgers?: { tagged: number };
      rates?: {
        vouchers: number;
        voucherRate: number;
        perLineMasterRate: number;
        needsReview: number;
      };
      error?: string;
    }>;
  };
}
