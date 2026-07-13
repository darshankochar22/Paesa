import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import GroupFlatList from '@/components/GroupFlatList';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
  inputCls,
  selectCls,
} from '@/components/ui';
import BankDetailsPopup from './components/BankDetailsPopup';
import type { GroupType } from '@/types/api';
import {
  useLedgerForm,
  EMPTY_TDS,
  EMPTY_TCS,
  EMPTY_SERVICE_TAX,
  EMPTY_EXCISE,
  EMPTY_VAT,
} from './hooks/useLedgerForm';
import LedgerMailingPanel from './components/LedgerMailingPanel';
import LedgerTaxPanel, { DutyTaxSection } from './components/LedgerTaxPanel';
import LedgerRoundingPanel from './components/LedgerRoundingPanel';
import LedgerBillwisePanel from './components/LedgerBillwisePanel';
import LedgerBankingPanel from './components/LedgerBankingPanel';
import LedgerBankDetailsForm from './components/LedgerBankDetailsForm';
import InterestParametersModal from './components/InterestParametersModal';
import OtherStatutoryModal from './components/statutory/OtherStatutoryModal';
import { getOtherStatutoryConfig } from '@/config/ledgerStatutoryConfig';
import { filterStatutorySectionsByFeature } from '@/lib/taxFeatures';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import { getLedgerConfig } from './config/LedgerConfig';
import AdditionalGSTDetailsModal from './components/AdditionalGSTDetails';
import ServiceTaxModal from './components/ServiceTaxModal';
import VATDetailsModal from './components/VATDetailsModal';
import TDSDetailsModal from './components/statutory/TDSDetailsModal';
import TCSDetailsModal from './components/statutory/TCSDetailsModal';
import {
  ServiceTaxDetailsModal,
  ExciseDetailsModal,
  VATDetailsModal as SimpleVATDetailsModal,
} from './components/statutory/SimpleTaxModals';
import DetailedVATDetailsModal from './components/statutory/VATTaxRateDetailsModal';
import DetailedExciseTariffDetails from '../inventory/stock-item/components/ExciseTariffDetails';

import LedgerStatutoryLeftPanel from './LedgerStatutoryLeftPanel';

