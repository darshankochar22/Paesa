import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";
import { useTCSNatureOfGoodsForm } from "./hooks/useTCSNatureOfGoodsForm";
import TCSNatureOfGoodsFormFields from "./components/TCSNatureOfGoodsFormFields";
import TCSNatureOfGoodsSelectionPanel from "./components/TCSNatureOfGoodsSelectionPanel";

export default function TCSNatureOfGoodsAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [showAccept, setShowAccept] = useState(false);

  const {
    form,
    setForm,
    loading,
    error,
    setError,
    success,
    setSuccess,
    tcsList,
    selectedTcs,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTcs,
    handleBack,
  } = useTCSNatureOfGoodsForm({ mode: "alter" });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showAccept) {
        const k = e.key.toLowerCase();
        if (k === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowAccept(false);
          handleSubmit();
        } else if (k === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedTcs) {
          handleBack();
        } else {
          navigate("/master/alter");
        }
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (selectedTcs && !selectedTcs.is_predefined) {
          setShowAccept(true);
        }
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedTcs && !selectedTcs.is_predefined) {
          handleDelete();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedTcs, handleBack, showAccept]);

  if (!selectedTcs) {
    return (
      <TCSNatureOfGoodsSelectionPanel
        tcsList={tcsList}
        onSelect={handleSelectTcs}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/tcs-nature-of-goods")}
      />
    );
  }

  const isPredefined = !!selectedTcs.is_predefined;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: () => setShowAccept(true) }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none font-mono text-[11px] text-zinc-950">
      <PageTitleBar
        title={`TCS Nature of Goods Alteration: ${selectedTcs.name}`}
        subtitle={selectedCompany?.name}
      />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 z-50">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 z-50">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-150 text-zinc-700 text-xs shrink-0 select-none font-bold">
          ℹ️ Predefined TCS Nature of Goods cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative">
        
        {/* Mock Gateway of Tally background */}
        <div className="absolute inset-0 flex p-8 opacity-20 select-none pointer-events-none text-zinc-500">
          <div className="w-80 border-r border-zinc-300 pr-6 space-y-4">
            <div className="text-sm font-bold border-b border-zinc-300 pb-1">Gateway of Tally</div>
            <div className="space-y-1 text-xs">
              <div>Masters</div>
              <div className="pl-4">Create</div>
              <div className="pl-4">Alter</div>
              <div className="pl-4">Chart of Accounts</div>
              <div className="mt-2">Transactions</div>
              <div className="pl-4">Vouchers</div>
              <div className="pl-4">Day Book</div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex min-h-0 relative z-10">
          <TCSNatureOfGoodsFormFields
            form={form}
            setForm={setForm}
            setField={setField}
            onSubmitPrompt={() => {
              if (!isPredefined) {
                setShowAccept(true);
              }
            }}
            isPredefined={isPredefined}
            mode="alter"
          />
        </div>

        <RightActionPanel actions={alterActions} className="h-full z-20" />
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

      {/* Footer bar */}
      <div className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-sans flex justify-between select-none shrink-0 z-30 font-mono">
        <div className="flex gap-4">
          {!isPredefined && <span>Alt+A: Accept</span>}
          {!isPredefined && <span>Alt+D: Delete</span>}
          <span>Esc: Back</span>
        </div>
      </div>
    </div>
  );
}
