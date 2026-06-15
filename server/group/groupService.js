const { db } = require("../db/index");

const PRIMARY_GROUPS = [
  { name: "Branch/Divisions", nature: "Assets" },
  { name: "Capital Account", nature: "Liabilities" },
  { name: "Current Assets", nature: "Assets" },
  { name: "Current Liabilities", nature: "Liabilities" },
  { name: "Direct Expenses", nature: "Expenses" },
  { name: "Direct Incomes", nature: "Income" },
  { name: "Fixed Assets", nature: "Assets" },
  { name: "Indirect Expenses", nature: "Expenses" },
  { name: "Indirect Incomes", nature: "Income" },
  { name: "Investments", nature: "Assets" },
  { name: "Loans(Liability)", nature: "Liabilities" },
  { name: "Misc.Expenses(Asset)", nature: "Assets" },
  { name: "Purchase Accounts", nature: "Expenses" },
  { name: "Sales Accounts", nature: "Income" },
  { name: "Suspense A/c", nature: "Liabilities" },
];

const PREDEFINED_GROUPS = [
  { name: "Bank Accounts", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Bank OCC A/c", parent_name: "Current Liabilities", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Bank OD A/c", parent_name: "Loans(Liability)", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Cash-in-hand", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Deposits (Asset)", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Duties & Taxes", parent_name: "Current Liabilities", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Loans & Advances (Asset)", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Provisions", parent_name: "Current Liabilities", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Reserves & Surplus", parent_name: "Capital Account", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Retained Earnings", parent_name: "Capital Account", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Secured Loans", parent_name: "Loans(Liability)", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Sundry Creditors", parent_name: "Current Liabilities", nature: "Liabilities", set_alter_tds_details: 0 },
  { name: "Sundry Debtors", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Stock-in-hand", parent_name: "Current Assets", nature: "Assets", set_alter_tds_details: 0 },
  { name: "Unsecured Loans", parent_name: "Loans(Liability)", nature: "Liabilities", set_alter_tds_details: 0 },
];

const INSERT_GROUP_SQL = `
  INSERT INTO groups (
    company_id, name, alias, parent_group_id,
    is_primary, is_predefined, nature, set_alter_tds_details,
    set_alter_tcs_details, behaves_like_subledger, show_net_debit_credit, used_for_calculation,
    allocation_method, gst_rate, cgst_rate, sgst_rate, igst_rate,
    hsn_sac_code, statutory_details, sort_order, group_type,
    display_order, is_active
  ) VALUES (
    :company_id, :name, :alias, :parent_group_id,
    :is_primary, :is_predefined, :nature, :set_alter_tds_details,
    :set_alter_tcs_details, :behaves_like_subledger, :show_net_debit_credit, :used_for_calculation,
    :allocation_method, :gst_rate, :cgst_rate, :sgst_rate, :igst_rate,
    :hsn_sac_code, :statutory_details, :sort_order, :group_type,
    :display_order, :is_active
  )
`;

const seedDefaultGroups = async (company_id) => {
  const seededPrimary = [];

  for (let i = 0; i < PRIMARY_GROUPS.length; i++) {
    const g = PRIMARY_GROUPS[i];
    const result = await db.execute({
      sql: INSERT_GROUP_SQL,
      args: {
        company_id,
        name: g.name,
        alias: null,
        parent_group_id: null,
        is_primary: 1,
        is_predefined: 1,
        nature: g.nature,
        set_alter_tds_details: 0,
        set_alter_tcs_details: 0,
        behaves_like_subledger: 0,
        show_net_debit_credit: 0,
        used_for_calculation: 0,
        allocation_method: "Average Cost",
        gst_rate: null,
        cgst_rate: null,
        sgst_rate: null,
        igst_rate: null,
        hsn_sac_code: null,
        statutory_details: null,
        sort_order: i + 1,
        group_type: "Primary",
        display_order: i + 1,
        is_active: 1,
      }
    });

    seededPrimary.push({ id: Number(result.lastInsertRowid), name: g.name });
  }

  for (let i = 0; i < PREDEFINED_GROUPS.length; i++) {
    const g = PREDEFINED_GROUPS[i];
    const parent = seededPrimary.find((p) => p.name === g.parent_name);
    await db.execute({
      sql: INSERT_GROUP_SQL,
      args: {
        company_id,
        name: g.name,
        alias: null,
        parent_group_id: parent ? parent.id : null,
        is_primary: 0,
        is_predefined: 1,
        nature: g.nature,
        set_alter_tds_details: g.set_alter_tds_details,
        set_alter_tcs_details: 0,
        behaves_like_subledger: 0,
        show_net_debit_credit: 0,
        used_for_calculation: 0,
        allocation_method: "Average Cost",
        gst_rate: null,
        cgst_rate: null,
        sgst_rate: null,
        igst_rate: null,
        hsn_sac_code: null,
        statutory_details: null,
        sort_order: i + 1,
        group_type: "Predefined",
        display_order: i + 1,
        is_active: 1,
      }
    });
  }
};

const buildTree = (allGroups, parentId = null) => {
  return allGroups
    .filter((g) => g.parent_group_id === parentId)
    .map((g) => ({ ...g, children: buildTree(allGroups, g.group_id) }));
};

module.exports = {
  seedDefaultGroups,

  create: async (data) => {
    try {
      const existsResult = await db.execute({
        sql: `SELECT * FROM groups WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name]
      });

      if (existsResult.rows.length > 0) return { success: false, error: "Group already exists" };

      const result = await db.execute({
        sql: INSERT_GROUP_SQL,
        args: {
          company_id: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parent_group_id: data.parent_group_id || null,
          is_primary: data.is_primary ? 1 : 0,
          is_predefined: 0,
          nature: data.nature,
          set_alter_tds_details: data.set_alter_tds_details ? 1 : 0,
          set_alter_tcs_details: data.set_alter_tcs_details ? 1 : 0,
          behaves_like_subledger: data.behaves_like_subledger ? 1 : 0,
          show_net_debit_credit: data.show_net_debit_credit ? 1 : 0,
          used_for_calculation: data.used_for_calculation ? 1 : 0,
          allocation_method: data.allocation_method || "Average Cost",
          gst_rate: data.gst_rate || null,
          cgst_rate: data.cgst_rate || null,
          sgst_rate: data.sgst_rate || null,
          igst_rate: data.igst_rate || null,
          hsn_sac_code: data.hsn_sac_code || null,
          statutory_details: data.statutory_details || null,
          sort_order: data.sort_order || 0,
          group_type: data.is_primary ? "Primary" : "User",
          display_order: data.display_order || 0,
          is_active: 1,
        }
      });

      const fetchResult = await db.execute({
        sql: `SELECT * FROM groups WHERE group_id = ?`,
        args: [Number(result.lastInsertRowid)]
      });
      
      return { success: true, group: fetchResult.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM groups WHERE company_id = ? AND is_active = 1`,
        args: [company_id]
      });
      return { success: true, groups: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM groups WHERE group_id = ?`,
        args: [id]
      });
      if (result.rows.length === 0) return { success: false, error: "Group not found" };
      return { success: true, group: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM groups WHERE company_id = ? AND is_active = 1`,
        args: [company_id]
      });
      const tree = buildTree(result.rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const checkResult = await db.execute({
        sql: `SELECT * FROM groups WHERE group_id = ?`,
        args: [data.group_id]
      });
      if (checkResult.rows.length === 0) return { success: false, error: "Group not found" };
      
      const group = checkResult.rows[0];

      await db.execute({
        sql: `
          UPDATE groups SET
            name = :name, alias = :alias, parent_group_id = :parent_group_id,
            is_primary = :is_primary,             nature = :nature,
            set_alter_tds_details = :set_alter_tds_details,
            set_alter_tcs_details = :set_alter_tcs_details,
            behaves_like_subledger = :behaves_like_subledger,
            show_net_debit_credit = :show_net_debit_credit,
            used_for_calculation = :used_for_calculation,
            allocation_method = :allocation_method,
            gst_rate = :gst_rate, cgst_rate = :cgst_rate,
            sgst_rate = :sgst_rate, igst_rate = :igst_rate,
            hsn_sac_code = :hsn_sac_code, statutory_details = :statutory_details,
            sort_order = :sort_order, display_order = :display_order,
            updated_at = datetime('now')
          WHERE group_id = :group_id
        `,
        args: {
          group_id: data.group_id,
          name: data.name !== undefined ? data.name : group.name,
          alias: data.alias !== undefined ? data.alias : group.alias,
          parent_group_id: data.parent_group_id !== undefined ? data.parent_group_id : group.parent_group_id,
          is_primary: data.is_primary ? 1 : 0,
          nature: data.nature !== undefined ? data.nature : group.nature,
          set_alter_tds_details: data.set_alter_tds_details ? 1 : 0,
          set_alter_tcs_details: data.set_alter_tcs_details ? 1 : 0,
          behaves_like_subledger: data.behaves_like_subledger ? 1 : 0,
          show_net_debit_credit: data.show_net_debit_credit ? 1 : 0,
          used_for_calculation: data.used_for_calculation ? 1 : 0,
          allocation_method: data.allocation_method !== undefined ? data.allocation_method : group.allocation_method,
          gst_rate: data.gst_rate !== undefined ? data.gst_rate : group.gst_rate,
          cgst_rate: data.cgst_rate !== undefined ? data.cgst_rate : group.cgst_rate,
          sgst_rate: data.sgst_rate !== undefined ? data.sgst_rate : group.sgst_rate,
          igst_rate: data.igst_rate !== undefined ? data.igst_rate : group.igst_rate,
          hsn_sac_code: data.hsn_sac_code !== undefined ? data.hsn_sac_code : group.hsn_sac_code,
          statutory_details: data.statutory_details !== undefined ? data.statutory_details : group.statutory_details,
          sort_order: data.sort_order !== undefined ? data.sort_order : group.sort_order,
          display_order: data.display_order !== undefined ? data.display_order : group.display_order,
        }
      });

      const updatedResult = await db.execute({
        sql: `SELECT * FROM groups WHERE group_id = ?`,
        args: [data.group_id]
      });
      return { success: true, group: updatedResult.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const checkResult = await db.execute({
        sql: `SELECT * FROM groups WHERE group_id = ?`,
        args: [id]
      });
      if (checkResult.rows.length === 0) return { success: false, error: "Group not found" };
      
      const group = checkResult.rows[0];
      if (group.is_predefined) return { success: false, error: "Cannot delete predefined groups" };

      const childrenResult = await db.execute({
        sql: `SELECT * FROM groups WHERE parent_group_id = ? AND is_active = 1`,
        args: [id]
      });
      if (childrenResult.rows.length > 0) return { success: false, error: "Cannot delete group with subgroups" };

      await db.execute({
        sql: `UPDATE groups SET is_active = 0 WHERE group_id = ?`,
        args: [id]
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};