// ---------------------------------------------------------------------------
// Drizzle ORM conversion. Follows the golden exemplar (currencyService.js):
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...), with eq()/and()/sql`` predicates.
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) so the legacy snake_case column keys and numeric 0/1 booleans
//     are preserved exactly (the controllers/tests + buildTree depend on the
//     snake_case keys group_id / parent_group_id).
//   * New-row id after INSERT comes from .returning({ id: groups.groupId }),
//     replacing the old result.lastInsertRowid.
// ---------------------------------------------------------------------------
const { db } = require("../db/index");
const { sql, eq, and } = require("drizzle-orm");
const { groups } = require("../db/schema");

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

// Fetch a single group row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${groups} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultGroups = async (company_id) => {
  const seededPrimary = [];

  for (let i = 0; i < PRIMARY_GROUPS.length; i++) {
    const g = PRIMARY_GROUPS[i];
    const inserted = await db
      .insert(groups)
      .values({
        companyId: company_id,
        name: g.name,
        alias: null,
        parentGroupId: null,
        isPrimary: 1,
        isPredefined: 1,
        nature: g.nature,
        setAlterTdsDetails: 0,
        setAlterTcsDetails: 0,
        setAlterOtherStatutoryDetails: 0,
        hsnSacSource: null,
        hsnSacDescription: null,
        gstRateSource: null,
        taxabilityType: null,
        behavesLikeSubledger: 0,
        showNetDebitCredit: 0,
        usedForCalculation: 0,
        allocationMethod: "Average Cost",
        gstRate: null,
        cgstRate: null,
        sgstRate: null,
        igstRate: null,
        hsnSacCode: null,
        statutoryDetails: null,
        sortOrder: i + 1,
        groupType: "Primary",
        displayOrder: i + 1,
        isActive: 1,
      })
      .returning({ id: groups.groupId });

    seededPrimary.push({ id: Number(inserted[0].id), name: g.name });
  }

  for (let i = 0; i < PREDEFINED_GROUPS.length; i++) {
    const g = PREDEFINED_GROUPS[i];
    const parent = seededPrimary.find((p) => p.name === g.parent_name);
    await db
      .insert(groups)
      .values({
        companyId: company_id,
        name: g.name,
        alias: null,
        parentGroupId: parent ? parent.id : null,
        isPrimary: 0,
        isPredefined: 1,
        nature: g.nature,
        setAlterTdsDetails: g.set_alter_tds_details,
        setAlterTcsDetails: 0,
        setAlterOtherStatutoryDetails: 0,
        hsnSacSource: null,
        hsnSacDescription: null,
        gstRateSource: null,
        taxabilityType: null,
        behavesLikeSubledger: 0,
        showNetDebitCredit: 0,
        usedForCalculation: 0,
        allocationMethod: "Average Cost",
        gstRate: null,
        cgstRate: null,
        sgstRate: null,
        igstRate: null,
        hsnSacCode: null,
        statutoryDetails: null,
        sortOrder: i + 1,
        groupType: "Predefined",
        displayOrder: i + 1,
        isActive: 1,
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
      const existsResult = await db.all(
        sql`SELECT * FROM ${groups}
            WHERE ${groups.companyId} = ${data.company_id}
              AND LOWER(${groups.name}) = LOWER(${data.name})
              AND ${groups.isActive} = 1`
      );

      if (existsResult.length > 0) return { success: false, error: "Group already exists" };

      const inserted = await db
        .insert(groups)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parentGroupId: data.parent_group_id || null,
          isPrimary: data.is_primary ? 1 : 0,
          isPredefined: 0,
          nature: data.nature,
          setAlterTdsDetails: data.set_alter_tds_details ? 1 : 0,
          setAlterTcsDetails: data.set_alter_tcs_details ? 1 : 0,
          setAlterOtherStatutoryDetails: data.set_alter_other_statutory_details ? 1 : 0,
          hsnSacSource: data.hsn_sac_source || null,
          hsnSacDescription: data.hsn_sac_description || null,
          gstRateSource: data.gst_rate_source || null,
          taxabilityType: data.taxability_type || null,
          behavesLikeSubledger: data.behaves_like_subledger ? 1 : 0,
          showNetDebitCredit: data.show_net_debit_credit ? 1 : 0,
          usedForCalculation: data.used_for_calculation ? 1 : 0,
          allocationMethod: data.allocation_method || "Average Cost",
          gstRate: data.gst_rate || null,
          cgstRate: data.cgst_rate || null,
          sgstRate: data.sgst_rate || null,
          igstRate: data.igst_rate || null,
          hsnSacCode: data.hsn_sac_code || null,
          statutoryDetails: data.statutory_details || null,
          sortOrder: data.sort_order || 0,
          groupType: data.is_primary ? "Primary" : "User",
          displayOrder: data.display_order || 0,
          isActive: 1,
        })
        .returning({ id: groups.groupId });

      const group = await findRow(sql`${groups.groupId} = ${Number(inserted[0].id)}`);

      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${groups}
            WHERE ${groups.companyId} = ${company_id}
              AND ${groups.isActive} = 1`
      );
      return { success: true, groups: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const group = await findRow(sql`${groups.groupId} = ${id}`);
      if (!group) return { success: false, error: "Group not found" };
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${groups}
            WHERE ${groups.companyId} = ${company_id}
              AND ${groups.isActive} = 1`
      );
      const tree = buildTree(rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const group = await findRow(sql`${groups.groupId} = ${data.group_id}`);
      if (!group) return { success: false, error: "Group not found" };

      await db
        .update(groups)
        .set({
          name: data.name !== undefined ? data.name : group.name,
          alias: data.alias !== undefined ? data.alias : group.alias,
          parentGroupId: data.parent_group_id !== undefined ? data.parent_group_id : group.parent_group_id,
          isPrimary: data.is_primary ? 1 : 0,
          nature: data.nature !== undefined ? data.nature : group.nature,
          setAlterTdsDetails: data.set_alter_tds_details ? 1 : 0,
          setAlterTcsDetails: data.set_alter_tcs_details ? 1 : 0,
          setAlterOtherStatutoryDetails: data.set_alter_other_statutory_details ? 1 : 0,
          hsnSacSource: data.hsn_sac_source !== undefined ? data.hsn_sac_source : group.hsn_sac_source,
          hsnSacDescription: data.hsn_sac_description !== undefined ? data.hsn_sac_description : group.hsn_sac_description,
          gstRateSource: data.gst_rate_source !== undefined ? data.gst_rate_source : group.gst_rate_source,
          taxabilityType: data.taxability_type !== undefined ? data.taxability_type : group.taxability_type,
          behavesLikeSubledger: data.behaves_like_subledger ? 1 : 0,
          showNetDebitCredit: data.show_net_debit_credit ? 1 : 0,
          usedForCalculation: data.used_for_calculation ? 1 : 0,
          allocationMethod: data.allocation_method !== undefined ? data.allocation_method : group.allocation_method,
          gstRate: data.gst_rate !== undefined ? data.gst_rate : group.gst_rate,
          cgstRate: data.cgst_rate !== undefined ? data.cgst_rate : group.cgst_rate,
          sgstRate: data.sgst_rate !== undefined ? data.sgst_rate : group.sgst_rate,
          igstRate: data.igst_rate !== undefined ? data.igst_rate : group.igst_rate,
          hsnSacCode: data.hsn_sac_code !== undefined ? data.hsn_sac_code : group.hsn_sac_code,
          statutoryDetails: data.statutory_details !== undefined ? data.statutory_details : group.statutory_details,
          sortOrder: data.sort_order !== undefined ? data.sort_order : group.sort_order,
          displayOrder: data.display_order !== undefined ? data.display_order : group.display_order,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(groups.groupId, data.group_id));

      const updated = await findRow(sql`${groups.groupId} = ${data.group_id}`);
      return { success: true, group: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const group = await findRow(sql`${groups.groupId} = ${id}`);
      if (!group) return { success: false, error: "Group not found" };
      if (group.is_predefined) return { success: false, error: "Cannot delete predefined groups" };

      const children = await db.all(
        sql`SELECT * FROM ${groups}
            WHERE ${groups.parentGroupId} = ${id}
              AND ${groups.isActive} = 1`
      );
      if (children.length > 0) return { success: false, error: "Cannot delete group with subgroups" };

      await db
        .update(groups)
        .set({ isActive: 0 })
        .where(eq(groups.groupId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
