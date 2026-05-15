let stockCategories = [];

module.exports = {
  create: async (data) => {
    try {
      const exists = stockCategories.find(
        c => c.company_id === data.company_id &&
        c.name.toLowerCase() === data.name.toLowerCase()
      );
      if (exists) return { success: false, error: 'Stock Category already exists' };

      const category = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        description: data.description || null,
        parent_category_id: data.parent_category_id || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      stockCategories.push(category);
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = stockCategories.filter(c => c.company_id === company_id && c.is_active);
      return { success: true, stockCategories: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const category = stockCategories.find(c => c.id === id);
      if (!category) return { success: false, error: 'Stock Category not found' };
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = stockCategories.findIndex(c => c.id === data.id);
      if (index === -1) return { success: false, error: 'Stock Category not found' };

      stockCategories[index] = { ...stockCategories[index], ...data, updated_at: new Date().toISOString() };
      return { success: true, category: stockCategories[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const category = stockCategories.find(c => c.id === id);
      if (!category) return { success: false, error: 'Stock Category not found' };

      const hasChildren = stockCategories.some(c => c.parent_category_id === id);
      if (hasChildren) return { success: false, error: 'Cannot delete category with subcategories' };

      stockCategories = stockCategories.map(c => c.id === id ? { ...c, is_active: false } : c);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};