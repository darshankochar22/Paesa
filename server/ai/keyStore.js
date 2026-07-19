// AI model config — developer-side, environment-only.
//
// The key is provided by the OPERATOR via environment variables (loaded from .env at app
// start by server/loadEnv.js), NOT entered through the app UI — the same approach as the
// WhatsApp (WHATSAPP_API_KEY) and GST integrations. The renderer only ever sees a masked,
// non-secret status; the raw key never leaves the main process.
//
//   AI_API_KEY    provider secret, e.g. a Groq key (gsk_…)            [required]
//   AI_BASE_URL   OpenAI-compatible /chat/completions endpoint        [default: Groq]
//   AI_MODEL      model id served by that endpoint                    [default below]
//
// Any OpenAI-compatible provider works by pointing AI_BASE_URL + AI_MODEL at it
// (Groq, DeepSeek, OpenRouter, Together, a local server, …).

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile'; // tool-use capable; override via AI_MODEL

// Gemini's OpenAI-compatible surface — lets the same /chat/completions agent loop drive
// Gemini (function-calling supported) when only a Google key is configured.
const GEMINI_OPENAI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

// Returns { apiKey, baseUrl, model } or null when no key is configured. AI_API_KEY (any
// OpenAI-compatible provider) wins; otherwise fall back to GEMINI_API_KEY so a single
// Google key powers both the bill-scan and the Copilot chat.
function getConfig() {
  const aiKey = (process.env.AI_API_KEY || '').trim();
  if (aiKey) {
    return {
      apiKey: aiKey,
      baseUrl: (process.env.AI_BASE_URL || GROQ_BASE_URL).trim(),
      model: (process.env.AI_MODEL || GROQ_DEFAULT_MODEL).trim(),
    };
  }
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (geminiKey) {
    return {
      apiKey: geminiKey,
      baseUrl: (process.env.AI_BASE_URL || GEMINI_OPENAI_BASE_URL).trim(),
      model: (process.env.AI_MODEL || process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL).trim(),
    };
  }
  return null;
}

function maskKey(k) {
  if (!k) return null;
  return k.length <= 11 ? `${k.slice(0, 3)}…` : `${k.slice(0, 7)}…${k.slice(-4)}`;
}

// Non-secret status for the renderer (never includes the raw key).
function getStatus() {
  const cfg = getConfig();
  if (!cfg) return { hasKey: false, baseUrl: null, model: null, masked: null };
  return { hasKey: true, baseUrl: cfg.baseUrl, model: cfg.model, masked: maskKey(cfg.apiKey) };
}

module.exports = { getConfig, getStatus, maskKey, GROQ_BASE_URL, GROQ_DEFAULT_MODEL };
