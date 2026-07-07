// Minimal, zero-dependency .env loader.
//
// Parses KEY=VALUE lines from a .env file at the project root and injects any keys that
// are NOT already present in process.env. Called once at app start (main.js) so
// developer-side credentials configured in .env — AI_API_KEY, WHATSAPP_*, GST_*,
// RAZORPAY_* — actually reach the main process. Real environment variables always win
// over .env values (we never overwrite an already-set var).
//
// Intentionally not the `dotenv` package: no new dependency, no lockfile churn.

const fs = require('fs');
const path = require('path');

function parseLine(line) {
  const s = line.trim();
  if (!s || s.startsWith('#')) return null;
  const eq = s.indexOf('=');
  if (eq === -1) return null;
  const key = s.slice(0, eq).trim();
  if (!key) return null;
  let val = s.slice(eq + 1).trim();
  // Strip a single layer of surrounding quotes.
  if (
    val.length >= 2 &&
    ((val[0] === '"' && val[val.length - 1] === '"') ||
      (val[0] === "'" && val[val.length - 1] === "'"))
  ) {
    val = val.slice(1, -1);
  }
  return [key, val];
}

// Loads the first .env found among the candidate paths. Returns the path used, or null.
function loadEnv(file) {
  const candidates = file
    ? [file]
    : [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')];
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const kv = parseLine(line);
        if (!kv) continue;
        const [key, val] = kv;
        if (process.env[key] === undefined) process.env[key] = val;
      }
      return p; // stop at the first file found
    } catch (err) {
      console.error('loadEnv failed for', p, err.message);
    }
  }
  return null;
}

module.exports = { loadEnv };
