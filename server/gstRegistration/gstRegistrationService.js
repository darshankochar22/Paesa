const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { gstRegistrations } = require('../db/schema');

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;
  return gstinRegex.test(gstin);
};

// Fetch a single gst_registrations row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${gstRegistrations} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }

      const exists = await db.all(
        sql`SELECT * FROM ${gstRegistrations}
            WHERE ${gstRegistrations.companyId} = ${data.company_id}
              AND ${gstRegistrations.gstin} = ${data.gstin}
              AND ${gstRegistrations.isActive} = 1`,
      );
      if (exists.length > 0) return { success: false, error: 'GSTIN already registered' };

      const inserted = await db
        .insert(gstRegistrations)
        .values({
          companyId: data.company_id,
          registrationType: data.registration_type || 'Regular',
          registrationStatus: data.registration_status || 'Active',
          assesseeOfOtherTerritory: data.assessee_of_other_territory ? 1 : 0,
          periodicityOfGstr1: data.periodicity_of_gstr1 || 'Monthly',
          gstin: data.gstin || null,
          gstUsername: data.gst_username || null,
          modeOfFiling: data.mode_of_filing || 'Online',
          eInvoiceDetails: data.e_invoice_details || null,
          eInvoiceApplication: data.e_invoice_application ? 1 : 0,
          eWayBillApplicable: data.e_way_bill_applicable ? 1 : 0,
          eWayBillApplicableFrom: data.e_way_bill_applicable_from || null,
          applicableForIntrastat: data.applicable_for_intrastat ? 1 : 0,
          legalName: data.legal_name || null,
          tradeName: data.trade_name || null,
          stateId: data.state_id || null,
          registrationDate: data.registration_date || null,
          effectiveFrom: data.effective_from || null,
          addressType: data.address_type || 'Primary',
          goodsDispatchedFrom: data.goods_dispatched_from || 'Primary',
          eInvoiceApplicableFrom: data.e_invoice_applicable_from || null,
          eInvoiceBillFromPlace: data.e_invoice_bill_from_place || null,
          compositionTaxRate: data.composition_tax_rate || null,
          compositionTaxCalcBasis: data.composition_tax_calc_basis || null,
          isActive: 1,
        })
        .returning({ id: gstRegistrations.gstId });

      const gstRegistration = await findRow(sql`${gstRegistrations.gstId} = ${inserted[0].id}`);
      return { success: true, gstRegistration };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${gstRegistrations}
            WHERE ${gstRegistrations.companyId} = ${company_id}`,
      );
      return { success: true, gstRegistrations: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const gstRegistration = await findRow(sql`${gstRegistrations.gstId} = ${id}`);
      if (!gstRegistration) return { success: false, error: 'GST Registration not found' };
      return { success: true, gstRegistration };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${gstRegistrations.gstId} = ${data.gst_id}`);
      if (!current) return { success: false, error: 'GST Registration not found' };

      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }

      await db
        .update(gstRegistrations)
        .set({
          registrationType: data.registration_type ?? current.registration_type,
          registrationStatus: data.registration_status ?? current.registration_status,
          assesseeOfOtherTerritory: data.assessee_of_other_territory ? 1 : 0,
          periodicityOfGstr1: data.periodicity_of_gstr1 ?? current.periodicity_of_gstr1,
          gstin: data.gstin ?? current.gstin,
          gstUsername: data.gst_username ?? current.gst_username,
          modeOfFiling: data.mode_of_filing ?? current.mode_of_filing,
          eInvoiceDetails: data.e_invoice_details ?? current.e_invoice_details,
          eInvoiceApplication: data.e_invoice_application ? 1 : 0,
          eWayBillApplicable: data.e_way_bill_applicable ? 1 : 0,
          eWayBillApplicableFrom:
            data.e_way_bill_applicable_from ?? current.e_way_bill_applicable_from,
          applicableForIntrastat: data.applicable_for_intrastat ? 1 : 0,
          legalName: data.legal_name ?? current.legal_name,
          tradeName: data.trade_name ?? current.trade_name,
          stateId: data.state_id ?? current.state_id,
          registrationDate: data.registration_date ?? current.registration_date,
          effectiveFrom: data.effective_from ?? current.effective_from,
          addressType: data.address_type ?? current.address_type,
          goodsDispatchedFrom: data.goods_dispatched_from ?? current.goods_dispatched_from,
          eInvoiceApplicableFrom:
            data.e_invoice_applicable_from ?? current.e_invoice_applicable_from,
          eInvoiceBillFromPlace:
            data.e_invoice_bill_from_place ?? current.e_invoice_bill_from_place,
          compositionTaxRate: data.composition_tax_rate ?? current.composition_tax_rate,
          compositionTaxCalcBasis:
            data.composition_tax_calc_basis ?? current.composition_tax_calc_basis,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(gstRegistrations.gstId, data.gst_id));

      const updated = await findRow(sql`${gstRegistrations.gstId} = ${data.gst_id}`);
      return { success: true, gstRegistration: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${gstRegistrations.gstId} = ${id}`);
      if (!existing) return { success: false, error: 'GST Registration not found' };

      await db.update(gstRegistrations).set({ isActive: 0 }).where(eq(gstRegistrations.gstId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
