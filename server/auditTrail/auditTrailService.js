// Audit-trail service — tamper-evident edit log (MCA Rule 11(g)).
//
// record() appends one row per business write and chains it to the previous row
// for the same company_id via SHA-256:
//
//   prev_hash = row_hash of the last audit_trail row for this company_id
//               (or '' if this is the first row for the company)
//   row_hash  = sha256(prev_hash + canonicalJSON({
//                 company_id, entity_type, entity_id, action,
//                 before, after, created_at }))
//
// Any later mutation of a stored row's chained fields breaks verifyChain().
//
// Robustness: record() catches everything internally and returns null on
// failure instead of throwing — audit logging is best-effort and must NEVER
// break the underlying business write (controllers also wrap the call). Reads
// (getAll / getByEntity / verifyChain) follow the same defensive contract.

const crypto = require('crypto');
const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { auditTrail } = require('../db/schema');

// Deterministic JSON: object keys sorted recursively so two logically-equal
// payloads always hash identically regardless of insertion order. Arrays keep
// order (it is meaningful). Values that are already strings (pre-serialized
// snapshots) are passed through as-is by the callers below.
function canonicalJSON(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortKeys(value[key]);
    }
    return out;
  }
  return value;
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Normalize a snapshot to its stored TEXT form (JSON string) or null.
// Accepts an object/array (serialized) or a string already-JSON (kept) or
// null/undefined (-> null).
function toSnapshotText(snapshot) {
  if (snapshot === null || snapshot === undefined) return null;
  if (typeof snapshot === 'string') return snapshot;
  return JSON.stringify(snapshot);
}

// Parse a stored snapshot TEXT back into a value for hashing. Mirrors the parse
// that produced the original row so re-hashing in verifyChain is faithful.
function parseSnapshot(text) {
  if (text === null || text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch (_e) {
    // Non-JSON text (shouldn't happen via record()) — hash the raw string.
    return text;
  }
}

// The exact payload that gets hashed for a row. Kept in ONE place so record()
// and verifyChain() always agree byte-for-byte.
function computeRowHash(prevHash, fields) {
  const payload = canonicalJSON({
    company_id: fields.company_id,
    entity_type: fields.entity_type,
    entity_id: fields.entity_id,
    action: fields.action,
    before: fields.before,
    after: fields.after,
    created_at: fields.created_at,
  });
  return sha256((prevHash || '') + payload);
}

async function lastRowHash(company_id) {
  const rows = await db.all(sql`
    SELECT row_hash FROM ${auditTrail}
    WHERE company_id = ${company_id}
    ORDER BY log_id DESC
    LIMIT 1
  `);
  return rows[0] ? rows[0].row_hash : '';
}

module.exports = {
  // Internal helpers exported for testing / reuse.
  canonicalJSON,
  computeRowHash,

  // Core insert (chains to the previous row). May throw. Because libsql is a single
  // shared connection, calling this between a caller's BEGIN and COMMIT makes the audit
  // row part of that transaction — it commits or rolls back atomically with the write.
  insertRow: async ({ company_id, entity_type, entity_id, action, before, after, user } = {}) => {
    const created_at = new Date().toISOString();
    const beforeText = toSnapshotText(before);
    const afterText = toSnapshotText(after);
    const prev_hash = await lastRowHash(company_id);

    // Hash over the parsed snapshots so verifyChain (which reads them back
    // from TEXT) reproduces the identical payload.
    const row_hash = computeRowHash(prev_hash, {
      company_id,
      entity_type,
      entity_id: entity_id ?? null,
      action,
      before: parseSnapshot(beforeText),
      after: parseSnapshot(afterText),
      created_at,
    });

    const rows = await db.all(sql`
      INSERT INTO ${auditTrail}
        (company_id, entity_type, entity_id, action, user,
         before_snapshot, after_snapshot, prev_hash, row_hash, created_at)
      VALUES (
        ${company_id}, ${entity_type}, ${entity_id ?? null}, ${action}, ${user ?? 'system'},
        ${beforeText}, ${afterText}, ${prev_hash}, ${row_hash}, ${created_at}
      )
      RETURNING *
    `);
    return rows[0] || null;
  },

  // TRANSACTIONAL: call this INSIDE a service's open transaction (between BEGIN and
  // COMMIT). It throws on failure so the caller's catch rolls back BOTH the business
  // write and the audit row together — no write without its audit row, and vice-versa.
  recordInTx: async function (meta) {
    return this.insertRow(meta);
  },

  // Append an audit row. BEST-EFFORT: never throws to the caller — returns the
  // inserted row on success, or null on any failure (logged). Use for non-transactional
  // (masters) paths where a logging failure must not block the business operation.
  record: async function (meta) {
    try {
      return await this.insertRow(meta);
    } catch (err) {
      console.error('Error in auditTrail.record:', err);
      return null;
    }
  },

  // All audit rows for a company, newest first.
  getAll: async (company_id, { limit } = {}) => {
    try {
      const lim = Number.isFinite(limit) ? limit : null;
      const rows = lim != null
        ? await db.all(sql`
            SELECT * FROM ${auditTrail}
            WHERE company_id = ${company_id}
            ORDER BY log_id DESC
            LIMIT ${lim}
          `)
        : await db.all(sql`
            SELECT * FROM ${auditTrail}
            WHERE company_id = ${company_id}
            ORDER BY log_id DESC
          `);
      return rows;
    } catch (err) {
      console.error('Error in auditTrail.getAll:', err);
      return [];
    }
  },

  // Audit rows for one entity, oldest first (chronological history).
  getByEntity: async (company_id, entity_type, entity_id) => {
    try {
      const rows = await db.all(sql`
        SELECT * FROM ${auditTrail}
        WHERE company_id = ${company_id}
          AND entity_type = ${entity_type}
          AND entity_id = ${entity_id}
        ORDER BY log_id ASC
      `);
      return rows;
    } catch (err) {
      console.error('Error in auditTrail.getByEntity:', err);
      return [];
    }
  },

  // Recompute the per-company hash chain in log_id order and report whether it
  // is intact. brokenAt is the log_id of the first row whose stored row_hash
  // (or prev_hash linkage) does not match the recomputation.
  verifyChain: async (company_id) => {
    try {
      const rows = await db.all(sql`
        SELECT * FROM ${auditTrail}
        WHERE company_id = ${company_id}
        ORDER BY log_id ASC
      `);

      let prev = '';
      for (const row of rows) {
        // The stored prev_hash must equal the running chain value.
        if ((row.prev_hash || '') !== prev) {
          return { intact: false, brokenAt: row.log_id };
        }
        const expected = computeRowHash(prev, {
          company_id: row.company_id,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          action: row.action,
          before: parseSnapshot(row.before_snapshot),
          after: parseSnapshot(row.after_snapshot),
          created_at: row.created_at,
        });
        if (expected !== row.row_hash) {
          return { intact: false, brokenAt: row.log_id };
        }
        prev = row.row_hash;
      }
      return { intact: true };
    } catch (err) {
      console.error('Error in auditTrail.verifyChain:', err);
      return { intact: false };
    }
  },
};
