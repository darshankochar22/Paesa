const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

const getMenu = async (company_id = 1) => {
  try {
    const featureResult = await tallyFeaturesService.get(company_id);
    const features = featureResult.success ? featureResult.features : {};

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
      ],
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
    ]
      // VAT masters only when VAT is enabled in Company Features (F11).
      .filter((item) => item !== 'VAT Registration Details' || features.enable_vat);
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
