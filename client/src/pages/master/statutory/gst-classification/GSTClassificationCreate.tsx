import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";
import { useGSTClassificationForm } from "./hooks/useGSTClassificationForm";
import GSTClassificationFormFields from "./components/GSTClassificationFormFields";

export default function GSTClassificationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    setField,
    addSlabRow,
    updateSlabRow,
    removeSlabRow,
    handleSubmit,
  } = useGSTClassificationForm({ mode: "create" });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/create");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/gst-classification");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/gst-classification") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title="Create GST Classification" subtitle={selectedCompany?.name} />

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
        <GSTClassificationFormFields
          form={form}
          setField={setField}
          addSlabRow={addSlabRow}
          updateSlabRow={updateSlabRow}
          removeSlabRow={removeSlabRow}
        />
        <RightActionPanel actions={actions} className="h-full" />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-end bg-zinc-50 shrink-0">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/create")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? "Creating..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}