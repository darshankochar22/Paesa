// IPC controller for the AI copilot. The model key is configured on the SERVER via env
// (see keyStore.js) — never entered in the UI. The renderer only receives a masked status.

const keyStore = require('./keyStore');
const agent = require('./agent');

// Tools read the context directly, so keep only the keys they use, with the types they
// expect: ids as numbers, and the Tally folder as a path string (set from the OS folder
// picker in the renderer, never typed).
const normalizeContext = (context = {}) => {
  const id = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));
  return {
    company_id: id(context.company_id),
    fy_id: id(context.fy_id),
    tally_folder:
      typeof context.tally_folder === 'string' && context.tally_folder
        ? context.tally_folder
        : undefined,
  };
};

module.exports = {
  // Non-secret status: { hasKey, baseUrl, model, masked }
  getKeyStatus: async () => keyStore.getStatus(),

  ask: async (event, { prompt, context, history } = {}) => {
    const config = keyStore.getConfig();
    if (!config) {
      return {
        success: false,
        error:
          'AI is not configured. Set AI_API_KEY (or GEMINI_API_KEY) in the server .env and restart.',
      };
    }
    return agent.ask({
      config,
      prompt,
      context: normalizeContext(context || {}),
      history: history || [],
    });
  },

  normalizeContext,
};
