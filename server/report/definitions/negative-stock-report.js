// Negative Stock (Gateway → Display More Reports → Exception Reports → Negative Stock).
// Lists only items whose closing quantity is below zero, valued at weighted-average
// cost (value/rate carry the negative sign, unlike normal Stock Summary which floors
// negatives to zero). Ends with a Grand Total row.
module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const { queryStockBalances } = require('../services/inventoryService');
      const as_on_date = params.as_on_date || params.to_date || null;

      const res = await queryStockBalances(company_id, fy_id, as_on_date, {
        stock_group_id: params.stock_group_id,
        godown_id: params.godown_id,
        stock_category_id: params.stock_category_id,
      });
      if (!res.success) return res;

      const rows = [];
      let totalQty = 0;
      let totalValue = 0;

      for (const r of res.rows || []) {
        const closingQty = Number(r.closing_qty) || 0;
        if (closingQty >= 0) continue; // negative stock only

        const openQty = Number(r.opening_qty) || 0;
        const openVal = Number(r.opening_value) || 0;
        const inQty = Number(r.inwards_qty) || 0;
        const inVal = Number(r.inwards_value) || 0;
        const denom = openQty + inQty;
        const avgRate = denom !== 0 ? (openVal + inVal) / denom : 0;
        const closingValue = avgRate * closingQty; // negative

        totalQty += closingQty;
        totalValue += closingValue;

        rows.push({
          item_id: r.item_id,
          item_name: r.item_name,
          group_name: r.group_name || 'Ungrouped',
          closing_qty: closingQty,
          closing_rate: avgRate,
          closing_value: closingValue,
        });
      }

      if (rows.length > 0) {
        rows.push({
          isTotal: true,
          item_name: 'Grand Total',
          group_name: '',
          closing_qty: totalQty,
          closing_rate: null,
          closing_value: totalValue,
        });
      }

      return {
        success: true,
        rows,
        message: rows.length === 0 ? 'No negative stock items found.' : null,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
