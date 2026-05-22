const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

const getMenu = async (company_id = 1) => {
  try {
    const featureResult = await tallyFeaturesService.get(company_id);
    const features = featureResult.success ? featureResult.features : {};

    const menu = [];

    const accountingItems = ["Group", "Ledger", "Currency", "Voucher Type"];
    if (features.enable_cost_centres) {
      accountingItems.push("Cost Centre");
    }
    menu.push({ title: "Accounting Masters", items: accountingItems });

    if (features.maintain_inventory !== 0) {
      const inventoryItems = ["Stock Group", "Stock Category", "Stock Items", "Unit", "Location"];
      menu.push({ title: "Inventory Masters", items: inventoryItems });
    }
    menu.push({
      title: "Statutory Masters",
      items: ["GST Registration", "GST Classification", "Statutory Details", "Company GST Details", "PAN / CIN Details"]
    });

    menu.push({
      title: "Payroll Masters",
      items: ["Employee Category", "Employee Group", "Employee", "Attendance Type", "Pay Head", "Payroll Unit", "Salary Structure"]
    });

    return { success: true, menu };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getMenu
};