const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:C:/Users/Pc/AppData/Roaming/startup/startup.db' });
(async () => {
  const cols = await db.execute('PRAGMA table_info(tally_features)');
  const names = cols.rows
    .filter((r) => /price|inventory/i.test(r.name))
    .map((r) => ({ name: r.name, dflt: r.dflt_value }));
  console.log('RELEVANT COLS:', JSON.stringify(names, null, 2));
  const r = await db.execute(
    'SELECT company_id, maintain_inventory, enable_multiple_price_levels FROM tally_features ORDER BY company_id',
  );
  console.log('FEATURES:', JSON.stringify(r.rows, null, 2));
})()
  .catch((e) => console.error(e))
  .finally(() => process.exit());
