import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import type { GodownType } from "../../../types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b last:border-0 min-h-[32px]">
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer";

interface FormData {
  name: string;
  alias: string;
  parent_godown_id: string;
  allow_storage_of_materials: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_godown_id: "",
  allow_storage_of_materials: "1",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function GodownCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.godown.getAll(company_id).then(r => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
  }, [selectedCompany]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.pincode && !/^\d{0,6}$/.test(form.pincode)) return "Pincode must be numeric (max 6 digits).";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_godown_id: form.parent_godown_id ? Number(form.parent_godown_id) : undefined,
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
      });

      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);

        setSuccess(`Godown "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/master/godown");
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Create Godown</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        {/* General */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <Row label="Name" required>
            <input
              autoFocus
              className={inputCls}
              value={form.name}
              onChange={set("name")}
              placeholder="Godown / location name"
            />
          </Row>
          <Row label="Alias">
            <input
              className={inputCls}
              value={form.alias}
              onChange={set("alias")}
              placeholder="Short name (optional)"
            />
          </Row>
          <Row label="Under">
            <select className={selectCls} value={form.parent_godown_id} onChange={set("parent_godown_id")}>
              <option value="">Primary</option>
              {godowns.map(g => (
                <option key={g.godown_id} value={g.godown_id}>{g.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Allow Storage of Materials">
            <select className={selectCls} value={form.allow_storage_of_materials} onChange={set("allow_storage_of_materials")}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Row>
        </div>

        {/* Address */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Address</div>
          <Row label="Address">
            <input
              className={inputCls}
              value={form.address}
              onChange={set("address")}
              placeholder="Street / building (optional)"
            />
          </Row>
          <Row label="City">
            <input
              className={inputCls}
              value={form.city}
              onChange={set("city")}
              placeholder="City (optional)"
            />
          </Row>
          <Row label="State">
            <input
              className={inputCls}
              value={form.state}
              onChange={set("state")}
              placeholder="State (optional)"
            />
          </Row>
          <Row label="Pincode">
            <input
              className={inputCls}
              value={form.pincode}
              onChange={set("pincode")}
              placeholder="6-digit pincode (optional)"
              maxLength={6}
            />
          </Row>
        </div>

      </div>

      {/* Success */}
      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">
          ✓ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 flex justify-end gap-3 shrink-0">
        <button
          onClick={() => navigate("/master/create")}
          className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Accept"}
        </button>
      </div>

    </div>
  );
}