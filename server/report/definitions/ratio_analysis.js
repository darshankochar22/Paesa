const ratioAnalysisReportService = require('../ratioAnalysisReportService');
const { calculateClosingStock } = require('../stockValuationEngine');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const res = await ratioAnalysisReportService.ratioAnalysis(company_id, fy_id);
    if (!res.success) return res;

    const method = params.stock_valuation_method || 'FIFO';
    const valRes = await calculateClosingStock(company_id, fy_id, null, method);
    if (valRes.success) {
      const inventory = valRes.totalValue;
      res.components.inventory = inventory;

      const currentAssets = res.components.currentAssets;
      const currentLiabilities = res.components.currentLiabilities;
      const sales = res.components.sales;
      const purchases = res.components.purchases;
      const directExpenses = res.components.directExpenses;

      const grossProfit = sales - (purchases + directExpenses) + inventory;

      res.components.grossProfit = grossProfit;

      for (const ratioObj of res.ratios) {
        if (ratioObj.key === 'quick_ratio') {
          const num = currentAssets - inventory;
          ratioObj.value = currentLiabilities ? Math.round((num / currentLiabilities) * 100) / 100 : null;
        } else if (ratioObj.key === 'gross_profit_pct') {
          ratioObj.value = sales ? Math.round((grossProfit / sales) * 10000) / 100 : null;
        } else if (ratioObj.key === 'inventory_turnover') {
          ratioObj.value = inventory ? Math.round(((purchases + directExpenses) / inventory) * 100) / 100 : null;
        }
      }
    }
    return res;
  }
};
