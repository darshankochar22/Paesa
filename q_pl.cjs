const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:C:/Users/Pc/AppData/Roaming/startup/startup.db' });
(async () => {
  const t = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%price_level%'",
  );
  console.log('TABLES:', JSON.stringify(t.rows));
  for (const row of t.rows) {
    try {
      const r = await db.execute(`SELECT * FROM ${row.name} LIMIT 20`);
      console.log(row.name, '=>', JSON.stringify(r.rows));
    } catch (e) {
      console.log(row.name, 'err', e.message);
    }
  }
})()
  .catch((e) => console.error(e))
  .finally(() => process.exit());
