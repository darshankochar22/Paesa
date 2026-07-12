import { useState, useEffect, useRef } from 'react';
import { PageTitleBar, RightActionPanel, Select, NotificationBanner } from '@/components/ui';
import type {
  BudgetType,
  BudgetGroupAllocation,
  BudgetLedgerAllocation,
  BudgetCostCentreAllocation,
  GroupType,
  LedgerType,
  CostCentreType,
} from '@/types/api';

const TYPE_OPTIONS = [
  { value: 'On Closing Balance', label: 'On Closing Balance' },
  { value: 'On Nett Transactions', label: 'On Nett Transactions' },
];

const inputCls =
  'w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 border-b border-transparent focus:border-zinc-400 transition-colors';
const numCls = inputCls + ' text-right';

type SubScreen = 'group' | 'ledger' | 'costCentre' | null;

interface Props {
  mode: 'create' | 'alter';
  companyId: number;
  groups: GroupType[];
  ledgers: LedgerType[];
  costCentres: CostCentreType[];
  budgets: BudgetType[];
  initial?: BudgetType;
  onSaved: (msg: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

function Row({
  label,
  required,
  children,
  onClick,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-start min-h-[36px] border-b border-zinc-100 last:border-0 ${onClick ? 'cursor-pointer hover:bg-zinc-50' : ''}`}
      onClick={onClick}
    >
      <span className="w-56 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

export default function BudgetForm({
  mode,
  companyId,
  groups,
  ledgers,
  costCentres,
  budgets,
  initial,
  onSaved,
  onCancel,
  onBack,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [parentId, setParentId] = useState<number | undefined>(initial?.parent_id ?? undefined);
  const [periodFrom, setPeriodFrom] = useState(initial?.period_from ?? '');
  const [periodTo, setPeriodTo] = useState(initial?.period_to ?? '');

  const [groupRows, setGroupRows] = useState<BudgetGroupAllocation[]>(initial?.groups ?? []);
  const [ledgerRows, setLedgerRows] = useState<BudgetLedgerAllocation[]>(initial?.ledgers ?? []);
  const [ccRows, setCcRows] = useState<BudgetCostCentreAllocation[]>(initial?.costCentres ?? []);

  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Lists used by the sub-screen selects (exclude self from "Under").
  const ccOptions = [
    { value: '', label: 'Not Applicable' },
    ...costCentres.map((c) => ({ value: c.cc_id!, label: c.name })),
  ];
  const periodSubtitle =
    periodFrom || periodTo ? `(From ${periodFrom || '…'} to ${periodTo || '…'})` : undefined;

  const eligibleParents = budgets.filter((b) => !initial || b.budget_id !== initial.budget_id);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    const payload: Partial<BudgetType> = {
      company_id: companyId,
      name: name.trim(),
      parent_id: parentId ?? null,
      period_from: periodFrom.trim() || undefined,
      period_to: periodTo.trim() || undefined,
      groups: groupRows.filter((r) => r.group_id),
      ledgers: ledgerRows.filter((r) => r.ledger_id),
      costCentres: ccRows.filter((r) => r.cost_centre_id),
    };
    try {
      const res =
        mode === 'create'
          ? await window.api.budget.create(payload)
          : await window.api.budget.update({ ...payload, budget_id: initial!.budget_id });
      if (res.success) {
        onSaved(`Budget "${name.trim()}" ${mode === 'create' ? 'created' : 'updated'}.`);
      } else {
        setError(res.error || 'Failed to save budget.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const formActions = [
    { key: 'Ctrl+A', label: 'Accept', onClick: handleSubmit },
    ...(onDelete ? [{ key: 'Alt+D', label: 'Delete', onClick: onDelete }] : []),
    { key: 'Esc', label: mode === 'alter' ? 'Back' : 'Quit', onClick: onBack },
  ];

  const yesNo = (on: boolean) => (
    <span className={`text-[12px] font-bold font-mono ${on ? 'text-zinc-950' : 'text-zinc-400'}`}>
      {on ? 'Yes' : 'No'}
    </span>
  );

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950 font-mono text-[12px]"
      data-enter-nav
    >
      <PageTitleBar
        title={mode === 'create' ? 'Budget Creation' : 'Budget Alteration'}
        subtitle={parentId ? 'Secondary' : 'Primary'}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-zinc-300 shadow-sm">
            <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-200 text-center font-bold text-xs uppercase tracking-wider text-zinc-700">
              {mode === 'create' ? 'Budget Creation' : 'Budget Alteration'}
            </div>

            <div className="p-4 flex flex-col gap-1">
              <Row label="Name" required>
                <input
                  ref={nameRef}
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Row>
              <Row label="Under">
                <Select
                  className="max-w-xs"
                  value={parentId ?? ''}
                  onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : undefined)}
                  options={[
                    { value: '', label: 'Primary' },
                    ...eligibleParents.map((b) => ({ value: b.budget_id!, label: b.name })),
                  ]}
                />
              </Row>
            </div>

            {/* Period of Budget table */}
            <div className="px-4 pb-5">
              <div className="border border-zinc-300">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] bg-zinc-100 border-b border-zinc-300 text-[11px] font-bold text-zinc-700 text-center">
                  <div className="col-span-2 py-1 border-r border-zinc-300">Period of Budget</div>
                  <div className="col-span-3 py-1">Set / Alter Budgets of</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] border-b border-zinc-300 text-[11px] font-semibold text-zinc-600 text-center bg-zinc-50">
                  <div className="py-1 border-r border-zinc-200">From</div>
                  <div className="py-1 border-r border-zinc-200">To</div>
                  <div className="py-1 border-r border-zinc-200">Groups</div>
                  <div className="py-1 border-r border-zinc-200">Ledgers</div>
                  <div className="py-1">Cost Centres</div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] text-center">
                  <input
                    className={inputCls + ' text-center border-r border-zinc-200'}
                    placeholder="D-MMM-YY"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                  />
                  <input
                    className={inputCls + ' text-center border-r border-zinc-200'}
                    placeholder="D-MMM-YY"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    data-enter-click
                    onClick={() => setSubScreen('group')}
                    className="py-1.5 border-r border-zinc-200 hover:bg-zinc-50 focus:bg-zinc-100 outline-none cursor-pointer"
                  >
                    {yesNo(groupRows.length > 0)}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    data-enter-click
                    onClick={() => setSubScreen('ledger')}
                    className="py-1.5 border-r border-zinc-200 hover:bg-zinc-50 focus:bg-zinc-100 outline-none cursor-pointer"
                  >
                    {yesNo(ledgerRows.length > 0)}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    data-enter-click
                    onClick={() => setSubScreen('costCentre')}
                    className="py-1.5 hover:bg-zinc-50 focus:bg-zinc-100 outline-none cursor-pointer"
                  >
                    {yesNo(ccRows.length > 0)}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 mt-2 font-sans">
                Click a Groups / Ledgers / Cost Centres cell to set or alter its budget allocations.
              </p>
            </div>
          </div>
        </div>

        <RightActionPanel actions={formActions} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0 font-sans">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            Delete
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
          >
            &larr; Back to Masters
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? 'Saving…' : 'Accept'}
          </button>
        </div>
      </div>

      {/* ── Group / Ledger budget sub-screen ─────────────────────────────── */}
      {(subScreen === 'group' || subScreen === 'ledger') && (
        <NameCostTypeAmountScreen
          kind={subScreen}
          budgetName={name || '(new budget)'}
          subtitle={periodSubtitle}
          primaryOptions={
            subScreen === 'group'
              ? groups.map((g) => ({ value: g.group_id!, label: g.name }))
              : ledgers.map((l) => ({ value: l.ledger_id!, label: l.name }))
          }
          ccOptions={ccOptions}
          rows={subScreen === 'group' ? groupRows : ledgerRows}
          onChange={(rows) =>
            subScreen === 'group'
              ? setGroupRows(rows as BudgetGroupAllocation[])
              : setLedgerRows(rows as BudgetLedgerAllocation[])
          }
          onClose={() => setSubScreen(null)}
        />
      )}

      {/* ── Cost Centre budget sub-screen ────────────────────────────────── */}
      {subScreen === 'costCentre' && (
        <CostCentreScreen
          budgetName={name || '(new budget)'}
          subtitle={periodSubtitle}
          ccList={costCentres}
          rows={ccRows}
          onChange={setCcRows}
          onClose={() => setSubScreen(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────── Group / Ledger budget grid ───────────────────── */

function NameCostTypeAmountScreen({
  kind,
  budgetName,
  subtitle,
  primaryOptions,
  ccOptions,
  rows,
  onChange,
  onClose,
}: {
  kind: 'group' | 'ledger';
  budgetName: string;
  subtitle?: string;
  primaryOptions: { value: number; label: string }[];
  ccOptions: { value: string | number; label: string }[];
  rows: any[];
  onChange: (rows: any[]) => void;
  onClose: () => void;
}) {
  const idKey = kind === 'group' ? 'group_id' : 'ledger_id';
  const firstLabel = kind === 'group' ? 'Group Name' : 'Account Name';
  const title =
    kind === 'group'
      ? `Group Budgets Under '${budgetName}'`
      : `Ledger Budgets Under '${budgetName}'`;

  const update = (i: number, patch: any) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([
      ...rows,
      { [idKey]: 0, cost_centre_id: null, type_of_budget: 'On Closing Balance', amount: 0 },
    ]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col font-mono text-[12px]"
      data-enter-nav-ignore
    >
      <PageTitleBar title={title} subtitle={subtitle} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto border border-zinc-300">
          <div className="grid grid-cols-[3fr_2fr_2fr_1.5fr_40px] bg-zinc-100 border-b border-zinc-300 text-[11px] font-bold text-zinc-700">
            <div className="py-1.5 px-2 border-r border-zinc-300">{firstLabel}</div>
            <div className="py-1.5 px-2 border-r border-zinc-300">Cost Centre</div>
            <div className="py-1.5 px-2 border-r border-zinc-300">Type of Budget</div>
            <div className="py-1.5 px-2 border-r border-zinc-300 text-right">Amount</div>
            <div />
          </div>
          {rows.length === 0 && (
            <div className="py-6 text-center text-zinc-400 italic font-sans text-xs">
              No allocations yet — add a row below.
            </div>
          )}
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[3fr_2fr_2fr_1.5fr_40px] border-b border-zinc-100 items-center"
            >
              <div className="border-r border-zinc-100 px-1">
                <Select
                  className="border-0 h-7"
                  value={r[idKey] || ''}
                  onChange={(e) =>
                    update(i, { [idKey]: e.target.value ? Number(e.target.value) : 0 })
                  }
                  options={primaryOptions}
                  placeholder="Select…"
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <Select
                  className="border-0 h-7"
                  value={r.cost_centre_id ?? ''}
                  onChange={(e) =>
                    update(i, { cost_centre_id: e.target.value ? Number(e.target.value) : null })
                  }
                  options={ccOptions}
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <Select
                  className="border-0 h-7"
                  value={r.type_of_budget || 'On Closing Balance'}
                  onChange={(e) => update(i, { type_of_budget: e.target.value })}
                  options={TYPE_OPTIONS}
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <input
                  className={numCls}
                  type="number"
                  value={r.amount ?? 0}
                  onChange={(e) =>
                    update(i, { amount: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                />
              </div>
              <button
                onClick={() => removeRow(i)}
                className="text-zinc-400 hover:text-red-500 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          ))}
          <div className="grid grid-cols-[3fr_2fr_2fr_1.5fr_40px] border-t border-zinc-300 bg-zinc-50 font-bold">
            <div className="py-1.5 px-2 col-span-3 text-zinc-600">Total</div>
            <div className="py-1.5 px-2 text-right text-zinc-900">
              {rows
                .reduce((s, r) => s + (Number(r.amount) || 0), 0)
                .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div />
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-3">
          <button
            onClick={addRow}
            className="text-xs px-3 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            + Add Row
          </button>
        </div>
      </div>
      <SubScreenFooter onClose={onClose} />
    </div>
  );
}

/* ───────────────────── Cost Centre budget grid ───────────────────── */

function CostCentreScreen({
  budgetName,
  subtitle,
  ccList,
  rows,
  onChange,
  onClose,
}: {
  budgetName: string;
  subtitle?: string;
  ccList: CostCentreType[];
  rows: BudgetCostCentreAllocation[];
  onChange: (rows: BudgetCostCentreAllocation[]) => void;
  onClose: () => void;
}) {
  const update = (i: number, patch: Partial<BudgetCostCentreAllocation>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...rows, { cost_centre_id: 0, expenses: 0, income: 0, closing_balance: 0 }]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const ccOptions = ccList.map((c) => ({ value: c.cc_id!, label: c.name }));

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col font-mono text-[12px]"
      data-enter-nav-ignore
    >
      <PageTitleBar title={`Cost Centre Budgets Under '${budgetName}'`} subtitle={subtitle} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto border border-zinc-300">
          <div className="grid grid-cols-[3fr_2fr_2fr_2fr_40px] bg-zinc-100 border-b border-zinc-300 text-[11px] font-bold text-zinc-700">
            <div className="py-1.5 px-2 border-r border-zinc-300">Cost Centre</div>
            <div className="py-1.5 px-2 border-r border-zinc-300 text-right">Expenses</div>
            <div className="py-1.5 px-2 border-r border-zinc-300 text-right">Income</div>
            <div className="py-1.5 px-2 border-r border-zinc-300 text-right">Closing Balance</div>
            <div />
          </div>
          {rows.length === 0 && (
            <div className="py-6 text-center text-zinc-400 italic font-sans text-xs">
              No allocations yet — add a row below.
            </div>
          )}
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-[3fr_2fr_2fr_2fr_40px] border-b border-zinc-100 items-center"
            >
              <div className="border-r border-zinc-100 px-1">
                <Select
                  className="border-0 h-7"
                  value={r.cost_centre_id || ''}
                  onChange={(e) =>
                    update(i, { cost_centre_id: e.target.value ? Number(e.target.value) : 0 })
                  }
                  options={ccOptions}
                  placeholder="Select…"
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <input
                  className={numCls}
                  type="number"
                  value={r.expenses ?? 0}
                  onChange={(e) =>
                    update(i, { expenses: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <input
                  className={numCls}
                  type="number"
                  value={r.income ?? 0}
                  onChange={(e) =>
                    update(i, { income: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                />
              </div>
              <div className="border-r border-zinc-100 px-1">
                <input
                  className={numCls}
                  type="number"
                  value={r.closing_balance ?? 0}
                  onChange={(e) =>
                    update(i, {
                      closing_balance: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                />
              </div>
              <button
                onClick={() => removeRow(i)}
                className="text-zinc-400 hover:text-red-500 text-sm font-bold"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
        <div className="max-w-4xl mx-auto mt-3">
          <button
            onClick={addRow}
            className="text-xs px-3 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            + Add Row
          </button>
        </div>
      </div>
      <SubScreenFooter onClose={onClose} />
    </div>
  );
}

function SubScreenFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="px-3 py-3 border-t border-zinc-200 flex justify-end bg-zinc-50 shrink-0 font-sans">
      <button
        onClick={onClose}
        className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 shadow-sm transition-colors font-medium"
      >
        Accept (Esc)
      </button>
    </div>
  );
}
