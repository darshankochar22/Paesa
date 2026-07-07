const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

const getMenu = async (company_id = 1) => {
  try {
    const featureResult = await tallyFeaturesService.get(company_id);
    const features = featureResult.success ? featureResult.features : {};

    // Statutory master → the F11 flag required for it to appear. GST / Service Tax
    // are not gated yet; items not listed here always show.
    const MASTER_FEATURE = {
      'TDS Details': 'enable_tds',
      'TDS Nature of Payment': 'enable_tds',
      'TCS Details': 'enable_tcs',
      'TCS Nature of Goods': 'enable_tcs',
      'VAT Registration Details': 'enable_vat',
      'Excise Registration Details': 'enable_excise',
      'Excise Duty Classification': 'enable_excise',
      'Excise Book': 'enable_excise',
      'CENVAT Opening Balance': 'enable_excise',
      'PLA Opening Balance': 'enable_excise',
      'Excise Opening Balance': 'enable_excise',
      'Dealer Excise Opening Stock': 'enable_excise',
      'Service Tax Details': 'enable_service_tax',
    };
    const gateItem = (item) => {
      const flag = MASTER_FEATURE[item];
      return !flag || features[flag];
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
    ];
    menu.push({ title: 'Accounting Masters', items: accountingItems });

    if (features.enable_payment_request_qr) {
      const paymentRequest = ['Merchant Profile'];
      menu.push({ title: 'Payment Request', items: paymentRequest });
    }

    if (features.maintain_inventory !== 0) {
      const inventoryItems = [
        'Stock Group',
        'Stock Category',
        'Stock Items',
        'Unit',
        'Location',
        'Price levels',
        'Price list (Stock Group)',
        'Price list (Stock Category)',
      ];
      menu.push({ title: 'Inventory Masters', items: inventoryItems });
    }
    menu.push({
      title: 'Statutory Masters',
      items: [
        'GST Registration',
        'GST Classification',
        'TCS Nature of Goods',
        'TDS Nature of Payment',
        'Excise Duty Classification',
        'Excise Book',
        'Tax Units',
      ].filter(gateItem),
    });

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
    menu.push({ title: 'Statutory Details', items: statutoryDetails });

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

    return { success: true, menu };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getMenu,
};
