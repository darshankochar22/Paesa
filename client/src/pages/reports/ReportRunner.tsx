import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import { ReportTable, type ComparisonColumn } from '@/components/reports/ReportTable';
import { ReportRightPanel } from '@/components/reports/ReportRightPanel';
import {
  ReportContextDialog,
  type ReportContextConfig,
} from '@/components/reports/ReportContextDialog';
import { SaveViewDialog } from '@/components/reports/SaveViewDialog';
import { CompareColumnDialog } from '@/components/reports/CompareColumnDialog';
import { ReportCommandPalette } from '@/components/reports/ReportCommandPalette';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { REPORT_DEFINITIONS, REPORT_CATEGORIES, type ReportConfig } from './reportDefinitions';
import {
  CURRENCY_FIELDS,
  DATE_FIELDS,
  NUMBER_FIELDS,
  SKIP_FIELDS,
  CURRENCY_KEYWORDS,
  NUMBER_KEYWORDS,
} from '@/constants/reportFields';
import { loadReportData } from './reportRunnerData';
import { renderSpecialLayout } from './reportSpecialLayouts';

export function ReportRunner({ reportType: reportTypeProp }: { reportType?: string } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const reportType = React.useMemo(() => {
    // A dedicated named report component passes its slug explicitly; otherwise
    // derive it from the path (legacy catch-all routing).
    if (reportTypeProp) return reportTypeProp;
    const pathname = location.pathname;
    if (pathname.includes('/group-summary')) return 'group-summary';
    if (pathname.includes('/group-vouchers')) return 'group-vouchers';
    if (pathname.includes('/ledger-summary')) return 'ledger-summary';
    const parts = pathname.split('/');
    return parts[parts.length - 1];
  }, [location.pathname, reportTypeProp]);

  const definition = React.useMemo<ReportConfig>(() => {
    return (
      REPORT_DEFINITIONS[reportType] || {
        title: reportType
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        apiMethod: undefined,
        columns: [
          { header: 'Particulars', field: 'name', align: 'left' },
          { header: 'Balance / Value', field: 'balance', type: 'currency', align: 'right' },
        ],
      }
    );
  }, [reportType]);

  const [rows, setRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // Informational message for reports that legitimately have no book rows
  // (e.g. GST reports that require data downloaded from the portal).
  const [notice, setNotice] = React.useState<string | null>(null);

  // Configuration and View State
  const [config, setConfig] = React.useState<ReportContextConfig>({
    basisOfValues: 'Accrual',
    showNarration: false,
    showPercentage: false,
    excludeZeroBalances: true,
    detailedFormat: false,
    valuationMethod: 'Default',
  });

  const [expandedRows, setExpandedRows] = React.useState<Record<string | number, boolean>>({});
  const [hiddenRowIds, setHiddenRowIds] = React.useState<Set<string | number>>(new Set());
  const [removedLinesHistory, setRemovedLinesHistory] = React.useState<(string | number)[]>([]);
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string | number>>(new Set());
  const [comparisonColumns, setComparisonColumns] = React.useState<ComparisonColumn[]>([]);

  const [auditChainStatus] = React.useState<any>(null);
  const companies: any[] = [];

  // Modals
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  const [isCompanyOpen, setIsCompanyOpen] = React.useState(false);
  const [isContextOpen, setIsContextOpen] = React.useState(false);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);
  const [isSaveViewOpen, setIsSaveViewOpen] = React.useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = React.useState(false);

  // Dates
  const [fromDate, setFromDate] = React.useState<string>(activeFY?.start_date ?? '');
  const [toDate, setToDate] = React.useState<string>(activeFY?.end_date ?? '');

  // Sync dates when activeFY loads (handles async context)
  React.useEffect(() => {
    if (activeFY?.start_date && !fromDate) setFromDate(activeFY.start_date);
    if (activeFY?.end_date && !toDate) setToDate(activeFY.end_date);
  }, [activeFY?.start_date, activeFY?.end_date]);

  React.useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const fromParam = queryParams.get('from_date');
    const toParam = queryParams.get('to_date');
    const monthParam = queryParams.get('month');

    if (fromParam) setFromDate(fromParam);
    if (toParam) setToDate(toParam);

    if (monthParam && activeFY?.start_date && activeFY?.end_date) {
      const months = [
        'january',
        'february',
        'march',
        'april',
        'may',
        'june',
        'july',
        'august',
        'september',
        'october',
        'november',
        'december',
      ];
      const mIndex = months.findIndex((m) => m.startsWith(monthParam.toLowerCase().trim()));
      if (mIndex !== -1) {
        const fyStart = new Date(activeFY.start_date);
        const fyEnd = new Date(activeFY.end_date);
        const fyStartMonth = fyStart.getMonth();
        let year;
        if (fyStartMonth <= mIndex) {
          year = fyStart.getFullYear();
        } else {
          year = fyEnd.getFullYear();
        }
        const start = new Date(year, mIndex, 1);
        const end = new Date(year, mIndex + 1, 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        setFromDate(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`);
        setToDate(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`);
      }
    }
  }, [location.search, activeFY]);

  // Data fetching lives in reportRunnerData.ts (loadReportData) — same closure
  // surface, passed explicitly.
  const loadData = React.useCallback(async () => {
    await loadReportData({
      reportType,
      definition,
      selectedCompany,
      activeFY,
      fromDate,
      toDate,
      valuationMethod: config.valuationMethod,
      location: location as any,
      setRows,
      setLoading,
      setError,
      setNotice,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, selectedCompany, activeFY, fromDate, toDate, config.valuationMethod]);

  React.useEffect(() => {
    loadData();
    setHiddenRowIds(new Set());
    setRemovedLinesHistory([]);
    setComparisonColumns([]);
  }, [loadData, reportType]);

  const handleExportCSV = React.useCallback(() => {
    if (!definition || !rows.length) return;
    const title = definition.title;
    const companyName = selectedCompany?.name || 'Unknown Company';
    const basisOfValues = config.basisOfValues || 'Accrual';
    const columns = definition.columns;

    const metadata = [
      `Report,${title}`,
      `Company,${companyName}`,
      `Period,${fromDate} to ${toDate}`,
      `Basis of Values,${basisOfValues}`,
      `Generated At,${new Date().toLocaleString()}`,
      '', // empty line
    ];

    const headerRow = columns.map((c) => `"${c.header}"`).join(',');
    const dataRows = rows
      .filter((r) => !hiddenRowIds.has(r.id))
      .map((row) => {
        return columns
          .map((c) => {
            const val = row[c.field] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',');
      });

    const csvContent = metadata.join('\n') + '\n' + headerRow + '\n' + dataRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [definition, rows, selectedCompany, config, fromDate, toDate, hiddenRowIds]);

  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  const handleHideRow = (rowId: string | number) => {
    setHiddenRowIds((prev) => {
      const copy = new Set(prev);
      copy.add(rowId);
      return copy;
    });
    setRemovedLinesHistory((prev) => [...prev, rowId]);
  };

  const handleRestoreLastLine = React.useCallback(() => {
    if (removedLinesHistory.length === 0) return;
    const historyCopy = [...removedLinesHistory];
    const restoredId = historyCopy.pop();
    setRemovedLinesHistory(historyCopy);
    if (restoredId !== undefined) {
      setHiddenRowIds((prev) => {
        const copy = new Set(prev);
        copy.delete(restoredId);
        return copy;
      });
    }
  }, [removedLinesHistory]);

  const handleToggleSelectRow = (rowId: string | number) => {
    setSelectedRowIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(rowId)) {
        copy.delete(rowId);
      } else {
        copy.add(rowId);
      }
      return copy;
    });
  };

  const handleToggleExpand = (rowId: string | number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleAddComparisonColumn = (colConfig: {
    companyId: number;
    companyName: string;
    fromDate: string;
    toDate: string;
  }) => {
    const newCol: ComparisonColumn = {
      id: `${colConfig.companyId}-${colConfig.fromDate}-${colConfig.toDate}`,
      companyId: colConfig.companyId,
      companyName: colConfig.companyName,
      fromDate: colConfig.fromDate,
      toDate: colConfig.toDate,
    };
    setComparisonColumns((prev) => [...prev, newCol]);
  };

  React.useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        return;
      }

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.closest("[role='dialog']"))
      ) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        setIsPeriodOpen(true);
      }

      if (e.key === 'F3') {
        e.preventDefault();
        setIsCompanyOpen(true);
      }

      if (e.key === 'F4') {
        e.preventDefault();
        setIsContextOpen(true);
      }

      if (e.key === 'b' && e.ctrlKey) {
        e.preventDefault();
        setConfig((prev) => ({
          ...prev,
          basisOfValues: prev.basisOfValues === 'Accrual' ? 'Cash' : 'Accrual',
        }));
      }

      if (e.key === 'h' && e.ctrlKey) {
        e.preventDefault();
        setIsPaletteOpen(true);
      }

      if (e.key === 'j' && e.ctrlKey) {
        e.preventDefault();
        navigate('/reports/exception');
      }

      if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        setIsSaveViewOpen(true);
      }

      if (e.key === 'F5' && e.altKey) {
        e.preventDefault();
        setConfig((prev) => ({ ...prev, detailedFormat: !prev.detailedFormat }));
      }

      if (e.key === 'c' && e.altKey) {
        e.preventDefault();
        setIsCompareOpen(true);
      }

      if (e.key === 'n' && e.altKey) {
        e.preventDefault();
        if (comparisonColumns.length > 0) {
          setComparisonColumns((prev) => prev.slice(0, -1));
        }
      }

      if (e.key === 'u' && e.altKey) {
        e.preventDefault();
        handleRestoreLastLine();
      }

      if (e.key === 'e' && e.altKey) {
        e.preventDefault();
        handleExportCSV();
      }

      if (e.key === 'p' && e.altKey) {
        e.preventDefault();
        handlePrint();
      }

      if (e.key === 'a' && e.altKey) {
        e.preventDefault();
        let prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Explain any anomalies and suggest follow-up actions.`;
        if (reportType === 'overdue-receivables' || definition.apiMethod === 'billsReceivable') {
          prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Please draft reminder letters for the overdue accounts and suggest follow-up actions.`;
        }
        navigate('/utilities/copilot', { state: { initialPrompt: prompt } });
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [
    comparisonColumns,
    navigate,
    handleExportCSV,
    handlePrint,
    handleRestoreLastLine,
    definition,
    fromDate,
    toDate,
    reportType,
  ]);

  const commandPaletteItems = React.useMemo(() => {
    const slugToCategory: Record<string, string> = {};
    for (const [cat, reports] of Object.entries(REPORT_CATEGORIES)) {
      for (const r of reports) {
        slugToCategory[r.slug] = cat;
      }
    }
    return Object.entries(REPORT_DEFINITIONS).map(([key, value]) => ({
      title: value.title,
      path: `/reports/accounts/${key}`,
      category: slugToCategory[key] || 'Reports',
      description: `Run and analyze ${value.title}`,
    }));
  }, []);

  const tableColumns = React.useMemo(() => {
    if (!rows.length) return definition.columns;
    const firstRow = rows.find((r: any) => !r.isHeader && !r.isTotal) || rows[0];
    const dataFields = Object.keys(firstRow).filter(
      (k) => k !== 'id' && k !== 'isHeader' && k !== 'isTotal',
    );
    const definedFields = definition.columns.map((c) => c.field);
    const matchCount = definedFields.filter((f) => dataFields.includes(f)).length;
    if (matchCount >= Math.max(1, Math.floor(definedFields.length / 2))) return definition.columns;

    return dataFields
      .filter((f) => !SKIP_FIELDS.has(f))
      .map((f) => {
        const header = f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const isCurrency = CURRENCY_FIELDS.has(f) || CURRENCY_KEYWORDS.some((kw) => f.includes(kw));
        const isDate = DATE_FIELDS.has(f);
        const isNumber = NUMBER_FIELDS.has(f) || NUMBER_KEYWORDS.some((kw) => f.includes(kw));
        const align = isCurrency || isNumber ? ('right' as const) : ('left' as const);
        const type = isDate
          ? ('date' as const)
          : isCurrency
            ? ('currency' as const)
            : isNumber
              ? ('number' as const)
              : undefined;
        return { header, field: f, type, align };
      });
  }, [rows, definition.columns]);

  return (
    <TallyReportLayout
      title={definition.title}
      companyName={selectedCompany?.name || 'No Company Selected'}
      leftSubtitle={
        <div className="flex gap-4 items-center">
          <span>
            Basis of Values: <span className="font-bold">{config.basisOfValues}</span>
          </span>
          <span>
            Valuation: <span className="font-bold">{config.valuationMethod}</span>
          </span>
          {reportType === 'edit-log' && auditChainStatus && (
            <span className="px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-black text-white">
              {auditChainStatus.intact
                ? '✔ Chain Intact'
                : `⚠ Chain Broken at Log #${auditChainStatus.brokenAt}`}
            </span>
          )}
        </div>
      }
      rightSubtitle={
        <span>
          Period: <span className="font-bold">{fromDate}</span> to{' '}
          <span className="font-bold">{toDate}</span>
        </span>
      }
    >
      <div className="flex h-full w-full overflow-hidden">
        {error ? (
          <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center animate-fade-in">
            {error}
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
            Loading report data...
          </div>
        ) : notice && rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center animate-fade-in">
            {notice}
          </div>
        ) : (
          (renderSpecialLayout(reportType, { fromDate, toDate }) ?? (
            <ReportTable
              columns={tableColumns}
              rows={rows}
              comparisonColumns={comparisonColumns}
              expandedRows={expandedRows}
              onToggleExpand={handleToggleExpand}
              hiddenRowIds={hiddenRowIds}
              onHideRow={handleHideRow}
              selectedRowIds={selectedRowIds}
              onToggleSelectRow={handleToggleSelectRow}
              primaryKey="id"
              detailedFormat={config.detailedFormat}
              onRowDrillDown={(row) => {
                if (row.isTotal || row.isHeader) return;
                if (row.voucher_id) {
                  navigate(`/transactions/voucher/${row.voucher_id}`);
                } else if (reportType === 'daybook' && row.id) {
                  navigate(`/transactions/voucher/${row.id}`);
                } else if (row.item_id) {
                  navigate('/reports/inventory/stock-item', {
                    state: { item_id: row.item_id, item_name: row.item_name },
                  });
                } else if (row.ledger_name) {
                  const ledgerId = row.ledger_id || row.id;
                  if (ledgerId) {
                    navigate(`/reports/accounts/ledger-summary/${ledgerId}`);
                  } else {
                    navigate(`/reports/accounts/ledger`);
                  }
                }
              }}
            />
          ))
        )}

        {/* Outstandings layouts render their own Tally-style action panel. */}
        {![
          'ledger-outstandings',
          'outstandings-ledger',
          'group-outstandings',
          'outstandings-group',
          'group-payment-performance',
          'ledger-payment-performance',
        ].includes(reportType) && (
          <ReportRightPanel
            onPeriodSelect={() => setIsPeriodOpen(true)}
            onCompanySelect={() => setIsCompanyOpen(true)}
            onContextSelect={() => setIsContextOpen(true)}
            onBasisOfValues={() =>
              setConfig((prev) => ({
                ...prev,
                basisOfValues: prev.basisOfValues === 'Accrual' ? 'Cash' : 'Accrual',
              }))
            }
            onChangeView={() => setIsPaletteOpen(true)}
            onExceptionReports={() => navigate('/reports/exception')}
            onSaveView={() => setIsSaveViewOpen(true)}
            onToggleDetailed={() =>
              setConfig((prev) => ({ ...prev, detailedFormat: !prev.detailedFormat }))
            }
            isDetailed={config.detailedFormat}
            onAddColumn={() => setIsCompareOpen(true)}
            onDeleteColumn={() => {
              if (comparisonColumns.length > 0) {
                setComparisonColumns((prev) => prev.slice(0, -1));
              }
            }}
            onRemoveLine={() => {
              // Hide the first selected, or the first row in the list
              const visible = rows.filter((r) => !hiddenRowIds.has(r.id));
              if (visible.length > 0) {
                handleHideRow(visible[0].id);
              }
            }}
            onRestoreLine={handleRestoreLastLine}
            canRestore={removedLinesHistory.length > 0}
            onExportCSV={handleExportCSV}
            onPrint={handlePrint}
            onAskAI={() => {
              let prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Explain any anomalies and suggest follow-up actions.`;
              if (
                reportType === 'overdue-receivables' ||
                definition.apiMethod === 'billsReceivable'
              ) {
                prompt = `Analyze the ${definition.title} from ${fromDate} to ${toDate}. Please draft reminder letters for the overdue accounts and suggest follow-up actions.`;
              }
              navigate('/utilities/copilot', { state: { initialPrompt: prompt } });
            }}
          />
        )}
      </div>

      {/* F2 Period Modal */}
      <Dialog open={isPeriodOpen} onOpenChange={(open) => !open && setIsPeriodOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white text-black border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-black font-bold">Select Period (F2)</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-black">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs h-9 border-gray-200 focus:border-gray-200 focus:ring-black text-black"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-black">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs h-9 border-gray-200 focus:border-gray-200 focus:ring-black text-black"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 bg-white border-t border-gray-200 p-3 -mx-4 -mb-4 rounded-b-xl">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPeriodOpen(false)}
              className="text-xs border-gray-200 hover:bg-black/[0.03] text-black"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                loadData();
                setIsPeriodOpen(false);
              }}
              className="text-xs bg-black hover:bg-black/80 text-white font-semibold"
            >
              Set Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* F3 Company Modal */}
      <Dialog open={isCompanyOpen} onOpenChange={(open) => !open && setIsCompanyOpen(false)}>
        <DialogContent className="sm:max-w-md bg-white text-black border border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-black font-bold">Change Company (F3)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            {companies.map((comp) => (
              <button
                key={comp.company_id}
                onClick={async () => {
                  if (window.api?.company) {
                    const full = await window.api.company.getById(comp.company_id);
                    if (full.success) {
                      // Note: We normally triggersetSelectedCompany via CompanyContext,
                      // but for localized change, we can switch active.
                      window.location.reload();
                    }
                  }
                  setIsCompanyOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-semibold border rounded hover:bg-black/[0.03] ${
                  comp.company_id === selectedCompany?.company_id
                    ? 'border-gray-200 bg-black/[0.06] text-black font-bold'
                    : 'border-gray-200 text-black'
                }`}
              >
                {comp.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* F4/F12 Context Modal */}
      <ReportContextDialog
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
        config={config}
        onSave={(newConfig) => setConfig(newConfig)}
      />

      {/* Ctrl+L Save View Modal */}
      <SaveViewDialog
        isOpen={isSaveViewOpen}
        onClose={() => setIsSaveViewOpen(false)}
        onSave={async (name) => {
          if (window.api?.report?.saveView && selectedCompany?.company_id) {
            const res = await window.api.report.saveView({
              company_id: selectedCompany.company_id,
              name,
              reportId: reportType,
              config,
              fromDate,
              toDate,
            });
            if (res.success) {
              alert(`Saved view "${name}" successfully!`);
            } else {
              alert(`Failed to save view: ${res.error}`);
            }
          } else {
            console.log(`Saved view ${name} with config:`, config, { fromDate, toDate });
          }
        }}
        defaultName={`${definition.title} Custom View`}
      />

      {/* Alt+C Compare Column Modal */}
      <CompareColumnDialog
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onAdd={handleAddComparisonColumn}
        companies={companies}
        currentCompanyId={selectedCompany?.company_id}
        defaultFromDate={fromDate}
        defaultToDate={toDate}
      />

      {/* Ctrl+H Command Palette */}
      <ReportCommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelect={(path) => navigate(path)}
        items={commandPaletteItems}
      />
    </TallyReportLayout>
  );
}
