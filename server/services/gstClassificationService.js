let gstClassifications = [];

const seedDefaultGSTClassifications = (company_id) => {
  const defaults = [
    { name: 'GST 0%',   gst_rate: 0,  cgst_rate: 0,    sgst_rate: 0,    igst_rate: 0,   cess_rate: 0, nature_of_transaction: 'Taxable' },
    { name: 'GST 5%',   gst_rate: 5,  cgst_rate: 2.5,  sgst_rate: 2.5,  igst_rate: 5,   cess_rate: 0, nature_of_transaction: 'Taxable' },
    { name: 'GST 12%',  gst_rate: 12, cgst_rate: 6,    sgst_rate: 6,    igst_rate: 12,  cess_rate: 0, nature_of_transaction: 'Taxable' },
    { name: 'GST 18%',  gst_rate: 18, cgst_rate: 9,    sgst_rate: 9,    igst_rate: 18,  cess_rate: 0, nature_of_transaction: 'Taxable' },
    { name: 'GST 28%',  gst_rate: 28, cgst_rate: 14,   sgst_rate: 14,   igst_rate: 28,  cess_rate: 0, nature_of_transaction: 'Taxable' },
    { name: 'Exempt',   gst_rate: 0,  cgst_rate: 0,    sgst_rate: 0,    igst_rate: 0,   cess_rate: 0, nature_of_transaction: 'Exempt' },
    { name: 'Nil Rated',gst_rate: 0,  cgst_rate: 0,    sgst_rate: 0,    igst_rate: 0,   cess_rate: 0, nature_of_transaction: 'Nil Rated' },
    { name: 'Non GST',  gst_rate: 0,  cgst_rate: 0,    sgst_rate: 0,    igst_rate: 0,   cess_rate: 0, nature_of_transaction: 'Non GST' },
  ];

  defaults.forEach((g, i) => {
    gstClassifications.push({
      id: Date.now() + i,
      company_id,
      name: g.name,
      nature_of_transaction: g.nature_of_transaction,
      hsn_sac_code: null,
      gst_rate: g.gst_rate,
      cgst_rate: g.cgst_rate,
      sgst_rate: g.sgst_rate,
      igst_rate: g.igst_rate,
      cess_rate: g.cess_rate,
      valuation_type: 'Based on Value',
      description: null,
      is_predefined: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
};

module.exports = {
  seedDefaultGSTClassifications,

  create: async (data) => {
    try {
      const exists = gstClassifications.find(
        g => g.company_id === data.company_id &&
        g.name.toLowerCase() === data.name.toLowerCase()
      );
      if (exists) return { success: false, error: 'GST Classification already exists' };

      const classification = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        nature_of_transaction: data.nature_of_transaction || 'Taxable',
        hsn_sac_code: data.hsn_sac_code || null,
        gst_rate: data.gst_rate || 0,
        cgst_rate: data.cgst_rate || 0,
        sgst_rate: data.sgst_rate || 0,
        igst_rate: data.igst_rate || 0,
        cess_rate: data.cess_rate || 0,
        valuation_type: data.valuation_type || 'Based on Value',
        description: data.description || null,
        is_predefined: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      gstClassifications.push(classification);
      return { success: true, classification };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = gstClassifications.filter(
        g => g.company_id === company_id && g.is_active
      );
      return { success: true, gstClassifications: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const classification = gstClassifications.find(g => g.id === id);
      if (!classification) return { success: false, error: 'GST Classification not found' };
      return { success: true, classification };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = gstClassifications.findIndex(g => g.id === data.id);
      if (index === -1) return { success: false, error: 'GST Classification not found' };
      if (gstClassifications[index].is_predefined) return { success: false, error: 'Cannot edit predefined GST classifications' };

      gstClassifications[index] = {
        ...gstClassifications[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, classification: gstClassifications[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const classification = gstClassifications.find(g => g.id === id);
      if (!classification) return { success: false, error: 'GST Classification not found' };
      if (classification.is_predefined) return { success: false, error: 'Cannot delete predefined GST classifications' };

      gstClassifications = gstClassifications.map(g =>
        g.id === id ? { ...g, is_active: false } : g
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};