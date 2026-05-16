let gstRegistrations = [];

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

module.exports = {
  create: async (data) => {
    try {

      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }


      const exists = gstRegistrations.find(
        g => g.company_id === data.company_id &&
        g.gstin === data.gstin
      );
      if (exists) return { success: false, error: 'GSTIN already registered' };

      const gstRegistration = {
        id: Date.now(),
        company_id: data.company_id,
        registration_type: data.registration_type || 'Regular',
        registration_status: data.registration_status || 'Active',
        assessee_of_other_territory: data.assessee_of_other_territory || false,
        periodicity_of_gstr1: data.periodicity_of_gstr1 || 'Monthly', 
        gstin: data.gstin || null,
        gst_username: data.gst_username || null,
        mode_of_filing: data.mode_of_filing || 'Online',
        e_invoice_details: data.e_invoice_details || null,
        e_invoice_application: data.e_invoice_application || false,
        e_way_bill_applicable: data.e_way_bill_applicable || false,
        e_way_bill_applicable_from: data.e_way_bill_applicable_from || null,
        applicable_for_intrastat: data.applicable_for_intrastat || false,
        legal_name: data.legal_name || null,
        trade_name: data.trade_name || null,
        state_id: data.state_id || null,
        registration_date: data.registration_date || null,
        effective_from: data.effective_from || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      gstRegistrations.push(gstRegistration);
      return { success: true, gstRegistration };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = gstRegistrations.filter(g => g.company_id === company_id && g.is_active);
      return { success: true, gstRegistrations: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const gstRegistration = gstRegistrations.find(g => g.id === id);
      if (!gstRegistration) return { success: false, error: 'GST Registration not found' };
      return { success: true, gstRegistration };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = gstRegistrations.findIndex(g => g.id === data.id);
      if (index === -1) return { success: false, error: 'GST Registration not found' };

      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }

      gstRegistrations[index] = {
        ...gstRegistrations[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, gstRegistration: gstRegistrations[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const gst = gstRegistrations.find(g => g.id === id);
      if (!gst) return { success: false, error: 'GST Registration not found' };

      gstRegistrations = gstRegistrations.map(g =>
        g.id === id ? { ...g, is_active: false } : g
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};