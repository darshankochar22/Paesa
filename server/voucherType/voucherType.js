const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_types (
      vt_id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id             INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                   TEXT NOT NULL,
      alias                  TEXT,
      short_name             TEXT,
      category               TEXT,
      default_voucher_class  TEXT,
      affects_inventory      INTEGER DEFAULT 0,
      affects_accounting     INTEGER DEFAULT 1,
      affects_gst            INTEGER DEFAULT 0,
      numbering_method       TEXT DEFAULT 'Automatic',
      numbering_prefix       TEXT DEFAULT '',
      numbering_suffix       TEXT DEFAULT '',
      starts_with            INTEGER DEFAULT 1,
      is_predefined          INTEGER DEFAULT 0,
      is_active              INTEGER DEFAULT 1,
      parent_vt_id           INTEGER REFERENCES voucher_types(vt_id) ON DELETE SET NULL,
      created_at             TEXT DEFAULT (datetime('now')),
      updated_at             TEXT DEFAULT (datetime('now'))
    )
  `);

  // Run alter tables for voucher_types to support smooth database updates
  const columnsToAdd_vt = [
    { name: 'alias', spec: 'TEXT' },
    { name: 'parent_vt_id', spec: 'INTEGER REFERENCES voucher_types(vt_id) ON DELETE SET NULL' },
    { name: 'default_voucher_class', spec: 'TEXT' },
    { name: 'affects_inventory', spec: 'INTEGER DEFAULT 0' },
    { name: 'affects_accounting', spec: 'INTEGER DEFAULT 1' },
    { name: 'affects_gst', spec: 'INTEGER DEFAULT 0' },
    { name: 'numbering_prefix', spec: 'TEXT DEFAULT \'\'' },
    { name: 'numbering_suffix', spec: 'TEXT DEFAULT \'\'' },
    { name: 'starts_with', spec: 'INTEGER DEFAULT 1' }
  ];

  for (const col of columnsToAdd_vt) {
    try {
      await db.execute(`ALTER TABLE voucher_types ADD COLUMN ${col.name} ${col.spec}`);
    } catch (_) {}
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_type_configs (
      config_id                            INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_type_id                      INTEGER NOT NULL REFERENCES voucher_types(vt_id) ON DELETE CASCADE,
      use_effective_dates                  INTEGER DEFAULT 0,
      allow_zero_value_transactions        INTEGER DEFAULT 0,
      make_voucher_optional                INTEGER DEFAULT 0,
      allow_narration                      INTEGER DEFAULT 1,
      allow_narration_per_ledger           INTEGER DEFAULT 0,
      numbering_behaviour                  TEXT DEFAULT 'Retain Original Voucher No.',
      set_alter_additional_numbering       INTEGER DEFAULT 0,
      show_unused_numbers                  INTEGER DEFAULT 1,
      prevent_duplicate_numbers            INTEGER DEFAULT 0,
      print_after_save                     INTEGER DEFAULT 0,
      whatsapp_after_save                  INTEGER DEFAULT 0,
      enable_default_accounting_allocation INTEGER DEFAULT 0,
      track_additional_cost_for_purchase   INTEGER DEFAULT 0,
      default_title_to_print               TEXT,
      use_for_pos_invoicing                INTEGER DEFAULT 0,
      default_bank_id                      INTEGER,
      declaration                          TEXT,
      set_alter_declaration                INTEGER DEFAULT 0,
      starting_number                      INTEGER DEFAULT 1,
      width_of_numerical_part              INTEGER DEFAULT 0,
      prefill_with_zero                    INTEGER DEFAULT 0,
      restart_numbering                    TEXT DEFAULT '[]',
      prefix_details                       TEXT DEFAULT '[]',
      suffix_details                       TEXT DEFAULT '[]',
      voucher_classes                      TEXT DEFAULT '[]'
    )
  `);

  const columnsToAdd_config = [
    { name: 'numbering_behaviour', spec: "TEXT DEFAULT 'Retain Original Voucher No.'" },
    { name: 'set_alter_additional_numbering', spec: 'INTEGER DEFAULT 0' },
    { name: 'show_unused_numbers', spec: 'INTEGER DEFAULT 1' },
    { name: 'prevent_duplicate_numbers', spec: 'INTEGER DEFAULT 0' },
    { name: 'whatsapp_after_save', spec: 'INTEGER DEFAULT 0' },
    { name: 'enable_default_accounting_allocation', spec: 'INTEGER DEFAULT 0' },
    { name: 'track_additional_cost_for_purchase', spec: 'INTEGER DEFAULT 0' },
    { name: 'default_title_to_print', spec: 'TEXT' },
    { name: 'use_for_pos_invoicing', spec: 'INTEGER DEFAULT 0' },
    { name: 'default_bank_id', spec: 'INTEGER' },
    { name: 'declaration', spec: 'TEXT' },
    { name: 'set_alter_declaration', spec: 'INTEGER DEFAULT 0' },
    // Additional numbering details sub-screen (issue #143) — scalars + JSON rows.
    { name: 'starting_number', spec: 'INTEGER DEFAULT 1' },
    { name: 'width_of_numerical_part', spec: 'INTEGER DEFAULT 0' },
    { name: 'prefill_with_zero', spec: 'INTEGER DEFAULT 0' },
    { name: 'restart_numbering', spec: "TEXT DEFAULT '[]'" },
    { name: 'prefix_details', spec: "TEXT DEFAULT '[]'" },
    { name: 'suffix_details', spec: "TEXT DEFAULT '[]'" },
    // Name of Class — named GST-ledger-mapping classes per voucher type.
    { name: 'voucher_classes', spec: "TEXT DEFAULT '[]'" }
  ];

  for (const col of columnsToAdd_config) {
    try {
      await db.execute(`ALTER TABLE voucher_type_configs ADD COLUMN ${col.name} ${col.spec}`);
    } catch (_) {}
  }
};

module.exports = { init };