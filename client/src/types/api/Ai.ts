export interface AiProposal {
  action: string;
  channel: string;
  args: Record<string, any>;
  summary: string;
  requiresApproval: boolean;
}

export interface AiAPI {
  ai: {
    getKeyStatus: () => Promise<{ hasKey: boolean; masked: string | null; model: string | null; provider: "anthropic" | "gemini" | null }>;
    setKey: (apiKey: string) => Promise<{ success: boolean; masked?: string; provider?: string; error?: string }>;
    clearKey: () => Promise<{ success: boolean }>;
    testKey: (apiKey?: string) => Promise<{ success: boolean; error?: string }>;
    ask: (payload: {
      prompt: string;
      context?: { company_id?: number; fy_id?: number };
      history?: { role: "user" | "assistant"; text: string }[];
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
