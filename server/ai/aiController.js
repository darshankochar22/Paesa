// IPC controller for the AI copilot. The model key is configured on the SERVER via env
// (see keyStore.js) — never entered in the UI. The renderer only receives a masked status.

const keyStore = require('./keyStore');
const agent = require('./agent');

module.exports = {
  // Non-secret status: { hasKey, baseUrl, model, masked }
  getKeyStatus: async () => keyStore.getStatus(),

  ask: async (event, { prompt, context, history } = {}) => {
    const config = keyStore.getConfig();
    if (!config) {
      return {
        success: false,
        error: 'AI is not configured. Set AI_API_KEY in the server .env and restart.',
      };
    }
    return agent.ask({ config, prompt, context: context || {}, history: history || [] });
  },
};
