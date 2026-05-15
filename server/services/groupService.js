let groups = [];

const PRIMARY_GROUPS = [
  { name: 'Branch/Divisions',      nature: 'Assets',      is_primary: true, parent_group_id: null },
  { name: 'Capital Account',       nature: 'Liabilities', is_primary: true, parent_group_id: null },
  { name: 'Current Assets',        nature: 'Assets',      is_primary: true, parent_group_id: null },
  { name: 'Current Liabilities',   nature: 'Liabilities', is_primary: true, parent_group_id: null },
  { name: 'Direct Expenses',       nature: 'Expenses',    is_primary: true, parent_group_id: null },
  { name: 'Direct Incomes',        nature: 'Income',      is_primary: true, parent_group_id: null },
  { name: 'Fixed Assets',          nature: 'Assets',      is_primary: true, parent_group_id: null },
  { name: 'Indirect Expenses',     nature: 'Expenses',    is_primary: true, parent_group_id: null },
  { name: 'Indirect Incomes',      nature: 'Income',      is_primary: true, parent_group_id: null },
  { name: 'Investments',           nature: 'Assets',      is_primary: true, parent_group_id: null },
  { name: 'Loans(Liability)',      nature: 'Liabilities', is_primary: true, parent_group_id: null },
  { name: 'Misc.Expenses(Asset)',  nature: 'Assets',      is_primary: true, parent_group_id: null },
  { name: 'Purchase Accounts',     nature: 'Expenses',    is_primary: true, parent_group_id: null },
  { name: 'Sales Accounts',        nature: 'Income',      is_primary: true, parent_group_id: null },
  { name: 'Suspense A/c',          nature: 'Liabilities', is_primary: true, parent_group_id: null },
];

const PREDEFINED_GROUPS = [
  { name: 'Bank Accounts',            parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: false },
  { name: 'Bank OD A/c',              parent_name: 'Loans(Liability)',     nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Cash-in-hand',             parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: false },
  { name: 'Deposits (Asset)',         parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: false },
  { name: 'Duties & Taxes',           parent_name: 'Current Liabilities', nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Loans & Advances (Asset)', parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: false },
  { name: 'Provisions',               parent_name: 'Current Liabilities', nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Reserves & Surplus',       parent_name: 'Capital Account',     nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Secured Loans',            parent_name: 'Loans(Liability)',     nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Sundry Creditors',         parent_name: 'Current Liabilities', nature: 'Liabilities', affect_gross_profit: false },
  { name: 'Sundry Debtors',           parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: false },
  { name: 'Stock-in-hand',            parent_name: 'Current Assets',      nature: 'Assets',      affect_gross_profit: true  },
  { name: 'Unsecured Loans',          parent_name: 'Loans(Liability)',     nature: 'Liabilities', affect_gross_profit: false },
];

const seedDefaultGroups = (company_id) => {
    const seeded = [];

    PRIMARY_GROUPS.forEach((g, i) => {
        seeded.push({
            id: Date.now() +i,
            company_id,
            name: g.name,
            alias: null,
            parent_group_id: null,
            is_primary: true,
            is_predefined: true,
            nature: g.nature,
            affect_gross_profit: false,
            behaves_like_subledger: false,
            show_net_debit_credit: false,
            used_for_calculation: false,
            allocations_method: 'Average Cost',
            gst_rate: null,
            cgst_rate: null,
            sgst_rate: null,
            igst_rate: null,
            hsn_sac_code: null,
            statutory_details: null,
            sort_order: i+1,
            group_type: 'Primary',
            display_order: i+1,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    });

    PREDEFINED_GROUPS.forEach((g,i) => {
        const parent = seeded.find(s => s.name === g.parent_name && s.company_id === company_id);
        seeded.push({
          id: Date.now() + 100+i,
          company_id,
          name: g.name,
          alias: null,
          parent_group_id: parent ? parent.id : null,
          is_primary: false,
          is_predefined: true,
          nature: g.nature,
          affect_gross_profit: g.affect_gross_profit,
          behaves_like_subledger: false,
          show_net_debt_credit: false,
          used_for_calculation: false,
          allocation_method: 'Average Cost',
          gst_rate: null,
          cgst_rate: null,
          sgst_rate: null,
          igst_rate: null,
          hsn_sac_code: null,
          statutory_details: null,
          sort_order: i + 1,
          group_type: 'Predefined',
          display_order: i+1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    });

    groups.push(...seeded);
};

const buildTree = (allGroups, parentId = null) => {
  return allGroups
      .filter(g => g.parent_group_id === parentId)
      .map(g => ({
        ...g,
        children: buildTree(allGroups, g.id),
      }));
};

module.exports = {
  seedDefaultGroups,

  create: async (data) => {
      try{
        const exists = groups.find(
          g => g.company_id === data.company_id &&
          g.name.toLowerCase() === data.name.toLowerCase()
        );

        if(exists) return { success: false, error: 'Group already exists' };

        const group = {
          id: Date.now(),
          company_id: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parent_group_id: data.parent_group_id || null,
          is_primary: false,
          is_predefined: false,
          nature: data.nature,
          affect_gross_profit: data.affect_gross_profit || false,
          behaves_like_subledger: data.behaves_like_subledger || false,
          show_net_debit_credit: data.show_net_debit_credit || false,
          used_for_calculation: data.used_for_calculation || false,
          allocation_method: data.allocation_method || 'Average Cost',
          gst_rate: data.gst_rate || null,
          cgst_rate: data.cgst_rate || null,
          sgst_rate: data.sgst_rate || null,
          igst_rate: data.igst_rate || null,
          hsn_sac_code: data.hsn_sac_code || null,
          statutory_details: data.statutory_details || null,
          sort_order: data.sort_order || 0,
          group_type: 'User',
          display_order: data.display_order || 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        groups.push(group);
        return { success: true, group };
      } catch (err) {
         return { success: false, error: err.message };
      }
  },

  getAll: async (company_id) => {
    try {
      const result = groups.filter(g => g.company_id === company_id && g.is_active);
      return { success: true , groups: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try{
      const group = groups.find(g => g.id === id);
      if(!group) return { success: false, error: "Group not found" };
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try{
      const companyGroups = groups.filter(g => g.company_id === company_id && g.is_active);
      const tree = buildTree(companyGroups);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = groups.findIndex( g => g.id === data.id );
      if(index === -1) return { success: false, error: 'Group not found' };

      if(groups[index].is_predefined) return { success: false, error: 'Cannot edit predefined groups ' };

      groups[index] = {
        ...groups[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, group: groups[index] };
    } catch (err){
      return { success: true, error: err.message };
    }
  },

  delete: async(id) => {
    try {
      const group = groups.find(g => g.id === id);
      if(!group) return { success: false, error: 'Group not found' };
      if(group.is_predefined) return { success: false, error: 'Cannot delete predefined groups' };

      const hasChildren = groups.some(g => g.parent_group_id === id);
      if(hasChildren) return { success: false, error: 'Cannot delete group with subgroups' };

      groups = groups.map(g => g.id === id ? {...g, is_active: false } : g);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};

