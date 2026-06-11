const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

const getMenu = async (company_id = 1) => {
  try {
    const featureResult = await tallyFeaturesService.get(company_id);
    const features = featureResult.success ? featureResult.features : {};

    const menu = [];

    const accountingItems = ["Group", "Ledger","Cost Centre", "Currency", "Voucher Type"];
    if (features.enable_cost_centres) {
      accountingItems.push("Cost Centre");
    }
    menu.push({ title: "Accounting Masters", items: accountingItems });
     
    if(features.enable_payment_request_qr) {
      const paymentRequest = ["Merchant Profile"];
      menu.push({ title: "Payment Request",items:paymentRequest});
    }

    if (features.maintain_inventory !== 0) {
      const inventoryItems = ["Stock Group", "Stock Category", "Stock Items", "Unit", "Location", "Price levels", "Price list (Stock Group)", "Price list (Stock Category)"];
      menu.push({ title: "Inventory Masters", items: inventoryItems });
    }
    menu.push({
      title: "Statutory Masters",
      items: ["GST Registration", "GST Classification", "TCS Nature of Goods", "TDS Nature of Payment","Tax Units"]
    });

    menu.push({
      title: "Statutory Details",
      items: ["Company GST Details","TDS Nature of payments","TCS Nature of goods","VAT Registration Details","Excise Registration Details", "PAN / CIN Details"]
    });

    menu.push({
      title: "Payroll Masters",
      items: ["Employee Category", "Employee","Units(work)", "Employee Group", "Attendance / Production type", "Pay Heads","Payroll Voucher Type", "Salary Structure"]
    });

    return { success: true, menu };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getMenu
};