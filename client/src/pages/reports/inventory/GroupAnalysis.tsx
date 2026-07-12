import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import MovementAnalysisTable, { type MovRow } from './MovementAnalysisTable';
import ItemVoucherAnalysis, { type VoucherRow } from './ItemVoucherAnalysis';

interface Group {
  group_id: number;
  name: string;
}
interface ItemRow {
  item_id: number;
  item_name: string;
  unit_name: string;
  purchase_qty: number;
  purchase_value: number;
  sales_qty: number;
  sales_value: number;
}

type Level =
  | { step: 'select' }
  | { step: 'report'; group: Group }
  | { step: 'vouchers'; group: Group; item: ItemRow };

const FooterBar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
    {children}
  </div>
);

export default function GroupAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'select' });

  // Ledger groups for selection
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setGroupsLoading(false);
      return;
    }
    setGroupsLoading(true);
    (window as any).api.group.getAll(companyId).then((res: any) => {
      const list: Group[] = [...(res.groups ?? [])].sort((a: Group, b: Group) =>
        a.name.localeCompare(b.name),
      );
      setGroups(list);
      setGroupsLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? groups
        : groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())),
    [groups, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // Report
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);

  const loadReport = React.useCallback(
    (group: Group) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'report', group });
      setLoading(true);
      setErr(null);
      setRowIdx(0);
      (window as any).api.report.groupAnalysis(companyId, fyId, group.group_id).then((res: any) => {
        if (res.success) setItems(res.items ?? []);
        else setErr(res.error || 'Failed to load');
        setLoading(false);
      });
    },
    [companyId, fyId],
  );

  // Item voucher analysis
  const [vouchers, setVouchers] = React.useState<VoucherRow[]>([]);
  const [loadingV, setLoadingV] = React.useState(false);
  const [vErr, setVErr] = React.useState<string | null>(null);
  const [vIdx, setVIdx] = React.useState(0);

  const loadVouchers = React.useCallback(
    (group: Group, item: ItemRow) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', group, item });
      setLoadingV(true);
      setVErr(null);
      setVIdx(0);
      (window as any).api.report
        .groupItemVouchers(companyId, fyId, group.group_id, item.item_id)
        .then((res: any) => {
          if (res.success) {
            // Group into Purchases then Sales sections (by voucher-type family), each chronological.
            const fam = (vt: string) => (/credit note|sales|sale/i.test(vt || '') ? 1 : 0);
            const sorted = [...(res.rows ?? [])].sort(
              (a, b) =>
                fam(a.voucher_type) - fam(b.voucher_type) ||
                String(a.date).localeCompare(String(b.date)),
            );
            setVouchers(sorted);
          } else setVErr(res.error || 'Failed to load vouchers');
          setLoadingV(false);
        });
    },
    [companyId, fyId],
  );

  const backToSelect = React.useCallback(() => {
    setLevel({ step: 'select' });
    setItems([]);
    setSearch('');
  }, []);
  const backToReport = React.useCallback((group: Group) => {
    setLevel({ step: 'report', group });
    setVouchers([]);
  }, []);

  // Keyboard nav — selection popup
  React.useEffect(() => {
    if (level.step !== 'select') return;
    const h = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level.step, filtered, selectIdx, loadReport, navigate]);

  React.useEffect(() => {
    if (level.step === 'report') {
      const h = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRowIdx((p) => Math.min(items.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRowIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const it = items[rowIdx];
          if (it) loadVouchers(level.group, it);
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          backToSelect();
        }
      };
      window.addEventListener('keydown', h);
      return () => window.removeEventListener('keydown', h);
    }
    if (level.step === 'vouchers') {
      const h = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setVIdx((p) => Math.min(vouchers.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setVIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const r = vouchers[vIdx];
          if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          backToReport(level.group);
        }
      };
      window.addEventListener('keydown', h);
      return () => window.removeEventListener('keydown', h);
    }
  }, [level, items, rowIdx, vouchers, vIdx, loadVouchers, backToSelect, backToReport, navigate]);

  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">Group Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <SelectionPopup
          title="Group Analysis"
          fieldLabel="Name of Group"
          listLabel="List of Groups"
          companyName={selectedCompany?.name}
          items={filtered.map((g) => ({ id: g.group_id, name: g.name }))}
          index={selectIdx}
          loading={groupsLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            const g = filtered[i];
            if (g) loadReport(g);
          }}
          onCancel={() => navigate(-1)}
        />
      </div>
    );
  }

  if (level.step === 'report') {
    const g = level.group;
    const rows: MovRow[] = items.map((it) => ({
      id: it.item_id,
      name: it.item_name,
      unit: it.unit_name,
      leftQty: it.purchase_qty,
      leftValue: it.purchase_value,
      rightQty: it.sales_qty,
      rightValue: it.sales_value,
    }));
    return (
      <MovementAnalysisTable
        title="Group Analysis"
        companyName={selectedCompany?.name}
        subtitle={g.name}
        periodLabel={periodLabel}
        leftLabel="Purchases"
        rightLabel="Sales"
        rows={rows}
        loading={loading}
        error={err}
        emptyText="No inventory movement found for this group."
        selectedIndex={rowIdx}
        onSelectIndex={setRowIdx}
        onActivate={(_r, i) => loadVouchers(g, items[i])}
        footer={
          <FooterBar>
            <button onClick={backToSelect} className="hover:underline hover:text-black">
              Q: Back to Group Selection
            </button>
            <span className="text-black">Enter: Item voucher analysis</span>
          </FooterBar>
        }
      />
    );
  }

  const { group: g, item: it } = level;
  return (
    <ItemVoucherAnalysis
      itemName={it.item_name}
      companyName={selectedCompany?.name}
      periodLabel={periodLabel}
      groupName={g.name}
      unit={it.unit_name}
      rows={vouchers}
      loading={loadingV}
      error={vErr}
      selectedIndex={vIdx}
      onSelectIndex={setVIdx}
      onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
      footer={
        <FooterBar>
          <button onClick={() => backToReport(g)} className="hover:underline hover:text-black">
            Q: Back to Group
          </button>
          <span className="text-black">Enter: Alter</span>
          <span className="text-black">A: Add Vch</span>
          <span className="text-black">2: Duplicate Vch</span>
          <span className="text-black">I: Insert Vch</span>
        </FooterBar>
      }
    />
  );
}
