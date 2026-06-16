// BYOK / BYO-endpoint config store. The model config — provider, API key, base URL, model —
// lives ONLY in the Electron main process; the API key is encrypted at rest with Electron
// safeStorage and is NEVER exposed to the renderer (the UI only sees a masked status + the
// non-secret provider/baseUrl/model). Falls back to an in-memory config when Electron/
// safeStorage is unavailable (e.g. tests).
//
// config shape: { provider: 'anthropic' | 'openai', apiKey, baseUrl?, model? }
//   - anthropic : native Claude via the Anthropic SDK (baseUrl unused)
//   - openai    : ANY OpenAI-compatible /chat/completions endpoint (OpenAI, DeepSeek, Groq,
//                 OpenRouter, local servers, …) — set baseUrl + model accordingly.

const fs = require('fs');
const path = require('path');

let memoryConfig = process.env.AI_API_KEY
  ? { provider: process.env.AI_PROVIDER || 'anthropic', apiKey: process.env.AI_API_KEY, baseUrl: process.env.AI_BASE_URL || null, model: process.env.AI_MODEL || null }
  : null;

function electron() {
  try {
    const e = require('electron');
    if (e && e.app && e.safeStorage) return e;
  } catch {}
  return null;
}

function configPath(e) {
  return path.join(e.app.getPath('userData'), 'ai-config.json');
}

function setConfig({ provider, apiKey, baseUrl = null, model = null } = {}) {
  const clean = { provider: provider || 'anthropic', apiKey: (apiKey || '').trim(), baseUrl: baseUrl || null, model: model || null };
  const e = electron();
  if (!e) { memoryConfig = clean; return true; }
  try {
    const keyField = e.safeStorage.isEncryptionAvailable()
      ? { enc: e.safeStorage.encryptString(clean.apiKey).toString('base64') }
      : { plain: clean.apiKey };
    fs.writeFileSync(configPath(e), JSON.stringify({ provider: clean.provider, baseUrl: clean.baseUrl, model: clean.model, ...keyField }));
    return true;
  } catch (err) {
    console.error('keyStore.setConfig failed:', err);
    return false;
  }
}

function getConfig() {
  if (memoryConfig) return memoryConfig;
  const e = electron();
  if (!e) return null;
  try {
    const p = configPath(e);
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const apiKey = data.enc ? e.safeStorage.decryptString(Buffer.from(data.enc, 'base64')) : (data.plain || null);
    if (!apiKey) return null;
    return { provider: data.provider || 'anthropic', apiKey, baseUrl: data.baseUrl || null, model: data.model || null };
  } catch (err) {
    console.error('keyStore.getConfig failed:', err);
    return null;
  }
}

function clearConfig() {
  memoryConfig = null;
  const e = electron();
  if (!e) return true;
  try {
    const p = configPath(e);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (err) {
    console.error('keyStore.clearConfig failed:', err);
    return false;
  }
}

function maskKey(k) {
  if (!k) return null;
  return k.length <= 11 ? `${k.slice(0, 3)}…` : `${k.slice(0, 7)}…${k.slice(-4)}`;
}

// Non-secret status for the renderer (never includes the raw key).
function getStatus() {
  const cfg = getConfig();
  if (!cfg) return { hasKey: false, provider: null, baseUrl: null, model: null, masked: null };
  return { hasKey: true, provider: cfg.provider, baseUrl: cfg.baseUrl, model: cfg.model, masked: maskKey(cfg.apiKey) };
}

module.exports = { setConfig, getConfig, clearConfig, getStatus, maskKey };
