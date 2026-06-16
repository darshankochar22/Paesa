// IPC controller for the AI copilot + BYO model config. The renderer never receives the raw
// key — only a masked status + the non-secret provider/baseUrl/model. Lives in the main process.

const keyStore = require('./keyStore');
const agent = require('./agent');

const PROVIDERS = ['anthropic', 'openai'];

module.exports = {
  // Non-secret status: { hasKey, provider, baseUrl, model, masked }
  getKeyStatus: async () => keyStore.getStatus(),

  // setKey now accepts a full config: { provider, apiKey, baseUrl?, model? }
  setKey: async (event, cfg = {}) => {
    const { provider, apiKey, baseUrl, model } = cfg;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 16) {
      return { success: false, error: 'Enter a valid API key.' };
    }
    const prov = PROVIDERS.includes(provider) ? provider : agent.detectProvider(apiKey);
    if (prov === 'openai' && (!baseUrl || !/^https?:\/\//.test(baseUrl))) {
      return { success: false, error: 'An OpenAI-compatible provider needs a base URL (e.g. https://api.openai.com/v1 or https://api.deepseek.com/v1).' };
    }
    const ok = keyStore.setConfig({ provider: prov, apiKey: apiKey.trim(), baseUrl: baseUrl || null, model: model || null });
    return ok ? { success: true, ...keyStore.getStatus() } : { success: false, error: 'Failed to store config.' };
  },

  clearKey: async () => ({ success: keyStore.clearConfig() }),

  // Test the stored config, or a config passed in (without saving it).
  testKey: async (event, cfg = {}) => {
    const config = (cfg && cfg.apiKey) ? cfg : keyStore.getConfig();
    return agent.testConfig(config);
  },

  ask: async (event, { prompt, context, history } = {}) => {
    const config = keyStore.getConfig();
    if (!config) return { success: false, error: 'No model configured. Add a provider + API key in Settings.' };
    return agent.ask({ config, prompt, context: context || {}, history: history || [] });
  },
};
