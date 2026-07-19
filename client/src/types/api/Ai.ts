export interface AiProposal {
  action: string;
  channel: string;
  args: Record<string, any>;
  summary: string;
  requiresApproval: boolean;
}

// Non-secret status surfaced to the renderer. The API key is configured on the server
// via env (AI_API_KEY) — never entered in the UI — so there is no setKey/clearKey here.
export interface AiStatus {
  hasKey: boolean;
  baseUrl: string | null;
  model: string | null;
  masked: string | null;
}

// Gemini bill-scan status (own key: GEMINI_API_KEY).
export interface GeminiStatus {
  hasKey: boolean;
  model: string | null;
  masked: string | null;
}

// One AI-drafted voucher, in the snake_case shape hydrateVoucherForm consumes. Names are
// pre-resolved to existing ledger_id/stock_item_id server-side; unresolved names are listed
// separately for the user to pick in the entry screen.
export interface ScannedVoucherDraft {
  company_id?: number;
  fy_id?: number;
  voucher_type: string;
  date: string;
  party_name?: string;
  party_ledger_id?: number;
  reference_number?: string;
  narration?: string;
  entries?: Array<{ ledger_name?: string; ledger_id?: number; type: 'Dr' | 'Cr'; amount: number }>;
  stock_entries?: Array<{
    item_name?: string;
    stock_item_id?: number;
    quantity?: number;
    rate?: number;
    amount?: number;
  }>;
  tax_amount?: number;
  total_amount?: number;
  confidence?: number;
  notes?: string;
}

export interface ScanBillResult {
  success: boolean;
  error?: string;
  model?: string;
  draft?: ScannedVoucherDraft;
  unresolvedLedgers?: string[];
  unresolvedItems?: string[];
  warnings?: string[];
}

export interface AiAPI {
  ai: {
    getKeyStatus: () => Promise<AiStatus>;
    ask: (payload: {
      prompt: string;
      context?: { company_id?: number; fy_id?: number };
      history?: { role: 'user' | 'assistant'; text: string }[];
    }) => Promise<{
      success: boolean;
      text?: string;
      error?: string;
      proposals?: AiProposal[];
      rounds?: number;
      capped?: boolean;
    }>;
    scanBillStatus: () => Promise<GeminiStatus>;
    scanBill: (payload: {
      company_id?: number;
      fy_id?: number;
      imageBase64: string;
      mimeType: string;
    }) => Promise<ScanBillResult>;
  };
}
