import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, MasterFormFooter, AlertBanner } from '@/components/ui';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
import type { EmployeeGroupType, EmployeeCategoryType } from '@/types/entities/Employee';
import SalaryDetailsModal, {
  type SalaryRow,
  fyStartISO,
} from '@/components/payroll/SalaryDetailsModal';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24';

interface FormData {
  name: string;
  alias: string;
  employee_category_id: number | null;
  parent_group_id: number | null;
}

const INITIAL: FormData = {
  name: '',
  alias: '',
  employee_category_id: null,
  parent_group_id: null,
};

export default function EmployeeGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [categories, setCategories] = useState<EmployeeCategoryType[]>([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [selectedParent, setSelectedParent] = useState<EmployeeGroupType | null>(null);
  const [defineSalary, setDefineSalary] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(fyStartISO());

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const defineSalaryRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.employeeGroup.getAll(companyId).then((res) => {
      if (res.success) {
        setGroups(res.employeeGroups);
        const primary = res.employeeGroups.find((g: EmployeeGroupType) => g.name === 'Primary');
        if (primary) {
          setSelectedParent(primary);
          setForm((f) => ({ ...f, parent_group_id: primary.employee_group_id || null }));
        }
      }
    });
    window.api.employeeCategory.getAll(companyId).then((res) => {
      if (res.success) setCategories(res.employeeCategories ?? []);
    });
  }, [companyId]);

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.employeeGroup.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        employee_category_id: form.employee_category_id || undefined,
        parent_group_id: form.parent_group_id || undefined,
      });
      if (result.success) {
        setSuccess(`Employee Group "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create employee group.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'g' && !showGroupPanel) {
        e.preventDefault();
        setShowGroupPanel((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGroupPanel]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => {
      if (showGroupPanel) setShowGroupPanel(false);
      else navigate('/master/create');
    },
  });

  const buildTree = (
    parentId: number | null,
  ): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] => {
    return groups
      .filter((g) => g.parent_group_id === parentId)
      .map((g) => ({ ...g, children: buildTree(g.employee_group_id || null) }));
  };

  const renderTree = (
    nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[],
    depth: number = 0,
  ) => {
    return nodes.map((node) => (
      <div key={node.employee_group_id}>
        <button
          className={`w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded transition-colors ${node.employee_group_id === selectedParent?.employee_group_id ? 'bg-zinc-200 font-semibold' : ''}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            setSelectedParent(node);
            setForm((f) => ({ ...f, parent_group_id: node.employee_group_id || null }));
            setShowGroupPanel(false);
            setTimeout(() => defineSalaryRef.current?.focus(), 50);
          }}
        >
          {node.is_predefined ? '◆ ' : '◇ '}
          {node.name}
        </button>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Employee Group Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Category" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select
                autoFocus
                ref={categoryRef}
                className={selectCls}
                value={form.employee_category_id ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    employee_category_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  nameRef.current?.focus();
                }}
              >
                <option value="">Not Applicable</option>
                {categories.map((c) => (
                  <option key={c.employee_category_id} value={c.employee_category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormRow>
            <FormRow
              label="Name"
              required
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={setField('name')}
                placeholder="e.g. Management"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowGroupPanel(true);
                }}
              />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div
              tabIndex={0}
              data-enter-click
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded transition-colors"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
            >
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">
                {selectedParent?.name || '-'}
              </span>
            </div>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1 max-w-2xl">
            <FormRow
              label="Define salary details"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={defineSalaryRef}
                className={selectCls}
                value={defineSalary ? 'Yes' : 'No'}
                onChange={(e) => {
                  const yes = e.target.value === 'Yes';
                  setDefineSalary(yes);
                  if (yes) setShowSalaryModal(true);
                  else setSalaryRows([]);
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            {defineSalary && salaryRows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSalaryModal(true)}
                className="ml-56 text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                {salaryRows.length} pay head{salaryRows.length !== 1 ? 's' : ''} defined — click to
                edit
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>

        {showGroupPanel && (
          <div
            className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
            data-enter-nav-ignore
          >
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
              <span>List of Employee Groups</span>
              <button
                onClick={() => setShowGroupPanel(false)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderTree(buildTree(null))}</div>
          </div>
        )}
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        submitLabel="Create"
        loading={loading}
      />

      {showSalaryModal && (
        <div data-enter-nav-ignore className="contents">
          <SalaryDetailsModal
            name={form.name}
            under={selectedParent?.name || 'Primary'}
            companyId={companyId}
            effectiveFrom={salaryEffectiveFrom}
            initialRows={salaryRows}
            onAccept={(rows, eff) => {
              setSalaryRows(rows);
              setSalaryEffectiveFrom(eff);
              setShowSalaryModal(false);
              if (rows.length === 0) setDefineSalary(false);
            }}
            onClose={() => {
              setShowSalaryModal(false);
              if (salaryRows.length === 0) setDefineSalary(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
