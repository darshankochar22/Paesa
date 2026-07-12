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
import { useTCSDetails } from './hooks/useTCSDetails';

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

interface PersonResponsibleModalProps {
  form: any;
  setField: (field: any, val: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function PersonResponsibleModal({
  form,
  setField,
  onSubmit,
  onClose,
}: PersonResponsibleModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const mRow = 'flex items-center min-h-[26px]';
  const mLabel = 'w-56';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
      <div className="bg-white border border-black shadow-2xl w-[580px] p-5" data-enter-nav>
        <div className="text-center font-bold text-xs pb-3 border-b border-zinc-200 uppercase tracking-wide">
          Person Responsible Details
        </div>

        <div className="py-4 space-y-1 overflow-y-auto max-h-[60vh] pr-2">
          <FormRow label="Name" labelWidth={mLabel} className={mRow}>
            <input
              autoFocus
              className={inputCls}
              value={form.personResponsibleName}
              onChange={(e) => setField('personResponsibleName', e.target.value)}
            />
          </FormRow>

          <FormRow label="Son/daughter of" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleSonDaughterOf ?? ''}
              onChange={(e) => setField('personResponsibleSonDaughterOf', e.target.value)}
            />
          </FormRow>

          <FormRow label="Designation" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleDesignation}
              onChange={(e) => setField('personResponsibleDesignation', e.target.value)}
            />
          </FormRow>

          <FormRow label="PAN" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsiblePan}
              onChange={(e) => setField('personResponsiblePan', e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="e.g. ABCDE1234F"
            />
          </FormRow>

          <FormRow label="Flat no." labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleFlatNo ?? ''}
              onChange={(e) => setField('personResponsibleFlatNo', e.target.value)}
            />
          </FormRow>

          <FormRow label="Name of the premises/building" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsiblePremises ?? ''}
              onChange={(e) => setField('personResponsiblePremises', e.target.value)}
            />
          </FormRow>

          <FormRow label="Road/Street/Lane" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleRoad ?? ''}
              onChange={(e) => setField('personResponsibleRoad', e.target.value)}
            />
          </FormRow>

          <FormRow label="Area/Location" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleArea ?? ''}
              onChange={(e) => setField('personResponsibleArea', e.target.value)}
            />
          </FormRow>

          <FormRow label="Town/City/District" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleCity ?? ''}
              onChange={(e) => setField('personResponsibleCity', e.target.value)}
            />
          </FormRow>

          <FormRow label="State" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleState ?? ''}
              onChange={(e) => setField('personResponsibleState', e.target.value)}
            />
          </FormRow>

          <FormRow label="Pincode" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsiblePincode ?? ''}
              onChange={(e) => setField('personResponsiblePincode', e.target.value)}
              maxLength={6}
            />
          </FormRow>

          <FormRow label="Mobile no." labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsiblePhone}
              onChange={(e) => setField('personResponsiblePhone', e.target.value)}
            />
          </FormRow>

          <FormRow label="STD code" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleStdCode ?? ''}
              onChange={(e) => setField('personResponsibleStdCode', e.target.value)}
            />
          </FormRow>

          <FormRow label="Telephone" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleTelephone ?? ''}
              onChange={(e) => setField('personResponsibleTelephone', e.target.value)}
            />
          </FormRow>

          <FormRow label="E-mail ID" labelWidth={mLabel} className={mRow}>
            <input
              className={inputCls}
              value={form.personResponsibleEmail}
              onChange={(e) => setField('personResponsibleEmail', e.target.value)}
            />
          </FormRow>
        </div>

        <div className="border-t border-zinc-200 pt-3 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-black hover:bg-black/[0.03] shadow-sm transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            data-enter-accept
            onClick={onSubmit}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-black/80 shadow-sm transition-colors font-medium"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TCSDetailsCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const { form, setField, loading, error, setError, success, setSuccess, saveDetails } =
    useTCSDetails({
      companyId,
      onSaveSuccess: () => {
        setTimeout(() => navigate('/master/create'), 1000);
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
        navigate('/master/create');
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
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar title="Company TCS Collector Details" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-3xl">
            <SectionLabel>Collector Details</SectionLabel>

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

            <FormRow label="Collector Type" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.collectorType}
                onChange={(e) => setField('collectorType', e.target.value)}
              >
                <option value="Company">Company</option>
                <option value="Individual/HUF">Individual/HUF</option>
              </select>
            </FormRow>

            <FormRow label="Collector branch/division" labelWidth={LABEL_W} className={rowCls}>
              <input
                className={inputCls}
                value={form.collectorBranch}
                onChange={(e) => setField('collectorBranch', e.target.value)}
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

            <FormRow label="Ignore IT exemption limit" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.ignoreItExemption ? 'Yes' : 'No'}
                onChange={(e) => setField('ignoreItExemption', e.target.value === 'Yes')}
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
        onCancel={() => navigate('/master/create')}
        onSubmit={saveDetails}
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
