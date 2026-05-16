const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS voucher_types (
    vt_id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id            INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    short_name            TEXT,
    category              TEXT,
    default_voucher_class TEXT,
    affects_inventory     INTEGER DEFAULT 0,
    affects_accounting    INTEGER DEFAULT 1,
    affects_gst           INTEGER DEFAULT 0,
    numbering_method      TEXT DEFAULT 'Automatic',
    numbering_prefix      TEXT DEFAULT '',
    numbering_suffix      TEXT DEFAULT '',
    starts_with           INTEGER DEFAULT 1,
    is_predefined         INTEGER DEFAULT 0,
    is_active             INTEGER DEFAULT 1,
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
  )
`);

db.execute(`
  CREATE TABLE IF NOT EXISTS voucher_type_configs (
    config_id                             INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_type_id                       INTEGER NOT NULL REFERENCES voucher_types(vt_id) ON DELETE CASCADE,
    use_effective_dates                   INTEGER DEFAULT 0,
    allow_zero_value_transactions         INTEGER DEFAULT 0,
    make_voucher_optional                 INTEGER DEFAULT 0,
    allow_narration                       INTEGER DEFAULT 1,
    allow_narration_per_ledger            INTEGER DEFAULT 0,
    whatsapp_after_save                   INTEGER DEFAULT 0,
    print_after_save                      INTEGER DEFAULT 0,
    enable_default_accounting_allocation  INTEGER DEFAULT 0,
    track_additional_cost_for_purchase    INTEGER DEFAULT 0,
    default_title_to_print                TEXT,
    use_for_pos_invoicing                 INTEGER DEFAULT 0,
    default_bank_id                       INTEGER,
    declaration                           TEXT,
    set_alter_declaration                 INTEGER DEFAULT 0
  )
`);
