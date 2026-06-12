import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";
import { useTDSNatureOfPaymentForm } from "./hooks/useTDSNatureOfPaymentForm";
import TDSNatureOfPaymentFormFields from "./components/TDSNatureOfPaymentFormFields";
import TDSNatureOfPaymentSelectionPanel from "./components/TDSNatureOfPaymentSelectionPanel";

export default function TDSNatureOfPaymentAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const {
    form,
    loading,
    error,
    setError,
    success,
    setSuccess,
    tdsList,
    selectedTds,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTds,
    handleBack,
  } = useTDSNatureOfPaymentForm({ mode: "alter" });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedTds) {
          handleBack();
        } else {
          navigate("/master/alter");
        }
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedTds, handleBack]);

  if (!selectedTds) {
    return (
      <TDSNatureOfPaymentSelectionPanel
        tdsList={tdsList}
        onSelect={handleSelectTds}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/tds-nature-of-payment")}
      />
    );
  }

  const isPredefined = selectedTds.is_predefined === 1;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none font-sans">
      <PageTitleBar
        title={`TDS Nature of Payment Alteration: ${selectedTds.name}`}
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
          ℹ️ Predefined TDS Nature of Payment cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <TDSNatureOfPaymentFormFields
          form={form}
          setField={setField}
          isPredefined={isPredefined}
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
              onClick={handleSubmit}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
            >
              {loading ? "Saving..." : "Accept"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
