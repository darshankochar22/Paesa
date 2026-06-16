// BYOK key storage. The Anthropic API key lives ONLY in the Electron main process,
// encrypted at rest with Electron safeStorage. It is never exposed to the renderer
// (the UI only ever sees a masked status). Falls back to an in-memory key when
// Electron/safeStorage is unavailable (e.g. tests).

const fs = require('fs');
const path = require('path');

let memoryKey = process.env.ANTHROPIC_API_KEY || null;

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

function setKey(key) {
  const e = electron();
  if (!e) { memoryKey = key; return true; }
  try {
    const payload = e.safeStorage.isEncryptionAvailable()
      ? { enc: e.safeStorage.encryptString(key).toString('base64') }
      : { plain: key };
    fs.writeFileSync(configPath(e), JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error('keyStore.setKey failed:', err);
    return false;
  }
}

function getKey() {
  if (memoryKey) return memoryKey;
  const e = electron();
  if (!e) return null;
  try {
    const p = configPath(e);
    if (!fs.existsSync(p)) return null;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.enc) return e.safeStorage.decryptString(Buffer.from(data.enc, 'base64'));
    return data.plain || null;
  } catch (err) {
    console.error('keyStore.getKey failed:', err);
    return null;
  }
}

function clearKey() {
  memoryKey = null;
  const e = electron();
  if (!e) return true;
  try {
    const p = configPath(e);
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return true;
  } catch (err) {
    console.error('keyStore.clearKey failed:', err);
    return false;
  }
}

function hasKey() {
  return !!getKey();
}

// Masked form for the renderer status (e.g. "sk-ant-…a1b2").
function maskedKey() {
  const k = getKey();
  if (!k) return null;
  return `${k.slice(0, 7)}…${k.slice(-4)}`;
}

module.exports = { setKey, getKey, clearKey, hasKey, maskedKey };
