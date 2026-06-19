const stockSummaryReportService = require('../stockSummaryReportService');
const { calculateClosingStock } = require('../stockValuationEngine');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const as_on_date = params.as_on_date || null;
    const res = await stockSummaryReportService.stockSummary(company_id, fy_id, as_on_date);
    if (!res.success) return res;

    const method = params.stock_valuation_method || 'FIFO';
    const valRes = await calculateClosingStock(company_id, fy_id, as_on_date, method);
    if (valRes.success) {
      for (const item of res.items) {
        const valItem = valRes.items.find(vi => vi.item_id === item.item_id);
        if (valItem) {
          item.closing_value = valItem.closing_value;
        }
      }
      res.totalClosingValue = res.items.reduce((s, it) => s + it.closing_value, 0);

      const groupMap = new Map();
      for (const it of res.items) {
        const key = it.group_id == null ? 'ungrouped' : it.group_id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            group_id: it.group_id,
            group_name: it.group_name,
            closing_qty: 0,
            closing_value: 0,
            item_count: 0,
          });
        }
        const g = groupMap.get(key);
        g.closing_qty += it.closing_qty;
        g.closing_value += it.closing_value;
        g.item_count += 1;
      }
      res.groups = Array.from(groupMap.values())
        .sort((a, b) => (a.group_name || '').localeCompare(b.group_name || ''));
    }

    return res;
  }
};
