const { db } = require('../db/index');

const PREDEFINED_VOUCHER_TYPES = [
  { name: 'Contra',        short_name: 'Contra', category: 'Contra',        affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Payment',       short_name: 'Pmnt',   category: 'Payment',       affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Receipt',       short_name: 'Rcpt',   category: 'Receipt',       affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Journal',       short_name: 'Jrnl',   category: 'Journal',       affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Sales',         short_name: 'Sale',   category: 'Sales',         affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Purchase',      short_name: 'Purc',   category: 'Purchase',      affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Credit Note',   short_name: 'Crnt',   category: 'Credit Note',   affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Debit Note',    short_name: 'Dbnt',   category: 'Debit Note',    affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Stock Journal', short_name: 'StJn',   category: 'Stock Journal', affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Delivery Note', short_name: 'DlvN',   category: 'Delivery Note', affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Receipt Note',  short_name: 'RctN',   category: 'Receipt Note',  affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Memorandum',    short_name: 'Memo',   category: 'Memorandum',    affects_inventory: 0, affects_accounting: 0, affects_gst: 0 },
  { name: 'Payroll',       short_name: 'Pyrl',   category: 'Payroll',       affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
];

const seedDefaultVoucherTypes = async (company_id) => {
  for (const vt of PREDEFINED_VOUCHER_TYPES) {
    const result = await db.execute(
      `INSERT INTO voucher_types (
        company_id, name, short_name, category, default_voucher_class,
        affects_inventory, affects_accounting, affects_gst,
        numbering_method, numbering_prefix, numbering_suffix,
        starts_with, is_predefined, is_active
      ) VALUES (?, ?, ?, ?, null, ?, ?, ?, 'Automatic', '', '', 1, 1, 1)`,
      [
        company_id, vt.name, vt.short_name, vt.category,
        vt.affects_inventory, vt.affects_accounting, vt.affects_gst,
      ]
    );

    await db.execute(
      `INSERT INTO voucher_type_configs (
        voucher_type_id, use_effective_dates, allow_zero_value_transactions,
        make_voucher_optional, allow_narration, allow_narration_per_ledger,
        whatsapp_after_save, print_after_save, enable_default_accounting_allocation,
        track_additional_cost_for_purchase, default_title_to_print,
        use_for_pos_invoicing, default_bank_id, declaration, set_alter_declaration
      ) VALUES (?, 0, 0, 0, 1, 0, 0, 0, 0, 0, ?, 0, null, null, 0)`,
      [result.lastInsertRowid, vt.name]
    );
  }
};

module.exports = {
  seedDefaultVoucherTypes,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM voucher_types WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Voucher Type already exists' };

      const result = await db.execute(
        `INSERT INTO voucher_types (
          company_id, name, short_name, category, default_voucher_class,
          affects_inventory, affects_accounting, affects_gst,
          numbering_method, numbering_prefix, numbering_suffix,
          starts_with, is_predefined, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          data.company_id,
          data.name,
          data.short_name || data.name.slice(0, 4),
          data.category,
          data.default_voucher_class || null,
          data.affects_inventory ? 1 : 0,
          data.affects_accounting ?? 1,
          data.affects_gst ? 1 : 0,
          data.numbering_method || 'Automatic',
          data.numbering_prefix || '',
          data.numbering_suffix || '',
          data.starts_with || 1,
        ]
      );

      const vt_id = result.lastInsertRowid;

      await db.execute(
        `INSERT INTO voucher_type_configs (
          voucher_type_id, use_effective_dates, allow_zero_value_transactions,
          make_voucher_optional, allow_narration, allow_narration_per_ledger,
          whatsapp_after_save, print_after_save, enable_default_accounting_allocation,
          track_additional_cost_for_purchase, default_title_to_print,
          use_for_pos_invoicing, default_bank_id, declaration, set_alter_declaration
        ) VALUES (?, 0, 0, 0, 1, 0, 0, 0, 0, 0, ?, 0, null, null, 0)`,
        [vt_id, data.name]
      );

      const voucherType = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`,
        [vt_id]
      );
      return { success: true, voucherType: voucherType.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM voucher_types WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, voucherTypes: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      return { success: true, voucherType: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getConfig: async (voucher_type_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM voucher_type_configs WHERE voucher_type_id = ?`,
        [voucher_type_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Config not found' };
      return { success: true, config: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateConfig: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM voucher_type_configs WHERE voucher_type_id = ?`,
        [data.voucher_type_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Config not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE voucher_type_configs SET
          use_effective_dates = ?,
          allow_zero_value_transactions = ?,
          make_voucher_optional = ?,
          allow_narration = ?,
          allow_narration_per_ledger = ?,
          whatsapp_after_save = ?,
          print_after_save = ?,
          enable_default_accounting_allocation = ?,
          track_additional_cost_for_purchase = ?,
          default_title_to_print = ?,
          use_for_pos_invoicing = ?,
          default_bank_id = ?,
          declaration = ?,
          set_alter_declaration = ?
         WHERE voucher_type_id = ?`,
        [
          data.use_effective_dates ?? current.use_effective_dates,
          data.allow_zero_value_transactions ?? current.allow_zero_value_transactions,
          data.make_voucher_optional ?? current.make_voucher_optional,
          data.allow_narration ?? current.allow_narration,
          data.allow_narration_per_ledger ?? current.allow_narration_per_ledger,
          data.whatsapp_after_save ?? current.whatsapp_after_save,
          data.print_after_save ?? current.print_after_save,
          data.enable_default_accounting_allocation ?? current.enable_default_accounting_allocation,
          data.track_additional_cost_for_purchase ?? current.track_additional_cost_for_purchase,
          data.default_title_to_print ?? current.default_title_to_print,
          data.use_for_pos_invoicing ?? current.use_for_pos_invoicing,
          data.default_bank_id ?? current.default_bank_id,
          data.declaration ?? current.declaration,
          data.set_alter_declaration ?? current.set_alter_declaration,
          data.voucher_type_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM voucher_type_configs WHERE voucher_type_id = ?`,
        [data.voucher_type_id]
      );
      return { success: true, config: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`,
        [data.vt_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined voucher types' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE voucher_types SET
          name = ?, short_name = ?, category = ?, default_voucher_class = ?,
          affects_inventory = ?, affects_accounting = ?, affects_gst = ?,
          numbering_method = ?, numbering_prefix = ?, numbering_suffix = ?,
          starts_with = ?, updated_at = datetime('now')
         WHERE vt_id = ?`,
        [
          data.name ?? current.name,
          data.short_name ?? current.short_name,
          data.category ?? current.category,
          data.default_voucher_class ?? current.default_voucher_class,
          data.affects_inventory ? 1 : 0,
          data.affects_accounting ? 1 : 0,
          data.affects_gst ? 1 : 0,
          data.numbering_method ?? current.numbering_method,
          data.numbering_prefix ?? current.numbering_prefix,
          data.numbering_suffix ?? current.numbering_suffix,
          data.starts_with ?? current.starts_with,
          data.vt_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`,
        [data.vt_id]
      );
      return { success: true, voucherType: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined voucher types' };

      await db.execute(
        `UPDATE voucher_types SET is_active = 0 WHERE vt_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};