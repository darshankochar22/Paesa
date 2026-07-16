const { setupTestDB, createTestCompany } = require('./helpers');
const companyGstDetailsService = require('../companyGstDetails/companyGstDetailsService');

describe('Company GST Details Service Tests', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Company GST Details Test Co');
    companyId = company.company_id;
  });

  it('should return exists: false with default data structures when no company GST details exist', async () => {
    const result = await companyGstDetailsService.get(companyId);
    expect(result.success).toBe(true);
    expect(result.exists).toBe(false);
    expect(result.data).toBeDefined();
    expect(result.data.hsnSacType).toBe('Not Defined');
    expect(result.data.downloadGSTRegistration).toBe('');
    expect(result.data.downloadReturnType).toBe('All Returns');
    expect(result.data.setStateWiseThresholdLimit).toBe(false);
    expect(result.data.stateWiseLimits).toEqual([]);
    expect(result.data.gstAdvancesApplicableFrom).toBe('');
    expect(result.data.gstRateDetails).toBe('Not Defined');
    expect(result.data.gstClassification).toBe('');
    expect(result.data.slabRates).toEqual([]);
  });

  it('should successfully insert new GST details including download settings and state limits', async () => {
    const data = {
      company_id: companyId,
      hsnSacType: 'Specify Details Here',
      hsnSacCode: '123456',
      description: 'Test Goods',
      taxabilityType: 'Taxable',
      gstRate: 18,
      gstRateDetails: 'Specify Slab-Based Rates',
      gstClassification: 'My Classification',
      slabRates: [
        { greaterThan: 0, upTo: '1000', taxabilityType: 'Taxable', gstRate: 5 },
        { greaterThan: 1000, upTo: '', taxabilityType: 'Taxable', gstRate: 12 },
      ],
      interstateThresholdLimit: 50000,
      intrastateThresholdLimit: 50000,
      thresholdLimitIncludes: 'Value of Invoice',
      createHSNSummaryFor: 'All Sections',
      minimumHSNLength: 4,
      showGSTAdvances: true,
      updateGSTStatus: false,
      gstReturnsConfigured: true,
      effectiveDate: '2026-04-01',
      downloadGSTRegistration: 'Chhattisgarh Registration',
      downloadReturnType: 'GSTR-1',
      setStateWiseThresholdLimit: true,
      stateWiseLimits: [{ stateName: 'Chhattisgarh', limit: 50000 }],
      gstAdvancesApplicableFrom: '2026-04-01',
    };

    const saveResult = await companyGstDetailsService.save(data);
    expect(saveResult.success).toBe(true);

    const getResult = await companyGstDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.hsnSacType).toBe('Specify Details Here');
    expect(getResult.data.hsnSacCode).toBe('123456');
    expect(getResult.data.showGSTAdvances).toBe(true);
    expect(getResult.data.gstReturnsConfigured).toBe(true);
    expect(getResult.data.downloadGSTRegistration).toBe('Chhattisgarh Registration');
    expect(getResult.data.downloadReturnType).toBe('GSTR-1');
    expect(getResult.data.setStateWiseThresholdLimit).toBe(true);
    expect(getResult.data.stateWiseLimits).toEqual([{ stateName: 'Chhattisgarh', limit: 50000 }]);
    expect(getResult.data.gstAdvancesApplicableFrom).toBe('2026-04-01');
    expect(getResult.data.gstRateDetails).toBe('Specify Slab-Based Rates');
    expect(getResult.data.gstClassification).toBe('My Classification');
    expect(getResult.data.slabRates).toEqual([
      { greaterThan: 0, upTo: '1000', taxabilityType: 'Taxable', gstRate: 5 },
      { greaterThan: 1000, upTo: '', taxabilityType: 'Taxable', gstRate: 12 },
    ]);
  });

  it('should successfully update existing GST details', async () => {
    const updatedData = {
      company_id: companyId,
      hsnSacType: 'Not Defined',
      hsnSacCode: '',
      description: '',
      taxabilityType: 'Not Defined',
      gstRate: 0,
      interstateThresholdLimit: 60000,
      intrastateThresholdLimit: 60000,
      thresholdLimitIncludes: 'Value of Taxable Goods',
      createHSNSummaryFor: 'None',
      minimumHSNLength: 4,
      showGSTAdvances: false,
      updateGSTStatus: true,
      gstReturnsConfigured: true,
      effectiveDate: '2026-05-01',
      downloadGSTRegistration: 'Maharashtra Registration',
      downloadReturnType: 'GSTR-3B',
      setStateWiseThresholdLimit: false,
      stateWiseLimits: [],
      gstAdvancesApplicableFrom: '',
    };

    const saveResult = await companyGstDetailsService.save(updatedData);
    expect(saveResult.success).toBe(true);

    const getResult = await companyGstDetailsService.get(companyId);
    expect(getResult.success).toBe(true);
    expect(getResult.exists).toBe(true);
    expect(getResult.data).toBeDefined();
    expect(getResult.data.hsnSacType).toBe('Not Defined');
    expect(getResult.data.interstateThresholdLimit).toBe(60000);
    expect(getResult.data.thresholdLimitIncludes).toBe('Value of Taxable Goods');
    expect(getResult.data.updateGSTStatus).toBe(true);
    expect(getResult.data.downloadGSTRegistration).toBe('Maharashtra Registration');
    expect(getResult.data.downloadReturnType).toBe('GSTR-3B');
    expect(getResult.data.setStateWiseThresholdLimit).toBe(false);
    expect(getResult.data.stateWiseLimits).toEqual([]);
    expect(getResult.data.gstAdvancesApplicableFrom).toBe('');
  });
});
