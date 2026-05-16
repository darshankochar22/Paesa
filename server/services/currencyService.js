let currencies = [];

const seedDefaultCurrency = (company_id) => {
  currencies.push({
    id: Date.now(),
    company_id,
    name: 'Indian Rupee',
    formal_name: 'Indian Rupee',
    iso_code: 'INR',
    symbol: '₹',
    decimal_places: 2,
    decimal_symbol: '.',
    decimal_places_in_words: 'Paise',
    suffix_symbol_to_amount: false,
    show_amount_in_millions: false,
    word_representing_amount_after_decimal: 'Paise',
    add_space_between_amount_and_symbol: false,
    is_active: true,
    is_default: true,
    is_predefined: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
};

module.exports = {
  seedDefaultCurrency,

  create: async (data) => {
    try {
      const exists = currencies.find(
        c => c.company_id === data.company_id &&
        c.iso_code.toLowerCase() === data.iso_code.toLowerCase()
      );
      if (exists) return { success: false, error: 'Currency already exists' };

      const currency = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        formal_name: data.formal_name || data.name,
        iso_code: data.iso_code,
        symbol: data.symbol,
        decimal_places: data.decimal_places ?? 2,
        decimal_symbol: data.decimal_symbol || '.',
        decimal_places_in_words: data.decimal_places_in_words || null,
        suffix_symbol_to_amount: data.suffix_symbol_to_amount || false,
        show_amount_in_millions: data.show_amount_in_millions || false,
        word_representing_amount_after_decimal: data.word_representing_amount_after_decimal || null,
        add_space_between_amount_and_symbol: data.add_space_between_amount_and_symbol || false,
        is_active: true,
        is_default: false,
        is_predefined: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      currencies.push(currency);
      return { success: true, currency };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = currencies.filter(c => c.company_id === company_id && c.is_active);
      return { success: true, currencies: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const currency = currencies.find(c => c.id === id);
      if (!currency) return { success: false, error: 'Currency not found' };
      return { success: true, currency };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setDefault: async (company_id, id) => {
    try {
      const currency = currencies.find(c => c.id === id);
      if (!currency) return { success: false, error: 'Currency not found' };

      currencies = currencies.map(c =>
        c.company_id === company_id ? { ...c, is_default: false } : c
      );

      currencies = currencies.map(c =>
        c.id === id ? { ...c, is_default: true } : c
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = currencies.findIndex(c => c.id === data.id);
      if (index === -1) return { success: false, error: 'Currency not found' };
      if (currencies[index].is_predefined) return { success: false, error: 'Cannot edit base currency' };

      currencies[index] = { ...currencies[index], ...data, updated_at: new Date().toISOString() };
      return { success: true, currency: currencies[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const currency = currencies.find(c => c.id === id);
      if (!currency) return { success: false, error: 'Currency not found' };
      if (currency.is_default) return { success: false, error: 'Cannot delete default currency' };
      if (currency.is_predefined) return { success: false, error: 'Cannot delete base currency' };

      currencies = currencies.map(c => c.id === id ? { ...c, is_active: false } : c);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};