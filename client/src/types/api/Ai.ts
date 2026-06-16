export interface AiProposal {
  action: string;
  channel: string;
  args: Record<string, any>;
  summary: string;
  requiresApproval: boolean;
}

export type AiProvider = "anthropic" | "openai";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
}

export interface AiStatus {
  hasKey: boolean;
  provider: AiProvider | null;
  baseUrl: string | null;
  model: string | null;
  masked: string | null;
}

export interface AiAPI {
  ai: {
    getKeyStatus: () => Promise<AiStatus>;
    setKey: (config: AiConfig) => Promise<{ success: boolean; error?: string } & Partial<AiStatus>>;
    clearKey: () => Promise<{ success: boolean }>;
    testKey: (config?: Partial<AiConfig>) => Promise<{ success: boolean; provider?: string; model?: string; error?: string }>;
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
