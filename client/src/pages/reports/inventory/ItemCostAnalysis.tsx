import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import CostAnalysisTable, { type CostRow } from './CostAnalysisTable';

export type CostMode = 'group' | 'item' | 'track';

interface Ref {
  id: number;
  name: string;
}
interface RawRow {
  id: number;
  name: string;
  unit?: string;
  cost: { qty: number; value: number };
  revenue: { qty: number; value: number };
  balance: { qty: number; value: number };
  profit: number;
}

const PRIMARY_ID = -1; // sentinel for group mode: all stock groups

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso?: string) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
    {children}
  </div>
);

const MODE_META: Record<
  CostMode,
  {
    title: string;
    popupTitle: string;
    fieldLabel: string;
    listLabel: string;
    createPath?: string;
  }
> = {
  group: {
    title: 'Stock Group Cost Analysis',
    popupTitle: 'Select Stock Group',
    fieldLabel: 'Name of Group',
    listLabel: 'List of Stock Groups',
    createPath: '/master/create/stock-group',
  },
  item: {
    title: 'Stock Item Cost Analysis',
    popupTitle: 'Select Stock Item',
    fieldLabel: 'Name of Item',
    listLabel: 'List of Stock Items',
    createPath: '/master/create/stock-item',
  },
  track: {
    title: 'Cost Track Break-up',
    popupTitle: 'Select Cost Track',
    fieldLabel: 'Name of Cost Track',
    listLabel: 'List of Cost Tracks',
  },
};

type Level = { step: 'select' } | { step: 'report'; ref: Ref };

export default function ItemCostAnalysis({ mode }: { mode: CostMode }) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : '';
  const meta = MODE_META[mode];

  const [level, setLevel] = React.useState<Level>({ step: 'select' });

  // ── Selection list (groups / items; cost-track has no master list) ────────
  const [list, setList] = React.useState<Ref[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setListLoading(false);
      return;
    }
    if (mode === 'track') {
      setList([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    const api = (window as any).api;
    const p = mode === 'group' ? api.stockGroup.getAll(companyId) : api.stockItem.getAll(companyId);
    p.then((res: any) => {
      const raw = mode === 'group' ? (res.stockGroups ?? []) : (res.stockItems ?? []);
      const items: Ref[] = raw
        .map((r: any) =>
          mode === 'group' ? { id: r.sg_id, name: r.name } : { id: r.item_id, name: r.name },
        )
        .sort((a: Ref, b: Ref) => a.name.localeCompare(b.name));
      setList(mode === 'group' ? [{ id: PRIMARY_ID, name: 'Primary' }, ...items] : items);
      setListLoading(false);
    });
  }, [companyId, mode]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? list
        : list.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [list, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // ── Report ────────────────────────────────────────────────────────────────
  const [rows, setRows] = React.useState<RawRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback(
    (ref: Ref) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'report', ref });
      setLoading(true);
      setErr(null);
      setRowIdx(0);
      (window as any).api.report
        .itemCostAnalysis(companyId, fyId, mode, ref.id)
        .then((res: any) => {
          if (res.success) setRows(res.rows ?? []);
          else setErr(res.error || 'Failed to load');
          setLoading(false);
        });
    },
    [companyId, fyId, mode],
  );

  // Cost Track is free-text: accept the typed name and run an (empty) break-up.
  const acceptTrack = React.useCallback(() => {
    loadReport({ id: 0, name: search.trim() || '(unnamed)' });
  }, [loadReport, search]);

  const backToSelect = React.useCallback(() => {
    setLevel({ step: 'select' });
    setRows([]);
    setSearch('');
  }, []);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === 'select') {
        if (mode === 'track') {
          if (e.key === 'Enter') {
            e.preventDefault();
            acceptTrack();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            navigate(-1);
          }
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectIdx((p) => Math.min(filtered.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const g = filtered[selectIdx];
          if (g) loadReport(g);
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
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          backToSelect();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level, mode, filtered, selectIdx, rows, loadReport, acceptTrack, backToSelect, navigate]);

  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">{meta.title}</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <SelectionPopup
          title={meta.popupTitle}
          fieldLabel={meta.fieldLabel}
          listLabel={meta.listLabel}
          companyName={selectedCompany?.name}
          items={filtered.map((g) => ({ id: g.id, name: g.name }))}
          index={selectIdx}
          loading={listLoading}
          search={search}
          emptyText={
            mode === 'track' ? 'Type a cost track name and press Enter.' : 'No records found.'
          }
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            if (mode === 'track') acceptTrack();
            else {
              const g = filtered[i];
              if (g) loadReport(g);
            }
          }}
          onCancel={() => navigate(-1)}
          onCreate={meta.createPath ? () => navigate(meta.createPath!) : undefined}
        />
      </div>
    );
  }

  const costRows: CostRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    cost: r.cost,
    revenue: r.revenue,
    balance: r.balance,
    profit: r.profit,
  }));
  return (
    <CostAnalysisTable
      title={meta.title}
      companyName={selectedCompany?.name}
      subtitle={level.ref.name}
      periodLabel={periodLabel}
      rows={costRows}
      loading={loading}
      error={err}
      emptyText="No cost-tracking movements found."
      selectedIndex={rowIdx}
      onSelectIndex={setRowIdx}
      footer={
        <FooterBar>
          <button onClick={backToSelect} className="hover:underline hover:text-black">
            Q: Back to Selection
          </button>
          <span className="text-black">Close Cost Track</span>
        </FooterBar>
      }
    />
  );
}
