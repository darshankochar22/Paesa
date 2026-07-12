import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from '../SelectionPopup';
import StockAgeingTable, { type AgeRow } from '../StockAgeingTable';

interface GroupRef {
  group_id: number;
  group_name: string;
}
interface RawRow {
  item_id: number;
  item_name: string;
  unit_name: string;
  expiry_date: string;
  total_qty: number;
  total_value: number;
  buckets: { qty: number; value: number }[];
  neg_qty: number;
  neg_value: number;
}

const PRIMARY_ID = -1;

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
    {children}
  </div>
);

/**
 * Job Work — Stock Ageing Analysis. Ages material moved under job work (Material
 * In/Out lots) by date, bucketed into ageing bands, with a Job Work In/Out basis
 * toggle (F8). Reuses the shared SelectionPopup + StockAgeingTable.
 */
export default function JobWorkAgeingAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const asAt = activeFY?.end_date;
  const fyStart = activeFY?.start_date;

  const [step, setStep] = React.useState<'select' | 'report'>('select');
  const [group, setGroup] = React.useState<GroupRef | null>(null);
  const [direction, setDirection] = React.useState<'in' | 'out'>('in');

  // ── Select Stock Group ──────────────────────────────────────────────────
  const [groupList, setGroupList] = React.useState<GroupRef[]>([]);
  const [groupListLoading, setGroupListLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setGroupListLoading(false);
      return;
    }
    setGroupListLoading(true);
    (window as any).api.stockGroup.getAll(companyId).then((res: any) => {
      const list: GroupRef[] = [...(res.stockGroups ?? [])]
        .map((g: any) => ({ group_id: g.sg_id, group_name: g.name }))
        .sort((a: GroupRef, b: GroupRef) => a.group_name.localeCompare(b.group_name));
      setGroupList([{ group_id: PRIMARY_ID, group_name: 'Primary' }, ...list]);
      setGroupListLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? groupList
        : groupList.filter((g) => g.group_name.toLowerCase().includes(search.toLowerCase())),
    [groupList, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // ── Ageing report ───────────────────────────────────────────────────────
  const [rows, setRows] = React.useState<RawRow[]>([]);
  const [bands, setBands] = React.useState<number[]>([45, 90, 180]);
  const [reportAsAt, setReportAsAt] = React.useState<string | undefined>(asAt);
  const [loadingReport, setLoadingReport] = React.useState(false);
  const [reportErr, setReportErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback(
    (g: GroupRef, dir: 'in' | 'out') => {
      if (!companyId || !fyId) return;
      setGroup(g);
      setStep('report');
      setDirection(dir);
      setLoadingReport(true);
      setReportErr(null);
      setRowIdx(0);
      (window as any).api.report
        .jobWorkAgeing(companyId, fyId, g.group_id, asAt, fyStart, dir)
        .then((res: any) => {
          if (res.success) {
            setRows(res.rows ?? []);
            if (Array.isArray(res.bands)) setBands(res.bands);
            setReportAsAt(res.as_at ?? asAt);
          } else setReportErr(res.error || 'Failed to load');
          setLoadingReport(false);
        });
    },
    [companyId, fyId, asAt, fyStart],
  );

  const backToSelect = React.useCallback(() => {
    setStep('select');
    setRows([]);
    setSearch('');
  }, []);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (step === 'select') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectIdx((p) => Math.min(filtered.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const g = filtered[selectIdx];
          if (g) loadReport(g, direction);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          navigate(-1);
        }
      } else {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRowIdx((p) => Math.min(rows.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRowIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'F8') {
          e.preventDefault();
          if (group) loadReport(group, direction === 'in' ? 'out' : 'in');
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          backToSelect();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [
    step,
    filtered,
    selectIdx,
    rows.length,
    group,
    direction,
    loadReport,
    backToSelect,
    navigate,
  ]);

  if (step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">Stock Ageing Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Group"
          fieldLabel="Name of Group"
          listLabel="List of Stock Groups"
          companyName={selectedCompany?.name}
          items={filtered.map((g) => ({ id: g.group_id, name: g.group_name }))}
          index={selectIdx}
          loading={groupListLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            const g = filtered[i];
            if (g) loadReport(g, direction);
          }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate('/master/create/stock-group')}
        />
      </div>
    );
  }

  const ageRows: AgeRow[] = rows.map((r) => ({
    id: r.item_id,
    name: r.item_name,
    unit: r.unit_name,
    expiry: r.expiry_date,
    total: { qty: r.total_qty, value: r.total_value },
    buckets: r.buckets,
    neg: { qty: r.neg_qty, value: r.neg_value },
  }));
  return (
    <StockAgeingTable
      companyName={selectedCompany?.name}
      groupLabel={group?.group_name || 'Primary'}
      asAt={reportAsAt}
      basis={direction === 'out' ? 'Job Work Out' : 'Job Work In'}
      bands={bands}
      rows={ageRows}
      loading={loadingReport}
      error={reportErr}
      selectedIndex={rowIdx}
      onSelectIndex={setRowIdx}
      footer={
        <FooterBar>
          <button onClick={backToSelect} className="hover:underline hover:text-black">
            Q: Back to Group Selection
          </button>
          <button
            onClick={() => group && loadReport(group, direction === 'in' ? 'out' : 'in')}
            className="hover:underline hover:text-black"
          >
            F8: {direction === 'in' ? 'Job Work Out' : 'Job Work In'}
          </button>
        </FooterBar>
      }
    />
  );
}
