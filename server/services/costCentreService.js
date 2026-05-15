let costCentres = [];

const buildTree = (all, parentId = null) => {
  return all
    .filter(c => c.parent_id === parentId)
    .map(c => ({ ...c, children: buildTree(all, c.id) }));
};

module.exports = {
  create: async (data) => {
    try {
      const exists = costCentres.find(
        c => c.company_id === data.company_id &&
        c.name.toLowerCase() === data.name.toLowerCase()
      );
      if (exists) return { success: false, error: 'Cost Centre already exists' };

      const costCentre = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        alias: data.alias || null,
        parent_id: data.parent_id || null,
        category: data.parent_id ? 'Secondary' : 'Primary',
        is_active: true,
        is_predefined: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      costCentres.push(costCentre);
      return { success: true, costCentre };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = costCentres.filter(c => c.company_id === company_id && c.is_active);
      return { success: true, costCentres: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const costCentre = costCentres.find(c => c.id === id);
      if (!costCentre) return { success: false, error: 'Cost Centre not found' };
      return { success: true, costCentre };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const all = costCentres.filter(c => c.company_id === company_id && c.is_active);
      const tree = buildTree(all);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = costCentres.findIndex(c => c.id === data.id);
      if (index === -1) return { success: false, error: 'Cost Centre not found' };

      costCentres[index] = {
        ...costCentres[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, costCentre: costCentres[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const cc = costCentres.find(c => c.id === id);
      if (!cc) return { success: false, error: 'Cost Centre not found' };

      const hasChildren = costCentres.some(c => c.parent_id === id);
      if (hasChildren) return { success: false, error: 'Cannot delete Cost Centre with sub-centres' };

      costCentres = costCentres.map(c => c.id === id ? { ...c, is_active: false } : c);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};