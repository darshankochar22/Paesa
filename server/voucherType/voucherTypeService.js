const { db } = require('../db/index');

const PREDEFINED_VOUCHER_TYPES = [
  { name: 'Contra',            short_name: 'Cont', category: 'Contra',            affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Payment',           short_name: 'Pmnt', category: 'Payment',           affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Receipt',           short_name: 'Rcpt', category: 'Receipt',           affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Journal',           short_name: 'Jrnl', category: 'Journal',           affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Sales',             short_name: 'Sale', category: 'Sales',             affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Purchase',          short_name: 'Purc', category: 'Purchase',          affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Credit Note',       short_name: 'CrNt', category: 'Credit Note',       affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Debit Note',        short_name: 'DbNt', category: 'Debit Note',        affects_inventory: 1, affects_accounting: 1, affects_gst: 1 },
  { name: 'Stock Journal',     short_name: 'StJn', category: 'Stock Journal',     affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Delivery Note',     short_name: 'DlvN', category: 'Delivery Note',     affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Receipt Note',      short_name: 'RctN', category: 'Receipt Note',      affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Memorandum',        short_name: 'Memo', category: 'Memorandum',        affects_inventory: 0, affects_accounting: 0, affects_gst: 0 },
  { name: 'Payroll',           short_name: 'Pyrl', category: 'Payroll',           affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Attendance',        short_name: 'Attn', category: 'Attendance',        affects_inventory: 0, affects_accounting: 0, affects_gst: 0 },
  { name: 'Sales Order',       short_name: 'SlOr', category: 'Sales Order',       affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Purchase Order',    short_name: 'PuOr', category: 'Purchase Order',    affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Rejection In',      short_name: 'RjIn', category: 'Rejection In',      affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Rejection Out',     short_name: 'RjOt', category: 'Rejection Out',     affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Reversing Journal', short_name: 'RvJn', category: 'Reversing Journal', affects_inventory: 0, affects_accounting: 1, affects_gst: 0 },
  { name: 'Physical Stock',    short_name: 'PhSt', category: 'Physical Stock',    affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Material In',       short_name: 'MtIn', category: 'Material In',       affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Material Out',      short_name: 'MtOt', category: 'Material Out',      affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Manufacturing Journal', short_name: 'MnJn', category: 'Manufacturing Journal', affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Job Work In Order', short_name: 'JbIn', category: 'Job Work In Order', affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
  { name: 'Job Work Out Order',short_name: 'JbOt', category: 'Job Work Out Order',affects_inventory: 1, affects_accounting: 0, affects_gst: 0 },
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
      [company_id, vt.name, vt.short_name, vt.category,
       vt.affects_inventory, vt.affects_accounting, vt.affects_gst]
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
        `SELECT vt_id FROM voucher_types WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'A voucher type with this name already exists.' };

      const result = await db.execute(
        `INSERT INTO voucher_types (
          company_id, name, short_name, category, default_voucher_class,
          affects_inventory, affects_accounting, affects_gst,
          numbering_method, numbering_prefix, numbering_suffix,
          starts_with, is_predefined, is_active, parent_vt_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)`,
        [
          data.company_id,
          data.name.trim(),
          data.short_name || data.name.slice(0, 4),
          data.category,
          data.default_voucher_class || null,
          data.affects_inventory ? 1 : 0,
          data.affects_accounting !== undefined ? (data.affects_accounting ? 1 : 0) : 1,
          data.affects_gst ? 1 : 0,
          data.numbering_method || 'Automatic',
          data.numbering_prefix || '',
          data.numbering_suffix || '',
          data.starts_with || 1,
          data.parent_vt_id || null,
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, 0)`,
        [
          vt_id,
          data.use_effective_dates ? 1 : 0,
          data.allow_zero_value_transactions ? 1 : 0,
          data.make_voucher_optional ? 1 : 0,
          data.allow_narration !== undefined ? (data.allow_narration ? 1 : 0) : 1,
          data.allow_narration_per_ledger ? 1 : 0,
          data.whatsapp_after_save ? 1 : 0,
          data.print_after_save ? 1 : 0,
          data.enable_default_accounting_allocation ? 1 : 0,
          data.track_additional_cost_for_purchase ? 1 : 0,
          data.name.trim(),
          data.use_for_pos_invoicing ? 1 : 0,
        ]
      );

      const voucherType = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`, [vt_id]
      );
      return { success: true, voucherType: voucherType.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT vt.*, vtc.use_effective_dates, vtc.allow_zero_value_transactions,
                vtc.make_voucher_optional, vtc.allow_narration, vtc.allow_narration_per_ledger,
                vtc.print_after_save, vtc.whatsapp_after_save, vtc.use_for_pos_invoicing,
                COALESCE(parent.name, vt.name) AS parent_name
         FROM voucher_types vt
         LEFT JOIN voucher_type_configs vtc ON vt.vt_id = vtc.voucher_type_id
         LEFT JOIN voucher_types parent ON vt.parent_vt_id = parent.vt_id
         WHERE vt.company_id = ? AND vt.is_active = 1
         ORDER BY vt.is_predefined DESC, vt.name ASC`,
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
        `SELECT vt.*, vtc.use_effective_dates, vtc.allow_zero_value_transactions,
                vtc.make_voucher_optional, vtc.allow_narration, vtc.allow_narration_per_ledger,
                vtc.whatsapp_after_save, vtc.print_after_save, vtc.enable_default_accounting_allocation,
                vtc.track_additional_cost_for_purchase, vtc.default_title_to_print,
                vtc.use_for_pos_invoicing, vtc.default_bank_id, vtc.declaration, vtc.set_alter_declaration
         FROM voucher_types vt
         LEFT JOIN voucher_type_configs vtc ON vt.vt_id = vtc.voucher_type_id
         WHERE vt.vt_id = ?`,
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
      const c = existing.rows[0];

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
          data.use_effective_dates ?? c.use_effective_dates,
          data.allow_zero_value_transactions ?? c.allow_zero_value_transactions,
          data.make_voucher_optional ?? c.make_voucher_optional,
          data.allow_narration ?? c.allow_narration,
          data.allow_narration_per_ledger ?? c.allow_narration_per_ledger,
          data.whatsapp_after_save ?? c.whatsapp_after_save,
          data.print_after_save ?? c.print_after_save,
          data.enable_default_accounting_allocation ?? c.enable_default_accounting_allocation,
          data.track_additional_cost_for_purchase ?? c.track_additional_cost_for_purchase,
          data.default_title_to_print ?? c.default_title_to_print,
          data.use_for_pos_invoicing ?? c.use_for_pos_invoicing,
          data.default_bank_id ?? c.default_bank_id,
          data.declaration ?? c.declaration,
          data.set_alter_declaration ?? c.set_alter_declaration,
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
        `SELECT * FROM voucher_types WHERE vt_id = ?`, [data.vt_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined voucher types' };

      const c = existing.rows[0];
      await db.execute(
        `UPDATE voucher_types SET
          name = ?, short_name = ?, category = ?, default_voucher_class = ?,
          affects_inventory = ?, affects_accounting = ?, affects_gst = ?,
          numbering_method = ?, numbering_prefix = ?, numbering_suffix = ?,
          starts_with = ?, parent_vt_id = ?, updated_at = datetime('now')
        WHERE vt_id = ?`,
        [
          data.name ?? c.name,
          data.short_name ?? c.short_name,
          data.category ?? c.category,
          data.default_voucher_class ?? c.default_voucher_class,
          data.affects_inventory ? 1 : 0,
          data.affects_accounting ? 1 : 0,
          data.affects_gst ? 1 : 0,
          data.numbering_method ?? c.numbering_method,
          data.numbering_prefix ?? c.numbering_prefix,
          data.numbering_suffix ?? c.numbering_suffix,
          data.starts_with ?? c.starts_with,
          data.parent_vt_id !== undefined ? data.parent_vt_id : c.parent_vt_id,
          data.vt_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`, [data.vt_id]
      );
      return { success: true, voucherType: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM voucher_types WHERE vt_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined voucher types' };

      await db.execute(
        `UPDATE voucher_types SET is_active = 0, updated_at = datetime('now') WHERE vt_id = ?`, [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};