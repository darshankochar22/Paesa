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
  };
}
