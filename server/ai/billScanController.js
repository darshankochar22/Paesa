// IPC controller for AI bill-scan → draft voucher.
//
// Takes an uploaded bill/invoice image, asks Gemini (vision) to extract a voucher, then
// resolves the AI's ledger/item NAMES to this company's existing master ids by similar
// name. Returns a DRAFT only — nothing is written. The renderer opens the draft in the
// real voucher entry screen for review; the final save goes through the normal voucher
// create path (window.api.automation.createVoucher / voucher.create).

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const gemini = require('./geminiClient');

const today = () => new Date().toISOString().slice(0, 10);

// Normalise a name for fuzzy matching: lowercase, collapse whitespace, drop punctuation
// and common company suffixes so "M/s. Jeetu Traders Pvt Ltd" ≈ "Jeetu Traders".
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b(m\/s|pvt|private|ltd|limited|llp|inc|co|company|and|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Resolve a single name to a master row using a tiered match: exact → normalised-exact →
// containment (either direction) → token overlap. Returns { id, matched, score } or null.
function bestMatch(name, rows, idKey) {
  if (!name) return null;
  const target = norm(name);
  if (!target) return null;
  let best = null;
  for (const r of rows) {
    const cand = norm(r.name);
    if (!cand) continue;
    let score = 0;
    if (cand === target) score = 1;
    else if (cand.includes(target) || target.includes(cand)) score = 0.8;
    else {
      const a = new Set(target.split(' '));
      const b = new Set(cand.split(' '));
      const overlap = [...a].filter((t) => b.has(t)).length;
      if (overlap) score = 0.4 + 0.4 * (overlap / Math.max(a.size, b.size));
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: Number(r[idKey]), matched: r.name, score };
    }
  }
  // Only accept confident matches; weak token overlap stays unresolved for the user to pick.
  return best && best.score >= 0.6 ? best : null;
}

module.exports = {
  // Non-secret Gemini status for the renderer.
  getStatus: async () => gemini.getStatus(),

  // Scan a bill image → draft voucher (NOT saved). Payload:
  //   { company_id, fy_id, imageBase64, mimeType }
  scanBill: async (event, { company_id, fy_id, imageBase64, mimeType } = {}) => {
    if (!gemini.getConfig()) {
      return {
        success: false,
        error: 'Gemini is not configured. Set GEMINI_API_KEY in the server .env and restart.',
      };
    }
    if (!company_id) return { success: false, error: 'No active company.' };
    if (!imageBase64) return { success: false, error: 'No image was provided.' };

    // Existing masters, so the model maps to real names and we can resolve ids.
    let ledgers = [];
    let items = [];
    try {
      ledgers = await db.all(
        sql`SELECT ledger_id, name FROM ledgers WHERE company_id = ${company_id} ORDER BY name`,
      );
      items = await db.all(
        sql`SELECT item_id, name FROM stock_items WHERE company_id = ${company_id} ORDER BY name`,
      );
    } catch (err) {
      return { success: false, error: `Master lookup failed: ${err.message}` };
    }

    // Ask Gemini to read the bill.
    let draft;
    try {
      draft = await gemini.scanBillToVoucher({
        imageBase64,
        mimeType,
        ledgerNames: ledgers.map((l) => l.name),
        itemNames: items.map((i) => i.name),
        today: today(),
      });
    } catch (err) {
      return { success: false, error: err.message || 'Gemini scan failed.' };
    }

    // Resolve names → ids by similar name; collect what we couldn't match for the UI.
    const unresolvedLedgers = [];
    const unresolvedItems = [];
    const warnings = Array.isArray(draft.notes) ? [] : draft.notes ? [String(draft.notes)] : [];

    if (Array.isArray(draft.entries)) {
      for (const e of draft.entries) {
        if (!e || !e.ledger_name) continue;
        const m = bestMatch(e.ledger_name, ledgers, 'ledger_id');
        if (m) {
          e.ledger_id = m.id;
          if (m.score < 1)
            warnings.push(`Ledger "${e.ledger_name}" matched to existing "${m.matched}".`);
          e.ledger_name = m.matched; // snap to the real master name
        } else if (!unresolvedLedgers.includes(e.ledger_name)) {
          unresolvedLedgers.push(e.ledger_name);
        }
      }
    }

    if (draft.party_name) {
      const m = bestMatch(draft.party_name, ledgers, 'ledger_id');
      if (m) {
        draft.party_ledger_id = m.id;
        draft.party_name = m.matched;
      } else if (!unresolvedLedgers.includes(draft.party_name)) {
        unresolvedLedgers.push(draft.party_name);
      }
    }

    if (Array.isArray(draft.stock_entries)) {
      for (const s of draft.stock_entries) {
        if (!s || !s.item_name) continue;
        const m = bestMatch(s.item_name, items, 'item_id');
        if (m) {
          s.stock_item_id = m.id;
          s.item_name = m.matched;
        } else if (!unresolvedItems.includes(s.item_name)) {
          unresolvedItems.push(s.item_name);
        }
      }
    }

    // Fill in the company/fy the entry screen needs; leave everything else for review.
    draft.company_id = Number(company_id);
    if (fy_id != null) draft.fy_id = Number(fy_id);

    return {
      success: true,
      model: gemini.getStatus().model,
      draft,
      unresolvedLedgers,
      unresolvedItems,
      warnings,
    };
  },
};
