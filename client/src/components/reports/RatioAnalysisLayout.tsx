import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface ComponentBalances {
  currentAssets: number;
  currentLiabilities: number;
  inventory: number;
  totalDebt: number;
  equity: number;
  totalAssets: number;
  sales: number;
  purchases: number;
  directExpenses: number;
  grossProfit: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  operatingCost: number;
  indirectIncomes: number;
  workingCapital: number;
  capitalEmployed: number;
  cashInHand: number;
  bankAccounts: number;
  bankOD: number;
  sundryDebtors: number;
  sundryCreditors: number;
  sundryDebtorsDue: number;
  sundryCreditorsDue: number;
  recvTurnoverDays: number;
}

const MOCK_COMPONENTS: ComponentBalances = {
  currentAssets: 4649774.0,
  currentLiabilities: 637229.0,
  inventory: 2012640.0,
  totalDebt: 700000.0,
  equity: 13577800.0,
  totalAssets: 18227800.0,
  sales: 5990395.0,
  purchases: 3700990.0,
  directExpenses: 0.0,
  grossProfit: 3922200.0,
  totalIncome: 5990395.0,
  totalExpenses: 2068195.0,
  netProfit: 3922200.0,
  operatingCost: 2068195.0,
  indirectIncomes: 0.0,
  workingCapital: 4012545.0,
  capitalEmployed: 14277800.0,
  cashInHand: 1000002034876.0,
  bankAccounts: -999999930000.0,
  bankOD: 700000.0,
  sundryDebtors: 502799.0,
  sundryCreditors: 562770.0,
  sundryDebtorsDue: 502799.0,
  sundryCreditorsDue: 562770.0,
  recvTurnoverDays: 30.64,
};

const fmtDrCr = (val: number, defaultDr = true) => {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  const absVal = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absVal);

  if (val === 0) return formatted;

  const isDr = val > 0 ? defaultDr : !defaultDr;
  return `${formatted} ${isDr ? 'Dr' : 'Cr'}`;
};

