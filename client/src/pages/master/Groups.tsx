import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import type { GroupType } from "../../types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start border-b last:border-0 min-h-[36px]">
      <span className="w-48 text-sm text-zinc-500 shrink-0 py-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400 border-b border-transparent focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer border-b border-transparent focus:border-zinc-300 transition-colors";

type Mode = "list" | "create" | "edit";

const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const ALLOC_METHODS = ["Average Cost", "FIFO", "LIFO", "Weighted Average"];

export default function Groups() {
  const { selectedCompany } = useCompany();
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<Partial<GroupType>>({});

  const companyId = selectedCompany?.company_id;

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await window.api.group.getAll(companyId);
      if (res.success) setGroups(res.groups ?? []);
    } catch (e) {
      setError("Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await window.api.group.getAll(companyId);
        if (cancelled) return;
        if (res.success) setGroups(res.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const resetForm = () => {
    setForm({
      name: "",
      alias: "",
      parent_group_id: undefined,
      nature: "Assets",
      affect_gross_profit: 0,
      behaves_like_subledger: 0,
      show_net_debit_credit: 0,
      used_for_calculation: 0,
      allocation_method: "Average Cost",
      gst_rate: undefined,
      cgst_rate: undefined,
      sgst_rate: undefined,
      igst_rate: undefined,
      hsn_sac_code: "",
      statutory_details: "",
      sort_order: 0,
      display_order: 0,
    });
  };

  const startCreate = () => {
    resetForm();
    setEditingId(null);
    setMode("create");
    setError(null);
    setSuccess(null);
  };

  const startEdit = async (id: number) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await window.api.group.getById(id);
      if (res.success && res.group) {
        setForm({ ...res.group });
        setEditingId(id);
        setMode("edit");
      } else {
        setError(res.error || "Group not found.");
      }
    } catch (e) {
      setError("Failed to fetch group.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (group: GroupType) => {
    if (!group.group_id) return;
    if (group.is_predefined) {
      setError("Cannot delete predefined groups.");
      return;
    }
    if (!confirm(`Delete group "${group.name}"?`)) return;
    setLoading(true);
    try {
      const res = await window.api.group.delete(group.group_id);
      if (res.success) {
        setSuccess(`Group "${group.name}" deleted.`);
        await fetchData();
      } else {
        setError(res.error || "Failed to delete group.");
      }
    } catch (e) {
      setError("Unexpected error during delete.");
    } finally {
      setLoading(false);
    }
  };

  const setField = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setToggle = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

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
      let res;
      const payload = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        nature: form.nature || undefined,
        affect_gross_profit: form.affect_gross_profit ? 1 : 0,
        behaves_like_subledger: form.behaves_like_subledger ? 1 : 0,
        show_net_debit_credit: form.show_net_debit_credit ? 1 : 0,
        used_for_calculation: form.used_for_calculation ? 1 : 0,
        allocation_method: form.allocation_method || "Average Cost",
        gst_rate: form.gst_rate ? Number(form.gst_rate) : undefined,
        cgst_rate: form.cgst_rate ? Number(form.cgst_rate) : undefined,
        sgst_rate: form.sgst_rate ? Number(form.sgst_rate) : undefined,
        igst_rate: form.igst_rate ? Number(form.igst_rate) : undefined,
        hsn_sac_code: form.hsn_sac_code?.trim() || undefined,
        statutory_details: form.statutory_details?.trim() || undefined,
        sort_order: Number(form.sort_order) || 0,
        display_order: Number(form.display_order) || 0,
      };

      if (mode === "edit" && editingId) {
        res = await window.api.group.update({ ...payload, group_id: editingId });
      } else {
        res = await window.api.group.create(payload);
      }

      if (res.success) {
        setSuccess(mode === "edit" ? `Group "${form.name}" updated.` : `Group "${form.name}" created.`);
        await fetchData();
        if (mode === "create") {
          resetForm();
        } else {
          setMode("list");
          setEditingId(null);
        }
      } else {
        setError(res.error || "Failed to save group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const parentName = (id?: number | null) => groups.find(g => g.group_id === id)?.name || "—";

  return (
    <div className="min-h-screen p-6">
      <Link to="/" className="px-4 py-2 inline-block rounded hover:bg-zinc-100 transition-colors">
        ← Back
      </Link>

      <div className="mt-4 bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">
            Groups
          </h1>
          {mode === "list" && (
            <button
              onClick={startCreate}
              className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              + New Group
            </button>
          )}
          {mode !== "list" && (
            <button
              onClick={() => { setMode("list"); setEditingId(null); setError(null); setSuccess(null); }}
              className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
            >
              ← Back to List
            </button>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}
        {success && (
          <div className="px-6 py-2 bg-green-50 border-b border-green-200 text-green-700 text-sm flex justify-between items-center">
            <span>✓ {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
          </div>
        )}

        {mode === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 bg-gray-50">
                  <th className="px-4 py-2 text-left border">Name</th>
                  <th className="px-4 py-2 text-left border">Under</th>
                  <th className="px-4 py-2 text-left border">Nature</th>
                  <th className="px-4 py-2 text-left border">Type</th>
                  <th className="px-4 py-2 text-center border">Status</th>
                  <th className="px-4 py-2 text-right border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const isPredefined = g.is_predefined === 1;
                  const isPrimary = g.is_primary === 1;
                  return (
                    <tr key={g.group_id} className="hover:bg-gray-50 border-b">
                      <td className="px-4 py-2 border font-medium">{g.name}</td>
                      <td className="px-4 py-2 border">{parentName(g.parent_group_id)}</td>
                      <td className="px-4 py-2 border">{g.nature}</td>
                      <td className="px-4 py-2 border">
                        {isPrimary ? "Primary" : (isPredefined ? "Predefined" : "User")}
                      </td>
                      <td className="px-4 py-2 border text-center">
                        {isPredefined || isPrimary ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">Protected</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2 border text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startEdit(g.group_id!)}
                            className="text-xs px-2 py-1 rounded border border-zinc-300 hover:bg-zinc-100 transition-colors"
                          >
                            Edit
                          </button>
                          {!isPredefined && !isPrimary && (
                            <button
                              onClick={() => handleDelete(g)}
                              className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No groups found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-6 flex flex-col gap-6 max-w-4xl">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
              <div className="border rounded overflow-hidden">
                <Row label="Name" required>
                  <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="Group name" />
                </Row>
                <Row label="Alias">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="Short name (optional)" />
                </Row>
                <Row label="Under (Parent Group)">
                  <select className={selectCls} value={form.parent_group_id || ""} onChange={setField("parent_group_id")}>
                    <option value="">— Primary —</option>
                    {groups.filter(g => g.group_id !== editingId).map(g => (
                      <option key={g.group_id} value={g.group_id}>{g.name}</option>
                    ))}
                  </select>
                </Row>
                <Row label="Nature">
                  <select className={selectCls} value={form.nature || "Assets"} onChange={setField("nature")}>
                    {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </Row>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Behaviour</div>
              <div className="border rounded overflow-hidden">
                <Row label="Allocation Method">
                  <select className={selectCls} value={form.allocation_method || "Average Cost"} onChange={setField("allocation_method")}>
                    {ALLOC_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Row>
                <Row label="Sort Order">
                  <input className={inputCls} type="number" value={form.sort_order ?? 0} onChange={setNumber("sort_order")} />
                </Row>
                <Row label="Display Order">
                  <input className={inputCls} type="number" value={form.display_order ?? 0} onChange={setNumber("display_order")} />
                </Row>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Options</div>
              <div className="border rounded overflow-hidden px-4 py-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.affect_gross_profit} onChange={setToggle("affect_gross_profit")} className="rounded" />
                  Affect Gross Profit
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.behaves_like_subledger} onChange={setToggle("behaves_like_subledger")} className="rounded" />
                  Behaves like Sub-ledger
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.show_net_debit_credit} onChange={setToggle("show_net_debit_credit")} className="rounded" />
                  Show Net Debit/Credit
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.used_for_calculation} onChange={setToggle("used_for_calculation")} className="rounded" />
                  Used for Calculation
                </label>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">GST Details</div>
              <div className="border rounded overflow-hidden">
                <Row label="GST Rate (%)">
                  <input className={inputCls} type="number" step="0.01" min="0" max="100" value={form.gst_rate ?? ""} onChange={setNumber("gst_rate")} placeholder="0" />
                </Row>
                <Row label="CGST Rate (%)">
                  <input className={inputCls} type="number" step="0.01" min="0" max="100" value={form.cgst_rate ?? ""} onChange={setNumber("cgst_rate")} placeholder="0" />
                </Row>
                <Row label="SGST Rate (%)">
                  <input className={inputCls} type="number" step="0.01" min="0" max="100" value={form.sgst_rate ?? ""} onChange={setNumber("sgst_rate")} placeholder="0" />
                </Row>
                <Row label="IGST Rate (%)">
                  <input className={inputCls} type="number" step="0.01" min="0" max="100" value={form.igst_rate ?? ""} onChange={setNumber("igst_rate")} placeholder="0" />
                </Row>
                <Row label="HSN / SAC Code">
                  <input className={inputCls} value={form.hsn_sac_code || ""} onChange={setField("hsn_sac_code")} placeholder="HSN / SAC Code" />
                </Row>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setMode("list"); setEditingId(null); }}
                className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? "Saving..." : (mode === "edit" ? "Update" : "Create")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
