// ---------------------------------------------------------------------------
// GOLDEN EXEMPLAR — Drizzle ORM conversion reference.
//
// This module is the pattern other modules copy. Key conventions:
//
//   * Import the drizzle instance `db` and the raw `sql` template tag, plus the
//     comparison helpers (`eq`, `and`) from drizzle-orm. Import table objects
//     from the dialect-switching schema barrel ('../db/schema').
//
//   * MUTATIONS / CONDITIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...), with eq()/and()/sql`` predicates.
//
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`). This preserves the EXACT legacy return shape: snake_case
//     column keys (iso_code, is_default, ...) and numeric 0/1 booleans, which
//     the test oracle asserts against. (The query builder would return
//     camelCase keys, changing the public shape — so we do not use it for the
//     returned row.) Column identifiers inside the template are still taken
//     from the schema (${currencies.isoCode}) rather than hardcoded strings.
//
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { currencies } = require('../db/schema');

// Fetch a single currency row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${currencies} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultCurrency = async (company_id) => {
  await db
    .insert(currencies)
    .values({
      companyId: company_id,
      name: 'Indian Rupee',
      formalName: 'Indian Rupee',
      isoCode: 'INR',
      symbol: '₹',
      decimalPlaces: 2,
      decimalSymbol: '.',
      decimalPlacesInWords: 'Paise',
      suffixSymbolToAmount: 0,
      showAmountInMillions: 0,
      wordRepresentingAmountAfterDecimal: 'Paise',
      addSpaceBetweenAmountAndSymbol: 0,
      isActive: 1,
      isDefault: 1,
      isPredefined: 1,
    });
};

module.exports = {
  seedDefaultCurrency,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${currencies}
            WHERE ${currencies.companyId} = ${data.company_id}
              AND LOWER(${currencies.isoCode}) = LOWER(${data.iso_code})
              AND ${currencies.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Currency already exists' };

      const inserted = await db
        .insert(currencies)
        .values({
          companyId: data.company_id,
          name: data.name,
          formalName: data.formal_name || data.name,
          isoCode: data.iso_code,
          symbol: data.symbol,
          decimalPlaces: data.decimal_places ?? 2,
          decimalSymbol: data.decimal_symbol || '.',
          decimalPlacesInWords: data.decimal_places_in_words || null,
          suffixSymbolToAmount: data.suffix_symbol_to_amount ? 1 : 0,
          showAmountInMillions: data.show_amount_in_millions ? 1 : 0,
          wordRepresentingAmountAfterDecimal: data.word_representing_amount_after_decimal || null,
          addSpaceBetweenAmountAndSymbol: data.add_space_between_amount_and_symbol ? 1 : 0,
          isActive: 1,
          isDefault: 0,
          isPredefined: 0,
        })
        .returning({ id: currencies.currencyId });

      const currency = await findRow(sql`${currencies.currencyId} = ${inserted[0].id}`);
      return { success: true, currency };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${currencies}
            WHERE ${currencies.companyId} = ${company_id}
              AND ${currencies.isActive} = 1`
      );
      return { success: true, currencies: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const currency = await findRow(sql`${currencies.currencyId} = ${id}`);
      if (!currency) return { success: false, error: 'Currency not found' };
      return { success: true, currency };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setDefault: async (company_id, id) => {
    try {
      const exists = await findRow(sql`${currencies.currencyId} = ${id}`);
      if (!exists) return { success: false, error: 'Currency not found' };

      await db
        .update(currencies)
        .set({ isDefault: 0 })
        .where(eq(currencies.companyId, company_id));
      await db
        .update(currencies)
        .set({ isDefault: 1 })
        .where(eq(currencies.currencyId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${currencies.currencyId} = ${data.currency_id}`);
      if (!current) return { success: false, error: 'Currency not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit base currency' };

      await db
        .update(currencies)
        .set({
          name: data.name ?? current.name,
          formalName: data.formal_name ?? current.formal_name,
          isoCode: data.iso_code ?? current.iso_code,
          symbol: data.symbol ?? current.symbol,
          decimalPlaces: data.decimal_places ?? current.decimal_places,
          decimalSymbol: data.decimal_symbol ?? current.decimal_symbol,
          decimalPlacesInWords: data.decimal_places_in_words ?? current.decimal_places_in_words,
          suffixSymbolToAmount: data.suffix_symbol_to_amount ? 1 : 0,
          showAmountInMillions: data.show_amount_in_millions ? 1 : 0,
          wordRepresentingAmountAfterDecimal:
            data.word_representing_amount_after_decimal ??
            current.word_representing_amount_after_decimal,
          addSpaceBetweenAmountAndSymbol: data.add_space_between_amount_and_symbol ? 1 : 0,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(currencies.currencyId, data.currency_id));

      const updated = await findRow(sql`${currencies.currencyId} = ${data.currency_id}`);
      return { success: true, currency: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${currencies.currencyId} = ${id}`);
      if (!existing) return { success: false, error: 'Currency not found' };
      if (existing.is_default) return { success: false, error: 'Cannot delete default currency' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete base currency' };

      await db
        .update(currencies)
        .set({ isActive: 0 })
        .where(eq(currencies.currencyId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
