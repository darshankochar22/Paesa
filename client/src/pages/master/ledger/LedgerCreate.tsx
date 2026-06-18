import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import GroupFlatList from "@/components/GroupFlatList";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import BankDetailsPopup from "./components/BankDetailsPopup";
import type { GroupType } from "@/types/api";
import {
  useLedgerForm,
  EMPTY_TDS,
  EMPTY_TCS,
  EMPTY_SERVICE_TAX,
  EMPTY_EXCISE,
  EMPTY_VAT,
} from "./hooks/useLedgerForm";
import LedgerMailingPanel from "./components/LedgerMailingPanel";
import LedgerTaxPanel from "./components/LedgerTaxPanel";
import LedgerRoundingPanel from "./components/LedgerRoundingPanel";
import LedgerBillwisePanel from "./components/LedgerBillwisePanel";
import LedgerBankingPanel from "./components/LedgerBankingPanel";
import LedgerBankDetailsForm from "./components/LedgerBankDetailsForm";
import InterestParametersModal from "./components/InterestParametersModal";
import OtherStatutoryTriggerPanel from "./components/OtherStatutoryTriggerPanel";
import OtherStatutoryModal from "./components/statutory/OtherStatutoryModal";
import { getOtherStatutoryConfig } from "@/config/ledgerStatutoryConfig";
import { getLedgerConfig } from "./config/LedgerConfig";
const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function LedgerCreate() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();

  const {
    form,
    setForm,
    bankForm,
    setBankForm,
    statutoryForm,
    setStatutoryForm,
    interestForm,
    setInterestForm,
    otherStatutory,
    setOtherStatutory,
    provideBank,
    showBankPopup,
    setShowBankPopup,
    showInterestPopup,
    showOtherStatutoryModal,
    setShowOtherStatutoryModal,
    showGroupPanel,
    setShowGroupPanel,
    flatGroups,
    loading,
    error,
    setError,
    success,
    setSuccess,
    selectedGroup,
    groupLineage,
    fyLabel,
    setField,
    setNumber,
    setBankField,
    setBankNumber,
    setStatutoryField,
    setStatutoryNumber,
    handleActivateInterestChange,
    handleInterestClose,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handleSubmit,
  } = useLedgerForm({ mode: "create" });
const groupName = selectedGroup?.name || groupLineage.primaryGroupName || "";
const currentConfig = getLedgerConfig(groupName);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showBankPopup && !showGroupPanel) {
        e.preventDefault();
        navigate("/master/create");
      }
      if (e.altKey && (e.key === "a" || e.key === "A") && !showBankPopup) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && (e.key === "g" || e.key === "G") && !showBankPopup) {
        e.preventDefault();
        setShowGroupPanel((prev) => !prev);
      }
      if (e.altKey && (e.key === "c" || e.key === "C") && !showBankPopup) {
        e.preventDefault();
        navigate("/master/alter/ledger");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, showBankPopup, showGroupPanel, navigate, setShowGroupPanel]);

  const ledgerActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setShowGroupPanel((prev) => !prev) },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Ledger", onClick: () => navigate("/master/alter/ledger") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
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

      {showInterestPopup && (
        <InterestParametersModal
          isOpen={showInterestPopup}
          ledgerName={form.name || ""}
          interestForm={interestForm}
          setInterestForm={setInterestForm}
          onClose={handleInterestClose}
        />
      )}

      {showOtherStatutoryModal && (
        <OtherStatutoryModal
          isOpen={showOtherStatutoryModal}
          ledgerName={form.name || ""}
          visibleSections={getOtherStatutoryConfig(groupLineage.primaryGroupName).sections}
          value={otherStatutory}
          onClose={() => setShowOtherStatutoryModal(false)}
          onAccept={(state) => {
            setOtherStatutory(state);
            setShowOtherStatutoryModal(false);
          }}
        />
      )}

      <PageTitleBar title="Ledger Creation" subtitle={selectedCompany?.name} />

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
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors group"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
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

          <LedgerBankDetailsForm
            bankForm={bankForm}
            setBankForm={setBankForm}
            setBankField={setBankField}
            setBankNumber={setBankNumber}
            groupLineage={groupLineage}
          />

          <OtherStatutoryTriggerPanel
            form={otherStatutory}
            onOpen={() => setShowOtherStatutoryModal(true)}
            onEnable={() =>
              setOtherStatutory((prev) => ({
                ...prev,
                tds: { ...prev.tds, is_tds_deductable: 1 },
              }))
            }
            onDisable={() =>
              setOtherStatutory({
                tds: { ...EMPTY_TDS },
                tcs: { ...EMPTY_TCS },
                serviceTax: { ...EMPTY_SERVICE_TAX },
                excise: { ...EMPTY_EXCISE },
                vat: { ...EMPTY_VAT },
              })
            }
          />

          <div className="flex-1" />

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
        </div>

        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <div className="p-3 flex justify-end">
            <div className="w-44 border border-zinc-200 rounded shrink-0 bg-white shadow-sm overflow-hidden">
              <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
              <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800">
                {Number(form.opening_balance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <LedgerRoundingPanel
            form={form}
            setForm={setForm}
            setField={setField}
            setNumber={setNumber}
            groupLineage={groupLineage}
          />

          <LedgerTaxPanel
            form={form}
            setField={setField}
            statutoryForm={statutoryForm}
            setStatutoryField={setStatutoryField}
            setStatutoryNumber={setStatutoryNumber}
            setStatutoryForm={setStatutoryForm}
            groupLineage={groupLineage}
            config={currentConfig}
            handleActivateInterestChange={handleActivateInterestChange}
          />

          <LedgerBillwisePanel
            form={form}
            setForm={setForm}
            setNumber={setNumber}
            groupLineage={groupLineage}
          />

          <div className="p-3 border-t border-zinc-100 bg-white">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Cost Centre Details</div>
            <FormRow label="Cost Centres are applicable" labelWidth="w-52" className="flex items-center min-h-[26px]">
              <select
                className="bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded"
                value={form.allow_cost_centres ? "Yes" : "No"}
                onChange={(e) => setForm((f) => ({ ...f, allow_cost_centres: e.target.value === "Yes" ? 1 : 0 }))}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>

          <LedgerMailingPanel
            form={form}
            setField={setField}
            groupLineage={groupLineage}
          />

          <LedgerBankingPanel
            provideBank={provideBank}
            handleProvideBankChange={handleProvideBankChange}
            bankForm={bankForm}
            showBankPopup={showBankPopup}
            setShowBankPopup={setShowBankPopup}
            groupLineage={groupLineage}
          />
        </div>

        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <GroupFlatList
              groups={flatGroups}
              selectedId={form.group_id as number}
              onSelect={(group: GroupType) => {
                setForm((f) => ({ ...f, group_id: group.group_id }));
                setShowGroupPanel(false);
              }}
              onCreate={() => { setShowGroupPanel(false); navigate("/master/create/group"); }}
              onClose={() => setShowGroupPanel(false)}
            />
          </div>
        )}

        <RightActionPanel actions={ledgerActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <Link to="/master/create" className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </Link>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50 transition-all font-semibold shadow-sm hover:shadow active:scale-95 duration-150"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}