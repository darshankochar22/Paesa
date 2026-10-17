// IPC controller for in-app assisted entry. LLM-agnostic: it exposes the voucher
// "response pattern" (schema + examples), validates a generated payload, and creates
// a real voucher through the existing voucherService. This is the endpoint an LLM
// (or any generator) plugs into later — today it's driven from the Copilot page by hand.

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const voucherService = require('../voucher/voucherService');
const {
  VOUCHER_TYPES,
  VOUCHER_SCHEMA,
  buildExamples,
  validatePayload,
} = require('./voucherContract');

const today = () => new Date().toISOString().slice(0, 10);

// Resolve entry/party ledger NAMES to ids within the company so we never write a
// dangling entry. Mutates payload in place; returns the list of names we couldn't find.
async function resolveLedgerIds(companyId, payload) {
  const unresolved = new Set();
  const cache = new Map();

  const resolve = async (name) => {
    const key = String(name).trim().toLowerCase();
    if (cache.has(key)) return cache.get(key);
    const rows = await db.all(
      sql`SELECT ledger_id FROM ledgers WHERE company_id = ${companyId} AND lower(name) = ${key} LIMIT 1`,
    );
    const id = rows.length ? Number(rows[0].ledger_id) : null;
    cache.set(key, id);
    return id;
  };

  if (Array.isArray(payload.entries)) {
    for (const e of payload.entries) {
      if (e && e.ledger_id == null && e.ledger_name) {
        const id = await resolve(e.ledger_name);
        if (id == null) unresolved.add(e.ledger_name);
        else e.ledger_id = id;
      }
    }
  }
  // Party is optional — resolve when we can, never hard-fail on it.
  if (payload.party_ledger_id == null && payload.party_name) {
    const id = await resolve(payload.party_name);
    if (id != null) payload.party_ledger_id = id;
  }

  return Array.from(unresolved);
}

module.exports = {
  // The "response pattern": shape + worked examples a generator can copy.
  getVoucherSchema: async () => ({
    schema: VOUCHER_SCHEMA,
    examples: buildExamples(today()),
    voucherTypes: VOUCHER_TYPES,
    rules: VOUCHER_SCHEMA.rules,
  }),

  // Shape-only check, no write — fast feedback for a generator.
  validateVoucher: async (event, payload = {}) => validatePayload(payload),

  // Validate → resolve ledger names → create. Returns
  // { success, voucher_id?, voucher_number?, errors?, warnings? }.
  createVoucher: async (event, payload = {}) => {
    const v = validatePayload(payload);
    if (!v.ok) return { success: false, errors: v.errors, warnings: v.warnings };

    let unresolved = [];
    try {
      unresolved = await resolveLedgerIds(payload.company_id, payload);
    } catch (err) {
      return {
        success: false,
        errors: [`Ledger lookup failed: ${err.message}`],
        warnings: v.warnings,
      };
    }
    if (unresolved.length) {
      return {
        success: false,
        warnings: v.warnings,
        errors: unresolved.map(
          (n) =>
            `No ledger named "${n}" exists in this company. Use an existing ledger name, or set ledger_id.`,
        ),
      };
    }

    const res = await voucherService.create(payload);
    if (res && res.success) {
      // voucherService.create returns the saved row as `voucher`.
      return {
        success: true,
        voucher_id: res.voucher ? Number(res.voucher.voucher_id) : undefined,
        voucher_number: res.voucher ? res.voucher.voucher_number : undefined,
        warnings: v.warnings,
      };
    }
    return { success: false, errors: [res?.error || 'Create failed.'], warnings: v.warnings };
  },
};
