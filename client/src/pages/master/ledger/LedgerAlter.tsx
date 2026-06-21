import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import LedgerListPanel from "./components/LedgerListPanel";
import { getLedgerConfig } from "./config/LedgerConfig";
import AdditionalGSTDetailsModal from "./components/AdditionalGSTDetails";
import ServiceTaxModal from "./components/ServiceTaxModal";
import VATDetailsModal from "./components/VATDetailsModal";
import TDSDetailsModal from "./components/statutory/TDSDetailsModal";
import TCSDetailsModal from "./components/statutory/TCSDetailsModal";
import {
  ServiceTaxDetailsModal,
  ExciseDetailsModal,
  VATDetailsModal as SimpleVATDetailsModal,
} from "./components/statutory/SimpleTaxModals";
import DetailedVATDetailsModal from "./components/statutory/VATTaxRateDetailsModal";
import DetailedExciseTariffDetails from "../inventory/stock-item/components/ExciseTariffDetails";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

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
    showLedgerPanel,
    setShowLedgerPanel,
    flatGroups,
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
    handleActivateInterestChange,
    handlePaymentGatewayChange,
    handleInterestClose,
    handleProvideBankChange,
    handleBankClose,
    handleBankAccept,
    handleSubmit,
    loadLedger,
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
    exciseDetails,
    setExciseDetails,
    vatTaxRateDetails,
    setVatTaxRateDetails,
    setServiceTaxDetails,
  } = useLedgerForm({ mode: "alter" });

  const groupName = selectedGroup?.name || groupLineage.primaryGroupName || "";
  const currentConfig = getLedgerConfig(groupName);

  // Whether to show the "Statutory Details" block on the LEFT panel.
  // Matches Tally: shown for Current Assets (assessableValueCalc) and always
  // present for the "Set/Alter other Statutory details" toggle.
  const showLeftStatutorySection =
    !form.behave_as_payment_gateway &&
    (currentConfig.assessableValueCalc || true);

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

  const [activeStatutoryModal, setActiveStatutoryModal] = useState<
    | "parent"
    | "tds"
    | "tcs"
    | "serviceTaxTier2"
    | "serviceTaxTier3"
    | "exciseTier2"
    | "exciseTier3"
    | "vatTier2"
    | "vatTier3"
    | null
  >(null);

  useEffect(() => {
    if (showOtherStatutoryModal) {
      setActiveStatutoryModal("parent");
    } else {
      setActiveStatutoryModal(null);
    }
  }, [showOtherStatutoryModal]);

  const closeAllStatutory = () => {
    setActiveStatutoryModal(null);
    setShowOtherStatutoryModal(false);
  };

  useEffect(() => {
    const routeLedgerId = location.state?.ledgerId;
    if (routeLedgerId && routeLedgerId !== selectedLedgerId) {
      loadLedger(routeLedgerId);
    }
  }, [location.state?.ledgerId, selectedLedgerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBankPopup) return;
        if (showServiceTaxModal) return;
        if (showVATDetailsModal) return;
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
  }, [handleSubmit, showBankPopup, showServiceTaxModal, showVATDetailsModal, showGroupPanel, showLedgerPanel, navigate, selectedLedgerId, setShowLedgerPanel, setShowGroupPanel]);

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

      {showOtherStatutoryModal && activeStatutoryModal === "parent" && (
        <OtherStatutoryModal
          isOpen
          ledgerName={form.name || ""}
          visibleSections={getOtherStatutoryConfig(groupLineage.primaryGroupName).sections}
          value={otherStatutory}
          onClose={closeAllStatutory}
          onAccept={(state) => {
            setOtherStatutory(state);
            closeAllStatutory();
          }}
          onTriggerSubModal={(kind) => {
            setOtherStatutory((prev) => {
              const next = { ...prev };
              if (kind === "tds") next.tds.is_tds_deductable = 1;
              if (kind === "tcs") next.tcs.is_tcs_applicable = 1;
              if (kind === "serviceTax") next.serviceTax.set_alter_service_tax_details = 1;
              if (kind === "excise") next.excise.set_alter_excise_details = 1;
              if (kind === "vat") next.vat.set_alter_vat_details = 1;
              return next;
            });
            setActiveStatutoryModal(kind === "tds" ? "tds" : kind === "tcs" ? "tcs" : `${kind}Tier2` as any);
          }}
          onResetSubModal={(kind) => {
            setOtherStatutory((prev) => {
              const next = { ...prev };
              if (kind === "tds") next.tds = { ...EMPTY_TDS, tds_pan_it_no: prev.tds.tds_pan_it_no, tds_name_on_pan: prev.tds.tds_name_on_pan };
              if (kind === "tcs") next.tcs = { ...EMPTY_TCS, tcs_pan_it_no: prev.tcs.tcs_pan_it_no, tcs_name_on_pan: prev.tcs.tcs_name_on_pan };
              if (kind === "serviceTax") next.serviceTax = { ...EMPTY_SERVICE_TAX };
              if (kind === "excise") next.excise = { ...EMPTY_EXCISE };
              if (kind === "vat") next.vat = { ...EMPTY_VAT };
              return next;
            });
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "tds" && (
        <TDSDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={otherStatutory.tds}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, tds: state }));
            setActiveStatutoryModal("parent");
          }}
          companyId={selectedCompany?.company_id}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "tcs" && (
        <TCSDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={otherStatutory.tcs}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, tcs: state }));
            setActiveStatutoryModal("parent");
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "serviceTaxTier2" && (
        <ServiceTaxDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={otherStatutory.serviceTax}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, serviceTax: state }));
            if (state.set_alter_service_tax_details === 1) {
              setActiveStatutoryModal("serviceTaxTier3");
            } else {
              setActiveStatutoryModal("parent");
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "serviceTaxTier3" && (
        <ServiceTaxModal
          isOpen
          ledgerName={form.name || ""}
          value={serviceTaxDetails}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setServiceTaxDetails(state);
            setActiveStatutoryModal("parent");
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "exciseTier2" && (
        <ExciseDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={otherStatutory.excise}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, excise: state }));
            if (state.set_alter_excise_details === 1) {
              setActiveStatutoryModal("exciseTier3");
            } else {
              setActiveStatutoryModal("parent");
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "exciseTier3" && (
        <DetailedExciseTariffDetails
          initialData={exciseDetails}
          onAccept={(state) => {
            setExciseDetails(state);
            setActiveStatutoryModal("parent");
          }}
          onClose={() => setActiveStatutoryModal("parent")}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "vatTier2" && (
        <SimpleVATDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={otherStatutory.vat}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, vat: state }));
            if (state.set_alter_vat_details === 1) {
              setActiveStatutoryModal("vatTier3");
            } else {
              setActiveStatutoryModal("parent");
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === "vatTier3" && (
        <DetailedVATDetailsModal
          isOpen
          ledgerName={form.name || ""}
          value={vatTaxRateDetails}
          onClose={() => setActiveStatutoryModal("parent")}
          onAccept={(state) => {
            setVatTaxRateDetails(state);
            setActiveStatutoryModal("parent");
          }}
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
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
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

          {/* Behave as Payment Gateway */}
          {selectedLedgerId && currentConfig.paymentGateway && (
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

          {selectedLedgerId && (
            <div className="p-3 border-t border-zinc-100 bg-white">
              <FormRow label="Activate interest calculation" labelWidth="w-52" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.activate_interest ? "Yes" : "No"}
                  onChange={handleActivateInterestChange}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>
          )}

          {/* Statutory Details (LEFT panel, matches Tally) */}
          {selectedLedgerId && showLeftStatutorySection && (
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

              {currentConfig.gstApplicabilitySection && (
  <>
    <FormRow label="GST applicability" labelWidth="w-60" className="flex items-center min-h-[26px]">
      <select
        className={selectCls}
        value={statutoryForm.gst_applicability || "Applicable"}
        onChange={setStatutoryField("gst_applicability")}
      >
        <option value="Applicable">Applicable</option>
        <option value="Not Applicable">Not Applicable</option>
        <option value="Undefined">Undefined</option>
      </select>
    </FormRow>

    {(statutoryForm.gst_applicability || "Applicable") === "Applicable" && (
      <>
        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
          HSN/SAC & Related Details
        </div>
        <FormRow label="HSN/SAC Details" labelWidth="w-60" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={statutoryForm.hsn_sac_source || "As per Company/Group"}
            onChange={setStatutoryField("hsn_sac_source")}
          >
            <option value="As per Company/Group">As per Company/Group</option>
            <option value="As per Stock Item">As per Stock Item</option>
            <option value="Specify Details Here">Specify Details Here</option>
          </select>
        </FormRow>

        {statutoryForm.hsn_sac_source === "Specify Details Here" ? (
          <>
            <FormRow label="HSN/SAC" labelWidth="w-60" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={statutoryForm.hsn_sac_code || ""} onChange={setStatutoryField("hsn_sac_code")} />
            </FormRow>
            <FormRow label="Description" labelWidth="w-60" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={statutoryForm.hsn_sac_description || ""} onChange={setStatutoryField("hsn_sac_description")} />
            </FormRow>
          </>
        ) : (
          <FormRow label="Source of details" labelWidth="w-60" className="flex items-center min-h-[26px]">
            <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
          </FormRow>
        )}

        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
          GST Rate & Related Details
        </div>
        <FormRow label="GST Rate Details" labelWidth="w-60" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={statutoryForm.gst_rate_source || "As per Company/Group"}
            onChange={setStatutoryField("gst_rate_source")}
          >
            <option value="As per Company/Group">As per Company/Group</option>
            <option value="As per Stock Item">As per Stock Item</option>
            <option value="Specify Details Here">Specify Details Here</option>
          </select>
        </FormRow>

        {statutoryForm.gst_rate_source === "Specify Details Here" ? (
          <>
            <FormRow label="Taxability Type" labelWidth="w-60" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={statutoryForm.taxability_type || "Taxable"}
                onChange={setStatutoryField("taxability_type")}
              >
                <option value="Taxable">Taxable</option>
                <option value="Exempt">Exempt</option>
                <option value="Nil Rated">Nil Rated</option>
              </select>
            </FormRow>
            <FormRow label="GST Rate" labelWidth="w-60" className="flex items-center min-h-[26px]">
              <input
                type="number"
                step="0.01"
                className={`${inputCls} text-right max-w-[100px]`}
                value={statutoryForm.gst_rate ?? 0}
                onChange={setStatutoryNumber("gst_rate")}
              />
              <span className="text-xs text-zinc-400 ml-1">%</span>
            </FormRow>
          </>
        ) : (
          <FormRow label="Source of details" labelWidth="w-60" className="flex items-center min-h-[26px]">
            <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
          </FormRow>
        )}

        <FormRow label="Type of Supply" labelWidth="w-60" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={statutoryForm.type_of_supply || "Services"}
            onChange={setStatutoryField("type_of_supply")}
          >
            <option value="Goods">Goods</option>
            <option value="Services">Services</option>
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

        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          {selectedLedgerId ? (
            <>
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

              <LedgerBillwisePanel
                form={form}
                setForm={setForm}
                setNumber={setNumber}
                groupLineage={groupLineage}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-300 text-sm select-none italic">
              No ledger selected
            </div>
          )}
        </div>

        {showLedgerPanel && (
          <LedgerListPanel
            ledgers={ledgers}
            selectedId={selectedLedgerId}
            onSelect={(l) => loadLedger(l.ledger_id!)}
            onClose={() => setShowLedgerPanel(false)}
          />
        )}

        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <GroupFlatList
              groups={flatGroups}
              selectedId={form.group_id as number}
              onSelect={(group: GroupType) => {
                setForm((f: any) => ({ ...f, group_id: group.group_id }));
                setShowGroupPanel(false);
              }}
              onCreate={() => { setShowGroupPanel(false); navigate("/master/create/group"); }}
              onClose={() => setShowGroupPanel(false)}
            />
          </div>
        )}

        <RightActionPanel actions={ledgerAlterActions} />
      </div>

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