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
import OtherStatutoryModal from "./components/statutory/OtherStatutoryModal";
import { getOtherStatutoryConfig } from "@/config/ledgerStatutoryConfig";
import { getLedgerConfig } from "./config/LedgerConfig";
import AdditionalGSTDetailsModal from "./components/AdditionalGSTDetails";
import ServiceTaxModal from "./components/ServiceTaxModal";
import VATDetailsModal from "./components/VATDetailsModal";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

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
    vatDetails,
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
    handlePaymentGatewayChange,
    handleInterestClose,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handleSubmit,
    gstDetails,
    showGSTDetailsModal,
    handleGSTDetailsOpen,
    handleGSTDetailsClose,
    handleGSTDetailsAccept,
    serviceTaxDetails,
    showServiceTaxModal,
    handleServiceTaxOpen,
    handleServiceTaxClose,
    handleServiceTaxAccept,
    showVATDetailsModal,
    handleVATDetailsOpen,
    handleVATDetailsClose,
    handleVATDetailsAccept,
  } = useLedgerForm({ mode: "create" });

  const groupName = selectedGroup?.name || groupLineage.primaryGroupName || "";
  const currentConfig = getLedgerConfig(groupName);

  // Whether to show the "Statutory Details" block on the LEFT panel.
  // This matches Tally: shown for Current Assets (assessableValueCalc) and always
  // present for the "Set/Alter other Statutory details" toggle.
  const showLeftStatutorySection =
    !form.behave_as_payment_gateway &&
    (currentConfig.assessableValueCalc || true); // "Set/Alter other Statutory details" always shows

  const isOtherStatutoryActive =
    otherStatutory.tds.is_tds_deductable === 1 ||
    otherStatutory.tcs.is_tcs_applicable === 1 ||
    otherStatutory.serviceTax.set_alter_service_tax_details === 1 ||
    otherStatutory.excise.set_alter_excise_details === 1 ||
    otherStatutory.vat.set_alter_vat_details === 1;

  const assessableGstSelected =
    currentConfig.assessableValueCalc &&
    !!statutoryForm.include_in_assessable_value_calculation &&
    statutoryForm.include_in_assessable_value_calculation !== "Not Applicable";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showBankPopup && !showGroupPanel && !showServiceTaxModal && !showVATDetailsModal) {
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
  }, [handleSubmit, showBankPopup, showGroupPanel, showServiceTaxModal, showVATDetailsModal, navigate, setShowGroupPanel]);

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

      {showGSTDetailsModal && (
        <AdditionalGSTDetailsModal
          isOpen={showGSTDetailsModal}
          ledgerName={form.name || ""}
          value={gstDetails}
          onClose={handleGSTDetailsClose}
          onAccept={handleGSTDetailsAccept}
        />
      )}

      {showServiceTaxModal && (
        <ServiceTaxModal
          isOpen={showServiceTaxModal}
          ledgerName={form.name || ""}
          value={serviceTaxDetails}
          onClose={handleServiceTaxClose}
          onAccept={handleServiceTaxAccept}
        />
      )}

      {showVATDetailsModal && (
        <VATDetailsModal
          isOpen={showVATDetailsModal}
          ledgerName={form.name || ""}
          value={vatDetails}
          onClose={handleVATDetailsClose}
          onAccept={handleVATDetailsAccept}
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
        {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          {/* Name / alias */}
          <div className="p-3 space-y-1">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name || ""} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias || ""} onChange={setField("alias")} />
            </FormRow>
          </div>

          {/* Under (group) */}
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

          {/* Behave as Payment Gateway */}
          {currentConfig.paymentGateway && (
            <div className="p-3 border-t border-zinc-100 bg-white space-y-1">
              <FormRow label="Behave as Payment Gateway ledger" labelWidth="w-60" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.behave_as_payment_gateway ? "Yes" : "No"}
                  onChange={handlePaymentGatewayChange}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
              {!!form.behave_as_payment_gateway && (
                <FormRow label="Payment Gateway Name" labelWidth="w-60" className="flex items-center min-h-[26px]">
                  <span className="text-sm text-zinc-500 italic px-1.5">Not Applicable</span>
                </FormRow>
              )}
            </div>
          )}

          {/* Activate interest calculation */}
          <div className="p-3 border-t border-zinc-100 bg-white">
            <FormRow label="Activate interest calculation" labelWidth="w-52" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.activate_interest ? "Yes" : "No"} onChange={handleActivateInterestChange}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          </div>

          {/* ── Statutory Details (LEFT panel, matches Tally) ─────────────────
               Only show when NOT a payment gateway ledger.
               "Include in Assessable Value" only for groups with assessableValueCalc.
               "Set/Alter other Statutory details" always shown.
          ──────────────────────────────────────────────────────────────────── */}
          {showLeftStatutorySection && (
            <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Statutory Details
              </div>

              {currentConfig.assessableValueCalc && (
                <>
                  <FormRow label="Include in Assessable Value calculation" labelWidth="w-60" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={statutoryForm.include_in_assessable_value_calculation || "Not Applicable"}
                      onChange={setStatutoryField("include_in_assessable_value_calculation")}
                    >
                      <option value="Not Applicable">Not Applicable</option>
                      <option value="Excise">Excise</option>
                      <option value="Excise & GST">Excise & GST</option>
                      <option value="Excise & VAT">Excise & VAT</option>
                      <option value="GST">GST</option>
                      <option value="VAT">VAT</option>
                    </select>
                  </FormRow>

                  {assessableGstSelected && (
                    <>
                      <FormRow label="Appropriate to" labelWidth="w-60" className="flex items-center min-h-[26px]">
                        <select
                          className={selectCls}
                          value={statutoryForm.appropriate_to || "Goods"}
                          onChange={setStatutoryField("appropriate_to")}
                        >
                          <option value="Goods">Goods</option>
                          <option value="Goods and Services">Goods and Services</option>
                          <option value="Services">Services</option>
                        </select>
                      </FormRow>
                      <FormRow label="Method of calculation" labelWidth="w-60" className="flex items-center min-h-[26px]">
                        <select
                          className={selectCls}
                          value={statutoryForm.method_of_calculation || "Based on Quantity"}
                          onChange={setStatutoryField("method_of_calculation")}
                        >
                          <option value="Based on Quantity">Based on Quantity</option>
                          <option value="Based on Value">Based on Value</option>
                        </select>
                      </FormRow>
                    </>
                  )}
                </>
              )}

              <FormRow label="Set/Alter other Statutory details" labelWidth="w-60" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={isOtherStatutoryActive ? "Yes" : "No"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "Yes" && !isOtherStatutoryActive) {
                      setOtherStatutory((prev) => ({
                        ...prev,
                        tds: { ...prev.tds, is_tds_deductable: 1 },
                      }));
                      setShowOtherStatutoryModal(true);
                    } else if (val === "No" && isOtherStatutoryActive) {
                      setOtherStatutory({
                        tds: { ...EMPTY_TDS },
                        tcs: { ...EMPTY_TCS },
                        serviceTax: { ...EMPTY_SERVICE_TAX },
                        excise: { ...EMPTY_EXCISE },
                        vat: { ...EMPTY_VAT },
                      });
                    } else if (val === "Yes" && isOtherStatutoryActive) {
                      setShowOtherStatutoryModal(true);
                    }
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>
          )}

          {/* Bank details form (inline fields when group is bank) */}
          <LedgerBankDetailsForm
            bankForm={bankForm}
            setBankForm={setBankForm}
            setBankField={setBankField}
            setBankNumber={setBankNumber}
            groupLineage={groupLineage}
          />

          <div className="flex-1" />

          {/* Opening Balance */}
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

        {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <div className="p-3 flex justify-end">
            <div className="w-44 border border-zinc-200 rounded shrink-0 bg-white shadow-sm overflow-hidden">
              <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
              <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800">
                {Number(form.opening_balance || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <LedgerRoundingPanel form={form} setForm={setForm} setField={setField} setNumber={setNumber} groupLineage={groupLineage} />

          <LedgerMailingPanel form={form} setField={setField} groupLineage={groupLineage} />

          <LedgerBankingPanel
            provideBank={provideBank}
            handleProvideBankChange={handleProvideBankChange}
            bankForm={bankForm}
            showBankPopup={showBankPopup}
            setShowBankPopup={setShowBankPopup}
            groupLineage={groupLineage}
          />

          {/* Tax panel: only DutyTax section + Tax Registration Details */}
          <LedgerTaxPanel
            form={form}
            setField={setField}
            statutoryForm={statutoryForm}
            setStatutoryField={setStatutoryField}
            setStatutoryNumber={setStatutoryNumber}
            setStatutoryForm={setStatutoryForm}
            groupLineage={groupLineage}
            config={currentConfig}
            onGSTDetailsChange={(val) => {
              if (val === "Yes") handleGSTDetailsOpen();
              else handleGSTDetailsClose();
            }}
            onServiceTaxDetailsChange={(val) => {
              if (val === "Yes") handleServiceTaxOpen();
              else handleServiceTaxClose();
            }}
            onVATDetailsChange={(val) => {
              if (val === "Yes") handleVATDetailsOpen();
              else handleVATDetailsClose();
            }}
          />

          <LedgerBillwisePanel form={form} setForm={setForm} setNumber={setNumber} groupLineage={groupLineage} />
        </div>

        {/* Group selector panel */}
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <GroupFlatList
              groups={flatGroups}
              selectedId={form.group_id as number}
              onSelect={(group: GroupType) => {
                setForm((f) => ({ ...f, group_id: group.group_id }));
                setShowGroupPanel(false);
              }}
              onCreate={() => {
                setShowGroupPanel(false);
                navigate("/master/create/group");
              }}
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