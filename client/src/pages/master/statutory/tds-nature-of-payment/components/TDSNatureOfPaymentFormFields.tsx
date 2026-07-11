import React, { useEffect, useRef, useState } from 'react';
import type { FormData } from '../hooks/useTDSNatureOfPaymentForm';

interface TDSNatureOfPaymentFormFieldsProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  setField: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
  mode: 'create' | 'alter';
  onSubmitPrompt: () => void;
}

const activeClass =
  'bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-full font-mono font-bold text-xs uppercase';
const inactiveClass =
  'border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-full font-mono font-bold text-xs uppercase';
const selectActiveClass =
  'bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-1.5 py-0.5 outline-none border w-24 font-mono font-bold text-xs appearance-none';
const selectInactiveClass =
  'border-transparent bg-transparent text-zinc-900 px-1.5 py-0.5 outline-none border w-24 font-mono font-bold text-xs appearance-none';

const getFocusableFields = (form: FormData) => {
  const showZeroRated =
    Number(form.rate_individual_with_pan || 0) === 0 && Number(form.rate_other_with_pan || 0) === 0;

  const fields: string[] = ['name', 'section', 'payment_code', 'remittance_code'];

  const isZero = form.is_zero_rated === 'Yes';
  if (!isZero) {
    fields.push('rate_individual_with_pan', 'rate_other_with_pan');
  }

  if (showZeroRated) {
    fields.push('is_zero_rated');
  }

  fields.push('threshold_limit');
  return fields;
};

