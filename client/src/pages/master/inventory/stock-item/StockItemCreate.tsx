import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, SideSelectionPanel } from "@/components/ui";
import type { StockGroupType, UnitType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

interface FormData {
  name: string;
  alias: string;
  group_id: string; // Under (default Primary "")
  unit_id: string;  // Units (default Not Applicable "")
  gst_applicable: "Not Applicable" | "Applicable";
  hsn_code: string;
  sac_code: string;
  gst_rate: string;
  cgst_rate: string;
  sgst_rate: string;
  igst_rate: string;
  type_of_supply: "Goods" | "Services";
  rate_of_duty: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  group_id: "",
  unit_id: "",
  gst_applicable: "Not Applicable",
  hsn_code: "",
  sac_code: "",
  gst_rate: "0",
  cgst_rate: "0",
  sgst_rate: "0",
  igst_rate: "0",
  type_of_supply: "Goods",
  rate_of_duty: "0",
};

export default function StockItemCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"group" | "unit" | null>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.unit.getAll(company_id).then(r => {
      if (r.success) setUnits(r.units ?? []);
    });
  }, [selectedCompany]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const half = val === "" ? "0" : String(parseFloat(val) / 2 || 0);
    setForm(f => ({ ...f, gst_rate: val, cgst_rate: half, sgst_rate: half, igst_rate: val }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.gst_applicable === "Applicable") {
      const rates = [form.gst_rate, form.cgst_rate, form.sgst_rate, form.igst_rate, form.rate_of_duty].map(Number);
      if (rates.some(v => v < 0)) return "GST rates cannot be negative.";
      if (rates.some(v => v > 100)) return "GST rates cannot exceed 100%.";
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        gst_applicable: form.gst_applicable,
        hsn_code: form.gst_applicable === "Applicable" ? (form.hsn_code.trim() || undefined) : undefined,
        sac_code: form.gst_applicable === "Applicable" ? (form.sac_code.trim() || undefined) : undefined,
        gst_rate: form.gst_applicable === "Applicable" ? (Number(form.gst_rate) || 0) : 0,
        cgst_rate: form.gst_applicable === "Applicable" ? (Number(form.cgst_rate) || 0) : 0,
        sgst_rate: form.gst_applicable === "Applicable" ? (Number(form.sgst_rate) || 0) : 0,
        igst_rate: form.gst_applicable === "Applicable" ? (Number(form.igst_rate) || 0) : 0,
        type_of_supply: form.gst_applicable === "Applicable" ? form.type_of_supply : "Goods",
        rate_of_duty: form.gst_applicable === "Applicable" ? (Number(form.rate_of_duty) || 0) : 0,
        opening_quantity: 0,
        opening_rate: 0,
        reorder_level: 0,
        reorder_quantity: 0,
        track_batches: 0,
        track_expiry: 0,
      });
      if (result.success) {
        setSuccess(`Stock Item "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activePanel) setActivePanel(null);
        else navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setActivePanel(activePanel === "group" ? null : "group");
      }
      if (e.altKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        setActivePanel(activePanel === "unit" ? null : "unit");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/stock-item");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, activePanel]);

  const selectedGroupLabel = form.group_id
    ? stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary"
    : "Primary";

  const selectedUnitLabel = form.unit_id
    ? units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable"
    : "Not Applicable";

  const itemActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setActivePanel(prev => prev === "group" ? null : "group") },
    { key: "Alt+U", label: "Select Unit", onClick: () => setActivePanel(prev => prev === "unit" ? null : "unit") },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Item", onClick: () => navigate("/master/alter/stock-item") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden">
      <PageTitleBar title="Stock Item Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left: form fields */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100 p-3 space-y-6 overflow-y-auto">
          <div className="max-w-2xl space-y-1">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">General</div>
            
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>
            
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>

            {/* Under */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm select-none"
              onClick={() => setActivePanel(activePanel === "group" ? null : "group")}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1 font-sans">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">{selectedGroupLabel}</span>
            </div>

            {/* Units */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm select-none"
              onClick={() => setActivePanel(activePanel === "unit" ? null : "unit")}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1 font-sans">Units</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">{selectedUnitLabel}</span>
            </div>
          </div>

          {/* Statutory Details */}
          <div className="max-w-2xl space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">Statutory Details</div>
            
            <FormRow label="Rate Of Duty" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={form.gst_applicable}
                onChange={setField("gst_applicable")}
              >
                <option value="Not Applicable">Not Applicable</option>
                <option value="Applicable">Applicable</option>
              </select>
            </FormRow>

            {form.gst_applicable === "Applicable" && (
              <div className="space-y-1 mt-2 border-l-2 border-zinc-100 pl-3">
                <FormRow label="HSN Code" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.hsn_code} onChange={setField("hsn_code")} placeholder="HSN (optional)" />
                </FormRow>
                
                <FormRow label="SAC Code" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.sac_code} onChange={setField("sac_code")} placeholder="SAC (optional)" />
                </FormRow>
                
                <FormRow label="GST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.gst_rate} onChange={handleGstChange} />
                </FormRow>
                
                <FormRow label="CGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.cgst_rate} onChange={setField("cgst_rate")} />
                </FormRow>
                
                <FormRow label="SGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.sgst_rate} onChange={setField("sgst_rate")} />
                </FormRow>
                
                <FormRow label="IGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.igst_rate} onChange={setField("igst_rate")} />
                </FormRow>
                
                <FormRow label="Type of Supply" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <select className={selectCls} value={form.type_of_supply} onChange={setField("type_of_supply")}>
                    <option value="Goods">Goods</option>
                    <option value="Services">Services</option>
                  </select>
                </FormRow>
                
                <FormRow label="Rate of Duty (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.rate_of_duty} onChange={setField("rate_of_duty")} />
                </FormRow>
              </div>
            )}
          </div>
        </div>

        {/* Side Panels */}
        {activePanel === "group" && (
          <SideSelectionPanel
            title="List of Groups"
            items={stockGroups.filter(g => g.name.toLowerCase() !== "primary").map(g => ({ id: g.sg_id, label: g.name }))}
            selected={form.group_id}
            onSelect={val => setForm(f => ({ ...f, group_id: val }))}
            onClose={() => setActivePanel(null)}
            showPrimary
          />
        )}
        {activePanel === "unit" && (
          <SideSelectionPanel
            title="List of Units"
            items={[
              { id: "create", label: "Create" }
            ]}
            selected={form.unit_id}
            onSelect={val => {
              if (val === "create") {
                navigate("/master/create/unit");
              } else {
                setForm(f => ({ ...f, unit_id: val }));
              }
            }}
            onClose={() => setActivePanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
          />
        )}

        <RightActionPanel actions={itemActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50 shrink-0">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}