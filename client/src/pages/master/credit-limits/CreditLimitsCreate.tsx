import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  MasterSelectionPanel,
  type TableColumn,
} from '@/components/ui';
import type { GroupType } from '@/types/entities/Group';
import type { LedgerType } from '@/types/entities/Ledger';

interface RowState {
  ledger_id: number;
  name: string;
  credit_limit: string;
  credit_limit_type: string;
  credit_period: string;
  check_credit_days: number;
}

const cellInput =
  'w-full bg-transparent text-xs outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

export default function CreditLimitsCreate({
  returnPath = '/master/create',
}: { returnPath?: string } = {}) {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [groups, setGroups] = useState<GroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load groups for the picker stage.
  useEffect(() => {
    if (!companyId) return;
    window.api.group.getAll(companyId).then((res) => {
      if (res.success) setGroups(res.groups || []);
    });
  }, [companyId]);

  // Load ledgers under the picked group into editable rows.
  const openGroup = async (group: GroupType) => {
    if (!companyId || !group.group_id) return;
    setError(null);
    setLoading(true);
    const res = await window.api.ledger.getByGroup(companyId, group.group_id);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to load ledgers');
      return;
    }
    const mapped: RowState[] = (res.ledgers || []).map((l: LedgerType) => ({
      ledger_id: l.ledger_id as number,
      name: l.name,
      credit_limit:
        l.credit_limit != null && Number(l.credit_limit) !== 0 ? String(l.credit_limit) : '',
      credit_limit_type: l.credit_limit_type || 'Cr',
      credit_period:
        l.default_credit_period != null && Number(l.default_credit_period) !== 0
          ? String(l.default_credit_period)
          : '',
      check_credit_days: l.check_credit_days ? 1 : 0,
    }));
    setSelectedGroup(group);
    setRows(mapped);
  };

  const backToGroups = () => {
    setSelectedGroup(null);
    setRows([]);
    setError(null);
  };

  const setRow = (idx: number, patch: Partial<RowState>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const save = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    const payload = rows.map((r) => ({
      ledger_id: r.ledger_id,
      credit_limit: Number(r.credit_limit) || 0,
      credit_limit_type: r.credit_limit_type || 'Cr',
      credit_period: Number(r.credit_period) || 0,
      check_credit_days: r.check_credit_days ? 1 : 0,
    }));
    const res = await window.api.ledger.updateCreditLimits(companyId, payload);
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Failed to save credit limits');
      return;
    }
    backToGroups();
  };

  // Esc on the table stage returns to the group picker.
  useEffect(() => {
    if (!selectedGroup) return;
    const handler = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'SELECT');
      if (e.key === 'Escape' && !typing) {
        e.preventDefault();
        backToGroups();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedGroup]);

  const groupColumns: TableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name of Group', span: 'col-span-8' },
      {
        key: 'nature',
        label: 'Nature',
        span: 'col-span-4',
        align: 'right',
        render: (g: GroupType) => g.nature || '—',
      },
    ],
    [],
  );

  // ── Stage 1: group picker ──────────────────────────────────────────────────
  if (!selectedGroup) {
    return (
      <MasterSelectionPanel<GroupType>
        title="Credit Limits — List of Groups"
        subtitle={selectedCompany?.name}
        searchPlaceholder="Search groups…"
        items={groups}
        filterFn={(g, s) => g.name.toLowerCase().includes(s.toLowerCase())}
        columns={groupColumns}
        onSelect={openGroup}
        onCancel={() => navigate(returnPath)}
        onCreate={() => navigate(returnPath)}
        createLabel="Back to Masters"
        rowKey={(g) => g.group_id ?? g.name}
        emptyMessage="No groups found."
      />
    );
  }

  // ── Stage 2: Multi Ledger Limit Alteration ─────────────────────────────────
  const actions = [
    { key: 'Ctrl+A', label: 'Accept', onClick: save },
    { key: 'Esc', label: 'Quit', onClick: backToGroups },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Multi Ledger Limit Alteration" subtitle={selectedGroup.name} />

      {error && (
        <div className="px-3 py-2 text-xs text-zinc-700 border-b border-zinc-200 bg-zinc-50 font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-zinc-100">
          {/* Header */}
          <div
            className="grid sticky top-0 z-10 px-3 py-2 bg-zinc-900 text-white text-[11px] font-semibold uppercase tracking-wider"
            style={{ gridTemplateColumns: '3rem 1fr 11rem 9rem 12rem' }}
          >
            <div className="text-right pr-2">S.No.</div>
            <div>Name of Ledger</div>
            <div className="text-right">Credit Limit</div>
            <div className="text-right">Credit Period</div>
            <div className="text-center">Check for Credit Days</div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && <div className="px-3 py-4 text-xs text-zinc-400">Loading…</div>}
            {!loading && rows.length === 0 && (
              <div className="px-3 py-4 text-xs text-zinc-400">No ledgers under this group.</div>
            )}
            {!loading &&
              rows.map((r, idx) => (
                <div
                  key={r.ledger_id}
                  className="grid px-3 py-1.5 items-center border-b border-zinc-100 text-xs hover:bg-zinc-50"
                  style={{ gridTemplateColumns: '3rem 1fr 11rem 9rem 12rem' }}
                >
                  <div className="text-right pr-2 text-zinc-500 tabular-nums">{idx + 1}</div>
                  <div className="truncate pr-2">{r.name}</div>

                  {/* Credit Limit: amount + Cr/Dr */}
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      value={r.credit_limit}
                      onChange={(e) => setRow(idx, { credit_limit: e.target.value })}
                      className={`${cellInput} text-right tabular-nums w-24`}
                      placeholder="0.00"
                    />
                    <select
                      value={r.credit_limit_type}
                      onChange={(e) => setRow(idx, { credit_limit_type: e.target.value })}
                      className={`${cellInput} w-14`}
                    >
                      <option value="Cr">Cr</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>

                  {/* Credit Period: number + Days */}
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      value={r.credit_period}
                      onChange={(e) => setRow(idx, { credit_period: e.target.value })}
                      className={`${cellInput} text-right tabular-nums w-16`}
                      placeholder="0"
                    />
                    <span className="text-[10px] text-zinc-400 w-8">Days</span>
                  </div>

                  {/* Check for Credit Days: Yes/No */}
                  <div className="flex justify-center">
                    <select
                      value={r.check_credit_days ? 'Yes' : 'No'}
                      onChange={(e) =>
                        setRow(idx, {
                          check_credit_days: e.target.value === 'Yes' ? 1 : 0,
                        })
                      }
                      className={`${cellInput} w-20 text-center`}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={backToGroups}
        onSubmit={save}
        submitLabel="Accept"
        cancelLabel="Back to Groups"
        loading={loading}
        disabled={rows.length === 0}
      />
    </div>
  );
}
