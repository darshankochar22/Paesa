const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS stock_groups (
    sg_id                       INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id                  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                        TEXT NOT NULL,
    alias                       TEXT,
    parent_group_id             INTEGER REFERENCES stock_groups(sg_id),
    should_quantities_be_added  INTEGER DEFAULT 1,
    hsn_sac_code                TEXT,
    hsn_sac_description         TEXT,
    gst_rate                    REAL DEFAULT 0,
    cgst_rate                   REAL DEFAULT 0,
    sgst_rate                   REAL DEFAULT 0,
    statutory_details           TEXT,
    is_primary                  INTEGER DEFAULT 0,
    is_active                   INTEGER DEFAULT 1,
    is_predefined               INTEGER DEFAULT 0,
    created_at                  TEXT DEFAULT (datetime('now')),
    updated_at                  TEXT DEFAULT (datetime('now'))
  )
`);
