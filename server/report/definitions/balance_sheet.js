const reportService = require('../reportService');
const { calculateClosingStock } = require('../stockValuationEngine');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const res = await reportService.balanceSheet(company_id, fy_id);
    if (!res.success) return res;

    const method = params.stock_valuation_method || 'FIFO';
    const as_on_date = params.as_on_date || null;
    const stockVal = await calculateClosingStock(company_id, fy_id, as_on_date, method);

    if (stockVal.success && stockVal.totalValue > 0) {
      res.assets.push({
        ledger_id: null,
        ledger_name: 'Closing Stock',
        balance: stockVal.totalValue
      });
      res.totalAssets = res.assets.reduce((s, l) => s + Math.abs(l.balance), 0);
    }
    return res;
  }
};