export default function LedgerCreate() {
  const { selectedCompany, features } = useCompany();
  const navigate = useNavigate();
  const [totalOpeningBalance, setTotalOpeningBalance] = useState<{
    totalDr: number;
    totalCr: number;
    netBalance: number;
    balanceType: string;
  } | null>(null);
  const [showExciseTariffPopup, setShowExciseTariffPopup] = useState(false);

  useEffect(() => {
    if (!selectedCompany?.company_id) return;
    window.api.ledger.getTotalOpeningBalance(selectedCompany.company_id).then((res: any) => {
      if (res.success) {
        setTotalOpeningBalance({
          totalDr: res.totalDr,
          totalCr: res.totalCr,
          netBalance: res.netBalance,
          balanceType: res.balanceType,
        });
      }
    });
  }, [selectedCompany?.company_id]);

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
    setServiceTaxDetails,
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
  } = useLedgerForm({ mode: 'create' });

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const underRef = useRef<HTMLDivElement>(null);

  const groupName = selectedGroup?.name || groupLineage.primaryGroupName || '';
  const currentConfig = getLedgerConfig(groupName, groupLineage.primaryGroupName);

  // Statutory section appears only when the group has assessable-value fields or
  // other-statutory sub-sections (TDS/TCS/…). Hidden for banks, payment gateways,
  // and simple groups like Cash-in-Hand that have neither.
  const statutorySections = filterStatutorySectionsByFeature(
    getOtherStatutoryConfig(groupLineage.primaryGroupName, groupName).sections,
    features,
  );
  const showLeftStatutorySection =
    !form.behave_as_payment_gateway &&
    !groupLineage.isBank &&
    (currentConfig.assessableValueCalc || statutorySections.length > 0);

  const isOtherStatutoryActive =
    otherStatutory.tds.is_tds_deductable === 1 ||
    otherStatutory.tcs.is_tcs_applicable === 1 ||
    otherStatutory.serviceTax.set_alter_service_tax_details === 1 ||
    otherStatutory.excise.set_alter_excise_details === 1 ||
    otherStatutory.vat.set_alter_vat_details === 1;

  const assessableGstSelected =
    currentConfig.assessableValueCalc &&
    !!statutoryForm.include_in_assessable_value_calculation &&
    statutoryForm.include_in_assessable_value_calculation !== 'Not Applicable';

  const [activeStatutoryModal, setActiveStatutoryModal] = useState<
    | 'parent'
    | 'tds'
    | 'tcs'
    | 'serviceTaxTier2'
    | 'serviceTaxTier3'
    | 'exciseTier2'
    | 'exciseTier3'
    | 'vatTier2'
    | 'vatTier3'
    | null
  >(null);

  useEffect(() => {
    if (showOtherStatutoryModal) {
      setActiveStatutoryModal('parent');
    } else {
      setActiveStatutoryModal(null);
    }
  }, [showOtherStatutoryModal]);

  const closeAllStatutory = () => {
    setActiveStatutoryModal(null);
    setShowOtherStatutoryModal(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        !showBankPopup &&
        !showGroupPanel &&
        !showServiceTaxModal &&
        !showVATDetailsModal
      ) {
        e.preventDefault();
        navigate('/master/create');
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A') && !showBankPopup) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && (e.key === 'g' || e.key === 'G') && !showBankPopup) {
        e.preventDefault();
        setShowGroupPanel((prev) => !prev);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C') && !showBankPopup) {
        e.preventDefault();
        navigate('/master/alter/ledger');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSubmit,
    showBankPopup,
    showGroupPanel,
    showServiceTaxModal,
    showVATDetailsModal,
    navigate,
    setShowGroupPanel,
  ]);

  const ledgerActions = [
    { key: 'Alt+G', label: 'Select Group', onClick: () => setShowGroupPanel((prev) => !prev) },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Ledger', onClick: () => navigate('/master/alter/ledger') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      {showBankPopup && (
        <BankDetailsPopup
          ledgerName={form.name || ''}
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
          ledgerName={form.name || ''}
          interestForm={interestForm}
          setInterestForm={setInterestForm}
          onClose={handleInterestClose}
          isBank={groupLineage.isBank}
        />
      )}

      {showGSTDetailsModal && (
        <AdditionalGSTDetailsModal
          isOpen={showGSTDetailsModal}
          ledgerName={form.name || ''}
          value={gstDetails}
          onClose={handleGSTDetailsClose}
          onAccept={handleGSTDetailsAccept}
        />
      )}

      {showServiceTaxModal && (
        <ServiceTaxModal
          isOpen={showServiceTaxModal}
          ledgerName={form.name || ''}
          value={serviceTaxDetails}
          onClose={handleServiceTaxClose}
          onAccept={handleServiceTaxAccept}
        />
      )}

      {showVATDetailsModal && (
        <VATDetailsModal
          isOpen={showVATDetailsModal}
          ledgerName={form.name || ''}
          value={vatDetails}
          onClose={handleVATDetailsClose}
          onAccept={handleVATDetailsAccept}
        />
      )}

      {showExciseTariffPopup && (
        <DetailedExciseTariffDetails
          initialData={exciseDetails}
          onAccept={(state) => {
            setExciseDetails(state);
            setShowExciseTariffPopup(false);
          }}
          onClose={() => setShowExciseTariffPopup(false)}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'parent' && (
        <OtherStatutoryModal
          isOpen
          ledgerName={form.name || ''}
          visibleSections={statutorySections}
          value={otherStatutory}
          companyId={selectedCompany?.company_id}
          tdsNatureOfPaymentOnly={
            groupLineage.isInventory || groupLineage.isTax || groupLineage.isMiscExpense
          }
          tcsNatureOfGoodsOnly={
            groupLineage.isInventory || groupLineage.isTax || groupLineage.isMiscExpense
          }
          onClose={closeAllStatutory}
          onAccept={(state) => {
            setOtherStatutory(state);
            closeAllStatutory();
          }}
          onCommit={(state) => setOtherStatutory(state)}
          onTriggerSubModal={(kind) => {
            setOtherStatutory((prev) => {
              const next = { ...prev };
              if (kind === 'serviceTax') next.serviceTax.set_alter_service_tax_details = 1;
              if (kind === 'excise') next.excise.set_alter_excise_details = 1;
              if (kind === 'vat') next.vat.set_alter_vat_details = 1;
              return next;
            });
            // Skip the intermediate applicability/Yes-No popup — open the detail directly.
            setActiveStatutoryModal(`${kind}Tier3` as any);
          }}
          onResetSubModal={(kind) => {
            setOtherStatutory((prev) => {
              const next = { ...prev };
              if (kind === 'tds')
                next.tds = {
                  ...EMPTY_TDS,
                  tds_pan_it_no: prev.tds.tds_pan_it_no,
                  tds_name_on_pan: prev.tds.tds_name_on_pan,
                };
              if (kind === 'tcs')
                next.tcs = {
                  ...EMPTY_TCS,
                  tcs_pan_it_no: prev.tcs.tcs_pan_it_no,
                  tcs_name_on_pan: prev.tcs.tcs_name_on_pan,
                };
              if (kind === 'serviceTax') next.serviceTax = { ...EMPTY_SERVICE_TAX };
              if (kind === 'excise') next.excise = { ...EMPTY_EXCISE };
              if (kind === 'vat') next.vat = { ...EMPTY_VAT };
              return next;
            });
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'tds' && (
        <TDSDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={otherStatutory.tds}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, tds: state }));
            setActiveStatutoryModal('parent');
          }}
          companyId={selectedCompany?.company_id}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'tcs' && (
        <TCSDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={otherStatutory.tcs}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, tcs: state }));
            setActiveStatutoryModal('parent');
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'serviceTaxTier2' && (
        <ServiceTaxDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={otherStatutory.serviceTax}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, serviceTax: state }));
            if (state.set_alter_service_tax_details === 1) {
              setActiveStatutoryModal('serviceTaxTier3');
            } else {
              setActiveStatutoryModal('parent');
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'serviceTaxTier3' && (
        <ServiceTaxModal
          isOpen
          ledgerName={form.name || ''}
          value={serviceTaxDetails}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setServiceTaxDetails(state);
            setActiveStatutoryModal('parent');
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'exciseTier2' && (
        <ExciseDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={otherStatutory.excise}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, excise: state }));
            if (state.set_alter_excise_details === 1) {
              setActiveStatutoryModal('exciseTier3');
            } else {
              setActiveStatutoryModal('parent');
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'exciseTier3' && (
        <DetailedExciseTariffDetails
          initialData={exciseDetails}
          onAccept={(state) => {
            setExciseDetails(state);
            setActiveStatutoryModal('parent');
          }}
          onClose={() => setActiveStatutoryModal('parent')}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'vatTier2' && (
        <SimpleVATDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={otherStatutory.vat}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setOtherStatutory((prev) => ({ ...prev, vat: state }));
            if (state.set_alter_vat_details === 1) {
              setActiveStatutoryModal('vatTier3');
            } else {
              setActiveStatutoryModal('parent');
            }
          }}
        />
      )}

      {showOtherStatutoryModal && activeStatutoryModal === 'vatTier3' && (
        <DetailedVATDetailsModal
          isOpen
          ledgerName={form.name || ''}
          value={vatTaxRateDetails}
          onClose={() => setActiveStatutoryModal('parent')}
          onAccept={(state) => {
            setVatTaxRateDetails(state);
            setActiveStatutoryModal('parent');
          }}
        />
      )}

      <PageTitleBar title="Ledger Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          {/* Name / alias */}
          <div className="p-3 space-y-1">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name || ''}
                onChange={setField('name')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias || ''}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowGroupPanel(true);
                }}
              />
            </FormRow>
          </div>

          {/* Under (group) */}
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div
              ref={underRef}
              tabIndex={0}
              data-enter-click
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded transition-colors group"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
            >
              <span className="w-16 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">
                Under
              </span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                {selectedGroup?.name || '—'}
              </span>
              {groupLineage.primaryGroupName &&
                groupLineage.primaryGroupName !== selectedGroup?.name && (
                  <span className="text-xs text-zinc-400 ml-2 font-normal">
                    (Group: {groupLineage.primaryGroupName})
                  </span>
                )}
            </div>
          </div>

          {/* Type of Ledger (Purchase / Sales / Direct / Indirect groups) */}
          <LedgerRoundingPanel
            form={form}
            setForm={setForm}
            setField={setField}
            setNumber={setNumber}
            groupLineage={groupLineage}
          />

          {/* Duty Tax fields (Type of Duty/Tax, sub-fields, Percentage, Rounding) for Duties & Taxes groups */}
          {groupLineage.isTax && (
            <DutyTaxSection
              statutoryForm={statutoryForm}
              setStatutoryField={setStatutoryField}
              setStatutoryNumber={setStatutoryNumber}
            />
          )}

          {/* Behave as Payment Gateway */}
          {currentConfig.paymentGateway && (
            <div className="p-3 border-t border-zinc-100 bg-white space-y-1">
              <FormRow
                label="Behave as Payment Gateway ledger"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.behave_as_payment_gateway ? 'Yes' : 'No'}
                  onChange={handlePaymentGatewayChange}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
              {!!form.behave_as_payment_gateway && (
                <FormRow
                  label="Payment Gateway Name"
                  labelWidth="w-60"
                  className="flex items-center min-h-[26px]"
                >
                  <span className="text-sm text-zinc-700 px-1.5">&#9670; Not Applicable</span>
                </FormRow>
              )}
            </div>
          )}

          {/* Bill-wise Details — above interest calculation for debtor/creditor groups
              (F11 → Enable Bill-wise entry) */}
          {isFeatureEnabled(features, 'enable_bill_wise_entry') && (
            <LedgerBillwisePanel
              form={form}
              setForm={setForm}
              setNumber={setNumber}
              groupLineage={groupLineage}
            />
          )}

          {/* Cost centres applicable (F11 → Enable Cost Centres) + interest + OD limit */}
          <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
            {isFeatureEnabled(features, 'enable_cost_centres') && (
              <FormRow
                label="Cost centres are applicable"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.allow_cost_centres ? 'Yes' : 'No'}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      allow_cost_centres: e.target.value === 'Yes' ? 1 : 0,
                    }))
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            )}
            {isFeatureEnabled(features, 'enable_interest_calculation') && (
              <FormRow
                label="Activate interest calculation"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.activate_interest ? 'Yes' : 'No'}
                  onChange={handleActivateInterestChange}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            )}
            {groupLineage.isOD && (
              <FormRow
                label="Set OD limit"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} max-w-[140px] text-right`}
                  value={form.od_limit ?? ''}
                  onChange={setNumber('od_limit')}
                  placeholder="0.00"
                />
              </FormRow>
            )}
          </div>

          {showLeftStatutorySection && (
            <LedgerStatutoryLeftPanel
              statutoryForm={statutoryForm}
              setStatutoryField={setStatutoryField}
              setStatutoryNumber={setStatutoryNumber}
              setOtherStatutory={setOtherStatutory}
              setShowOtherStatutoryModal={setShowOtherStatutoryModal}
              groupLineage={groupLineage}
              currentConfig={currentConfig}
              assessableGstSelected={assessableGstSelected}
              isOtherStatutoryActive={isOtherStatutoryActive}
              statutorySections={statutorySections}
              inputCls={inputCls}
            />
          )}

          {/* Bank details form (inline fields when group is bank) — hidden when ledger behaves as payment gateway */}
          {!form.behave_as_payment_gateway && (
            <LedgerBankDetailsForm
              ledgerName={form.name || ''}
              bankForm={bankForm}
              setBankField={setBankField}
              setBankForm={setBankForm}
              groupLineage={groupLineage}
            />
          )}

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
              onChange={setNumber('opening_balance')}
            />
            <select
              className={selectCls}
              value={(form as any).opening_balance_type || 'Dr'}
              onChange={setField('opening_balance_type')}
            >
              <option value="Dr">Dr</option>
              <option value="Cr">Cr</option>
            </select>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
        <div className="w-[480px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <div className="p-3 flex justify-end">
            <div className="w-48 border border-zinc-300 rounded-md shrink-0 bg-white shadow-sm overflow-hidden">
              <div className="text-center text-[9px] font-bold border-b border-zinc-200 py-1 bg-zinc-100 text-zinc-600 uppercase tracking-wider">
                Total Opening Balance
              </div>
              <div className="flex divide-x divide-zinc-100">
                <div className="flex-1 text-center py-1.5">
                  <div className="text-[9px] font-semibold text-zinc-500 uppercase">Dr</div>
                  <div className="text-xs font-bold tabular-nums text-zinc-900 mt-0.5">
                    {totalOpeningBalance ? totalOpeningBalance.totalDr.toFixed(2) : '0.00'}
                  </div>
                </div>
                <div className="flex-1 text-center py-1.5">
                  <div className="text-[9px] font-semibold text-zinc-500 uppercase">Cr</div>
                  <div className="text-xs font-bold tabular-nums text-zinc-900 mt-0.5">
                    {totalOpeningBalance ? totalOpeningBalance.totalCr.toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-200 py-1 text-center bg-zinc-50/40">
                <div className="text-[9px] font-semibold text-zinc-500 uppercase">Net</div>
                <div className="text-sm font-extrabold tabular-nums text-zinc-900">
                  {totalOpeningBalance
                    ? `${totalOpeningBalance.netBalance.toFixed(2)} ${totalOpeningBalance.balanceType}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

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
            vatActive={otherStatutory.vat.set_alter_vat_details === 1}
            exciseActive={otherStatutory.excise.set_alter_excise_details === 1}
            onGSTDetailsChange={(val) => {
              if (val === 'Yes') handleGSTDetailsOpen();
              else handleGSTDetailsClose();
            }}
            onServiceTaxDetailsChange={(val) => {
              if (val === 'Yes') handleServiceTaxOpen();
              else handleServiceTaxClose();
            }}
            onVATDetailsChange={(val) => {
              if (val === 'Yes') handleVATDetailsOpen();
              else handleVATDetailsClose();
            }}
            onExciseDetailsChange={(val) => {
              if (val === 'Yes') {
                setOtherStatutory((p) => ({
                  ...p,
                  excise: { ...p.excise, set_alter_excise_details: 1 },
                }));
                setShowExciseTariffPopup(true);
              } else {
                setOtherStatutory((p) => ({
                  ...p,
                  excise: { ...p.excise, set_alter_excise_details: 0 },
                }));
              }
            }}
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
                focusFieldAfter(underRef.current);
              }}
              onCreate={() => {
                setShowGroupPanel(false);
                navigate('/master/create/group');
              }}
              onClose={() => setShowGroupPanel(false)}
            />
          </div>
        )}

        <RightActionPanel actions={ledgerActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
