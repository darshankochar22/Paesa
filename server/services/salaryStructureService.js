let salaryStructures = [];

module.exports = {
  create: async (data) => {
    try {
      const exists = salaryStructures.find(
        s => s.company_id === data.company_id &&
        s.employee_id === data.employee_id &&
        s.effective_from === data.effective_from &&
        s.pay_head_id === data.pay_head_id
      );
      if (exists) return { success: false, error: 'Salary structure already exists for this date' };

      const structure = {
        id: Date.now(),
        company_id: data.company_id,
        employee_id: data.employee_id,
        effective_from: data.effective_from,
        pay_head_id: data.pay_head_id,
        amount: data.amount || 0,
        calculation_mode: data.calculation_mode || 'Flat Rate',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      salaryStructures.push(structure);
      return { success: true, structure };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createBulk: async (company_id, employee_id, effective_from, entries) => {
    try {
      const created = [];

      entries.forEach((entry, i) => {
        const structure = {
          id: Date.now() + i,
          company_id,
          employee_id,
          effective_from,
          pay_head_id: entry.pay_head_id,
          amount: entry.amount || 0,
          calculation_mode: entry.calculation_mode || 'Flat Rate',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        salaryStructures.push(structure);
        created.push(structure);
      });

      return { success: true, structures: created };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = salaryStructures.filter(
        s => s.company_id === company_id && s.is_active
      );
      return { success: true, salaryStructures: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const structure = salaryStructures.find(s => s.id === id);
      if (!structure) return { success: false, error: 'Salary Structure not found' };
      return { success: true, structure };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByEmployee: async (company_id, employee_id) => {
    try {
      const structures = salaryStructures.filter(
        s => s.company_id === company_id &&
        s.employee_id === employee_id &&
        s.is_active
      );

      const grouped = structures.reduce((acc, s) => {
        if (!acc[s.effective_from]) acc[s.effective_from] = [];
        acc[s.effective_from].push(s);
        return acc;
      }, {});

      const sorted = Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({
          effective_from: date,
          pay_heads: grouped[date],
        }));

      return { success: true, salaryStructures: sorted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = salaryStructures.findIndex(s => s.id === data.id);
      if (index === -1) return { success: false, error: 'Salary Structure not found' };

      salaryStructures[index] = {
        ...salaryStructures[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, structure: salaryStructures[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const structure = salaryStructures.find(s => s.id === id);
      if (!structure) return { success: false, error: 'Salary Structure not found' };

      salaryStructures = salaryStructures.map(s =>
        s.id === id ? { ...s, is_active: false } : s
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};