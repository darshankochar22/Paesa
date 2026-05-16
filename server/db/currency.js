const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS currencies (
    currency_id                           INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id                            INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                                  TEXT NOT NULL,
    formal_name                           TEXT,
    iso_code                              TEXT NOT NULL,
    symbol                                TEXT,
    decimal_places                        INTEGER DEFAULT 2,
    decimal_symbol                        TEXT DEFAULT '.',
    decimal_places_in_words               TEXT,
    suffix_symbol_to_amount               INTEGER DEFAULT 0,
    show_amount_in_millions               INTEGER DEFAULT 0,
    word_representing_amount_after_decimal TEXT,
    add_space_between_amount_and_symbol   INTEGER DEFAULT 0,
    is_active                             INTEGER DEFAULT 1,
    is_default                            INTEGER DEFAULT 0,
    is_predefined                         INTEGER DEFAULT 0,
    created_at                            TEXT DEFAULT (datetime('now')),
    updated_at                            TEXT DEFAULT (datetime('now'))
  )
`);
