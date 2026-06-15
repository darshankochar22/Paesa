// ---------------------------------------------------------------------------
// Drizzle ORM conversion — follows the currencyService golden exemplar.
//
//   * Import the drizzle instance `db` and the raw `sql` template tag, plus the
//     comparison helpers (`eq`) from drizzle-orm. Import table objects from the
//     dialect-switching schema barrel ('../db/schema').
//   * MUTATIONS use the query builder: db.insert().values(), db.update().set().
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ...`) to
//     preserve the EXACT legacy snake_case shape (tax_unit_id, set_alter_*,
//     is_active as numeric 0/1) the test oracle asserts against.
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
// ---------------------------------------------------------------------------
const { db } = require("../db/index");
const { sql, eq } = require("drizzle-orm");
const { taxUnits } = require("../db/schema");

// Fetch a single tax_unit row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${taxUnits} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${taxUnits}
            WHERE ${taxUnits.companyId} = ${data.company_id}
              AND LOWER(${taxUnits.name}) = LOWER(${data.name})
              AND ${taxUnits.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: "Tax unit already exists" };

      const inserted = await db
        .insert(taxUnits)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          addressLine1: data.address_line1 || null,
          addressLine2: data.address_line2 || null,
          addressLine3: data.address_line3 || null,
          addressLine4: data.address_line4 || null,
          state: data.state || null,
          pincode: data.pincode || null,
          telephone: data.telephone || null,
          registeredFor: data.registered_for || "Excise",
          setAlterExciseDetails: data.set_alter_excise_details ? 1 : 0,
          registrationType: data.registration_type || "Importer",
          eccNumber: data.ecc_number || null,
          setAlterExciseTariff: data.set_alter_excise_tariff ? 1 : 0,
          setAlterRule11Book: data.set_alter_rule11_book ? 1 : 0,
          sortOrder: data.sort_order || 0,
          isActive: 1,
        })
        .returning({ id: taxUnits.taxUnitId });

      const taxUnit = await findRow(sql`${taxUnits.taxUnitId} = ${inserted[0].id}`);
      return { success: true, taxUnit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${taxUnits}
            WHERE ${taxUnits.companyId} = ${company_id}
              AND ${taxUnits.isActive} = 1`
      );
      return { success: true, taxUnits: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const taxUnit = await findRow(sql`${taxUnits.taxUnitId} = ${id}`);
      if (!taxUnit) return { success: false, error: "Tax unit not found" };
      return { success: true, taxUnit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const taxUnit = await findRow(sql`${taxUnits.taxUnitId} = ${data.tax_unit_id}`);
      if (!taxUnit) return { success: false, error: "Tax unit not found" };

      await db
        .update(taxUnits)
        .set({
          name: data.name !== undefined ? data.name : taxUnit.name,
          alias: data.alias !== undefined ? data.alias : taxUnit.alias,
          addressLine1:
            data.address_line1 !== undefined ? data.address_line1 : taxUnit.address_line1,
          addressLine2:
            data.address_line2 !== undefined ? data.address_line2 : taxUnit.address_line2,
          addressLine3:
            data.address_line3 !== undefined ? data.address_line3 : taxUnit.address_line3,
          addressLine4:
            data.address_line4 !== undefined ? data.address_line4 : taxUnit.address_line4,
          state: data.state !== undefined ? data.state : taxUnit.state,
          pincode: data.pincode !== undefined ? data.pincode : taxUnit.pincode,
          telephone: data.telephone !== undefined ? data.telephone : taxUnit.telephone,
          registeredFor:
            data.registered_for !== undefined ? data.registered_for : taxUnit.registered_for,
          setAlterExciseDetails:
            data.set_alter_excise_details !== undefined
              ? data.set_alter_excise_details
                ? 1
                : 0
              : taxUnit.set_alter_excise_details,
          registrationType:
            data.registration_type !== undefined
              ? data.registration_type
              : taxUnit.registration_type,
          eccNumber: data.ecc_number !== undefined ? data.ecc_number : taxUnit.ecc_number,
          setAlterExciseTariff:
            data.set_alter_excise_tariff !== undefined
              ? data.set_alter_excise_tariff
                ? 1
                : 0
              : taxUnit.set_alter_excise_tariff,
          setAlterRule11Book:
            data.set_alter_rule11_book !== undefined
              ? data.set_alter_rule11_book
                ? 1
                : 0
              : taxUnit.set_alter_rule11_book,
          sortOrder: data.sort_order !== undefined ? data.sort_order : taxUnit.sort_order,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(taxUnits.taxUnitId, data.tax_unit_id));

      const updated = await findRow(sql`${taxUnits.taxUnitId} = ${data.tax_unit_id}`);
      return { success: true, taxUnit: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${taxUnits.taxUnitId} = ${id}`);
      if (!existing) return { success: false, error: "Tax unit not found" };

      await db
        .update(taxUnits)
        .set({ isActive: 0 })
        .where(eq(taxUnits.taxUnitId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
