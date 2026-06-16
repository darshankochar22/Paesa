// IPC controller for the AI copilot + BYOK. The renderer never receives the raw key —
// only a masked status. Lives in the main process.

const keyStore = require('./keyStore');
const agent = require('./agent');

module.exports = {
  // BYOK key management
  getKeyStatus: async () => {
    const key = keyStore.getKey();
    const provider = key ? agent.providerFor(key) : null;
    return {
      hasKey: !!key,
      masked: keyStore.maskedKey(),
      provider,
      model: provider ? agent.modelFor(provider) : null,
    };
  },
  setKey: async (event, { apiKey } = {}) => {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 20) {
      return { success: false, error: 'Enter a valid API key (Anthropic sk-ant-… or a Google Gemini key).' };
    }
    const key = apiKey.trim();
    const ok = keyStore.setKey(key);
    return ok
      ? { success: true, masked: keyStore.maskedKey(), provider: agent.providerFor(key) }
      : { success: false, error: 'Failed to store key.' };
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
