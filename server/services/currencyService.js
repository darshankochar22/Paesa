const { db } = require('../db/index');

const seedDefaultCurrency = async (company_id) => {
  await db.execute(
    `INSERT INTO currencies (
      company_id, name, formal_name, iso_code, symbol, decimal_places,
      decimal_symbol, decimal_places_in_words, suffix_symbol_to_amount,
      show_amount_in_millions, word_representing_amount_after_decimal,
      add_space_between_amount_and_symbol, is_active, is_default, is_predefined
    ) VALUES (?, 'Indian Rupee', 'Indian Rupee', 'INR', '₹', 2, '.', 'Paise', 0, 0, 'Paise', 0, 1, 1, 1)`,
    [company_id]
  );
};

module.exports = {
  seedDefaultCurrency,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM currencies WHERE company_id = ? AND LOWER(iso_code) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.iso_code]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Currency already exists' };

      const result = await db.execute(
        `INSERT INTO currencies (
          company_id, name, formal_name, iso_code, symbol, decimal_places,
          decimal_symbol, decimal_places_in_words, suffix_symbol_to_amount,
          show_amount_in_millions, word_representing_amount_after_decimal,
          add_space_between_amount_and_symbol, is_active, is_default, is_predefined
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0)`,
        [
          data.company_id,
          data.name,
          data.formal_name || data.name,
          data.iso_code,
          data.symbol,
          data.decimal_places ?? 2,
          data.decimal_symbol || '.',
          data.decimal_places_in_words || null,
          data.suffix_symbol_to_amount ? 1 : 0,
          data.show_amount_in_millions ? 1 : 0,
          data.word_representing_amount_after_decimal || null,
          data.add_space_between_amount_and_symbol ? 1 : 0,
        ]
      );

      const currency = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, currency: currency.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM currencies WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, currencies: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Currency not found' };
      return { success: true, currency: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setDefault: async (company_id, id) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [id]
      );
      if (exists.rows.length === 0) return { success: false, error: 'Currency not found' };

      await db.execute(
        `UPDATE currencies SET is_default = 0 WHERE company_id = ?`,
        [company_id]
      );
      await db.execute(
        `UPDATE currencies SET is_default = 1 WHERE currency_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [data.currency_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Currency not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit base currency' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE currencies SET
          name = ?, formal_name = ?, iso_code = ?, symbol = ?,
          decimal_places = ?, decimal_symbol = ?, decimal_places_in_words = ?,
          suffix_symbol_to_amount = ?, show_amount_in_millions = ?,
          word_representing_amount_after_decimal = ?,
          add_space_between_amount_and_symbol = ?,
          updated_at = datetime('now')
         WHERE currency_id = ?`,
        [
          data.name ?? current.name,
          data.formal_name ?? current.formal_name,
          data.iso_code ?? current.iso_code,
          data.symbol ?? current.symbol,
          data.decimal_places ?? current.decimal_places,
          data.decimal_symbol ?? current.decimal_symbol,
          data.decimal_places_in_words ?? current.decimal_places_in_words,
          data.suffix_symbol_to_amount ? 1 : 0,
          data.show_amount_in_millions ? 1 : 0,
          data.word_representing_amount_after_decimal ?? current.word_representing_amount_after_decimal,
          data.add_space_between_amount_and_symbol ? 1 : 0,
          data.currency_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [data.currency_id]
      );
      return { success: true, currency: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM currencies WHERE currency_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Currency not found' };
      if (existing.rows[0].is_default) return { success: false, error: 'Cannot delete default currency' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete base currency' };

      await db.execute(
        `UPDATE currencies SET is_active = 0 WHERE currency_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};