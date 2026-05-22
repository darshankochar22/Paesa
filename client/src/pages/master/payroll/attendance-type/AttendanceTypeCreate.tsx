import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar } from "@/components/ui";
import type { PayrollUnitType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface FormData {
  name: string;
  alias: string;
  type: string;
  unit_id: string;
  period: string;
  carry_forward: string;
  encashment: string;
  max_days: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  type: "Attendance / Leave with Pay",
  unit_id: "",
  period: "Per Day",
  carry_forward: "0",
  encashment: "0",
  max_days: "0",
};

const ATTENDANCE_TYPES = [
  "Attendance / Leave with Pay",
  "Leave without Pay",
  "Production",
  "User Defined Calendar Type",
];

export default function AttendanceTypeCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [units, setUnits] = useState<PayrollUnitType[]>([]);
  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    window.api.payrollUnit.getAll(companyId).then((res) => {
      if (res.success) setUnits(res.payrollUnits);
    });
  }, [companyId]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.attendanceType.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        type: form.type,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        period: form.period,
        carry_forward: Number(form.carry_forward),
        encashment: Number(form.encashment),
        max_days: Number(form.max_days),
      });
      if (result.success) {
        setSuccess(`Attendance Type "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create attendance type.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/create"); }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Attendance/Production Type Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>* {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>* {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Present" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>
            <FormRow label="Under" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <span className="text-sm font-semibold text-zinc-800">Primary</span>
            </FormRow>
            <FormRow label="Attendance Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.type} onChange={setField("type")}>
                {ATTENDANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Period" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.period} onChange={setField("period")}>
                <option value="Per Day">Per Day</option>
                <option value="Per Month">Per Month</option>
                <option value="Per Year">Per Year</option>
                <option value="Per Hour">Per Hour</option>
              </select>
            </FormRow>
            <FormRow label="Unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_id} onChange={setField("unit_id")}>
                <option value="">Select</option>
                {units.map(u => <option key={u.payroll_unit_id} value={u.payroll_unit_id}>{u.name}</option>)}
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">&larr; Back to Masters</button>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium">
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
