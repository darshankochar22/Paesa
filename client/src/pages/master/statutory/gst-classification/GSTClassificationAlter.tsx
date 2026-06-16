import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";
import { useGSTClassificationForm } from "./hooks/useGSTClassificationForm";
import GSTClassificationFormFields from "./components/GSTClassificationFormFields";
import GSTClassificationSelectionPanel from "./components/GSTClassificationSelectionPanel";

export default function GSTClassificationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [activeField, setActiveField] = useState<string>("name");
  const [showAccept, setShowAccept] = useState(false);

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    classifications,
    selectedClass,
    setField,
    addSlabRow,
    updateSlabRow,
    removeSlabRow,
    handleSubmit,
    handleDelete,
    handleSelectClass,
    handleBack,
  } = useGSTClassificationForm({ mode: "alter" });

  useEffect(() => {
    if (showAccept) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowAccept(false);
          handleSubmit();
        } else if (key === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAccept(false);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedClass) {
          handleBack();
        } else {
          navigate("/master/alter");
        }
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAccept(true);
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedClass, handleBack, showAccept]);

  if (!selectedClass) {
    return (
      <GSTClassificationSelectionPanel
        classifications={classifications}
        onSelect={handleSelectClass}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/gst-classification")}
      />
    );
  }

  const isPredefined = !!selectedClass.is_predefined;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: () => setShowAccept(true) }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none font-mono">
      <PageTitleBar
        title={`GST Classification Alteration: ${selectedClass.name}`}
        subtitle={selectedCompany?.name}
      />

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
      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined GST classifications cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <GSTClassificationFormFields
          form={form}
          setField={setField}
          addSlabRow={addSlabRow}
          updateSlabRow={updateSlabRow}
          removeSlabRow={removeSlabRow}
          isPredefined={isPredefined}
          activeField={activeField}
          setActiveField={setActiveField}
          onSubmitPrompt={() => setShowAccept(true)}
        />
        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        {!isPredefined ? (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
          >
            Delete
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          {!isPredefined && (
            <button
              onClick={() => setShowAccept(true)}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
            >
              {loading ? "Saving..." : "Accept"}
            </button>
          )}
        </div>
      </div>

      {showAccept && (
        <div className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in">
          <h4 className="font-bold text-zinc-900 text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                handleSubmit();
              }}
              disabled={loading}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}