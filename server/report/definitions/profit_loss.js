const reportService = require('../reportService');
const { calculateClosingStock } = require('../stockValuationEngine');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const res = await reportService.profitLoss(company_id, fy_id);
    if (!res.success) return res;

    const method = params.stock_valuation_method || 'FIFO';
    const as_on_date = params.as_on_date || null;
    const stockVal = await calculateClosingStock(company_id, fy_id, as_on_date, method);

    if (stockVal.success) {
      res.closingStockValue = stockVal.totalValue;
      res.totalIncome += stockVal.totalValue;
      res.netProfit = res.totalIncome - res.totalExpenses;
      res.isProfit = res.netProfit >= 0;
    }
    return res;
  }
};
