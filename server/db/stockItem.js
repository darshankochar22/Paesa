const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS stock_items (
    item_id             INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    alias               TEXT,
    group_id            INTEGER REFERENCES stock_groups(sg_id),
    category_id         INTEGER REFERENCES stock_categories(sc_id),
    unit_id             INTEGER REFERENCES units(unit_id),
    gst_applicable      TEXT DEFAULT 'Not Applicable',
    hsn_code            TEXT,
    sac_code            TEXT,
    gst_rate            REAL DEFAULT 0,
    cgst_rate           REAL DEFAULT 0,
    sgst_rate           REAL DEFAULT 0,
    igst_rate           REAL DEFAULT 0,
    type_of_supply      TEXT DEFAULT 'Goods',
    rate_of_duty        REAL DEFAULT 0,
    statutory_details   TEXT,
    opening_quantity    REAL DEFAULT 0,
    opening_rate        REAL DEFAULT 0,
    opening_value       REAL DEFAULT 0,
    reorder_level       REAL DEFAULT 0,
    reorder_quantity    REAL DEFAULT 0,
    track_batches       INTEGER DEFAULT 0,
    track_expiry        INTEGER DEFAULT 0,
    is_active           INTEGER DEFAULT 1,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
  )
`);
