import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, FormRow, RightActionPanel } from "@/components/ui";
import { usePANDetails } from "./hooks/usePANDetails";

const inputCls = "bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none w-64 text-[11px] font-bold text-zinc-950 font-mono";

export default function PANDetailsCreate() {
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
  } = usePANDetails({
    companyId,
    onSaveSuccess: () => {
      setTimeout(() => navigate("/master/create"), 1000);
    },
  });

  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // Global keydown listeners for shortcuts (Esc to quit, Alt+A to Accept)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showAcceptPrompt) {
          setShowAcceptPrompt(false);
        } else {
          navigate("/master/create");
        }
        return;
      }

      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (showAcceptPrompt) {
          handleConfirmSave();
        } else {
          setShowAcceptPrompt(true);
        }
        return;
      }

      if (showAcceptPrompt) {
        const k = e.key.toLowerCase();
        if (k === "y" || e.key === "Enter") {
          e.preventDefault();
          handleConfirmSave();
        } else if (k === "n") {
          e.preventDefault();
          setShowAcceptPrompt(false);
        }
      }
    },
    [showAcceptPrompt, navigate]
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
        setShowAcceptPrompt(true);
      }
    }
  };

  const handleConfirmSave = async () => {
    setShowAcceptPrompt(false);
    await saveDetails();
  };

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: () => setShowAcceptPrompt(true) },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="PAN/CIN Details" subtitle={selectedCompany?.name} />

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
          <div ref={formRef} onKeyDown={handleFormKeyDown} className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6 space-y-4 relative mt-10">
            
            {/* Header */}
            <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-4 tracking-wide text-zinc-900 uppercase">
              PAN/CIN Details
            </div>

            <div className="space-y-2">
              <FormRow label="PAN/Income tax no." labelWidth="w-[300px]">
                <input
                  autoFocus
                  className={inputCls}
                  value={form.pan}
                  onChange={(e) => setField("pan", e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </FormRow>

              <FormRow label="Corporate Identity No. (CIN)" labelWidth="w-[300px]">
                <input
                  className={inputCls}
                  value={form.cin}
                  onChange={(e) => setField("cin", e.target.value.toUpperCase())}
                  placeholder="e.g. U12345KA2026PTC123456"
                  maxLength={21}
                />
              </FormRow>
            </div>

            {/* Accept Dialog Prompt */}
            {showAcceptPrompt && (
              <div className="absolute bottom-4 right-4 bg-white border-2 border-zinc-800 p-4 shadow-lg z-50 flex flex-col items-center min-w-[150px] animate-fade-in font-sans">
                <div className="text-xs font-bold text-zinc-800 mb-3">Accept?</div>
                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmSave}
                    className="px-3 py-1 bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 rounded shadow"
                  >
                    Yes (Y)
                  </button>
                  <button
                    onClick={() => setShowAcceptPrompt(false)}
                    className="px-3 py-1 border border-zinc-300 text-zinc-600 text-xs font-bold hover:bg-zinc-50 rounded"
                  >
                    No (N)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        <RightActionPanel actions={actions} />
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
            onClick={() => setShowAcceptPrompt(true)}
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
