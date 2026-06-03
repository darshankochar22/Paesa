import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type { StockGroupType } from "@/types/api";


const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm placeholder:text-zinc-300";
const selectCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm cursor-pointer";

function Row({ label, required, children, indent }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-center min-h-[26px] ${indent ? "pl-4" : ""}`}>
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1 font-sans">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2 shrink-0">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}


function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1 text-xs font-semibold text-zinc-600 select-none border-b border-zinc-200 pb-0.5">
      {title}
    </div>
  );
}

function SubSectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center min-h-[26px] pl-2">
      <span className="text-sm text-zinc-500 italic">{title}</span>
    </div>
  );
}

// ── Group side panel ───────────────────────────────────────────────────────────
function SidePanel({
  title, items, selected, onSelect, onClose,
}: {
  title: string;
  items: { id: string | number; label: string }[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-0 right-0 h-full w-64 bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold text-zinc-600 tracking-wide uppercase font-sans">{title}</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-sm font-bold">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Primary option always first */}
        <div
          className={`px-3 py-2 text-xs cursor-pointer border-b border-zinc-100 italic ${selected === "" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-50"}`}
          onClick={() => { onSelect(""); onClose(); }}
        >
          Primary
        </div>
        {items.map(item => (
          <div
            key={item.id}
            className={`px-3 py-2 text-xs cursor-pointer border-b border-zinc-100 ${selected === String(item.id) ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={() => { onSelect(String(item.id)); onClose(); }}
          >
            {item.label}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-zinc-400 italic">No groups found</div>
        )}
      </div>
    </div>
  );
}

// ── Selection screen (shown before a group is chosen) ─────────────────────────
function SelectionPanel({
  groups, onSelect, onCancel, onCreate,
}: {
  groups: StockGroupType[];
  onSelect: (g: StockGroupType) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); onCreate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onCreate]);

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "name", label: "Group Name", span: "col-span-8",
      render: (r: StockGroupType) => <span className="font-bold text-zinc-950 uppercase">{r.name}</span>,
    },
    {
      key: "alias", label: "Alias", span: "col-span-4",
      render: (r: StockGroupType) => <span className="text-zinc-500">{r.alias || "—"}</span>,
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Group", onClick: onCreate },
    { key: "Esc",   label: "Quit",         onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Stock Group" subtitle="Select Group to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search groups by name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: StockGroupType) => r.sg_id}
            onRowClick={onSelect}
            emptyMessage="No stock groups found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Form state ─────────────────────────────────────────────────────────────────
interface FormData {
  name: string;
  alias: string;
  parent_group_id: string;
  should_quantities_be_added: string;
  // HSN/SAC
  hsn_sac_details: string;     // UI toggle: "as_per_company" | "specify"
  hsn_sac_code: string;
  hsn_sac_description: string;
  // GST
  gst_rate_details: string;    // UI toggle: "as_per_company" | "specify"
  taxability_type: string;
  gst_rate: string;
  cgst_rate: string;
  sgst_rate: string;
}

// Derive UI toggles from saved DB values
function buildForm(g: StockGroupType): FormData {
  const hasHsn = !!(g.hsn_sac_code || g.hsn_sac_description);
  const hasGst = !!(g.gst_rate && Number(g.gst_rate) > 0);

  return {
    name:                       g.name ?? "",
    alias:                      g.alias ?? "",
    parent_group_id:            g.parent_group_id ? String(g.parent_group_id) : "",
    should_quantities_be_added: String(g.should_quantities_be_added ?? 0),
    hsn_sac_details:            hasHsn ? "specify" : "as_per_company",
    hsn_sac_code:               g.hsn_sac_code ?? "",
    hsn_sac_description:        g.hsn_sac_description ?? "",
    gst_rate_details:           hasGst ? "specify" : "as_per_company",
    taxability_type:            g.taxability_type ?? "as_per_company",
    gst_rate:                   String(g.gst_rate ?? 0),
    cgst_rate:                  String(g.cgst_rate ?? 0),
    sgst_rate:                  String(g.sgst_rate ?? 0),
  };
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StockGroupAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [stockGroups, setStockGroups]     = useState<StockGroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<StockGroupType | null>(null);
  const [form, setForm]                   = useState<FormData | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState<string | null>(null);
  const [showPanel, setShowPanel]         = useState(false);

  // Load all groups on mount
  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
  }, [selectedCompany]);

  const handleSelectGroup = (g: StockGroupType) => {
    setSelectedGroup(g);
    setForm(buildForm(g));
    setError(null);
    setSuccess(null);
  };

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  // Auto-split GST into CGST + SGST
  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val  = e.target.value;
    const half = val === "" ? "0" : String(parseFloat((parseFloat(val) / 2).toFixed(2)));
    setForm(f => f ? { ...f, gst_rate: val, cgst_rate: half, sgst_rate: half } : f);
  };

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    const gst = Number(form.gst_rate);
    if (gst < 0 || gst > 100) return "GST rate must be between 0 and 100.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedGroup) return;
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true); setError(null);
    try {
      const totalGst = parseFloat(form.gst_rate) || 0;
      const halfGst  = parseFloat((totalGst / 2).toFixed(2));

      const result = await window.api.stockGroup.update({
        sg_id:                      selectedGroup.sg_id,
        company_id:                 selectedCompany!.company_id,
        name:                       form.name.trim(),
        alias:                      form.alias.trim() || null,
        parent_group_id:            form.parent_group_id ? Number(form.parent_group_id) : null,
        should_quantities_be_added: Number(form.should_quantities_be_added),
        // HSN/SAC — clear when toggled back to "as per company"
        hsn_sac_code:               form.hsn_sac_details === "specify" ? form.hsn_sac_code.trim() || null : null,
        hsn_sac_description:        form.hsn_sac_details === "specify" ? form.hsn_sac_description.trim() || null : null,
        // GST — clear when toggled back to "as per company"
        gst_rate:                   form.gst_rate_details === "specify" ? totalGst : 0,
        cgst_rate:                  form.gst_rate_details === "specify" ? halfGst  : 0,
        sgst_rate:                  form.gst_rate_details === "specify" ? halfGst  : 0,
        // taxability_type stored in its own column
        taxability_type:            form.taxability_type !== "as_per_company" ? form.taxability_type : null,
        statutory_details:          null,
      });

      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);
        setSuccess(`Stock Group "${form.name}" updated.`);
        setTimeout(() => {
          setSuccess(null);
          setSelectedGroup(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to update stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedGroup, selectedCompany]);

  const handleDelete = useCallback(async () => {
    if (!selectedGroup) return;
    if (!window.confirm(`Delete "${selectedGroup.name}"? This cannot be undone.`)) return;

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockGroup.delete(selectedGroup.sg_id);
      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);
        setSelectedGroup(null);
        setForm(null);
      } else {
        setError(result.error || "Failed to delete stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedGroup, selectedCompany]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPanel) { setShowPanel(false); return; }
        if (selectedGroup) { setSelectedGroup(null); setForm(null); return; }
        navigate("/master/alter");
      }
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (selectedGroup) setShowPanel(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, showPanel, selectedGroup]);

  // ── Selection screen ─────────────────────────────────────────────────────────
  if (!selectedGroup || !form) {
    return (
      <SelectionPanel
        groups={stockGroups.filter(g => !g.is_predefined)}
        onSelect={handleSelectGroup}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/stock-group")}
      />
    );
  }

  // ── Derived labels ────────────────────────────────────────────────────────────
  const underOptions = stockGroups.filter(g => String(g.sg_id) !== String(selectedGroup.sg_id));

  const selectedUnderLabel = form.parent_group_id
    ? stockGroups.find(g => String(g.sg_id) === form.parent_group_id)?.name ?? "Primary"
    : "Primary";

  const hsnSourceLabel = form.hsn_sac_details === "as_per_company" ? "Not Available" : "Specified Here";
  const gstSourceLabel = form.gst_rate_details === "as_per_company" ? "Not Available" : "Specified Here";

  const alterActions = [
    { key: "Alt+G", label: "Select Under", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept",       onClick: handleSubmit },
    { key: "Alt+D", label: "Delete",       onClick: handleDelete },
    { key: "Esc",   label: "Back",         onClick: () => { setSelectedGroup(null); setForm(null); } },
  ];

  // ── Edit form ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Stock Group Alteration: ${selectedGroup.name}`} subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* ── Form area ── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 max-w-2xl bg-white">

          {/* Basic */}
          <Row label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Stock group name" />
          </Row>
          <Row label="(alias)">
            <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
          </Row>

          {/* Under — opens side panel */}
          <div className="flex items-center min-h-[26px]">
            <span className="w-56 text-sm text-zinc-400 shrink-0 py-1 font-sans">Under</span>
            <span className="text-zinc-600 mr-2 shrink-0">:</span>
            <button
              type="button"
              onClick={() => setShowPanel(true)}
              className="text-sm py-0.5 px-1 bg-transparent outline-none uppercase font-bold text-zinc-900 tracking-wide hover:text-black transition-colors"
            >
              {selectedUnderLabel}
            </button>
          </div>

          <Row label="Should quantities of items be added">
            <select className={selectCls} value={form.should_quantities_be_added} onChange={set("should_quantities_be_added")}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Row>

          {/* ── Statutory Details ── */}
          <SectionHeader title="Statutory Details" />

          <SubSectionLabel title="HSN/SAC & Related Details" />

          <Row label="HSN/SAC Details" indent>
            <select className={selectCls} value={form.hsn_sac_details} onChange={set("hsn_sac_details")}>
              <option value="as_per_company">As per Company/Stock Group</option>
              <option value="specify">Specify Here</option>
            </select>
          </Row>

          <Row label="Source of details" indent>
            <span className="text-sm text-zinc-400 px-1">{hsnSourceLabel}</span>
          </Row>

          {form.hsn_sac_details === "specify" && (
            <>
              <Row label="HSN/SAC" indent>
                <input className={inputCls} value={form.hsn_sac_code} onChange={set("hsn_sac_code")} placeholder="e.g. 1001" />
              </Row>
              <Row label="Description" indent>
                <input className={inputCls} value={form.hsn_sac_description} onChange={set("hsn_sac_description")} placeholder="HSN description (optional)" />
              </Row>
            </>
          )}

          <SubSectionLabel title="GST Rate & Related Details" />

          <Row label="GST Rate Details" indent>
            <select className={selectCls} value={form.gst_rate_details} onChange={set("gst_rate_details")}>
              <option value="as_per_company">As per Company/Stock Group</option>
              <option value="specify">Specify Here</option>
            </select>
          </Row>

          <Row label="Source of details" indent>
            <span className="text-sm text-zinc-400 px-1">{gstSourceLabel}</span>
          </Row>

          <Row label="Taxability Type" indent>
            <select className={selectCls} value={form.taxability_type} onChange={set("taxability_type")}>
              <option value="as_per_company">As per Company/Stock Group</option>
              <option value="Taxable">Taxable</option>
              <option value="Exempt">Exempt</option>
              <option value="Nil Rated">Nil Rated</option>
              <option value="Non-GST">Non-GST</option>
            </select>
          </Row>

          {form.gst_rate_details === "specify" && (
            <>
              <Row label="GST Rate (%)" indent>
                <div className="flex items-center gap-1">
                  <input
                    className={inputCls}
                    style={{ width: "60px" }}
                    type="number" min="0" max="100" step="0.01"
                    value={form.gst_rate}
                    onChange={handleGstChange}
                  />
                  <span className="text-sm text-zinc-400">%</span>
                </div>
              </Row>
              <Row label="CGST Rate (%)" indent>
                <div className="flex items-center gap-1">
                  <input
                    className={inputCls}
                    style={{ width: "60px" }}
                    type="number" min="0" max="100" step="0.01"
                    value={form.cgst_rate}
                    onChange={set("cgst_rate")}
                  />
                  <span className="text-sm text-zinc-400">%</span>
                </div>
              </Row>
              <Row label="SGST Rate (%)" indent>
                <div className="flex items-center gap-1">
                  <input
                    className={inputCls}
                    style={{ width: "60px" }}
                    type="number" min="0" max="100" step="0.01"
                    value={form.sgst_rate}
                    onChange={set("sgst_rate")}
                  />
                  <span className="text-sm text-zinc-400">%</span>
                </div>
              </Row>
            </>
          )}

        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => { setSelectedGroup(null); setForm(null); }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>

      {/* Under side panel */}
      {showPanel && (
        <SidePanel
          title="Stock Groups"
          items={underOptions.map(g => ({ id: g.sg_id, label: g.name }))}
          selected={form.parent_group_id}
          onSelect={val => setForm(f => f ? { ...f, parent_group_id: val } : f)}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}