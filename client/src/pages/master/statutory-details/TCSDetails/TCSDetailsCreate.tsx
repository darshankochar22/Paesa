import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, FormRow, RightActionPanel, NotificationBanner } from '@/components/ui';
import { useTCSDetails } from './hooks/useTCSDetails';

const activeClass =
  'bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs';
const inactiveClass =
  'border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs';
const getSelectCls = (isActive: boolean) => `${isActive ? activeClass : inactiveClass}`;
const getInputCls = (isActive: boolean) => `${isActive ? activeClass : inactiveClass}`;

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
  const [activeField, setActiveField] = useState('name');
  const fields = [
    'name',
    'sonDaughterOf',
    'designation',
    'pan',
    'flatNo',
    'premises',
    'road',
    'area',
    'city',
    'state',
    'pincode',
    'phone',
    'stdCode',
    'telephone',
    'email',
  ];

  const nameRef = useRef<HTMLInputElement>(null);
  const sonDaughterOfRef = useRef<HTMLInputElement>(null);
  const designationRef = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);
  const flatNoRef = useRef<HTMLInputElement>(null);
  const premisesRef = useRef<HTMLInputElement>(null);
  const roadRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const stdCodeRef = useRef<HTMLInputElement>(null);
  const telephoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refMap: Record<string, React.RefObject<HTMLInputElement | null>> = {
      name: nameRef,
      sonDaughterOf: sonDaughterOfRef,
      designation: designationRef,
      pan: panRef,
      flatNo: flatNoRef,
      premises: premisesRef,
      road: roadRef,
      area: areaRef,
      city: cityRef,
      state: stateRef,
      pincode: pincodeRef,
      phone: phoneRef,
      stdCode: stdCodeRef,
      telephone: telephoneRef,
      email: emailRef,
    };
    refMap[activeField]?.current?.focus();
    refMap[activeField]?.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeField]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const idx = fields.indexOf(activeField);
      if (idx === -1) return;

      if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) {
          onSubmit();
        } else {
          setActiveField(fields[idx + 1]);
        }
        return;
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        if (idx > 0) {
          setActiveField(fields[idx - 1]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeField, onSubmit, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999] font-mono text-[11px]"
      data-enter-nav-ignore
    >
      <div className="bg-white border-4 border-double border-zinc-400 shadow-2xl w-[580px] p-5">
        <div className="text-center font-bold text-xs pb-3 border-b border-zinc-200 uppercase tracking-wide">
          Person Responsible Details
        </div>

        <div className="py-4 space-y-1.5 overflow-y-auto max-h-[60vh] pr-2">
          <FormRow label="Name" labelWidth="w-56">
            <input
              ref={nameRef}
              className={getInputCls(activeField === 'name')}
              value={form.personResponsibleName}
              onChange={(e) => setField('personResponsibleName', e.target.value)}
              onFocus={() => setActiveField('name')}
            />
          </FormRow>

          <FormRow label="Son/daughter of" labelWidth="w-56">
            <input
              ref={sonDaughterOfRef}
              className={getInputCls(activeField === 'sonDaughterOf')}
              value={form.personResponsibleSonDaughterOf ?? ''}
              onChange={(e) => setField('personResponsibleSonDaughterOf', e.target.value)}
              onFocus={() => setActiveField('sonDaughterOf')}
            />
          </FormRow>

          <FormRow label="Designation" labelWidth="w-56">
            <input
              ref={designationRef}
              className={getInputCls(activeField === 'designation')}
              value={form.personResponsibleDesignation}
              onChange={(e) => setField('personResponsibleDesignation', e.target.value)}
              onFocus={() => setActiveField('designation')}
            />
          </FormRow>

          <FormRow label="PAN" labelWidth="w-56">
            <input
              ref={panRef}
              className={getInputCls(activeField === 'pan')}
              value={form.personResponsiblePan}
              onChange={(e) => setField('personResponsiblePan', e.target.value.toUpperCase())}
              maxLength={10}
              onFocus={() => setActiveField('pan')}
              placeholder="e.g. ABCDE1234F"
            />
          </FormRow>

          <div className="pt-2" />

          <FormRow label="Flat no." labelWidth="w-56">
            <input
              ref={flatNoRef}
              className={getInputCls(activeField === 'flatNo')}
              value={form.personResponsibleFlatNo ?? ''}
              onChange={(e) => setField('personResponsibleFlatNo', e.target.value)}
              onFocus={() => setActiveField('flatNo')}
            />
          </FormRow>

          <FormRow label="Name of the premises/building" labelWidth="w-56">
            <input
              ref={premisesRef}
              className={getInputCls(activeField === 'premises')}
              value={form.personResponsiblePremises ?? ''}
              onChange={(e) => setField('personResponsiblePremises', e.target.value)}
              onFocus={() => setActiveField('premises')}
            />
          </FormRow>

          <FormRow label="Road/Street/Lane" labelWidth="w-56">
            <input
              ref={roadRef}
              className={getInputCls(activeField === 'road')}
              value={form.personResponsibleRoad ?? ''}
              onChange={(e) => setField('personResponsibleRoad', e.target.value)}
              onFocus={() => setActiveField('road')}
            />
          </FormRow>

          <FormRow label="Area/Location" labelWidth="w-56">
            <input
              ref={areaRef}
              className={getInputCls(activeField === 'area')}
              value={form.personResponsibleArea ?? ''}
              onChange={(e) => setField('personResponsibleArea', e.target.value)}
              onFocus={() => setActiveField('area')}
            />
          </FormRow>

          <FormRow label="Town/City/District" labelWidth="w-56">
            <input
              ref={cityRef}
              className={getInputCls(activeField === 'city')}
              value={form.personResponsibleCity ?? ''}
              onChange={(e) => setField('personResponsibleCity', e.target.value)}
              onFocus={() => setActiveField('city')}
            />
          </FormRow>

          <FormRow label="State" labelWidth="w-56">
            <input
              ref={stateRef}
              className={getInputCls(activeField === 'state')}
              value={form.personResponsibleState ?? ''}
              onChange={(e) => setField('personResponsibleState', e.target.value)}
              onFocus={() => setActiveField('state')}
            />
          </FormRow>

          <FormRow label="Pincode" labelWidth="w-56">
            <input
              ref={pincodeRef}
              className={getInputCls(activeField === 'pincode')}
              value={form.personResponsiblePincode ?? ''}
              onChange={(e) => setField('personResponsiblePincode', e.target.value)}
              maxLength={6}
              onFocus={() => setActiveField('pincode')}
            />
          </FormRow>

          <div className="pt-2" />

          <FormRow label="Mobile no." labelWidth="w-56">
            <input
              ref={phoneRef}
              className={getInputCls(activeField === 'phone')}
              value={form.personResponsiblePhone}
              onChange={(e) => setField('personResponsiblePhone', e.target.value)}
              onFocus={() => setActiveField('phone')}
            />
          </FormRow>

          <FormRow label="STD code" labelWidth="w-56">
            <input
              ref={stdCodeRef}
              className={getInputCls(activeField === 'stdCode')}
              value={form.personResponsibleStdCode ?? ''}
              onChange={(e) => setField('personResponsibleStdCode', e.target.value)}
              onFocus={() => setActiveField('stdCode')}
            />
          </FormRow>

          <FormRow label="Telephone" labelWidth="w-56">
            <input
              ref={telephoneRef}
              className={getInputCls(activeField === 'telephone')}
              value={form.personResponsibleTelephone ?? ''}
              onChange={(e) => setField('personResponsibleTelephone', e.target.value)}
              onFocus={() => setActiveField('telephone')}
            />
          </FormRow>

          <FormRow label="E-mail ID" labelWidth="w-56">
            <input
              ref={emailRef}
              className={getInputCls(activeField === 'email')}
              value={form.personResponsibleEmail}
              onChange={(e) => setField('personResponsibleEmail', e.target.value)}
              onFocus={() => setActiveField('email')}
            />
          </FormRow>
        </div>

        <div className="border-t border-zinc-200 pt-3 flex justify-end gap-3 shrink-0 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}

const FIELDS = [
  'tanRegNumber',
  'tan',
  'collectorType',
  'collectorBranch',
  'setAlterPersonResponsible',
  'ignoreItExemption',
];

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
  const [activeField, setActiveField] = useState('tanRegNumber');
  const [showAccept, setShowAccept] = useState(false);

  const tanRegNumberRef = useRef<HTMLInputElement>(null);
  const tanRef = useRef<HTMLInputElement>(null);
  const collectorTypeRef = useRef<HTMLSelectElement>(null);
  const collectorBranchRef = useRef<HTMLInputElement>(null);
  const setAlterPersonResponsibleRef = useRef<HTMLSelectElement>(null);
  const ignoreItExemptionRef = useRef<HTMLSelectElement>(null);

  const handlePersonModalSubmit = () => {
    setShowPersonModal(false);
    setActiveField('ignoreItExemption');
  };

  const handlePersonModalClose = () => {
    setShowPersonModal(false);
    setField('setAlterPersonResponsible', false);
    setActiveField('setAlterPersonResponsible');
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showPersonModal) return;

      if (showAccept) {
        const key = e.key.toLowerCase();
        if (key === 'y' || e.key === 'Enter') {
          e.preventDefault();
          setShowAccept(false);
          saveDetails();
        } else if (key === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowAccept(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/create');
        return;
      }

      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setShowAccept(true);
        return;
      }

      const idx = FIELDS.indexOf(activeField);
      if (idx !== -1) {
        if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
          e.preventDefault();
          if (activeField === 'setAlterPersonResponsible' && form.setAlterPersonResponsible) {
            setShowPersonModal(true);
          } else if (idx === FIELDS.length - 1) {
            setShowAccept(true);
          } else {
            setActiveField(FIELDS[idx + 1]);
          }
          return;
        }
        if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          if (idx > 0) {
            setActiveField(FIELDS[idx - 1]);
          }
          return;
        }

        if (activeField === 'setAlterPersonResponsible' || activeField === 'ignoreItExemption') {
          const key = e.key.toLowerCase();
          if (key === 'y' || key === 'n') {
            e.preventDefault();
            const val = key === 'y';
            setField(activeField, val);
            if (activeField === 'setAlterPersonResponsible' && val) {
              setShowPersonModal(true);
            } else if (idx === FIELDS.length - 1) {
              setShowAccept(true);
            } else {
              setActiveField(FIELDS[idx + 1]);
            }
          }
        }
      }
    },
    [
      showPersonModal,
      showAccept,
      activeField,
      form.setAlterPersonResponsible,
      saveDetails,
      navigate,
      setField,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (showPersonModal || showAccept) return;

    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      tanRegNumber: tanRegNumberRef,
      tan: tanRef,
      collectorType: collectorTypeRef,
      collectorBranch: collectorBranchRef,
      setAlterPersonResponsible: setAlterPersonResponsibleRef,
      ignoreItExemption: ignoreItExemptionRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, showPersonModal, showAccept]);

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex-grow flex flex-col h-full bg-white select-none text-zinc-950 relative"
      data-enter-nav
    >
      <PageTitleBar title="Company TCS Collector Details" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-grow flex min-h-0 relative">
        <div className="flex-grow overflow-y-auto p-6 bg-zinc-50 font-mono text-zinc-800 text-[11px]">
          <div className="max-w-2xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6 space-y-4">
            <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-4 tracking-wide text-zinc-900 uppercase">
              Company TCS Collector Details
            </div>

            <div className="space-y-1.5">
              <FormRow label="TAN registration number" labelWidth="w-[340px]">
                <input
                  ref={tanRegNumberRef}
                  className={getInputCls(activeField === 'tanRegNumber')}
                  value={form.tanRegNumber}
                  onChange={(e) => setField('tanRegNumber', e.target.value)}
                  onFocus={() => setActiveField('tanRegNumber')}
                  placeholder="e.g. TANR12345A"
                />
              </FormRow>

              <FormRow
                label="Tax deduction and collection Account Number (TAN)"
                labelWidth="w-[340px]"
              >
                <input
                  ref={tanRef}
                  className={getInputCls(activeField === 'tan')}
                  value={form.tan}
                  onChange={(e) => setField('tan', e.target.value.toUpperCase())}
                  onFocus={() => setActiveField('tan')}
                  placeholder="e.g. BLRP01234D"
                  maxLength={10}
                />
              </FormRow>

              <FormRow label="Collector Type" labelWidth="w-[340px]">
                <select
                  ref={collectorTypeRef}
                  className={getSelectCls(activeField === 'collectorType')}
                  value={form.collectorType}
                  onChange={(e) => setField('collectorType', e.target.value)}
                  onFocus={() => setActiveField('collectorType')}
                >
                  <option value="Company">Company</option>
                  <option value="Individual/HUF">Individual/HUF</option>
                </select>
              </FormRow>

              <FormRow label="Collector branch/division" labelWidth="w-[340px]">
                <input
                  ref={collectorBranchRef}
                  className={getInputCls(activeField === 'collectorBranch')}
                  value={form.collectorBranch}
                  onChange={(e) => setField('collectorBranch', e.target.value)}
                  onFocus={() => setActiveField('collectorBranch')}
                  placeholder="e.g. Bangalore South"
                />
              </FormRow>

              <FormRow label="Set/alter details of person responsible" labelWidth="w-[340px]">
                <select
                  ref={setAlterPersonResponsibleRef}
                  className={getSelectCls(activeField === 'setAlterPersonResponsible')}
                  value={form.setAlterPersonResponsible ? 'Yes' : 'No'}
                  onChange={(e) => {
                    const val = e.target.value === 'Yes';
                    setField('setAlterPersonResponsible', val);
                    if (val) setShowPersonModal(true);
                  }}
                  onFocus={() => setActiveField('setAlterPersonResponsible')}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>

            <div className="text-center font-bold text-xs py-2 my-2 text-zinc-900 border-t border-zinc-100 tracking-wide uppercase">
              Rate &amp; Exemption Details
            </div>

            <div className="space-y-1.5">
              <FormRow label="Ignore IT exemption limit" labelWidth="w-[340px]">
                <select
                  ref={ignoreItExemptionRef}
                  className={getSelectCls(activeField === 'ignoreItExemption')}
                  value={form.ignoreItExemption ? 'Yes' : 'No'}
                  onChange={(e) => setField('ignoreItExemption', e.target.value === 'Yes')}
                  onFocus={() => setActiveField('ignoreItExemption')}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {showPersonModal && (
        <PersonResponsibleModal
          form={form}
          setField={setField}
          onSubmit={handlePersonModalSubmit}
          onClose={handlePersonModalClose}
        />
      )}

      {showAccept && (
        <div
          className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in text-zinc-950"
          data-enter-nav-ignore
        >
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                saveDetails();
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

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/master/create')}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={() => setShowAccept(true)}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