export default function TDSNatureOfPaymentFormFields({
  form,
  setForm,
  setField,
  isPredefined = false,
  mode,
  onSubmitPrompt,
}: TDSNatureOfPaymentFormFieldsProps) {
  const [activeField, setActiveField] = useState<string>('name');

  // Input element refs
  const nameRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLInputElement>(null);
  const paymentCodeRef = useRef<HTMLInputElement>(null);
  const remittanceCodeRef = useRef<HTMLInputElement>(null);
  const rateIndWithPanRef = useRef<HTMLInputElement>(null);
  const rateOtherWithPanRef = useRef<HTMLInputElement>(null);
  const isZeroRatedRef = useRef<HTMLSelectElement>(null);
  const thresholdLimitRef = useRef<HTMLInputElement>(null);

  // Focus effect
  useEffect(() => {
    if (isPredefined) return;
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      name: nameRef,
      section: sectionRef,
      payment_code: paymentCodeRef,
      remittance_code: remittanceCodeRef,
      rate_individual_with_pan: rateIndWithPanRef,
      rate_other_with_pan: rateOtherWithPanRef,
      is_zero_rated: isZeroRatedRef,
      threshold_limit: thresholdLimitRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, isPredefined]);

  const showZeroRated =
    Number(form.rate_individual_with_pan || 0) === 0 && Number(form.rate_other_with_pan || 0) === 0;

  // Rate change helper
  const handleRateChange = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (val !== '' && isNaN(Number(val))) return;

    setForm((f) => {
      const newForm = { ...f, [key]: val };
      const hasRate =
        Number(newForm.rate_individual_with_pan || 0) > 0 ||
        Number(newForm.rate_other_with_pan || 0) > 0;

      if (hasRate) {
        newForm.is_zero_rated = 'No';
      }
      return newForm;
    });
  };

  // Zero-rated toggle helper
  const handleZeroRatedChange = (val: 'Yes' | 'No') => {
    setForm((f) => {
      const newForm = { ...f, is_zero_rated: val };
      if (val === 'Yes') {
        newForm.rate_individual_with_pan = '0';
        newForm.rate_other_with_pan = '0';
      }
      return newForm;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    if (isPredefined) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const fields = getFocusableFields(form);
      const idx = fields.indexOf(activeField);
      if (idx === -1) return;

      if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) {
          onSubmitPrompt();
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

      // Quick Yes/No shortcuts
      if (activeField === 'is_zero_rated') {
        const key = e.key.toLowerCase();
        if (key === 'y' || key === 'n') {
          e.preventDefault();
          const val = key === 'y' ? 'Yes' : 'No';
          handleZeroRatedChange(val);
          if (idx < fields.length - 1) {
            setActiveField(fields[idx + 1]);
          } else {
            onSubmitPrompt();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField, form, isPredefined, onSubmitPrompt]);

  const cls = (f: string) => (activeField === f ? activeClass : inactiveClass);
  const selectCls = (f: string) => (activeField === f ? selectActiveClass : selectInactiveClass);

  return (
    // Self-managed Tally-style field walk (window keydown + activeField):
    // the global enter-nav must not double-handle Enter inside this zone.
    <div
      className="bg-white border-4 border-double border-zinc-400 w-[550px] shadow-2xl p-5 relative select-none font-mono text-[11px] text-zinc-950 animate-fade-in"
      data-enter-nav-ignore
    >
      {/* Title */}
      <div className="font-bold text-xs pb-3 mb-4 border-b border-zinc-200 tracking-wide text-zinc-900">
        TDS Nature of Payment {mode === 'create' ? 'Creation' : 'Alteration'}
      </div>

      <div className="grid grid-cols-[280px_10px_1fr] items-center gap-y-1.5">
        {/* Name */}
        <div className="text-zinc-700 font-bold pl-1">Name</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={nameRef}
            type="text"
            className={cls('name')}
            value={form.name}
            onChange={setField('name')}
            onFocus={() => setActiveField('name')}
            disabled={isPredefined}
          />
        </div>

        {/* Section */}
        <div className="text-zinc-700 pl-1">Section</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={sectionRef}
            type="text"
            className={cls('section')}
            value={form.section}
            onChange={setField('section')}
            onFocus={() => setActiveField('section')}
            disabled={isPredefined}
          />
        </div>

        {/* Payment code */}
        <div className="text-zinc-700 pl-1">Payment code</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={paymentCodeRef}
            type="text"
            className={cls('payment_code')}
            value={form.payment_code}
            onChange={setField('payment_code')}
            onFocus={() => setActiveField('payment_code')}
            disabled={isPredefined}
          />
        </div>

        {/* Remittance code */}
        <div className="text-zinc-700 pl-1">Remittance code</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={remittanceCodeRef}
            type="text"
            className={cls('remittance_code')}
            value={form.remittance_code}
            onChange={setField('remittance_code')}
            onFocus={() => setActiveField('remittance_code')}
            disabled={isPredefined}
          />
        </div>

        {/* Rates Section Header */}
        <div className="col-span-3 text-zinc-800 font-bold mt-2 border-b border-dashed border-zinc-200 pb-0.5 pl-1">
          Rate for individuals/HUF
        </div>

        {/* Individual Rate With PAN */}
        <div className="text-zinc-600 pl-6">With PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateIndWithPanRef}
            type="text"
            className={`${cls('rate_individual_with_pan')} w-24 text-right`}
            value={form.rate_individual_with_pan}
            onChange={handleRateChange('rate_individual_with_pan')}
            onFocus={() => setActiveField('rate_individual_with_pan')}
            disabled={isPredefined || form.is_zero_rated === 'Yes'}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        {/* Rates Section 2 Header */}
        <div className="col-span-3 text-zinc-800 font-bold mt-2 border-b border-dashed border-zinc-200 pb-0.5 pl-1">
          Rate for other deductee types
        </div>

        {/* Other Rate With PAN */}
        <div className="text-zinc-600 pl-6">With PAN</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div className="flex items-center gap-1">
          <input
            ref={rateOtherWithPanRef}
            type="text"
            className={`${cls('rate_other_with_pan')} w-24 text-right`}
            value={form.rate_other_with_pan}
            onChange={handleRateChange('rate_other_with_pan')}
            onFocus={() => setActiveField('rate_other_with_pan')}
            disabled={isPredefined || form.is_zero_rated === 'Yes'}
          />
          <span className="text-zinc-500 font-bold">%</span>
        </div>

        <div className="col-span-3 mt-2 border-b border-zinc-200" />

        {/* Is zero rated */}
        {showZeroRated && (
          <>
            <div className="text-zinc-700 pl-1">Is zero rated</div>
            <div className="text-zinc-400 text-center font-bold">:</div>
            <div>
              <select
                ref={isZeroRatedRef}
                className={selectCls('is_zero_rated')}
                value={form.is_zero_rated}
                onChange={(e) => handleZeroRatedChange(e.target.value as 'Yes' | 'No')}
                onFocus={() => setActiveField('is_zero_rated')}
                disabled={isPredefined}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </>
        )}

        {/* Threshold/exemption limit */}
        <div className="text-zinc-700 pl-1">Threshold/exemption limit</div>
        <div className="text-zinc-400 text-center font-bold">:</div>
        <div>
          <input
            ref={thresholdLimitRef}
            type="text"
            className={`${cls('threshold_limit')} w-36`}
            value={form.threshold_limit}
            onChange={(e) => {
              const val = e.target.value;
              if (val !== '' && isNaN(Number(val))) return;
              setField('threshold_limit')(e);
            }}
            onFocus={() => setActiveField('threshold_limit')}
            disabled={isPredefined}
          />
        </div>
      </div>
    </div>
  );
}
