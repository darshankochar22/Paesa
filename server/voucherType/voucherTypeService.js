// ---------------------------------------------------------------------------
// Drizzle ORM conversion (pattern: currencyService.js golden exemplar).
//
//   * MUTATIONS use the query builder: db.insert().values(),
//     db.update().set().where(), with eq() predicates.
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) to preserve the EXACT legacy snake_case shape (vt_id,
//     is_active, ...) and numeric 0/1 booleans the test oracle asserts against.
//   * getAll / getById use typed `sql` LEFT JOINs (with table aliases vt / vtc /
//     parent) to keep the exact selected/aliased columns (vt.*, the vtc config
//     columns, and the COALESCE(parent.name, vt.name) AS parent_name) byte-for-
//     byte identical to the legacy queries.
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { voucherTypes, voucherTypeConfigs } = require('../db/schema');

// ── Additional numbering details (issue #143) — restart/prefix/suffix rows are
//    stored as JSON text columns on voucher_type_configs. Serialize on write,
//    parse on read so callers always see arrays. ──────────────────────────────
const parseRows = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val !== 'string' || !val.trim()) return [];
  try { const r = JSON.parse(val); return Array.isArray(r) ? r : []; } catch { return []; }
};
const serializeRows = (val) => JSON.stringify(Array.isArray(val) ? val : parseRows(val));
// Parse the three JSON columns of a raw config row in place.
const normalizeConfig = (config) => {
  if (!config) return config;
  return {
    ...config,
    restart_numbering: parseRows(config.restart_numbering),
    prefix_details: parseRows(config.prefix_details),
    suffix_details: parseRows(config.suffix_details),
    voucher_classes: parseRows(config.voucher_classes),
  };
};

// Fetch a single voucher_types row in the legacy snake_case shape (or undefined).
const findVoucherTypeRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${voucherTypes} WHERE ${whereSql}`);
  return rows[0];
};

// Fetch a single voucher_type_configs row in the legacy snake_case shape.
const findConfigRow = async (voucher_type_id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${voucherTypeConfigs}
        WHERE ${voucherTypeConfigs.voucherTypeId} = ${voucher_type_id}`
  );
  return rows[0];
};

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
    const inserted = await db
      .insert(voucherTypes)
      .values({
        companyId: company_id,
        name: vt.name,
        shortName: vt.short_name,
        category: vt.category,
        defaultVoucherClass: null,
        affectsInventory: vt.affects_inventory,
        affectsAccounting: vt.affects_accounting,
        affectsGst: vt.affects_gst,
        numberingMethod: 'Automatic',
        numberingPrefix: '',
        numberingSuffix: '',
        startsWith: 1,
        isPredefined: 1,
        isActive: 1,
      })
      .returning({ id: voucherTypes.vtId });

    await db
      .insert(voucherTypeConfigs)
      .values({
        voucherTypeId: inserted[0].id,
        useEffectiveDates: 0,
        allowZeroValueTransactions: 0,
        makeVoucherOptional: 0,
        allowNarration: 1,
        allowNarrationPerLedger: 0,
        whatsappAfterSave: 0,
        printAfterSave: 0,
        enableDefaultAccountingAllocation: 0,
        trackAdditionalCostForPurchase: 0,
        defaultTitleToPrint: vt.name,
        useForPosInvoicing: 0,
        defaultBankId: null,
        declaration: null,
        setAlterDeclaration: 0,
      });
  }
};

