import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import GroupFlatList from "@/components/GroupFlatList";
import type { GroupType } from "@/types/api";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";

function Row({ label, required, children, onClick }: { label: string; required?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`flex items-start border-b last:border-0 min-h-[36px]${onClick ? " cursor-pointer hover:bg-zinc-50" : ""}`} onClick={onClick}>
      <span className="w-64 text-sm text-zinc-600 shrink-0 py-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const ALLOC_METHODS = ["Not Applicable", "Appropriate by Quantity", "Appropriate by Value"];

const INITIAL_GROUP: Partial<GroupType> = {
  name: "",
  alias: "",
  parent_group_id: undefined,
  is_primary: 0,
  nature: "Assets",
  set_alter_tds_details: 0,
  behaves_like_subledger: 0,
  show_net_debit_credit: 0,
  used_for_calculation: 0,
  allocation_method: "Not Applicable",
};

export default function GroupAlterEdit() {
  const { id } = useParams<{ id: string }>();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originalGroup, setOriginalGroup] = useState<GroupType | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);

  const companyId = selectedCompany?.company_id;
  const persistKey = companyId && id ? `groupAlterEdit_${companyId}_${id}` : null;
  const persisted = persistKey ? loadFormState<any>(persistKey ?? "") : null;
  const wasRestored = !!(persisted?.form);
  const hasSavedOnce = useRef(wasRestored);

  const [form, setForm] = useState<Partial<GroupType>>(
    () => persisted?.form ?? INITIAL_GROUP
  );

  useEffect(() => {
    if (!companyId || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [groupRes, allRes] = await Promise.all([
          window.api.group.getById(Number(id)),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (groupRes.success && groupRes.group) {
          setOriginalGroup(groupRes.group);
          if (!wasRestored) {
            setForm({ ...groupRes.group });
          }
        } else {
          setError(groupRes.error || "Group not found.");
        }
        if (allRes.success && allRes.groups) setFlatGroups(allRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load group.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId, id]);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasSavedOnce.current) {
      hasSavedOnce.current = true;
      return;
    }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const parentGroup = form.parent_group_id
    ? flatGroups.find((g) => g.group_id === form.parent_group_id)
    : null;

  const primaryGroupName = useMemo(() => {
    if (!parentGroup || flatGroups.length === 0) return null;
    let current: GroupType | undefined = parentGroup;
    while (current) {
      if (!current.parent_group_id) return current.name;
      current = flatGroups.find((g) => g.group_id === current!.parent_group_id);
    }
    return null;
  }, [parentGroup, flatGroups]);

  const isPrimarySelected = !form.parent_group_id;

  const handleGroupSelect = (group: GroupType) => {
    setForm((f) => ({
      ...f,
      parent_group_id: group.group_id,
      is_primary: 0,
      nature: group.nature || "Assets",
    }));
    setShowGroupPanel(false);
  };

  const handleSelectPrimary = () => {
    setForm((f) => ({ ...f, parent_group_id: undefined, is_primary: 1 }));
    setShowGroupPanel(false);
  };

  const setField = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleField = (key: keyof GroupType) => () => {
    setForm((f) => ({ ...f, [key]: f[key] ? 0 : 1 }));
  };

  const validate = (): string | null => {
    if (!form.name?.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null); setSuccess(null);
    try {
      const payload = {
        group_id: Number(id),
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || null,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : null,
        is_primary: form.parent_group_id ? 0 : 1,
        nature: form.nature || null,
        set_alter_tds_details: form.set_alter_tds_details ? 1 : 0,
        behaves_like_subledger: form.behaves_like_subledger ? 1 : 0,
        show_net_debit_credit: form.show_net_debit_credit ? 1 : 0,
        used_for_calculation: form.used_for_calculation ? 1 : 0,
        allocation_method: form.allocation_method || "Not Applicable",
      };

      const res = await window.api.group.update(payload);
      if (res.success) {
        setSuccess(`Group "${form.name}" updated.`);
        if (persistKey) clearFormState(persistKey);
        hasSavedOnce.current = false;
        setTimeout(() => navigate("/master/alter/group"), 1000);
      } else {
        setError(res.error || "Failed to update group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  if (!originalGroup && !error) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/master/alter/group" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Groups
            </Link>
            <h1 className="text-lg font-semibold text-zinc-800">Edit Group</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-2 border border-green-200 text-green-700 text-sm flex justify-between items-center">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
          </div>
        )}

        <div className="flex flex-col gap-6 max-w-3xl">
          <div>
            <div className="border rounded overflow-hidden">
              <Row label="Name" required>
                <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="" />
              </Row>
              <Row label="(alias)">
                <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="" />
              </Row>
              <Row label="Under" onClick={() => setShowGroupPanel(!showGroupPanel)}>
                <span className="text-sm py-1 font-medium text-zinc-800 cursor-pointer">
                  {parentGroup ? parentGroup.name : "\u2014 Primary \u2014"}
                </span>
                {primaryGroupName && primaryGroupName !== parentGroup?.name && (
                  <span className="text-xs text-zinc-400 ml-2 font-normal">(Group: {primaryGroupName})</span>
                )}
              </Row>
              {isPrimarySelected && (
                <Row label="Nature of Group" required>
                  <select className={selectCls} value={form.nature || "Liabilities"} onChange={setField("nature")}>
                    {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Row>
              )}
            </div>
          </div>

          <div className="border-t" />

          <div className="border rounded overflow-hidden">
            <Row label="Group behaves like a sub-ledger" onClick={toggleField("behaves_like_subledger")}>
              <span className="text-sm py-1">{form.behaves_like_subledger ? "Yes" : "No"}</span>
            </Row>
            <Row label="Nett Debit/Credit Balances for Reporting" onClick={toggleField("show_net_debit_credit")}>
              <span className="text-sm py-1">{form.show_net_debit_credit ? "Yes" : "No"}</span>
            </Row>
            <Row label="Used for calculation (for example: taxes, discounts) (for sales invoice entries)" onClick={toggleField("used_for_calculation")}>
              <span className="text-sm py-1">{form.used_for_calculation ? "Yes" : "No"}</span>
            </Row>
            <Row label="Method to allocate when used in purchase invoice">
              <select className={selectCls} value={form.allocation_method || "Not Applicable"} onChange={setField("allocation_method")}>
                {ALLOC_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Row>
            <Row label="Set/Alter TDS details" onClick={toggleField("set_alter_tds_details")}>
              <span className="text-sm py-1">{form.set_alter_tds_details ? "Yes" : "No"}</span>
            </Row>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => navigate("/master/alter/group")}
              className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>

      {showGroupPanel && (
        <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Under Group</span>
            <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
          </div>
          <div
            className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b ${isPrimarySelected ? "bg-zinc-100 font-semibold text-black" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={handleSelectPrimary}
          >
            <span className="truncate">Primary</span>
          </div>
          <GroupFlatList
            groups={flatGroups}
            selectedId={form.parent_group_id as number}
            onSelect={handleGroupSelect}
            showHeader={false}
          />
        </div>
      )}
    </div>
  );
}
