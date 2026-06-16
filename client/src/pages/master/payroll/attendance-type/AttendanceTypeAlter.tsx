import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, MasterSelectionPanel, MasterFormFooter, AlertBanner } from "@/components/ui";
import { useMasterShortcuts } from "@/hooks/useMasterShortcuts";
import type { AttendanceTypeType, PayrollUnitType } from "@/types/entities/Payroll";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";
const ATTENDANCE_TYPES = ["Attendance / Leave with Pay", "Leave without Pay", "Production", "User Defined Calendar Type"];

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

export default function AttendanceTypeAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [types, setTypes] = useState<AttendanceTypeType[]>([]);
  const [units, setUnits] = useState<PayrollUnitType[]>([]);
  const [selectedType, setSelectedType] = useState<AttendanceTypeType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const [tRes, uRes] = await Promise.all([
      window.api.attendanceType.getAll(companyId),
      window.api.payrollUnit.getAll(companyId)
    ]);
    if (tRes.success) setTypes(tRes.attendanceTypes ?? []);
    if (uRes.success) setUnits(uRes.payrollUnits ?? []);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = (t: AttendanceTypeType) => {
    setSelectedType(t);
    setForm({
      name: t.name,
      alias: t.alias || "",
      type: t.type || "Attendance / Leave with Pay",
      unit_id: t.unit_id ? String(t.unit_id) : "",
      period: t.period || "Per Day",
      carry_forward: t.carry_forward ? String(t.carry_forward) : "0",
      encashment: t.encashment ? String(t.encashment) : "0",
      max_days: t.max_days ? String(t.max_days) : "0"
    });
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.typeId;
    if (preSelectId && types.length > 0) {
      const t = types.find(t => t.attendance_type_id === preSelectId);
      if (t) handleSelect(t);
    }
  }, [location.state, types]);

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => (f ? { ...f, [key]: e.target.value } : null));

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedType) return;
    if (selectedType.is_predefined) {
      setError("Predefined attendance types cannot be altered.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.attendanceType.update({
        attendance_type_id: selectedType.attendance_type_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        type: form.type,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        period: form.period,
        carry_forward: Number(form.carry_forward),
        encashment: Number(form.encashment),
        max_days: Number(form.max_days)
      });
      if (res.success) {
        setSuccess(`"${form.name}" updated successfully.`);
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelectedType(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to update attendance type.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedType, companyId, loadData]);

  const handleDelete = useCallback(async () => {
    if (!selectedType) return;
    if (selectedType.is_predefined) {
      setError("Predefined attendance types cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete "${selectedType.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.attendanceType.delete(selectedType.attendance_type_id!);
      if (res.success) {
        setSuccess("Attendance type deleted successfully.");
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelectedType(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to delete attendance type.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedType, loadData]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: handleDelete,
    onQuit: () => {
      if (selectedType) {
        setSelectedType(null);
        setForm(null);
      } else {
        navigate("/master/alter");
      }
    }
  });

  if (!selectedType || !form) {
    const columns = [
      {
        key: "name",
        label: "Name",
        span: "col-span-5",
        render: (r: AttendanceTypeType) => (
          <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
            {r.name}
            {!!r.is_predefined && (
              <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
                PREDEFINED
              </span>
            )}
          </span>
        )
      },
      {
        key: "type",
        label: "Type",
        span: "col-span-4",
        render: (r: AttendanceTypeType) => <span className="text-zinc-500">{r.type}</span>
      },
      {
        key: "period",
        label: "Period",
        span: "col-span-3",
        render: (r: AttendanceTypeType) => <span className="text-zinc-400">{r.period || "-"}</span>
      }
    ];

    return (
      <MasterSelectionPanel
        title="Alter Attendance Type"
        subtitle="Select Type to Alter"
        searchPlaceholder="Search types by name..."
        items={types}
        filterFn={(t, search) => t.name.toLowerCase().includes(search.toLowerCase())}
        columns={columns}
        onSelect={handleSelect}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/attendance-type")}
        createLabel="Create Type"
        rowKey={(r) => String(r.attendance_type_id)}
        emptyMessage="No attendance types found."
      />
    );
  }

  const isPredefined = !!selectedType.is_predefined;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: () => { setSelectedType(null); setForm(null); } }
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Alter Attendance Type: ${selectedType.name}`} subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />}

      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined attendance types cannot be altered or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-w-2xl bg-white border-r border-zinc-100">
          <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
            <input
              autoFocus={!isPredefined}
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.name}
              onChange={setField("name")}
            />
          </FormRow>
          <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.alias}
              onChange={setField("alias")}
            />
          </FormRow>
          <FormRow label="Under" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <span className="text-sm font-semibold text-zinc-800">Primary</span>
          </FormRow>
          <FormRow label="Attendance Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.type}
              onChange={setField("type")}
            >
              {ATTENDANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="Period" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.period}
              onChange={setField("period")}
            >
              <option value="Per Day">Per Day</option>
              <option value="Per Month">Per Month</option>
              <option value="Per Year">Per Year</option>
              <option value="Per Hour">Per Hour</option>
            </select>
          </FormRow>
          <FormRow label="Unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.unit_id}
              onChange={setField("unit_id")}
            >
              <option value="">Select</option>
              {units.map(u => <option key={u.payroll_unit_id} value={u.payroll_unit_id}>{u.name}</option>)}
            </select>
          </FormRow>
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={() => {
          setSelectedType(null);
          setForm(null);
        }}
        onSubmit={handleSubmit}
        onDelete={!isPredefined ? handleDelete : undefined}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
        disabled={isPredefined}
      />
    </div>
  );
}
