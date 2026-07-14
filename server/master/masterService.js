const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

const getMenu = async (company_id = 1) => {
  try {
    const featureResult = await tallyFeaturesService.get(company_id);
    const features = featureResult.success ? featureResult.features : {};

    // Master item → the F11 flag required for it to appear. Items not listed
    // here always show. Non-destructive: a hidden master's data is untouched and
    // reappears when the feature is turned back on.
    const MASTER_FEATURE = {
      // Accounting — hidden when "Maintain Accounts" is off (inventory-only
      // company). Voucher Type + Currency stay (needed for inventory vouchers).
      Group: 'maintain_accounts',
      Ledger: 'maintain_accounts',
      'Credit Limits': 'maintain_accounts',
      Budget: 'maintain_accounts',
      Scenario: 'maintain_accounts',
      'Cost Category': 'enable_cost_centres',
      'Cost Centre': 'enable_cost_centres',
      // Inventory
      'Price levels': 'enable_multiple_price_levels',
      'Price list (Stock Group)': 'enable_multiple_price_levels',
      'Price list (Stock Category)': 'enable_multiple_price_levels',
      // GST
      'GST Registration': 'enable_gst',
      'GST Classification': 'enable_gst',
      'Company GST Details': 'enable_gst',
      // TDS / TCS
      'TDS Details': 'enable_tds',
      'TDS Nature of Payment': 'enable_tds',
      'TCS Details': 'enable_tcs',
      'TCS Nature of Goods': 'enable_tcs',
      // VAT
      'VAT Registration Details': 'enable_vat',
      // Excise
      'Excise Registration Details': 'enable_excise',
      'Excise Duty Classification': 'enable_excise',
      'Excise Book': 'enable_excise',
      'CENVAT Opening Balance': 'enable_excise',
      'PLA Opening Balance': 'enable_excise',
      'Excise Opening Balance': 'enable_excise',
      'Dealer Excise Opening Stock': 'enable_excise',
      // Service Tax
      'Service Tax Details': 'enable_service_tax',
      // Payroll
      'Payroll Statutory Details': 'enable_payroll_statutory',
    };
    // A flag is "on" unless it is explicitly stored as 0 (matches the client
    // isFeatureEnabled semantics; features that default on stay on).
    const flagOn = (flag) => features[flag] !== 0;
    const gateItem = (item) => {
      const flag = MASTER_FEATURE[item];
      return !flag || flagOn(flag);
    };

    const menu = [];

    const accountingItems = [
      'Group',
      'Ledger',
      'Credit Limits',
      'Currency',
      'Voucher Type',
      'Cost Category',
      'Cost Centre',
      'Budget',
      'Scenario',
    ].filter(gateItem);
    if (accountingItems.length) {
      menu.push({ title: 'Accounting Masters', items: accountingItems });
    }

    if (flagOn('enable_payment_request_qr')) {
      const paymentRequest = ['Merchant Profile'];
      menu.push({ title: 'Payment Request', items: paymentRequest });
    }

    if (flagOn('maintain_inventory')) {
      const inventoryItems = [
        'Stock Group',
        'Stock Category',
        'Stock Items',
        'Unit',
        'Location',
        'Price levels',
        'Price list (Stock Group)',
        'Price list (Stock Category)',
      ].filter(gateItem);
      menu.push({ title: 'Inventory Masters', items: inventoryItems });
    }

    const statutoryMasters = [
      'GST Registration',
      'GST Classification',
      'TCS Nature of Goods',
      'TDS Nature of Payment',
      'Excise Duty Classification',
      'Excise Book',
      'Tax Units',
    ].filter(gateItem);
    if (statutoryMasters.length) {
      menu.push({ title: 'Statutory Masters', items: statutoryMasters });
    }

    const statutoryDetails = [
      'Company GST Details',
      'TDS Details',
      'TCS Details',
      'VAT Registration Details',
      'Excise Registration Details',
      'Service Tax Details',
      'CENVAT Opening Balance',
      'PLA Opening Balance',
      'Excise Opening Balance',
      'Dealer Excise Opening Stock',
      'PAN / CIN Details',
      'Payroll Statutory Details',
    ].filter(gateItem);
    if (statutoryDetails.length) {
      menu.push({ title: 'Statutory Details', items: statutoryDetails });
    }

    if (flagOn('maintain_payroll')) {
      menu.push({
        title: 'Payroll Masters',
        items: [
          'Employee Category',
          'Employee',
          'Units(work)',
          'Employee Group',
          'Attendance / Production type',
          'Pay Heads',
          'Payroll Voucher Type',
        ],
      });
    }

    return { success: true, menu };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getMenu,
};
