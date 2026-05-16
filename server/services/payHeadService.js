let payHeads = [];

const seedDefaultPayHeads = (company_id) => {
  const defaults = [
    {
      name: 'Basic Salary',
      pay_head_type: 'Earnings',
      calculation_type: 'Flat Rate',
      affects_net_salary: true,
      under_group: 'Indirect Expenses',
      statutory_component: null,
      percentage_or_amount: 0,
    },
    {
      name: 'House Rent Allowance',
      pay_head_type: 'Earnings',
      calculation_type: 'Percentage',
      affects_net_salary: true,
      under_group: 'Indirect Expenses',
      statutory_component: null,
      percentage_or_amount: 40,
    },
    {
      name: 'Conveyance Allowance',
      pay_head_type: 'Earnings',
      calculation_type: 'Flat Rate',
      affects_net_salary: true,
      under_group: 'Indirect Expenses',
      statutory_component: null,
      percentage_or_amount: 0,
    },
    {
      name: 'Provident Fund',
      pay_head_type: 'Deductions',
      calculation_type: 'Percentage',
      affects_net_salary: true,
      under_group: 'Current Liabilities',
      statutory_component: 'PF',
      percentage_or_amount: 12,
    },
    {
      name: 'Professional Tax',
      pay_head_type: 'Deductions',
      calculation_type: 'Flat Rate',
      affects_net_salary: true,
      under_group: 'Current Liabilities',
      statutory_component: 'PT',
      percentage_or_amount: 0,
    },
    {
      name: 'TDS',
      pay_head_type: 'Deductions',
      calculation_type: 'Percentage',
      affects_net_salary: true,
      under_group: 'Current Liabilities',
      statutory_component: 'TDS',
      percentage_or_amount: 0,
    },
    {
      name: 'ESI',
      pay_head_type: 'Deductions',
      calculation_type: 'Percentage',
      affects_net_salary: true,
      under_group: 'Current Liabilities',
      statutory_component: 'ESI',
      percentage_or_amount: 0.75,
    },
    {
      name: 'Gratuity',
      pay_head_type: 'Employer Statutory Contributions',
      calculation_type: 'Percentage',
      affects_net_salary: false,
      under_group: 'Indirect Expenses',
      statutory_component: 'Gratuity',
      percentage_or_amount: 4.81,
    },
  ];

  defaults.forEach((p, i) => {
    payHeads.push({
      id: Date.now() + i,
      company_id,
      name: p.name,
      pay_head_type: p.pay_head_type,
      calculation_type: p.calculation_type,
      affects_net_salary: p.affects_net_salary,
      under_group: p.under_group,
      statutory_component: p.statutory_component,
      percentage_or_amount: p.percentage_or_amount,
      is_active: true,
      is_predefined: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
};

module.exports = {
  seedDefaultPayHeads,

  create: async (data) => {
    try {
      const exists = payHeads.find(
        p => p.company_id === data.company_id &&
        p.name.toLowerCase() === data.name.toLowerCase()
      );
      if (exists) return { success: false, error: 'Pay Head already exists' };

      const payHead = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        pay_head_type: data.pay_head_type || 'Earnings',
        calculation_type: data.calculation_type || 'Flat Rate', 
        affects_net_salary: data.affects_net_salary ?? true,
        under_group: data.under_group || null,
        statutory_component: data.statutory_component || null,
        percentage_or_amount: data.percentage_or_amount || 0,
        is_active: true,
        is_predefined: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      payHeads.push(payHead);
      return { success: true, payHead };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = payHeads.filter(
        p => p.company_id === company_id && p.is_active
      );
      return { success: true, payHeads: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const payHead = payHeads.find(p => p.id === id);
      if (!payHead) return { success: false, error: 'Pay Head not found' };
      return { success: true, payHead };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = payHeads.findIndex(p => p.id === data.id);
      if (index === -1) return { success: false, error: 'Pay Head not found' };
      if (payHeads[index].is_predefined) return { success: false, error: 'Cannot edit predefined pay heads' };

      payHeads[index] = {
        ...payHeads[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, payHead: payHeads[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const payHead = payHeads.find(p => p.id === id);
      if (!payHead) return { success: false, error: 'Pay Head not found' };
      if (payHead.is_predefined) return { success: false, error: 'Cannot delete predefined pay heads' };

      payHeads = payHeads.map(p =>
        p.id === id ? { ...p, is_active: false } : p
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};