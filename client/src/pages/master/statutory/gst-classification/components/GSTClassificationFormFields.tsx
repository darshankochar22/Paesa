import { useEffect, useRef } from 'react';
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
  activeField: string;
  setActiveField: (field: string) => void;
  onSubmitPrompt: () => void;
}

const activeClass = 'bg-[#ffea5d] border-[#e6c300] text-zinc-950';
const inactiveClass = 'border-transparent bg-transparent text-zinc-900';
const getSelectCls = (isActive: boolean, extra = '') =>
  `px-2 py-0.5 border outline-none font-bold transition-all ${isActive ? activeClass : `${inactiveClass} bg-transparent`} ${extra}`;
const getInputCls = (isActive: boolean, extra = '') =>
  `px-2 py-0.5 border outline-none font-bold transition-all ${isActive ? activeClass : `${inactiveClass} bg-transparent`} ${extra}`;

export const getGSTClassificationFocusableFields = (form: FormData) => {
  const fields: string[] = ['name', 'hsn_sac_details'];
  if (form.hsn_sac_details === 'Specify Details Here') {
    fields.push('hsn_sac_code', 'description');
  }
  fields.push('gst_rate_details');
  if (form.gst_rate_details === 'Specify Details Here') {
    fields.push('taxability');
    if (form.taxability === 'Taxable') {
      fields.push('igst_rate');
    }
  } else if (form.gst_rate_details === 'Specify Slab-Based Rates') {
    form.slabRows.forEach((_, index) => {
      fields.push(`slab_greater_than_${index}`);
      fields.push(`slab_up_to_${index}`);
      fields.push(`slab_taxability_${index}`);
      fields.push(`slab_gst_rate_${index}`);
    });
    fields.push('add_slab_row');
  }
  return fields;
};

