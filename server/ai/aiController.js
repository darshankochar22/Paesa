// IPC controller for the AI copilot + BYOK. The renderer never receives the raw key —
// only a masked status. Lives in the main process.

const keyStore = require('./keyStore');
const agent = require('./agent');

module.exports = {
  // BYOK key management
  getKeyStatus: async () => ({
    hasKey: keyStore.hasKey(),
    masked: keyStore.maskedKey(),
    model: agent.DEFAULT_MODEL,
  }),
  setKey: async (event, { apiKey } = {}) => {
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.startsWith('sk-')) {
      return { success: false, error: 'Enter a valid Anthropic API key (starts with sk-).' };
    }
    const ok = keyStore.setKey(apiKey.trim());
    return ok ? { success: true, masked: keyStore.maskedKey() } : { success: false, error: 'Failed to store key.' };
  },
  clearKey: async () => ({ success: keyStore.clearKey() }),
  testKey: async (event, { apiKey } = {}) => agent.testKey(apiKey ? apiKey.trim() : keyStore.getKey()),

  // Copilot
  ask: async (event, { prompt, context, history } = {}) => {
    const apiKey = keyStore.getKey();
    if (!apiKey) return { success: false, error: 'No API key. Add your Anthropic key in Settings.' };
    return agent.ask({ apiKey, prompt, context: context || {}, history: history || [] });
  },
};
