const { setupTestDB, createTestCompany } = require('./helpers');
const gstClassificationService = require('../gstClassification/gstClassificationService');
const gstRegistrationService = require('../gstRegistration/gstRegistrationService');

describe('GST Services Tests', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('GST Services Test Co');
    companyId = company.company_id;
  });

  describe('GST Classification Service', () => {
    it('company creation seeds NO gst classifications (users add their own)', async () => {
      const result = await gstClassificationService.getAll(companyId);
      expect(result.success).toBe(true);
      expect(result.gstClassifications.length).toBe(0);
    });

    it('should create a custom GST classification', async () => {
      const data = {
        company_id: companyId,
        name: 'Custom Lux Items 28%',
        nature_of_transaction: 'Local',
        taxability: 'Taxable',
        reverse_charge: 0,
        ineligible_for_input_tax_credit: 0,
        gst_rate: 28.0,
        cgst_rate: 14.0,
        sgst_rate: 14.0,
        igst_rate: 28.0,
        cess_rate: 0,
      };

      const result = await gstClassificationService.create(data);
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();
    });
  });

  describe('GST Registration Service', () => {
    it('should create a GST registration', async () => {
      const data = {
        company_id: companyId,
        registration_type: 'Regular',
        registration_status: 'Active',
        assessee_of_other_territory: 0,
        periodicity_of_gstr1: 'Monthly',
        gstin: '27AAACG1234A1Z1',
        e_way_bill_applicable: 1,
        e_way_bill_applicable_from: '2026-04-01',
        applicable_for_intrastat: 0,
      };

      const result = await gstRegistrationService.create(data);
      expect(result.success).toBe(true);
      expect(result.gstRegistration).toBeDefined();
    });
  });
});
