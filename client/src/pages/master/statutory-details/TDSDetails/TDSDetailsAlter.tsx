import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  PageTitleBar,
  FormRow,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { useTDSDetails } from './hooks/useTDSDetails';
import PersonResponsibleModal from './PersonResponsibleModal';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors';

const rowCls = 'flex items-center min-h-[26px]';
const LABEL_W = 'w-[340px]';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-1 pt-4 mb-1">
      {children}
    </div>
  );
}

export default function TDSDetailsAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const { form, setField, loading, error, setError, success, setSuccess, saveDetails } =
    useTDSDetails({
      companyId,
      onSaveSuccess: () => {
        setTimeout(() => navigate('/master/alter'), 1000);
      },
    });

  const [showPersonModal, setShowPersonModal] = useState(false);

  const handlePersonModalSubmit = () => setShowPersonModal(false);

  const handlePersonModalClose = () => {
    setShowPersonModal(false);
    setField('setAlterPersonResponsible', false);
  };

  useEffect(() => {
    if (showPersonModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/alter');
      }
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        saveDetails();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPersonModal, saveDetails, navigate]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: saveDetails },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/alter') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar
        title="Company TDS Deductor Details (Alteration)"
        subtitle={selectedCompany?.name}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-3xl">
            <SectionLabel>Deductor Details</SectionLabel>

            <FormRow label="TAN registration number" labelWidth={LABEL_W} className={rowCls}>
              <input
                autoFocus
                className={inputCls}
                value={form.tanRegNumber}
                onChange={(e) => setField('tanRegNumber', e.target.value)}
                placeholder="e.g. TANR12345A"
              />
            </FormRow>

            <FormRow
              label="Tax deduction and collection Account Number (TAN)"
              labelWidth={LABEL_W}
              className={rowCls}
            >
              <input
                className={inputCls}
                value={form.tan}
                onChange={(e) => setField('tan', e.target.value.toUpperCase())}
                placeholder="e.g. BLRP01234D"
                maxLength={10}
              />
            </FormRow>

            <FormRow label="Deductor type" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.deductorType}
                onChange={(e) => setField('deductorType', e.target.value)}
              >
                <option value="Company">Company</option>
                <option value="Individual/HUF">Individual/HUF</option>
              </select>
            </FormRow>

            <FormRow label="Deductor branch/division" labelWidth={LABEL_W} className={rowCls}>
              <input
                className={inputCls}
                value={form.deductorBranch}
                onChange={(e) => setField('deductorBranch', e.target.value)}
                placeholder="e.g. Bangalore South"
              />
            </FormRow>

            <FormRow
              label="Set/alter details of person responsible"
              labelWidth={LABEL_W}
              className={rowCls}
            >
              <select
                className={selectCls}
                value={form.setAlterPersonResponsible ? 'Yes' : 'No'}
                onChange={(e) => {
                  const val = e.target.value === 'Yes';
                  setField('setAlterPersonResponsible', val);
                  if (val) setShowPersonModal(true);
                }}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>

            <SectionLabel>Rate &amp; Exemption Details</SectionLabel>

            <FormRow
              label="Ignore IT exemption limit for TDS deduction"
              labelWidth={LABEL_W}
              className={rowCls}
            >
              <select
                className={selectCls}
                value={form.ignoreItExemption ? 'Yes' : 'No'}
                onChange={(e) => setField('ignoreItExemption', e.target.value === 'Yes')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>

            <FormRow label="Activate TDS for stock items" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.activateTdsForItems ? 'Yes' : 'No'}
                onChange={(e) => setField('activateTdsForItems', e.target.value === 'Yes')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/alter')}
        onSubmit={saveDetails}
        cancelLabel="Back to Masters"
        loading={loading}
      />

      {showPersonModal && (
        <PersonResponsibleModal
          form={form}
          setField={setField}
          onSubmit={handlePersonModalSubmit}
          onClose={handlePersonModalClose}
        />
      )}
    </div>
  );
}
