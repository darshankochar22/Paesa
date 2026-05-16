const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS groups (
    group_id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id                INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                      TEXT NOT NULL,
    alias                     TEXT,
    parent_group_id           INTEGER REFERENCES groups(group_id),
    is_primary                INTEGER DEFAULT 0,
    is_predefined             INTEGER DEFAULT 0,
    nature                    TEXT,
    affect_gross_profit       INTEGER DEFAULT 0,
    behaves_like_subledger    INTEGER DEFAULT 0,
    show_net_debit_credit     INTEGER DEFAULT 0,
    used_for_calculation      INTEGER DEFAULT 0,
    allocation_method         TEXT DEFAULT 'Average Cost',
    gst_rate                  REAL,
    cgst_rate                 REAL,
    sgst_rate                 REAL,
    igst_rate                 REAL,
    hsn_sac_code              TEXT,
    statutory_details         TEXT,
    sort_order                INTEGER DEFAULT 0,
    group_type                TEXT,
    display_order             INTEGER DEFAULT 0,
    is_active                 INTEGER DEFAULT 1,
    created_at                TEXT DEFAULT (datetime('now')),
    updated_at                TEXT DEFAULT (datetime('now'))
  )
`);
