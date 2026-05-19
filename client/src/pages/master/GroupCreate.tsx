import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import GroupTree from "../../../components/GroupTree";
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

const NATURES = ["Assets", "Liabilities", "Income", "Expenses"];
const ALLOC_METHODS = ["Average Cost", "FIFO", "LIFO", "Weighted Average"];

export default function GroupCreate() {
  const { selectedCompany } = useCompany();
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<GroupType>>({
    name: "",
    alias: "",
    parent_group_id: undefined,
    is_primary: 0,
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

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await window.api.group.getTree(companyId);
        if (cancelled) return;
        if (res.success && res.tree) setGroupTree(res.tree ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleGroupSelect = (group: GroupType) => {
    setForm((f) => ({ ...f, parent_group_id: group.group_id }));
  };

  const setField = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setNumber = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setToggle = (key: keyof GroupType) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

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
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        is_primary: form.is_primary,
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

      const res = await window.api.group.create(payload);
      if (res.success) {
        setSuccess(`Group "${form.name}" created.`);
        setForm((f) => ({
          ...f,
          name: "",
          alias: "",
          affect_gross_profit: 0,
          behaves_like_subledger: 0,
          show_net_debit_credit: 0,
          used_for_calculation: 0,
          gst_rate: undefined,
          cgst_rate: undefined,
          sgst_rate: undefined,
          igst_rate: undefined,
          hsn_sac_code: "",
          statutory_details: "",
          sort_order: 0,
          display_order: 0,
        }));
        const treeRes = await window.api.group.getTree(companyId!);
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
      } else {
        setError(res.error || "Failed to create group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/master/create" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Masters
            </Link>
            <h1 className="text-lg font-semibold text-zinc-800">Create Group</h1>
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
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
            <div className="border rounded overflow-hidden">
              <Row label="Name" required>
                <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} placeholder="Group name" />
              </Row>
              <Row label="Alias">
                <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} placeholder="Short name (optional)" />
              </Row>
              <Row label="Nature">
                <select className={selectCls} value={form.nature || "Assets"} onChange={setField("nature")}>
                  {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Row>
              <div className="border-b last:border-0 min-h-[36px] flex items-center px-1 py-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.is_primary} onChange={setToggle("is_primary")} className="rounded" />
                  Is Primary
                </label>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Behaviour</div>
            <div className="border rounded overflow-hidden">
              <Row label="Allocation Method">
                <select className={selectCls} value={form.allocation_method || "Average Cost"} onChange={setField("allocation_method")}>
                  {ALLOC_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
              onClick={handleSubmit}
              disabled={loading}
              className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      <div className="w-72 border-l bg-zinc-50/50 flex flex-col">
        <div className="px-4 py-3 border-b text-sm font-medium text-zinc-600">
          Under Group
        </div>
        <div className="flex-1 overflow-y-auto">
          <GroupTree
            tree={groupTree}
            selectedId={form.parent_group_id as number}
            onSelect={handleGroupSelect}
          />
        </div>
      </div>
    </div>
  );
}