export default function GSTClassificationFormFields({
  form,
  setField,
  addSlabRow,
  updateSlabRow,
  removeSlabRow,
  isPredefined = false,
  activeField,
  setActiveField,
  onSubmitPrompt,
}: GSTClassificationFormFieldsProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const hsnSacDetailsRef = useRef<HTMLSelectElement>(null);
  const hsnSacCodeRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const gstRateDetailsRef = useRef<HTMLSelectElement>(null);
  const taxabilityRef = useRef<HTMLSelectElement>(null);
  const igstRateRef = useRef<HTMLInputElement>(null);
  const addSlabRowRef = useRef<HTMLButtonElement>(null);
  const slabRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

  useEffect(() => {
    if (isPredefined) return;
    if (activeField.startsWith('slab_')) {
      slabRefs.current[activeField]?.focus();
      return;
    }
    const refMap: Record<
      string,
      React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>
    > = {
      name: nameRef,
      hsn_sac_details: hsnSacDetailsRef,
      hsn_sac_code: hsnSacCodeRef,
      description: descriptionRef,
      gst_rate_details: gstRateDetailsRef,
      taxability: taxabilityRef,
      igst_rate: igstRateRef,
      add_slab_row: addSlabRowRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, isPredefined]);

  useEffect(() => {
    if (isPredefined) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const fields = getGSTClassificationFocusableFields(form);
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeField, form, isPredefined, onSubmitPrompt, setActiveField]);
  const dis = (extra = '') =>
    `${extra} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`.trim();
  const hsnDisabled = isPredefined || form.hsn_sac_details === 'Not Defined';
  const gstDisabled = isPredefined || form.gst_rate_details === 'Not Defined';

  return (
    // Self-managed Tally-style field walk (window keydown + activeField):
    // the global enter-nav must not double-handle Enter inside this zone.
    <div
      className="flex-1 overflow-y-auto p-3 bg-white border-r border-zinc-100 font-mono text-[11px]"
      data-enter-nav-ignore
    >
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none pb-1">
          HSN / SAC &amp; Related Details
        </div>

        <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            ref={nameRef}
            disabled={isPredefined}
            className={getInputCls(activeField === 'name', dis())}
            placeholder="e.g. GST 18%"
            value={form.name}
            onChange={setField('name')}
            onFocus={() => setActiveField('name')}
          />
        </FormRow>

        <FormRow
          label="HSN / SAC Details"
          labelWidth="w-64"
          className="flex items-center min-h-[26px]"
        >
          <select
            ref={hsnSacDetailsRef}
            disabled={isPredefined}
            className={getSelectCls(activeField === 'hsn_sac_details', dis('w-44'))}
            value={form.hsn_sac_details}
            onChange={setField('hsn_sac_details')}
            onFocus={() => setActiveField('hsn_sac_details')}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
          </select>
        </FormRow>

        <FormRow label="HSN / SAC" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            ref={hsnSacCodeRef}
            disabled={hsnDisabled}
            inputMode="numeric"
            pattern="[0-9]*"
            className={getInputCls(activeField === 'hsn_sac_code', dis())}
            placeholder="Enter HSN or SAC code"
            value={form.hsn_sac_code}
            onChange={setField('hsn_sac_code')}
            onFocus={() => setActiveField('hsn_sac_code')}
            maxLength={8}
          />
        </FormRow>

        <FormRow label="Description" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            ref={descriptionRef}
            disabled={hsnDisabled}
            className={getInputCls(activeField === 'description', dis())}
            placeholder="Optional description"
            value={form.description}
            onChange={setField('description')}
            onFocus={() => setActiveField('description')}
          />
        </FormRow>
      </div>

      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none pb-1">
          GST Rate &amp; Related Details
        </div>

        <FormRow
          label="GST Rate Details"
          labelWidth="w-64"
          className="flex items-center min-h-[26px]"
        >
          <select
            ref={gstRateDetailsRef}
            disabled={isPredefined}
            className={getSelectCls(activeField === 'gst_rate_details', dis('w-44'))}
            value={form.gst_rate_details}
            onChange={setField('gst_rate_details')}
            onFocus={() => setActiveField('gst_rate_details')}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
            <option>Specify Slab-Based Rates</option>
          </select>
        </FormRow>

        {form.gst_rate_details === 'Specify Slab-Based Rates' ? (
          <div className="space-y-2">
            <div className="text-[11px] uppercase font-bold text-zinc-400 select-none">
              Slab-Based Tax Rate Details
            </div>
            <div className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 text-[10px] uppercase text-zinc-500 tracking-wider mb-2">
              <div>Greater Than</div>
              <div>Up To</div>
              <div>Taxability Type</div>
              <div>GST Rate</div>
              <div className="text-right">Action</div>
            </div>
            {form.slabRows.map((row, index) => {
              const gtField = `slab_greater_than_${index}`;
              const utField = `slab_up_to_${index}`;
              const txField = `slab_taxability_${index}`;
              const rateField = `slab_gst_rate_${index}`;

              return (
                <div
                  key={index}
                  className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 items-center"
                >
                  <input
                    ref={(el) => {
                      slabRefs.current[gtField] = el;
                    }}
                    disabled={isPredefined}
                    type="number"
                    min="0"
                    step="0.01"
                    className={getInputCls(activeField === gtField, dis())}
                    value={row.greater_than}
                    onChange={(e) => updateSlabRow(index, 'greater_than', e.target.value)}
                    onFocus={() => setActiveField(gtField)}
                  />
                  <input
                    ref={(el) => {
                      slabRefs.current[utField] = el;
                    }}
                    disabled={isPredefined}
                    type="number"
                    min="0"
                    step="0.01"
                    className={getInputCls(activeField === utField, dis())}
                    value={row.up_to}
                    onChange={(e) => updateSlabRow(index, 'up_to', e.target.value)}
                    onFocus={() => setActiveField(utField)}
                  />
                  <select
                    ref={(el) => {
                      slabRefs.current[txField] = el;
                    }}
                    disabled={isPredefined}
                    className={getSelectCls(activeField === txField, dis('w-full'))}
                    value={row.taxability}
                    onChange={(e) => updateSlabRow(index, 'taxability', e.target.value)}
                    onFocus={() => setActiveField(txField)}
                  >
                    <option>Taxable</option>
                    <option>Exempt</option>
                    <option>Nil Rated</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      ref={(el) => {
                        slabRefs.current[rateField] = el;
                      }}
                      disabled={
                        isPredefined ||
                        row.taxability === 'Exempt' ||
                        row.taxability === 'Nil Rated'
                      }
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={getInputCls(activeField === rateField, dis('w-20'))}
                      value={row.gst_rate}
                      onChange={(e) => updateSlabRow(index, 'gst_rate', e.target.value)}
                      onFocus={() => setActiveField(rateField)}
                    />
                    <span className="text-xs text-zinc-400">%</span>
                  </div>
                  <button
                    type="button"
                    disabled={isPredefined || form.slabRows.length === 1}
                    onClick={() => removeSlabRow(index)}
                    className="text-[10px] px-2 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <button
              ref={addSlabRowRef}
              type="button"
              onClick={addSlabRow}
              disabled={isPredefined}
              onFocus={() => setActiveField('add_slab_row')}
              className={`text-xs px-3 py-1 rounded transition-colors disabled:opacity-50 font-bold border ${activeField === 'add_slab_row' ? 'bg-[#ffea5d] border-[#e6c300] text-zinc-950' : 'bg-zinc-100 border-transparent text-zinc-700 hover:bg-zinc-200'}`}
            >
              Add Slab Line
            </button>
          </div>
        ) : (
          <>
            <FormRow
              label="Taxability Type"
              labelWidth="w-64"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={taxabilityRef}
                disabled={gstDisabled}
                className={getSelectCls(activeField === 'taxability', dis('w-44'))}
                value={form.taxability}
                onChange={setField('taxability')}
                onFocus={() => setActiveField('taxability')}
              >
                <option>Unknown</option>
                <option>Taxable</option>
                <option>Exempt</option>
                <option>Nil Rated</option>
              </select>
            </FormRow>

            <FormRow label="GST Rate" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-1">
                <input
                  ref={igstRateRef}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={
                    gstDisabled || form.taxability === 'Exempt' || form.taxability === 'Nil Rated'
                  }
                  className={getInputCls(activeField === 'igst_rate', dis('w-20'))}
                  value={form.igst_rate}
                  onChange={setField('igst_rate')}
                  onFocus={() => setActiveField('igst_rate')}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </FormRow>
          </>
        )}

        {!gstDisabled && !isPredefined && (
          <div className="text-[10px] text-zinc-400 italic px-1.5 pt-1 font-sans">
            {form.gst_rate_details === 'Specify Slab-Based Rates'
              ? 'Slab-based GST rates are enabled for this classification.'
              : 'Editing GST Rate will auto-fill Central and State tax as half each.'}
          </div>
        )}
      </div>
    </div>
  );
}
