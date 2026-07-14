const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { tallyFeatures } = require('../db/schema');

// Read a single F11 (tally_features) flag for a company, server-side. Defaults to
// ENABLED (true) when the row/flag is missing — matching the client's
// isFeatureEnabled convention (null/unset = on; only a stored 0 = off). Cheap
// single-column read (no seeding), safe to call from hot paths like voucher save.
async function isFeatureEnabled(company_id, column) {
  try {
    const rows = await db.all(
      sql`SELECT ${sql.raw(column)} AS val FROM ${tallyFeatures} WHERE ${tallyFeatures.companyId} = ${company_id}`,
    );
    if (!rows.length) return true;
    return Number(rows[0].val) !== 0;
  } catch (_) {
    return true;
  }
}

module.exports = { isFeatureEnabled };