module.exports = {
  seedDefaultVoucherTypes,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT ${voucherTypes.vtId} FROM ${voucherTypes}
            WHERE ${voucherTypes.companyId} = ${data.company_id}
              AND LOWER(${voucherTypes.name}) = LOWER(${data.name})
              AND ${voucherTypes.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'A voucher type with this name already exists.' };

      const inserted = await db
        .insert(voucherTypes)
        .values({
          companyId: data.company_id,
          name: data.name.trim(),
          alias: data.alias || null,
          shortName: data.short_name || data.name.slice(0, 4),
          category: data.category,
          defaultVoucherClass: data.default_voucher_class || null,
          affectsInventory: data.affects_inventory ? 1 : 0,
          affectsAccounting: data.affects_accounting !== undefined ? (data.affects_accounting ? 1 : 0) : 1,
          affectsGst: data.affects_gst ? 1 : 0,
          numberingMethod: data.numbering_method || 'Automatic',
          numberingPrefix: data.numbering_prefix || '',
          numberingSuffix: data.numbering_suffix || '',
          startsWith: data.starts_with || 1,
          isPredefined: 0,
          isActive: 1,
          parentVtId: data.parent_vt_id || null,
        })
        .returning({ id: voucherTypes.vtId });

      const vt_id = inserted[0].id;

      await db
        .insert(voucherTypeConfigs)
        .values({
          voucherTypeId: vt_id,
          useEffectiveDates: data.use_effective_dates ? 1 : 0,
          allowZeroValueTransactions: data.allow_zero_value_transactions ? 1 : 0,
          makeVoucherOptional: data.make_voucher_optional ? 1 : 0,
          allowNarration: data.allow_narration !== undefined ? (data.allow_narration ? 1 : 0) : 1,
          allowNarrationPerLedger: data.allow_narration_per_ledger ? 1 : 0,
          numberingBehaviour: data.numbering_behaviour || 'Retain Original Voucher No.',
          setAlterAdditionalNumbering: data.set_alter_additional_numbering ? 1 : 0,
          showUnusedNumbers: data.show_unused_numbers !== undefined ? (data.show_unused_numbers ? 1 : 0) : 1,
          preventDuplicateNumbers: data.prevent_duplicate_numbers ? 1 : 0,
          whatsappAfterSave: data.whatsapp_after_save ? 1 : 0,
          printAfterSave: data.print_after_save ? 1 : 0,
          enableDefaultAccountingAllocation: data.enable_default_accounting_allocation ? 1 : 0,
          trackAdditionalCostForPurchase: data.track_additional_cost_for_purchase ? 1 : 0,
          defaultTitleToPrint: data.name.trim(),
          useForPosInvoicing: data.use_for_pos_invoicing ? 1 : 0,
          defaultBankId: null,
          declaration: null,
          setAlterDeclaration: 0,
          startingNumber: Number.isFinite(Number(data.starting_number)) ? Number(data.starting_number) : 1,
          widthOfNumericalPart: Number.isFinite(Number(data.width_of_numerical_part)) ? Number(data.width_of_numerical_part) : 0,
          prefillWithZero: data.prefill_with_zero ? 1 : 0,
          restartNumbering: serializeRows(data.restart_numbering),
          prefixDetails: serializeRows(data.prefix_details),
          suffixDetails: serializeRows(data.suffix_details),
          voucherClasses: serializeRows(data.voucher_classes),
        });

      const voucherType = await findVoucherTypeRow(sql`${voucherTypes.vtId} = ${vt_id}`);
      return { success: true, voucherType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT vt.*, vtc.use_effective_dates, vtc.allow_zero_value_transactions,
                vtc.make_voucher_optional, vtc.allow_narration, vtc.allow_narration_per_ledger,
                vtc.print_after_save, vtc.whatsapp_after_save, vtc.use_for_pos_invoicing,
                COALESCE(parent.name, vt.name) AS parent_name
            FROM ${voucherTypes} vt
            LEFT JOIN ${voucherTypeConfigs} vtc ON vt.vt_id = vtc.voucher_type_id
            LEFT JOIN ${voucherTypes} parent ON vt.parent_vt_id = parent.vt_id
            WHERE vt.company_id = ${company_id} AND vt.is_active = 1
            ORDER BY vt.is_predefined DESC, vt.name ASC`
      );
      return { success: true, voucherTypes: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rows = await db.all(
        sql`SELECT vt.*, vtc.use_effective_dates, vtc.allow_zero_value_transactions,
                vtc.make_voucher_optional, vtc.allow_narration, vtc.allow_narration_per_ledger,
                vtc.numbering_behaviour, vtc.set_alter_additional_numbering, vtc.show_unused_numbers,
                vtc.prevent_duplicate_numbers,
                vtc.whatsapp_after_save, vtc.print_after_save, vtc.enable_default_accounting_allocation,
                vtc.track_additional_cost_for_purchase, vtc.default_title_to_print,
                vtc.use_for_pos_invoicing, vtc.default_bank_id, vtc.declaration, vtc.set_alter_declaration,
                vtc.starting_number, vtc.width_of_numerical_part, vtc.prefill_with_zero,
                vtc.restart_numbering, vtc.prefix_details, vtc.suffix_details, vtc.voucher_classes
            FROM ${voucherTypes} vt
            LEFT JOIN ${voucherTypeConfigs} vtc ON vt.vt_id = vtc.voucher_type_id
            WHERE vt.vt_id = ${id}`
      );
      if (rows.length === 0) return { success: false, error: 'Voucher Type not found' };
      return { success: true, voucherType: normalizeConfig(rows[0]) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getConfig: async (voucher_type_id) => {
    try {
      const config = await findConfigRow(voucher_type_id);
      if (!config) return { success: false, error: 'Config not found' };
      return { success: true, config: normalizeConfig(config) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateConfig: async (data) => {
    try {
      const c = await findConfigRow(data.voucher_type_id);
      if (!c) return { success: false, error: 'Config not found' };

      await db
        .update(voucherTypeConfigs)
        .set({
          useEffectiveDates: data.use_effective_dates ?? c.use_effective_dates,
          allowZeroValueTransactions: data.allow_zero_value_transactions ?? c.allow_zero_value_transactions,
          makeVoucherOptional: data.make_voucher_optional ?? c.make_voucher_optional,
          allowNarration: data.allow_narration ?? c.allow_narration,
          allowNarrationPerLedger: data.allow_narration_per_ledger ?? c.allow_narration_per_ledger,
          numberingBehaviour: data.numbering_behaviour ?? c.numbering_behaviour,
          setAlterAdditionalNumbering: data.set_alter_additional_numbering ?? c.set_alter_additional_numbering,
          showUnusedNumbers: data.show_unused_numbers ?? c.show_unused_numbers,
          preventDuplicateNumbers: data.prevent_duplicate_numbers ?? c.prevent_duplicate_numbers,
          whatsappAfterSave: data.whatsapp_after_save ?? c.whatsapp_after_save,
          printAfterSave: data.print_after_save ?? c.print_after_save,
          enableDefaultAccountingAllocation: data.enable_default_accounting_allocation ?? c.enable_default_accounting_allocation,
          trackAdditionalCostForPurchase: data.track_additional_cost_for_purchase ?? c.track_additional_cost_for_purchase,
          defaultTitleToPrint: data.default_title_to_print ?? c.default_title_to_print,
          useForPosInvoicing: data.use_for_pos_invoicing ?? c.use_for_pos_invoicing,
          defaultBankId: data.default_bank_id ?? c.default_bank_id,
          declaration: data.declaration ?? c.declaration,
          setAlterDeclaration: data.set_alter_declaration ?? c.set_alter_declaration,
          startingNumber: data.starting_number !== undefined ? Number(data.starting_number) : c.starting_number,
          widthOfNumericalPart: data.width_of_numerical_part !== undefined ? Number(data.width_of_numerical_part) : c.width_of_numerical_part,
          prefillWithZero: data.prefill_with_zero !== undefined ? (data.prefill_with_zero ? 1 : 0) : c.prefill_with_zero,
          restartNumbering: data.restart_numbering !== undefined ? serializeRows(data.restart_numbering) : c.restart_numbering,
          prefixDetails: data.prefix_details !== undefined ? serializeRows(data.prefix_details) : c.prefix_details,
          suffixDetails: data.suffix_details !== undefined ? serializeRows(data.suffix_details) : c.suffix_details,
          voucherClasses: data.voucher_classes !== undefined ? serializeRows(data.voucher_classes) : c.voucher_classes,
        })
        .where(eq(voucherTypeConfigs.voucherTypeId, data.voucher_type_id));

      const updated = await findConfigRow(data.voucher_type_id);
      return { success: true, config: normalizeConfig(updated) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const c = await findVoucherTypeRow(sql`${voucherTypes.vtId} = ${data.vt_id}`);
      if (!c) return { success: false, error: 'Voucher Type not found' };
      // Predefined types (Sales, Purchase, Payment, ...) allow editing alias,
      // abbreviation, activate, and numbering settings — but not the Name or
      // Category, which are hardcoded as strings across the GST engine, reports,
      // and voucher rendering elsewhere in the app.
      if (c.is_predefined) {
        if (data.name !== undefined && data.name !== c.name) {
          return { success: false, error: 'Cannot rename a predefined voucher type' };
        }
        if (data.category !== undefined && data.category !== c.category) {
          return { success: false, error: 'Cannot change the category of a predefined voucher type' };
        }
      }

      await db
        .update(voucherTypes)
        .set({
          name: data.name ?? c.name,
          alias: data.alias ?? c.alias,
          shortName: data.short_name ?? c.short_name,
          category: data.category ?? c.category,
          defaultVoucherClass: data.default_voucher_class ?? c.default_voucher_class,
          affectsInventory: data.affects_inventory ? 1 : 0,
          affectsAccounting: data.affects_accounting ? 1 : 0,
          affectsGst: data.affects_gst ? 1 : 0,
          numberingMethod: data.numbering_method ?? c.numbering_method,
          numberingPrefix: data.numbering_prefix ?? c.numbering_prefix,
          numberingSuffix: data.numbering_suffix ?? c.numbering_suffix,
          startsWith: data.starts_with ?? c.starts_with,
          isActive: data.is_active !== undefined ? (data.is_active ? 1 : 0) : c.is_active,
          parentVtId: data.parent_vt_id !== undefined ? data.parent_vt_id : c.parent_vt_id,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(voucherTypes.vtId, data.vt_id));

      const updated = await findVoucherTypeRow(sql`${voucherTypes.vtId} = ${data.vt_id}`);
      return { success: true, voucherType: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findVoucherTypeRow(sql`${voucherTypes.vtId} = ${id}`);
      if (!existing) return { success: false, error: 'Voucher Type not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined voucher types' };

      await db
        .update(voucherTypes)
        .set({ isActive: 0, updatedAt: sql`datetime('now')` })
        .where(eq(voucherTypes.vtId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
