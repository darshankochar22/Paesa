const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_lists (
      price_list_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id        INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      stock_group       TEXT    NOT NULL DEFAULT 'All Items',
      price_level       TEXT    NOT NULL,
      applicable_from   TEXT    NOT NULL,
      is_active         INTEGER DEFAULT 1,
      created_at        TEXT    DEFAULT (datetime('now')),
      updated_at        TEXT    DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_list_lines (
      line_id           INTEGER PRIMARY KEY AUTOINCREMENT,
      price_list_id     INTEGER NOT NULL REFERENCES price_lists(price_list_id) ON DELETE CASCADE,
      item_id           INTEGER REFERENCES stock_items(item_id) ON DELETE SET NULL,
      particulars       TEXT    NOT NULL,
      qty_from          REAL    DEFAULT 0,
      qty_less_than     REAL    DEFAULT 0,
      rate              REAL    DEFAULT 0,
      disc_percent      REAL    DEFAULT 0,
      sort_order        INTEGER DEFAULT 0,
      created_at        TEXT    DEFAULT (datetime('now')),
      updated_at        TEXT    DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };