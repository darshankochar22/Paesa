import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, FormRow, RightActionPanel } from "@/components/ui";
import { useTDSDetails } from "./hooks/useTDSDetails";

const selectCls = "bg-white border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none w-64 text-[11px] font-bold text-zinc-950 font-mono";
const inputCls = "bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none w-64 text-[11px] font-bold text-zinc-950 font-mono";

export default function TDSDetailsCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const {
    form,
    setField,
    loading,
    error,
    setError,
    success,
    setSuccess,
    saveDetails,
  } = useTDSDetails({
    companyId,
    onSaveSuccess: () => {
      setTimeout(() => navigate("/master/create"), 1000);
    },
  });

  const [showPersonModal, setShowPersonModal] = useState(false);

  // Focus tracking for Enter/Tab key traversal
  const formRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation between form elements
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPersonModal) {
          setShowPersonModal(false);
          setField("setAlterPersonResponsible", false);
        } else {
          navigate("/master/create");
        }
        return;
      }

      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        saveDetails();
        return;
      }
    },
    [showPersonModal, saveDetails, navigate, setField]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      const formEl = formRef.current;
      if (!formEl) return;

      const focusable = Array.from(
        formEl.querySelectorAll("input, select, button:not([disabled])")
      ) as HTMLElement[];

      const index = focusable.indexOf(e.target as HTMLElement);
      if (index >= 0 && index < focusable.length - 1) {
        focusable[index + 1].focus();
      } else {
        saveDetails();
      }
    }
  };

  const handlePersonModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPersonModal(false);
  };

  const handlePersonModalClose = () => {
    setShowPersonModal(false);
    setField("setAlterPersonResponsible", false);
  };

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: saveDetails },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="Company TDS Deductor Details" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-4 py-2 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        {/* Central Card Form */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 font-mono text-zinc-800 text-[11px]">
          <div ref={formRef} onKeyDown={handleFormKeyDown} className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6 space-y-4">
            
            {/* Header */}
            <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-4 tracking-wide text-zinc-900 uppercase">
              Company TDS Deductor Details
            </div>

            <div className="space-y-1">
              <FormRow label="TAN registration number" labelWidth="w-[340px]">
                <input
                  autoFocus
                  className={inputCls}
                  value={form.tanRegNumber}
                  onChange={(e) => setField("tanRegNumber", e.target.value)}
                  placeholder="e.g. TANR12345A"
                />
              </FormRow>

              <FormRow label="Tax deduction and collection Account Number (TAN)" labelWidth="w-[340px]">
                <input
                  className={inputCls}
                  value={form.tan}
                  onChange={(e) => setField("tan", e.target.value.toUpperCase())}
                  placeholder="e.g. BLRP01234D"
                  maxLength={10}
                />
              </FormRow>

              <FormRow label="Deductor type" labelWidth="w-[340px]">
                <select
                  className={selectCls}
                  value={form.deductorType}
                  onChange={(e) => setField("deductorType", e.target.value)}
                >
                  <option value="Company">Company</option>
                  <option value="Individual/HUF">Individual/HUF</option>
                </select>
              </FormRow>

              <FormRow label="Deductor branch/division" labelWidth="w-[340px]">
                <input
                  className={inputCls}
                  value={form.deductorBranch}
                  onChange={(e) => setField("deductorBranch", e.target.value)}
                  placeholder="e.g. Bangalore South"
                />
              </FormRow>

              <FormRow label="Set/alter details of person responsible" labelWidth="w-[340px]">
                <select
                  className={selectCls}
                  value={form.setAlterPersonResponsible ? "Yes" : "No"}
                  onChange={(e) => {
                    const val = e.target.value === "Yes";
                    setField("setAlterPersonResponsible", val);
                    if (val) {
                      setShowPersonModal(true);
                    }
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>

            {/* Rate & Exemption Details Divider */}
            <div className="text-center font-bold text-xs py-2 my-2 text-zinc-900 border-t border-zinc-100 tracking-wide uppercase">
              Rate & Exemption Details
            </div>

            <div className="space-y-1">
              <FormRow label="Ignore IT exemption limit for TDS deduction" labelWidth="w-[340px]">
                <select
                  className={selectCls}
                  value={form.ignoreItExemption ? "Yes" : "No"}
                  onChange={(e) => setField("ignoreItExemption", e.target.value === "Yes")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>

              <FormRow label="Activate TDS for stock items" labelWidth="w-[340px]">
                <select
                  className={selectCls}
                  value={form.activateTdsForItems ? "Yes" : "No"}
                  onChange={(e) => setField("activateTdsForItems", e.target.value === "Yes")}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />

        {/* Person Responsible Details Overlay Modal */}
        {showPersonModal && (
          <div className="fixed inset-0 bg-zinc-900/40 z-[9999] flex items-center justify-center backdrop-blur-[1px]">
            <form
              onSubmit={handlePersonModalSubmit}
              className="bg-white border border-zinc-400 w-[550px] shadow-2xl overflow-hidden flex flex-col font-mono text-[11px] text-zinc-950 animate-fade-in"
            >
              <div className="text-center font-bold text-xs pt-4 pb-2 border-b border-zinc-200 tracking-wide text-zinc-900">
                <span className="underline decoration-1 decoration-zinc-800 underline-offset-4">
                  Person Responsible Details
                </span>
              </div>

              <div className="p-4 space-y-3">
                <FormRow label="Name" labelWidth="w-40">
                  <input
                    autoFocus
                    className={inputCls}
                    value={form.personResponsibleName}
                    onChange={(e) => setField("personResponsibleName", e.target.value)}
                    required
                  />
                </FormRow>

                <FormRow label="Designation" labelWidth="w-40">
                  <input
                    className={inputCls}
                    value={form.personResponsibleDesignation}
                    onChange={(e) => setField("personResponsibleDesignation", e.target.value)}
                  />
                </FormRow>

                <FormRow label="PAN" labelWidth="w-40">
                  <input
                    className={inputCls}
                    value={form.personResponsiblePan}
                    onChange={(e) => setField("personResponsiblePan", e.target.value.toUpperCase())}
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                  />
                </FormRow>

                <FormRow label="Mobile / Phone" labelWidth="w-40">
                  <input
                    className={inputCls}
                    value={form.personResponsiblePhone}
                    onChange={(e) => setField("personResponsiblePhone", e.target.value)}
                  />
                </FormRow>

                <FormRow label="Email" labelWidth="w-40">
                  <input
                    type="email"
                    className={inputCls}
                    value={form.personResponsibleEmail}
                    onChange={(e) => setField("personResponsibleEmail", e.target.value)}
                  />
                </FormRow>
              </div>

              <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0 font-sans">
                <button
                  type="button"
                  onClick={handlePersonModalClose}
                  className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 shadow-sm transition-colors font-medium"
                >
                  Ok
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/create")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={saveDetails}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}