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
        
    })
}