import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import GroupTree from "@/components/GroupTree";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import BankDetailsPopup from "./components/BankDetailsPopup";
import type { GroupType } from "@/types/api";
import { useCompany } from "@/context/CompanyContext";
import { useLedgerForm } from "./hooks/useLedgerForm";

// Modular UI Panel Components
import LedgerMailingPanel from "./components/LedgerMailingPanel";
import LedgerTaxPanel from "./components/LedgerTaxPanel";
import LedgerRoundingPanel from "./components/LedgerRoundingPanel";
import LedgerBillwisePanel from "./components/LedgerBillwisePanel";
import LedgerBankingPanel from "./components/LedgerBankingPanel";
import LedgerBankDetailsForm from "./components/LedgerBankDetailsForm";
import LedgerListPanel from "./components/LedgerListPanel";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function LedgerAlter() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    form,
    setForm,
    bankForm,
    setBankForm,
    statutoryForm,
    setStatutoryForm,
    provideBank,
    showBankPopup,
    setShowBankPopup,
    showGroupPanel,
    setShowGroupPanel,
    showLedgerPanel,
    setShowLedgerPanel,
    groupTree,
    ledgers,
    loading,
    saving,
    error,
    setError,
    success,
    setSuccess,
    selectedLedgerId,
    selectedGroup,
    groupLineage,
    fyLabel,
    setField,
    setNumber,
    setBankField,
    setBankNumber,
    setStatutoryField,
    setStatutoryNumber,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handleSubmit,
    loadLedger,
  } = useLedgerForm({ mode: "alter" });

  // Load from router navigation state (e.g. from COA page edit buttons)
  useEffect(() => {
    const routeLedgerId = location.state?.ledgerId;
    if (routeLedgerId && routeLedgerId !== selectedLedgerId) {
      loadLedger(routeLedgerId);
    }
  }, [location.state?.ledgerId, selectedLedgerId]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBankPopup) return;
        if (showLedgerPanel) { e.preventDefault(); setShowLedgerPanel(false); return; }
        if (showGroupPanel) { e.preventDefault(); setShowGroupPanel(false); return; }
        e.preventDefault();
        navigate("/master/alter");
      }
      if (e.altKey && (e.key === "a" || e.key === "A") && !showBankPopup) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && (e.key === "l" || e.key === "L") && !showBankPopup) {
        e.preventDefault();
        setShowLedgerPanel((prev) => !prev);
        setShowGroupPanel(false);
      }
      if (e.altKey && (e.key === "g" || e.key === "G") && !showBankPopup && selectedLedgerId) {
        e.preventDefault();
        setShowGroupPanel((prev) => !prev);
        setShowLedgerPanel(false);
      }
      if (e.altKey && (e.key === "c" || e.key === "C") && !showBankPopup) {
        e.preventDefault();
        navigate("/master/create/ledger");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, showBankPopup, showGroupPanel, showLedgerPanel, navigate, selectedLedgerId, setShowLedgerPanel, setShowGroupPanel]);

  const ledgerAlterActions = [
    { key: "Alt+L", label: "Select Ledger", onClick: () => { setShowLedgerPanel((prev) => !prev); setShowGroupPanel(false); } },
    { key: "Alt+G", label: "Select Group", disabled: !selectedLedgerId, onClick: () => { setShowGroupPanel((prev) => !prev); setShowLedgerPanel(false); } },
    { key: "Alt+A", label: "Accept", disabled: !selectedLedgerId, onClick: handleSubmit },
    { key: "Alt+C", label: "Create Ledger", onClick: () => navigate("/master/create/ledger") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/alter") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ""}
          bankForm={bankForm}
          setBankForm={setBankForm}
          onClose={handleBankClose}
          onAccept={handleBankAccept}
          isOD={groupLineage.isOD}
        />
      )}

      <PageTitleBar title="Ledger Alteration" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* Left column: Name / Group / Bank (if bank group) / Opening Balance */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            {/* Ledger selector row */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group mb-2 border border-zinc-200 bg-zinc-50/30"
              onClick={() => { setShowLedgerPanel((v) => !v); setShowGroupPanel(false); }}
            >
              <span className="w-16 text-sm shrink-0 font-medium text-zinc-500">Ledger</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                {selectedLedgerId
                  ? ledgers.find((l) => l.ledger_id === selectedLedgerId)?.name ?? "—"
                  : <span className="text-zinc-400 italic">Select ledger to alter…</span>}
              </span>
            </div>

            {selectedLedgerId && (
              <>
                <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
                  <input
                    autoFocus
                    className={inputCls}
                    value={form.name || ""}
                    onChange={setField("name")}
                  />
                </FormRow>
                <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
                </FormRow>
              </>
            )}
          </div>

          {selectedLedgerId && (
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
              <div
                className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group"
                onClick={() => { setShowGroupPanel((v) => !v); setShowLedgerPanel(false); }}
              >
                <span className="w-16 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">Under</span>
                <span className="text-zinc-400 mr-2 shrink-0">:</span>
                <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                  {selectedGroup?.name || "—"}
                </span>
                {groupLineage.primaryGroupName && groupLineage.primaryGroupName !== selectedGroup?.name && (
                  <span className="text-xs text-zinc-400 ml-2 font-normal">(Group: {groupLineage.primaryGroupName})</span>
                )}
              </div>
            </div>
          )}

          {/* Bank Account Details Form (inline for bank groups) */}
          {selectedLedgerId && (
            <LedgerBankDetailsForm
              bankForm={bankForm}
              setBankForm={setBankForm}
              setBankField={setBankField}
              setBankNumber={setBankNumber}
              groupLineage={groupLineage}
            />
          )}

          <div className="flex-1" />

          {selectedLedgerId ? (
            <div className="border-t border-zinc-200 bg-zinc-50/50 p-3 flex items-center justify-center gap-2">
              <span className="text-sm font-semibold text-zinc-600">Opening Balance</span>
              <span className="text-sm text-zinc-500">( on {fyLabel} ) :</span>
              <input
                type="number"
                step="0.01"
                className="w-36 border border-zinc-300 rounded text-sm text-right px-2 py-1 outline-none focus:border-zinc-800 transition-all"
                value={form.opening_balance ?? 0}
                onChange={setNumber("opening_balance")}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm italic select-none">
              Click &ldquo;Ledger&rdquo; above to select a ledger to alter.
            </div>
          )}
        </div>

        {/* Right column: detail panels — always shown when selected */}
        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          {selectedLedgerId ? (
            <>
              {/* Opening balance summary box */}
              <div className="p-3 flex justify-end">
                <div className="w-44 border border-zinc-200 rounded shrink-0 bg-white shadow-sm overflow-hidden">
                  <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
                  <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800">
                    {Number(form.opening_balance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Ledger rounding configuration panel */}
              <LedgerRoundingPanel
                form={form}
                setForm={setForm}
                setField={setField}
                setNumber={setNumber}
                groupLineage={groupLineage}
              />

              {/* Tax registration and statutory GST configuration details */}
              <LedgerTaxPanel
                form={form}
                setField={setField}
                statutoryForm={statutoryForm}
                setStatutoryField={setStatutoryField}
                setStatutoryNumber={setStatutoryNumber}
                setStatutoryForm={setStatutoryForm}
                groupLineage={groupLineage}
              />

              {/* Debtor/Creditor bill-wise details panel */}
              <LedgerBillwisePanel
                form={form}
                setForm={setForm}
                setNumber={setNumber}
                groupLineage={groupLineage}
              />

              {/* Cost Centre Details */}
              <div className="p-3 border-t border-zinc-100 bg-white">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Cost Centre Details</div>
                <FormRow label="Cost Centres are applicable" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <select
                    className="bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded"
                    value={form.allow_cost_centres ? "Yes" : "No"}
                    onChange={(e) => setForm((f: any) => ({ ...f, allow_cost_centres: e.target.value === "Yes" ? 1 : 0 }))}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
              </div>

              {/* Mailing details panel */}
              <LedgerMailingPanel
                form={form}
                setField={setField}
                groupLineage={groupLineage}
              />

              {/* Banking config and preview panel */}
              <LedgerBankingPanel
                provideBank={provideBank}
                handleProvideBankChange={handleProvideBankChange}
                bankForm={bankForm}
                showBankPopup={showBankPopup}
                setShowBankPopup={setShowBankPopup}
                groupLineage={groupLineage}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-300 text-sm select-none italic">
              No ledger selected
            </div>
          )}
        </div>

        {/* Ledger list panel */}
        {showLedgerPanel && (
          <LedgerListPanel
            ledgers={ledgers}
            selectedId={selectedLedgerId}
            onSelect={(l) => loadLedger(l.ledger_id!)}
            onClose={() => setShowLedgerPanel(false)}
          />
        )}

        {/* Group panel */}
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center select-none">
              <span>List of Groups</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowGroupPanel(false); navigate("/master/create/group"); }}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                >
                  + Create
                </button>
                <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GroupTree
                tree={groupTree}
                selectedId={form.group_id as number}
                onSelect={(group: GroupType) => {
                  setForm((prev: any) => ({ ...prev, group_id: group.group_id }));
                  setShowGroupPanel(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Actions panel */}
        <RightActionPanel actions={ledgerAlterActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <Link to="/master/alter" className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </Link>
        {selectedLedgerId && (
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="text-sm px-6 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 duration-150"
          >
            {saving ? "Saving..." : loading ? "Loading..." : "Update"}
          </button>
        )}
      </div>
    </div>
  );
}