import React from 'react';
import { FormRow } from '@/components/ui';
import type { FormData } from '../hooks/useTDSNatureOfPaymentForm';

interface TDSNatureOfPaymentFormFieldsProps {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  setField: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
}

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const numCls =
  'w-24 text-right bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const rowCls = 'flex items-center min-h-[26px]';
const LABEL_W = 'w-72';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-1 pt-4 mb-1">
      {children}
    </div>
  );
}

export default function TDSNatureOfPaymentFormFields({
  form,
  setForm,
  setField,
  isPredefined = false,
}: TDSNatureOfPaymentFormFieldsProps) {
  const showZeroRated =
    Number(form.rate_individual_with_pan || 0) === 0 && Number(form.rate_other_with_pan || 0) === 0;

  const ratesDisabled = isPredefined || form.is_zero_rated === 'Yes';

  const handleRateChange = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val !== '' && isNaN(Number(val))) return;
    setForm((f) => {
      const newForm = { ...f, [key]: val };
      const hasRate =
        Number(newForm.rate_individual_with_pan || 0) > 0 ||
        Number(newForm.rate_other_with_pan || 0) > 0;
      if (hasRate) newForm.is_zero_rated = 'No';
      return newForm;
    });
  };

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

  const handleNumeric = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val !== '' && isNaN(Number(val))) return;
    setField(key)(e);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
      <div className="p-3 space-y-1 max-w-2xl">
        <FormRow label="Name" labelWidth={LABEL_W} className={rowCls} required>
          <input
            autoFocus
            disabled={isPredefined}
            className={inputCls}
            value={form.name}
            onChange={setField('name')}
          />
        </FormRow>

        <FormRow label="Section" labelWidth={LABEL_W} className={rowCls}>
          <input
            disabled={isPredefined}
            className={inputCls}
            value={form.section}
            onChange={setField('section')}
          />
        </FormRow>

        <FormRow label="Payment code" labelWidth={LABEL_W} className={rowCls}>
          <input
            disabled={isPredefined}
            className={inputCls}
            value={form.payment_code}
            onChange={setField('payment_code')}
          />
        </FormRow>

        <FormRow label="Remittance code" labelWidth={LABEL_W} className={rowCls}>
          <input
            disabled={isPredefined}
            className={inputCls}
            value={form.remittance_code}
            onChange={setField('remittance_code')}
          />
        </FormRow>

        <SectionLabel>Rate for individuals / HUF</SectionLabel>

        <FormRow label="With PAN" labelWidth={LABEL_W} className={rowCls}>
          <div className="flex items-center gap-1">
            <input
              disabled={ratesDisabled}
              className={numCls}
              value={form.rate_individual_with_pan}
              onChange={handleRateChange('rate_individual_with_pan')}
            />
            <span className="text-sm text-black">%</span>
          </div>
        </FormRow>

        <SectionLabel>Rate for other deductee types</SectionLabel>

        <FormRow label="With PAN" labelWidth={LABEL_W} className={rowCls}>
          <div className="flex items-center gap-1">
            <input
              disabled={ratesDisabled}
              className={numCls}
              value={form.rate_other_with_pan}
              onChange={handleRateChange('rate_other_with_pan')}
            />
            <span className="text-sm text-black">%</span>
          </div>
        </FormRow>

        <SectionLabel>Other Details</SectionLabel>

        {showZeroRated && (
          <FormRow label="Is zero rated" labelWidth={LABEL_W} className={rowCls}>
            <select
              disabled={isPredefined}
              className={selectCls}
              value={form.is_zero_rated}
              onChange={(e) => handleZeroRatedChange(e.target.value as 'Yes' | 'No')}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>
        )}

        <FormRow label="Threshold / exemption limit" labelWidth={LABEL_W} className={rowCls}>
          <input
            disabled={isPredefined}
            className={`${inputCls} w-36`}
            value={form.threshold_limit}
            onChange={handleNumeric('threshold_limit')}
          />
        </FormRow>
      </div>
      <div className="flex-1" />
    </div>
  );
}
