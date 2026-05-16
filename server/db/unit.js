const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS units (
    unit_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    symbol              TEXT NOT NULL,
    formal_name         TEXT,
    decimal_places      INTEGER DEFAULT 0,
    unit_quantity_code  TEXT,
    unit_type           TEXT DEFAULT 'Simple',
    is_simple           INTEGER DEFAULT 1,
    is_active           INTEGER DEFAULT 1,
    is_predefined       INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
  )
`);
