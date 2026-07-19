import { LAYOUT_ONLY_REPORTS } from '@/constants/reportFields';

// Per-report data fetch dispatcher — extracted from ReportRunner.tsx's loadData
// (behaviour unchanged). Receives the runner's state setters explicitly.
export interface LoadReportCtx {
  reportType: string;
  definition: any;
  selectedCompany: any;
  activeFY: any;
  fromDate: string;
  toDate: string;
  valuationMethod?: string;
  location: { search: string; state: any };
  setRows: (rows: any[]) => void;
  setLoading: (b: boolean) => void;
  setError: (e: string | null) => void;
  setNotice: (n: string | null) => void;
}

export async function loadReportData(ctx: LoadReportCtx) {
  const {
    reportType,
    definition,
    selectedCompany,
    activeFY,
    fromDate,
    toDate,
    location,
    setRows,
    setLoading,
    setError,
    setNotice,
  } = ctx;
  const config = { valuationMethod: ctx.valuationMethod };
  if (LAYOUT_ONLY_REPORTS.has(reportType)) {
    setLoading(false);
    return;
  }
  if (!selectedCompany?.company_id || !activeFY?.fy_id) {
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);
  setNotice(null);

  try {
    if (definition.apiMethod === 'editLogSummary') {
      const res = await window.api.auditTrail.getAll(selectedCompany.company_id, {
        from_date: fromDate,
        to_date: toDate,
        limit: 100,
      });
      if (!res.success) throw new Error(res.error);
      const rows = res.logs || [];
      setRows(
        rows.map((r: any) => ({
          id: r.log_id,
          timestamp: new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          entity: `${r.entity_type} ${r.entity_id ? `(#${r.entity_id})` : ''}`,
          action: r.action,
          user: r.user || 'System',
        })),
      );
      setLoading(false);
      return;
    }

    if (definition.apiMethod && window.api?.report?.[definition.apiMethod]) {
      let res;
      if (definition.apiMethod === 'ledgerReport') {
        const queryParams = new URLSearchParams(location.search);
        const ledgerIdParam = queryParams.get('ledger_id') || (location.state as any)?.ledger_id;
        const ledgerId = ledgerIdParam ? Number(ledgerIdParam) : 1;
        // Drilling from the Ledger Monthly Summary passes a month name; forward it so
        // the backend matches by calendar-month-within-FY (year-agnostic) rather than
        // an FY-reconstructed date window that can drop out-of-nominal-year vouchers.
        const monthParam = queryParams.get('month');
        res = await window.api.report.ledgerReport(
          selectedCompany.company_id,
          activeFY.fy_id,
          ledgerId,
          fromDate,
          toDate,
          monthParam || undefined,
        );
      } else if (
        definition.apiMethod === 'cashBook' ||
        definition.apiMethod === 'daybook' ||
        definition.apiMethod === 'bankBook'
      ) {
        res = await window.api.report[definition.apiMethod](
          selectedCompany.company_id,
          activeFY.fy_id,
          fromDate,
          toDate,
        );
      } else if (definition.apiMethod === 'cashFlow' || definition.apiMethod === 'fundsFlow') {
        res = await window.api.report[definition.apiMethod](
          selectedCompany.company_id,
          activeFY.fy_id,
          fromDate,
          toDate,
        );
      } else if (definition.apiMethod === 'stockSummary') {
        const methodMap: Record<string, string> = {
          Default: 'FIFO',
          FIFO: 'FIFO',
          'Average Cost': 'Weighted Average',
          'Weighted Average': 'Weighted Average',
        };
        const valuationMethod = methodMap[config.valuationMethod] || 'FIFO';
        res = await window.api.report.stockSummary(
          selectedCompany.company_id,
          activeFY.fy_id,
          toDate,
          valuationMethod,
        );
      } else if (
        ['godownSummary', 'stockAgeing', 'movementAnalysis', 'costCentreReport'].includes(
          definition.apiMethod,
        )
      ) {
        res = await window.api.report[definition.apiMethod](
          selectedCompany.company_id,
          activeFY.fy_id,
          toDate,
        );
      } else if (definition.apiMethod === 'orderOutstandingSales') {
        res = await window.api.report.orderOutstanding(
          selectedCompany.company_id,
          activeFY.fy_id,
          'sales',
        );
      } else if (definition.apiMethod === 'orderOutstandingPurchase') {
        res = await window.api.report.orderOutstanding(
          selectedCompany.company_id,
          activeFY.fy_id,
          'purchase',
        );
      } else if (definition.apiMethod === 'run') {
        res = await window.api.report.run(definition.reportId || reportType.replace(/-/g, '_'), {
          company_id: selectedCompany.company_id,
          fy_id: activeFY.fy_id,
          as_on_date: toDate,
          from_date: fromDate,
          to_date: toDate,
        });
      } else {
        res = await window.api.report[definition.apiMethod](
          selectedCompany.company_id,
          activeFY.fy_id,
        );
      }

      if (res?.success) {
        let finalRows = [];
        if (
          Array.isArray(res.rows) &&
          (definition.apiMethod === 'billsReceivable' || definition.apiMethod === 'billsPayable')
        ) {
          finalRows = res.rows.map((r: any, idx: number) => ({
            id: idx + 1,
            date: r.bill_date,
            ref_no: r.bill,
            party_name: r.party,
            pending_amount: r.balance,
            amount: r.balance,
            due_date: r.due_date,
            overdue_days: r.overdue_days,
          }));
        } else if (Array.isArray(res.rows)) {
          finalRows = res.rows.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
        } else if (res.assets || res.liabilities) {
          const list: any[] = [];
          if (res.liabilities && res.liabilities.length > 0) {
            list.push({
              id: 'L-header',
              particulars: 'LIABILITIES',
              current_period: null,
              previous_period: null,
              variance: null,
              drill: '',
              isHeader: true,
            });
            list.push(
              ...res.liabilities.map((l: any, idx: number) => ({
                id: `L-${idx}`,
                particulars: l.ledger_name,
                current_period: Math.abs(l.balance),
                previous_period: 0,
                variance: Math.abs(l.balance),
                drill: '→',
              })),
            );
            list.push({
              id: 'L-total',
              particulars: 'Total Liabilities',
              current_period: res.totalLiabilities,
              previous_period: 0,
              variance: res.totalLiabilities,
              drill: '',
              isTotal: true,
            });
          }
          if (res.assets && res.assets.length > 0) {
            list.push({
              id: 'A-header',
              particulars: 'ASSETS',
              current_period: null,
              previous_period: null,
              variance: null,
              drill: '',
              isHeader: true,
            });
            list.push(
              ...res.assets.map((a: any, idx: number) => ({
                id: `A-${idx}`,
                particulars: a.ledger_name,
                current_period: Math.abs(a.balance),
                previous_period: 0,
                variance: Math.abs(a.balance),
                drill: '→',
              })),
            );
            list.push({
              id: 'A-total',
              particulars: 'Total Assets',
              current_period: res.totalAssets,
              previous_period: 0,
              variance: res.totalAssets,
              drill: '',
              isTotal: true,
            });
          }
          finalRows = list;
        } else if (res.income || res.expenses) {
          const list: any[] = [];
          if (res.income && res.income.length > 0) {
            list.push({
              id: 'I-header',
              particulars: 'INCOME',
              current_period: null,
              previous_period: null,
              variance: null,
              drill: '',
              isHeader: true,
            });
            list.push(
              ...res.income.map((i: any, idx: number) => ({
                id: `I-${idx}`,
                particulars: i.ledger_name,
                current_period: i.balance,
                previous_period: 0,
                variance: i.balance,
                drill: '→',
              })),
            );
            list.push({
              id: 'I-total',
              particulars: 'Total Income',
              current_period: res.totalIncome,
              previous_period: 0,
              variance: res.totalIncome,
              drill: '',
              isTotal: true,
            });
          }
          if (res.expenses && res.expenses.length > 0) {
            list.push({
              id: 'E-header',
              particulars: 'EXPENSES',
              current_period: null,
              previous_period: null,
              variance: null,
              drill: '',
              isHeader: true,
            });
            list.push(
              ...res.expenses.map((e: any, idx: number) => ({
                id: `E-${idx}`,
                particulars: e.ledger_name,
                current_period: e.balance,
                previous_period: 0,
                variance: e.balance,
                drill: '→',
              })),
            );
            list.push({
              id: 'E-total',
              particulars: 'Total Expenses',
              current_period: res.totalExpenses,
              previous_period: 0,
              variance: res.totalExpenses,
              drill: '',
              isTotal: true,
            });
          }
          if (res.netProfit !== undefined) {
            list.push({
              id: 'NP',
              particulars: res.isProfit ? 'Net Profit' : 'Net Loss',
              current_period: Math.abs(res.netProfit),
              previous_period: 0,
              variance: Math.abs(res.netProfit),
              drill: '',
              isTotal: true,
            });
          }
          finalRows = list;
        } else if (Array.isArray(res.vouchers)) {
          finalRows = res.vouchers.map((v: any) => ({
            id: v.voucher_id,
            date: v.date,
            voucher_type: v.voucher_type,
            voucher_number: v.voucher_number,
            narration: v.narration,
            debit: v.amount,
            credit: 0,
          }));
        } else if (definition.apiMethod === 'cashFlow' && Array.isArray(res.byCounterLedger)) {
          finalRows = res.byCounterLedger.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
        } else if (
          definition.apiMethod === 'fundsFlow' &&
          Array.isArray(res.sources) &&
          Array.isArray(res.applications)
        ) {
          const list = [];
          list.push({
            id: 'src-head',
            particulars: 'SOURCES OF FUNDS',
            amount: null,
            isHeader: true,
          });
          list.push(
            ...res.sources.map((s: any, idx: number) => ({
              id: `src-${idx}`,
              particulars: s.particulars,
              amount: s.amount,
            })),
          );
          list.push({
            id: 'src-total',
            particulars: 'Total Sources',
            amount: res.totalSources,
            isTotal: true,
          });
          list.push({
            id: 'app-head',
            particulars: 'APPLICATIONS OF FUNDS',
            amount: null,
            isHeader: true,
          });
          list.push(
            ...res.applications.map((a: any, idx: number) => ({
              id: `app-${idx}`,
              particulars: a.particulars,
              amount: a.amount,
            })),
          );
          list.push({
            id: 'app-total',
            particulars: 'Total Applications',
            amount: res.totalApplications,
            isTotal: true,
          });
          list.push({
            id: 'net-wc',
            particulars: res.isNetIncrease
              ? 'Net Increase in Working Capital'
              : 'Net Decrease in Working Capital',
            amount: Math.abs(res.netWorkingCapitalChange),
            isTotal: true,
          });
          finalRows = list;
        } else if (definition.apiMethod === 'stockSummary' && Array.isArray(res.items)) {
          finalRows = res.items.map((r: any, idx: number) => ({ id: idx + 1, ...r }));
        } else if (definition.apiMethod === 'ratioAnalysis' && Array.isArray(res.ratios)) {
          finalRows = res.ratios.map((r: any, idx: number) => {
            let displayValue = String(r.value);
            if (r.value !== null && r.value !== undefined) {
              if (r.unit === '%') {
                displayValue = `${r.value}%`;
              } else if (r.unit === 'x') {
                displayValue = `${r.value} x`;
              } else if (r.unit === 'amount') {
                displayValue = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                }).format(r.value);
              }
            } else {
              displayValue = 'n/a';
            }
            return { id: idx + 1, label: r.label, displayValue };
          });
        }
        setRows(finalRows);
        setNotice(finalRows.length === 0 && res.message ? res.message : null);
      } else {
        setError(res?.error || 'Failed to load database report.');
        setRows([]);
      }
    } else {
      setError(`Report API method '${definition.apiMethod}' is missing or not implemented.`);
      setRows([]);
    }
  } catch (err: any) {
    console.error(err);
    setError(`Error accessing database: ${err.message || 'Unknown error'}`);
    setRows([]);
  } finally {
    setLoading(false);
  }
}
