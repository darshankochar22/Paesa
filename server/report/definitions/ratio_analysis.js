const ratioAnalysisReportService = require('../ratioAnalysisReportService');
const { calculateClosingStock } = require('../stockValuationEngine');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const res = await ratioAnalysisReportService.ratioAnalysis(company_id, fy_id);
    if (!res.success) return res;

    // Optional valuation-method override (FIFO/LIFO/…). Re-value closing stock and
    // cascade the change through the inventory-dependent ratios, keeping the SAME
    // formulas the service uses so both entry points agree. A change in closing
    // stock shifts gross profit (and hence net profit) by exactly that delta.
    const method = params.stock_valuation_method;
    if (!method) return res;
    const valRes = await calculateClosingStock(company_id, fy_id, null, method);
    if (valRes.success) {
      const inventory = Number(valRes.totalValue) || 0;
      const delta = inventory - (res.components.inventory || 0);
      if (delta !== 0) {
        const { currentLiabilities, sales, workingCapital } = res.components;
        const grossProfit = (res.components.grossProfit || 0) + delta;
        const netProfit = (res.components.netProfit || 0) + delta;

        res.components.inventory = Math.round(inventory * 100) / 100;
        res.components.grossProfit = Math.round(grossProfit * 100) / 100;
        res.components.netProfit = Math.round(netProfit * 100) / 100;

        const r2 = (num, den) => (den ? Math.round((num / den) * 100) / 100 : null);
        const p2 = (num, den) => (den ? Math.round((num / den) * 10000) / 100 : null);
        for (const ratioObj of res.ratios) {
          if (ratioObj.key === 'quick_ratio')
            ratioObj.value = r2(res.components.currentAssets - inventory, currentLiabilities);
          else if (ratioObj.key === 'gross_profit_pct') ratioObj.value = p2(grossProfit, sales);
          else if (ratioObj.key === 'net_profit_pct') ratioObj.value = p2(netProfit, sales);
          else if (ratioObj.key === 'inventory_turnover') ratioObj.value = r2(sales, inventory);
          else if (ratioObj.key === 'return_wc_pct') ratioObj.value = p2(netProfit, workingCapital);
        }
      }
    }
    return res;
  },
};