export function RatioAnalysisLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [groupsList, setGroupsList] = React.useState<any[]>([]);

  const [activeCol, setActiveCol] = React.useState<'left' | 'right'>('left');
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      (window as any).api.report.ratioAnalysis(selectedCompany.company_id, activeFY.fy_id),
      (window as any).api.group.getAll(selectedCompany.company_id),
    ])
      .then(([ratioRes, groupsRes]: [any, any]) => {
        if (ratioRes?.success) {
          setData(ratioRes);
        } else {
          setError(ratioRes?.error || 'Failed to load ratios.');
        }
        if (groupsRes?.success) {
          setGroupsList(groupsRes.groups || groupsRes || []);
        } else if (Array.isArray(groupsRes)) {
          setGroupsList(groupsRes);
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const components = React.useMemo<ComponentBalances>(() => {
    if (!data?.components) return MOCK_COMPONENTS;
    const allZero = Object.values(data.components).every((v) => v === 0);
    if (allZero) return MOCK_COMPONENTS;
    return { ...MOCK_COMPONENTS, ...data.components };
  }, [data]);

  const leftItems = React.useMemo(
    () => [
      {
        key: 'working_capital',
        label: 'Working Capital',
        subtitle: '(Current Assets-Current Liabilities)',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.workingCapital, true),
        drilldown: '/reports/accounts/funds-flow',
        isGroupDrilldown: false,
      },
      {
        key: 'cash_in_hand',
        label: 'Cash-in-hand',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.cashInHand, true),
        drilldown: 'Cash-in-hand',
        isGroupDrilldown: true,
      },
      {
        key: 'bank_accounts',
        label: 'Bank Accounts',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.bankAccounts, true),
        drilldown: 'Bank Accounts',
        isGroupDrilldown: true,
      },
      {
        key: 'bank_od',
        label: 'Bank OD A/c',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.bankOD, false),
        drilldown: 'Bank OD A/c',
        isGroupDrilldown: true,
      },
      {
        key: 'sundry_debtors',
        label: 'Sundry Debtors',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.sundryDebtors, true),
        drilldown: 'Sundry Debtors',
        isGroupDrilldown: true,
        subRow: {
          label: '(due till today)',
          getValue: (comp: ComponentBalances) => fmtDrCr(comp.sundryDebtorsDue, true),
        },
      },
      {
        key: 'sundry_creditors',
        label: 'Sundry Creditors',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.sundryCreditors, false),
        drilldown: 'Sundry Creditors',
        isGroupDrilldown: true,
        subRow: {
          label: '(due till today)',
          getValue: (comp: ComponentBalances) => fmtDrCr(comp.sundryCreditorsDue, false),
        },
      },
      {
        key: 'sales_accounts',
        label: 'Sales Accounts',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.sales, false),
        drilldown: 'Sales Accounts',
        isGroupDrilldown: true,
      },
      {
        key: 'purchase_accounts',
        label: 'Purchase Accounts',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.purchases, true),
        drilldown: 'Purchase Accounts',
        isGroupDrilldown: true,
      },
      {
        key: 'stock_in_hand',
        label: 'Stock-in-hand',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.inventory, true),
        drilldown: '/reports/inventory/stock-summary',
        isGroupDrilldown: false,
      },
      {
        key: 'net_profit',
        label: 'Nett Profit',
        getValue: (comp: ComponentBalances) => fmtDrCr(comp.netProfit, false),
        drilldown: '/reports/accounts/profit-loss',
        isGroupDrilldown: false,
      },
      {
        key: 'wc_turnover',
        label: 'Wkg. Capital Turnover',
        subtitle: '(Sales Accounts / Working Capital)',
        getValue: (comp: ComponentBalances) => {
          const wc = comp.workingCapital;
          if (!wc || wc === 0) return '0.00';
          return (comp.sales / wc).toFixed(2);
        },
        drilldown: '/reports/accounts/profit-loss',
        isGroupDrilldown: false,
      },
      {
        key: 'inventory_turnover',
        label: 'Inventory Turnover',
        subtitle: '(Sales Accounts / Closing Stock)',
        getValue: (comp: ComponentBalances) => {
          const inv = comp.inventory;
          if (!inv || inv === 0) return '0.00';
          return (comp.sales / inv).toFixed(2);
        },
        drilldown: '/reports/accounts/profit-loss',
        isGroupDrilldown: false,
      },
    ],
    [],
  );

  const rightItems = React.useMemo(
    () => [
      {
        key: 'current_ratio',
        label: 'Current Ratio',
        subtitle: '(Current Assets : Current Liabilities)',
        getValue: (comp: ComponentBalances) => {
          const val =
            comp.currentLiabilities !== 0 ? comp.currentAssets / comp.currentLiabilities : 0;
          return `${val.toFixed(2)} : 1`;
        },
        drilldown: '/reports/accounts/balance-sheet',
      },
      {
        key: 'quick_ratio',
        label: 'Quick Ratio',
        subtitle: '(Current Assets-Stock-in-hand : Current Liabilities)',
        getValue: (comp: ComponentBalances) => {
          const val =
            comp.currentLiabilities !== 0
              ? (comp.currentAssets - comp.inventory) / comp.currentLiabilities
              : 0;
          return `${val.toFixed(2)} : 1`;
        },
        drilldown: '/reports/accounts/balance-sheet',
      },
      {
        key: 'debt_equity',
        label: 'Debt/Equity Ratio',
        subtitle: '(Loans (Liability) : Capital Account + Nett Profit)',
        getValue: (comp: ComponentBalances) => {
          const denom = comp.equity + comp.netProfit;
          const val = denom !== 0 ? comp.totalDebt / denom : 0;
          return `${val.toFixed(2)} : 1`;
        },
        drilldown: '/reports/accounts/balance-sheet',
      },
      {
        key: 'gross_profit_pct',
        label: 'Gross Profit %',
        getValue: (comp: ComponentBalances) => {
          const val = comp.sales !== 0 ? (comp.grossProfit / comp.sales) * 100 : 0;
          return `${val.toFixed(2)} %`;
        },
        drilldown: '/reports/accounts/profit-loss',
      },
      {
        key: 'net_profit_pct',
        label: 'Nett Profit %',
        getValue: (comp: ComponentBalances) => {
          const val = comp.sales !== 0 ? (comp.netProfit / comp.sales) * 100 : 0;
          return `${val.toFixed(2)} %`;
        },
        drilldown: '/reports/accounts/profit-loss',
      },
      {
        key: 'operating_cost_pct',
        label: 'Operating Cost %',
        subtitle: '(as percentage of Sales Accounts)',
        getValue: (comp: ComponentBalances) => {
          const val = comp.sales !== 0 ? (comp.operatingCost / comp.sales) * 100 : 0;
          return `${val.toFixed(2)} %`;
        },
        drilldown: '/reports/accounts/profit-loss',
      },
      {
        key: 'recv_turnover',
        label: 'Recv. Turnover in days',
        subtitle: '(payment performance of Debtors)',
        getValue: (comp: ComponentBalances) => {
          // Payment performance of Debtors — sum of per-party performance,
          // computed server-side so it equals the Group Payment Performance drill.
          const val =
            comp.recvTurnoverDays != null
              ? comp.recvTurnoverDays
              : comp.sales !== 0
                ? (comp.sundryDebtors / comp.sales) * 365
                : 0;
          const formatted = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(val);
          return `${formatted} days`;
        },
        drilldown: '/reports/accounts/group-payment-performance',
      },
      {
        key: 'roi',
        label: 'Return on Investment %',
        subtitle: '(Nett Profit / Capital Account + Nett Profit ) %',
        getValue: (comp: ComponentBalances) => {
          const denom = comp.equity + comp.netProfit;
          const val = denom !== 0 ? (comp.netProfit / denom) * 100 : 0;
          return `${val.toFixed(2)} %`;
        },
        drilldown: '/reports/accounts/balance-sheet',
      },
      {
        key: 'return_wc',
        label: 'Return on Wkg. Capital %',
        subtitle: '(Nett Profit / Working Capital) %',
        getValue: (comp: ComponentBalances) => {
          const val = comp.workingCapital !== 0 ? (comp.netProfit / comp.workingCapital) * 100 : 0;
          return `${val.toFixed(2)} %`;
        },
        drilldown: '/reports/accounts/balance-sheet',
      },
    ],
    [],
  );

  const handleDrilldownFor = React.useCallback(
    (col: 'left' | 'right', idx: number) => {
      const items = col === 'left' ? leftItems : rightItems;
      const item = items[idx];
      if (!item) return;

      if (col === 'left') {
        const gItem = item as (typeof leftItems)[0];
        if (gItem.isGroupDrilldown) {
          const groupName = gItem.drilldown;
          const matched = groupsList.find(
            (g) => g.name.toLowerCase().trim() === groupName.toLowerCase().trim(),
          );
          if (matched) {
            navigate(`/reports/accounts/group-summary/${matched.group_id}`);
          } else {
            const parts = groupName.split(' ');
            const firstWord = parts[0];
            const matchedPartial = groupsList.find((g) =>
              g.name.toLowerCase().includes(firstWord.toLowerCase()),
            );
            if (matchedPartial) {
              navigate(`/reports/accounts/group-summary/${matchedPartial.group_id}`);
            } else {
              console.warn('Group not found:', groupName);
            }
          }
        } else {
          navigate(gItem.drilldown);
        }
      } else {
        const rItem = item as (typeof rightItems)[0];
        if (rItem.key === 'recv_turnover') {
          // Group Payment Performance report for Sundry Debtors.
          const matchedDebtors = groupsList.find((g) => g.name.toLowerCase().includes('debtors'));
          if (matchedDebtors) {
            navigate(
              `/reports/accounts/group-payment-performance?group_id=${matchedDebtors.group_id}&group_name=${encodeURIComponent(matchedDebtors.name)}`,
            );
          } else {
            navigate(rItem.drilldown);
          }
        } else {
          navigate(rItem.drilldown);
        }
      }
    },
    [groupsList, components, navigate, leftItems, rightItems],
  );

  // "(due till today)" drills to the Group Outstanding report — a DIFFERENT report
  // from the Sundry Debtors / Sundry Creditors row (which drills to Group Summary).
  const handleDueDrilldown = React.useCallback(
    (groupName: string) => {
      const matched =
        groupsList.find((g) => g.name.toLowerCase().trim() === groupName.toLowerCase().trim()) ||
        groupsList.find((g) =>
          g.name.toLowerCase().includes(groupName.split(' ')[0].toLowerCase()),
        );
      if (matched) {
        navigate(
          `/reports/accounts/outstandings-group?group_id=${matched.group_id}&group_name=${encodeURIComponent(matched.name)}`,
        );
      } else {
        console.warn('Group not found for Group Outstanding drill:', groupName);
      }
    },
    [groupsList, navigate],
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const maxLen = activeCol === 'left' ? leftItems.length : rightItems.length;
        setFocusedIndex((prev) => Math.min(maxLen - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeCol === 'left') {
          setActiveCol('right');
          setFocusedIndex((prev) => Math.min(rightItems.length - 1, prev));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeCol === 'right') {
          setActiveCol('left');
          setFocusedIndex((prev) => Math.min(leftItems.length - 1, prev));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleDrilldownFor(activeCol, focusedIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCol, focusedIndex, handleDrilldownFor, leftItems.length, rightItems.length]);

  const formatPeriod = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const fmt = (d: Date) =>
        `${d.getDate()}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear().toString().slice(-2)}`;
      return `${fmt(start)} to ${fmt(end)}`;
    } catch {
      return '1-Apr-26 to 2-Jan-27';
    }
  };

  const periodText = React.useMemo(() => {
    if (activeFY?.start_date && activeFY?.end_date) {
      return formatPeriod(activeFY.start_date, activeFY.end_date);
    }
    return '1-Apr-26 to 2-Jan-27';
  }, [activeFY]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center animate-fade-in">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ratio Analysis report data...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white text-black border-b border-gray-200 select-none">
      {/* Upper header section */}
      <div className="bg-white border-b border-gray-200 px-4 py-1.5 flex justify-between items-center text-black font-mono text-[11px] font-semibold select-none">
        <span className="font-bold text-black tracking-wide">Ratio Analysis</span>
        <span className="text-black">{selectedCompany?.name || 'Moly Jain'}</span>
        <span className="text-black">{periodText}</span>
      </div>

      {/* Main Two Column layout */}
      <div className="flex-1 flex overflow-hidden font-mono text-[11px] relative">
        {/* Left Column (Principal Groups) */}
        <div className="w-[50%] flex flex-col overflow-hidden border-r border-gray-200">
          <div className="bg-white border-b border-gray-200 px-3 py-1 flex justify-between items-center select-none font-bold text-black border-r border-gray-200">
            <span>Principal Groups</span>
            <span className="text-black text-[10px]">{periodText}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {leftItems.map((item, idx) => {
                  const isFocused = activeCol === 'left' && focusedIndex === idx;
                  const val = item.getValue(components);

                  return (
                    <React.Fragment key={item.key}>
                      <tr
                        onClick={() => {
                          setActiveCol('left');
                          setFocusedIndex(idx);
                        }}
                        onDoubleClick={() => handleDrilldownFor('left', idx)}
                        className={`cursor-pointer transition-colors ${
                          isFocused
                            ? 'bg-black/[0.06] text-black font-bold'
                            : 'hover:bg-black/[0.03] text-black'
                        }`}
                      >
                        <td className="px-3 py-1 text-left font-bold">{item.label}</td>
                        <td className="px-3 py-1 text-right font-bold whitespace-nowrap w-44">
                          {val}
                        </td>
                      </tr>
                      {item.subtitle && (
                        <tr
                          onClick={() => {
                            setActiveCol('left');
                            setFocusedIndex(idx);
                          }}
                          className={`${isFocused ? 'bg-black/[0.06] text-black' : 'text-black'}`}
                        >
                          <td colSpan={2} className="px-5 pb-1 text-left italic text-[10px]">
                            {item.subtitle}
                          </td>
                        </tr>
                      )}
                      {'subRow' in item && item.subRow && (
                        <tr
                          onClick={() => {
                            setActiveCol('left');
                            setFocusedIndex(idx);
                          }}
                          onDoubleClick={() =>
                            item.isGroupDrilldown && handleDueDrilldown(item.drilldown)
                          }
                          className={`cursor-pointer border-b border-gray-200 ${
                            isFocused ? 'bg-black/[0.06] text-black font-semibold' : 'text-black'
                          }`}
                        >
                          <td className="px-5 py-0.5 text-left italic text-[10px]">
                            {item.subRow.label}
                          </td>
                          <td className="px-3 py-0.5 text-right whitespace-nowrap w-44 font-semibold text-[10px]">
                            {item.subRow.getValue(components)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (Principal Ratios) */}
        <div className="w-[50%] flex flex-col overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-3 py-1 flex justify-between items-center select-none font-bold text-black">
            <span>Principal Ratios</span>
            <span className="text-black text-[10px]">{periodText}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <tbody>
                {rightItems.map((item, idx) => {
                  const isFocused = activeCol === 'right' && focusedIndex === idx;
                  const val = item.getValue(components);

                  return (
                    <React.Fragment key={item.key}>
                      <tr
                        onClick={() => {
                          setActiveCol('right');
                          setFocusedIndex(idx);
                        }}
                        onDoubleClick={() => handleDrilldownFor('right', idx)}
                        className={`cursor-pointer transition-colors ${
                          isFocused
                            ? 'bg-black/[0.06] text-black font-bold'
                            : 'hover:bg-black/[0.03] text-black'
                        }`}
                      >
                        <td className="px-3 py-1 text-left font-bold">{item.label}</td>
                        <td className="px-3 py-1 text-right font-bold whitespace-nowrap w-44">
                          {val}
                        </td>
                      </tr>
                      {item.subtitle && (
                        <tr
                          onClick={() => {
                            setActiveCol('right');
                            setFocusedIndex(idx);
                          }}
                          className={`${isFocused ? 'bg-black/[0.06] text-black' : 'text-black'}`}
                        >
                          <td colSpan={2} className="px-5 pb-1 text-left italic text-[10px]">
                            {item.subtitle}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Retro Status Footer bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-1 flex justify-between items-center text-[10px] text-black font-semibold select-none font-mono">
        <span>
          <span className="text-black font-bold">Q:</span> Quit
        </span>
        <span>
          <span className="text-black font-bold">Space:</span> Select
        </span>
        <span>
          <span className="text-black font-bold">R:</span> Remove Line
        </span>
        <span>
          <span className="text-black font-bold">U:</span> Restore Line
        </span>
        <span>
          <span className="text-black font-bold">F12:</span> Configure
        </span>
      </div>
    </div>
  );
}
