const FEATURE_GROUPS = [
  { group_key: 'accounts',   group_name: 'Accounting Features',          online_access: 0, display_order: 1 },
  { group_key: 'inventory',  group_name: 'Inventory Features',           online_access: 0, display_order: 2 },
  { group_key: 'gst',        group_name: 'GST & Statutory Features',     online_access: 0, display_order: 3 },
  { group_key: 'payroll',    group_name: 'Payroll Features',             online_access: 0, display_order: 4 },
  { group_key: 'banking',    group_name: 'Banking Features',             online_access: 0, display_order: 5 },
  { group_key: 'online',     group_name: 'Online & Connected Features',  online_access: 1, display_order: 6 },
];

const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS feature_groups (
      feature_group_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      group_key         TEXT NOT NULL UNIQUE,
      group_name        TEXT NOT NULL,
      online_access     INTEGER DEFAULT 0,
      display_order     INTEGER DEFAULT 0,
      is_active         INTEGER DEFAULT 1
    )
  `);

  for (const g of FEATURE_GROUPS) {
    await db.execute(`
      INSERT OR IGNORE INTO feature_groups (group_key, group_name, online_access, display_order, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [g.group_key, g.group_name, g.online_access, g.display_order]);
  }
};

module.exports = { init };