import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, MasterSelectionPanel, MasterFormFooter, AlertBanner } from "@/components/ui";
import { useMasterShortcuts } from "@/hooks/useMasterShortcuts";
import type { EmployeeGroupType, EmployeeCategoryType } from "@/types/entities/Employee";
import SalaryDetailsModal, { type SalaryRow, fyStartISO } from "@/components/payroll/SalaryDetailsModal";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";

export default function EmployeeGroupAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [categories, setCategories] = useState<EmployeeCategoryType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<EmployeeGroupType | null>(null);
  const [form, setForm] = useState<{ name: string; alias: string; employee_category_id: number | null; parent_group_id: number | null }>({ name: "", alias: "", employee_category_id: null, parent_group_id: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [selectedParent, setSelectedParent] = useState<EmployeeGroupType | null>(null);
  const [defineSalary, setDefineSalary] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(fyStartISO());

  const loadGroups = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.employeeGroup.getAll(companyId);
    if (res.success) setGroups(res.employeeGroups ?? []);
  }, [companyId]);
  useEffect(() => { loadGroups(); }, [loadGroups]);

  useEffect(() => {
    if (!companyId) return;
    window.api.employeeCategory.getAll(companyId).then((res) => {
      if (res.success) setCategories(res.employeeCategories ?? []);
    });
  }, [companyId]);

  const handleSelectGroup = (g: EmployeeGroupType) => {
    setSelectedGroup(g);
    setForm({ name: g.name, alias: g.alias || "", employee_category_id: g.employee_category_id ?? null, parent_group_id: g.parent_group_id ?? null });
    const parent = groups.find(p => p.employee_group_id === g.parent_group_id);
    setSelectedParent(parent || null);
    // Group-level salary defaults are not persisted (no backend store keyed by group),
    // so reset to a blank structure on every selection — mirrors EmployeeGroupCreate.
    setDefineSalary(false);
    setSalaryRows([]);
    setSalaryEffectiveFrom(fyStartISO());
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.groupId;
    if (preSelectId && groups.length > 0) {
      const g = groups.find(g => g.employee_group_id === preSelectId);
      if (g) handleSelectGroup(g);
    }
  }, [location.state, groups]);

  const setField = (key: "name" | "alias") => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!selectedGroup) return;
    setLoading(true); setError(null);
    try {
      const res = await window.api.employeeGroup.update({ employee_group_id: selectedGroup.employee_group_id, name: form.name.trim(), alias: form.alias.trim() || undefined, employee_category_id: form.employee_category_id || undefined, parent_group_id: form.parent_group_id || undefined });
      if (res.success) {
        setSuccess(`Group "${form.name}" updated.`);
        await loadGroups();
        setTimeout(() => { setSuccess(null); setSelectedGroup(null); }, 1500);
      } else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [form, selectedGroup, loadGroups]);

  const handleDelete = useCallback(async () => {
    if (!selectedGroup) return;
    if (selectedGroup.is_predefined) { setError("Cannot delete predefined group."); return; }
    setLoading(true); setError(null);
    try {
      const res = await window.api.employeeGroup.delete(selectedGroup.employee_group_id!);
      if (res.success) {
        setSuccess("Group deleted.");
        await loadGroups();
        setTimeout(() => { setSuccess(null); setSelectedGroup(null); }, 1500);
      } else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [selectedGroup, loadGroups]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: selectedGroup && !selectedGroup.is_predefined ? handleDelete : undefined,
    onQuit: () => {
      if (selectedGroup) {
        setSelectedGroup(null);
      } else {
        navigate("/master/alter");
      }
    },
  });

  const buildTree = (parentId: number | null): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] => {
    return groups
      .filter(g => g.parent_group_id === parentId && g.employee_group_id !== selectedGroup?.employee_group_id)
      .map(g => ({ ...g, children: buildTree(g.employee_group_id ?? null) }));
  };

  const renderTree = (nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.employee_group_id}>
        <button className="w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded" style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => { setForm(f => ({ ...f, parent_group_id: node.employee_group_id ?? null })); setSelectedParent(node); setShowGroupPanel(false); }}>
          {node.name}
        </button>
        {node.children?.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  if (!selectedGroup) {
    const columns = [
      {
        key: "name",
        label: "Group Name",
        span: "col-span-8",
        render: (r: EmployeeGroupType) => <span className="font-bold text-zinc-950 uppercase">{r.name}</span>,
      },
      {
        key: "alias",
        label: "Alias",
        span: "col-span-4",
        render: (r: EmployeeGroupType) => <span className="text-zinc-500">{r.alias || "—"}</span>,
      },
    ];

    return (
      <MasterSelectionPanel
        title="Alter Employee Group"
        subtitle="Select Group to Alter"
        searchPlaceholder="Search groups by name…"
        items={groups}
        filterFn={(g, search) => g.name.toLowerCase().includes(search.toLowerCase())}
        columns={columns}
        onSelect={handleSelectGroup}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/employee-group")}
        createLabel="Create Group"
        rowKey={(r) => String(r.employee_group_id)}
        emptyMessage="No employee groups found."
      />
    );
  }

  const editActions: any = [];
  void editActions;
  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Employee Group" subtitle={selectedCompany?.name} />
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Category" labelWidth="w-56">
              <select
                className={selectCls}
                value={form.employee_category_id ?? ""}
                onChange={(e) => setForm(f => ({ ...f, employee_category_id: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">Not Applicable</option>
                {categories.map(c => (
                  <option key={c.employee_category_id} value={c.employee_category_id}>{c.name}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Name" required labelWidth="w-56"><input className={inputCls} value={form.name} onChange={setField("name")} /></FormRow>
            <FormRow label="(alias)" labelWidth="w-56"><input className={inputCls} value={form.alias} onChange={setField("alias")} /></FormRow>
            <div className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded" onClick={() => setShowGroupPanel(!showGroupPanel)}>
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span><span className="text-zinc-400 mr-2">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">{selectedParent?.name || "Primary"}</span>
            </div>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1 max-w-2xl">
            <FormRow label="Define salary details" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={defineSalary ? "Yes" : "No"}
                onChange={(e) => {
                  const yes = e.target.value === "Yes";
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
                {salaryRows.length} pay head{salaryRows.length !== 1 ? "s" : ""} defined — click to edit
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b bg-zinc-50 text-xs font-bold text-zinc-500 uppercase flex justify-between"><span>List of Employee Groups</span><button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400">&times;</button></div>
            <div className="flex-1 overflow-y-auto">
              <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 font-medium" onClick={() => { setForm(f => ({ ...f, parent_group_id: null })); setSelectedParent(null); setShowGroupPanel(false); }}>Primary</button>
              {renderTree(buildTree(null))}
            </div>
          </div>
        )}
      </div>
      <MasterFormFooter
        onCancel={() => setSelectedGroup(null)}
        onSubmit={handleSubmit}
        onDelete={!selectedGroup.is_predefined ? handleDelete : undefined}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
      />

      {showSalaryModal && (
        <SalaryDetailsModal
          name={form.name}
          under={selectedParent?.name || "Primary"}
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
      )}
    </div>
  );
}
