import React from 'react';
import { FormRow } from '@/components/ui';
import type { FormData } from '../hooks/useGSTClassificationForm';

interface GSTClassificationFormFieldsProps {
  form: FormData;
  setField: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  addSlabRow: () => void;
  updateSlabRow: (index: number, field: keyof FormData['slabRows'][number], value: string) => void;
  removeSlabRow: (index: number) => void;
  isPredefined?: boolean;
}

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const cellCls =
  'w-full bg-transparent text-sm outline-none px-1 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const rowCls = 'flex items-center min-h-[26px]';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-1 pt-4 mb-1">
      {children}
    </div>
  );
}

export default function GSTClassificationFormFields({
  form,
  setField,
  addSlabRow,
  updateSlabRow,
  removeSlabRow,
  isPredefined = false,
}: GSTClassificationFormFieldsProps) {
  const hsnDisabled = isPredefined || form.hsn_sac_details === 'Not Defined';
  const gstDisabled = isPredefined || form.gst_rate_details === 'Not Defined';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
      <div className="p-3 space-y-1 max-w-3xl">
        <SectionLabel>HSN / SAC &amp; Related Details</SectionLabel>

        <FormRow label="Name" labelWidth="w-64" className={rowCls} required>
          <input
            autoFocus
            disabled={isPredefined}
            className={inputCls}
            placeholder="e.g. GST 18%"
            value={form.name}
            onChange={setField('name')}
          />
        </FormRow>

        <FormRow label="HSN / SAC Details" labelWidth="w-64" className={rowCls}>
          <select
            disabled={isPredefined}
            className={selectCls}
            value={form.hsn_sac_details}
            onChange={setField('hsn_sac_details')}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
          </select>
        </FormRow>

        <FormRow label="HSN / SAC" labelWidth="w-64" className={rowCls}>
          <input
            disabled={hsnDisabled}
            inputMode="numeric"
            pattern="[0-9]*"
            className={inputCls}
            placeholder="Enter HSN or SAC code"
            value={form.hsn_sac_code}
            onChange={setField('hsn_sac_code')}
            maxLength={8}
          />
        </FormRow>

        <FormRow label="Description" labelWidth="w-64" className={rowCls}>
          <input
            disabled={hsnDisabled}
            className={inputCls}
            placeholder="Optional description"
            value={form.description}
            onChange={setField('description')}
          />
        </FormRow>

        <SectionLabel>GST Rate &amp; Related Details</SectionLabel>

        <FormRow label="GST Rate Details" labelWidth="w-64" className={rowCls}>
          <select
            disabled={isPredefined}
            className={selectCls}
            value={form.gst_rate_details}
            onChange={setField('gst_rate_details')}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
            <option>Specify Slab-Based Rates</option>
          </select>
        </FormRow>

        {form.gst_rate_details === 'Specify Slab-Based Rates' ? (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 text-[10px] uppercase text-black tracking-wider font-bold">
              <div>Greater Than</div>
              <div>Up To</div>
              <div>Taxability Type</div>
              <div>GST Rate</div>
              <div className="text-right">Action</div>
            </div>
            {form.slabRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 items-center"
              >
                <input
                  disabled={isPredefined}
                  type="number"
                  min="0"
                  step="0.01"
                  className={cellCls}
                  value={row.greater_than}
                  onChange={(e) => updateSlabRow(index, 'greater_than', e.target.value)}
                />
                <input
                  disabled={isPredefined}
                  type="number"
                  min="0"
                  step="0.01"
                  className={cellCls}
                  value={row.up_to}
                  onChange={(e) => updateSlabRow(index, 'up_to', e.target.value)}
                />
                <select
                  disabled={isPredefined}
                  className={cellCls}
                  value={row.taxability}
                  onChange={(e) => updateSlabRow(index, 'taxability', e.target.value)}
                >
                  <option>Taxable</option>
                  <option>Exempt</option>
                  <option>Nil Rated</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    disabled={
                      isPredefined || row.taxability === 'Exempt' || row.taxability === 'Nil Rated'
                    }
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={cellCls}
                    value={row.gst_rate}
                    onChange={(e) => updateSlabRow(index, 'gst_rate', e.target.value)}
                  />
                  <span className="text-sm text-black">%</span>
                </div>
                <button
                  type="button"
                  disabled={isPredefined || form.slabRows.length === 1}
                  onClick={() => removeSlabRow(index)}
                  className="text-[10px] px-2 py-1 border border-black text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-black"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSlabRow}
              disabled={isPredefined}
              className="text-xs px-3 py-1 border border-black text-black hover:bg-black hover:text-white transition-colors disabled:opacity-40 font-medium"
            >
              Add Slab Line
            </button>
          </div>
        ) : (
          <>
            <FormRow label="Taxability Type" labelWidth="w-64" className={rowCls}>
              <select
                disabled={gstDisabled}
                className={selectCls}
                value={form.taxability}
                onChange={setField('taxability')}
              >
                <option>Unknown</option>
                <option>Taxable</option>
                <option>Exempt</option>
                <option>Nil Rated</option>
              </select>
            </FormRow>

            <FormRow label="GST Rate" labelWidth="w-64" className={rowCls}>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={
                    gstDisabled || form.taxability === 'Exempt' || form.taxability === 'Nil Rated'
                  }
                  className={`${inputCls} w-20 text-right`}
                  value={form.igst_rate}
                  onChange={setField('igst_rate')}
                />
                <span className="text-sm text-black">%</span>
              </div>
            </FormRow>
          </>
        )}

        {!gstDisabled && !isPredefined && (
          <div className="text-[11px] text-zinc-500 italic px-1 pt-1">
            {form.gst_rate_details === 'Specify Slab-Based Rates'
              ? 'Slab-based GST rates are enabled for this classification.'
              : 'Editing GST Rate will auto-fill Central and State tax as half each.'}
          </div>
        )}
      </div>
      <div className="flex-1" />
    </div>
  );
}
