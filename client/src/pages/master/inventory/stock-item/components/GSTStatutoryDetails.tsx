import type { RefObject } from 'react';
import { FormRow, inputCls, selectCls } from '@/components/ui';
import type { FormData, PanelType } from '../types';

interface GSTStatutoryDetailsProps {
  form: FormData;
  setVal: (key: keyof FormData, value: any) => void;
  setActivePanel: (panel: PanelType) => void;
  gstClassifications: any[];
  onOpenOtherStatutory: () => void;
  // Anchors for resuming Enter navigation after a classification panel closes.
  hsnClassRef?: RefObject<HTMLSpanElement | null>;
  rateClassRef?: RefObject<HTMLSpanElement | null>;
}

export default function GSTStatutoryDetails({
  form,
  setVal,
  setActivePanel,
  gstClassifications,
  onOpenOtherStatutory,
  hsnClassRef,
  rateClassRef,
}: GSTStatutoryDetailsProps) {
  const selectedHsnClsName =
    gstClassifications.find((c) => String(c.gc_id) === form.hsn_classification_id)?.name || '—';

  const selectedRateClsName =
    gstClassifications.find((c) => String(c.gc_id) === form.rate_classification_id)?.name || '—';

  const handleGstApplicabilityChange = (val: string) => {
    setVal('gst_applicable', val);
    if (val !== 'Applicable') {
      setVal('hsn_sac_details', 'as_per_company');
      setVal('hsn_sac', '');
      setVal('hsn_sac_description', '');
      setVal('hsn_classification_id', '');
      setVal('gst_rate_details', 'as_per_company');
      setVal('rate_classification_id', '');
      setVal('taxability_type', '');
      setVal('gst_rate', '0');
      setVal('type_of_supply', 'Goods');
    }
  };

  return (
    <div className="flex-1 min-w-0 px-6 pt-4 pb-2 overflow-y-auto flex flex-col gap-0 select-none border-l border-zinc-100">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
        Statutory Details
      </div>

      <FormRow
        label="GST applicability"
        labelWidth="w-52"
        className="flex items-center min-h-[26px]"
      >
        <select
          className={selectCls}
          value={form.gst_applicable}
          onChange={(e) => handleGstApplicabilityChange(e.target.value)}
        >
          <option value="Applicable">Applicable</option>
          <option value="Not Applicable">Not Applicable</option>
        </select>
      </FormRow>

      {form.gst_applicable === 'Applicable' && (
        <>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-3 mb-1">
            HSN/SAC &amp; Related Details
          </div>

          <FormRow
            label="HSN/SAC Details"
            labelWidth="w-52"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.hsn_sac_details}
              onChange={(e) => setVal('hsn_sac_details', e.target.value)}
            >
              <option value="as_per_company">As per Company/Stock Group</option>
              <option value="specify_here">Specify Details Here</option>
              <option value="use_classification">Use GST Classification</option>
              <option value="specify_in_voucher">Specify in Voucher</option>
            </select>
          </FormRow>

          {form.hsn_sac_details === 'as_per_company' && (
            <FormRow
              label="Source of details"
              labelWidth="w-52"
              className="flex items-center min-h-[26px]"
            >
              <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
            </FormRow>
          )}

          {form.hsn_sac_details === 'specify_here' && (
            <>
              <FormRow label="HSN/SAC" labelWidth="w-52" className="flex items-center min-h-[26px]">
                <input
                  className={inputCls}
                  value={form.hsn_sac}
                  onChange={(e) => setVal('hsn_sac', e.target.value)}
                  placeholder="Code"
                />
              </FormRow>
              <FormRow
                label="Description"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <input
                  className={inputCls}
                  value={form.hsn_sac_description}
                  onChange={(e) => setVal('hsn_sac_description', e.target.value)}
                  placeholder="Description"
                />
              </FormRow>
            </>
          )}

          {form.hsn_sac_details === 'use_classification' &&
            (() => {
              const cls = gstClassifications.find(
                (c) => String(c.gc_id) === form.hsn_classification_id,
              );
              return (
                <>
                  <FormRow
                    label="Classification"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span
                      ref={hsnClassRef}
                      tabIndex={0}
                      data-enter-click
                      role="button"
                      className="flex-1 text-left text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 px-1.5 py-0.5 border border-transparent hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-800 rounded transition-colors cursor-pointer outline-none"
                      onClick={() => setActivePanel('hsn_classification')}
                    >
                      {selectedHsnClsName}
                    </span>
                  </FormRow>
                  <FormRow
                    label="HSN/SAC"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span className="text-sm text-zinc-500 px-1.5">{cls?.hsn_sac_code || '—'}</span>
                  </FormRow>
                  <FormRow
                    label="Description"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span className="text-sm text-zinc-500 px-1.5">{cls?.description || '—'}</span>
                  </FormRow>
                </>
              );
            })()}

          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-3 mb-1">
            GST Rate &amp; Related Details
          </div>

          <FormRow
            label="GST Rate Details"
            labelWidth="w-52"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.gst_rate_details}
              onChange={(e) => setVal('gst_rate_details', e.target.value)}
            >
              <option value="as_per_company">As per Company/Stock Group</option>
              <option value="specify_here">Specify Details Here</option>
              <option value="use_classification">Use GST Classification</option>
              <option value="specify_in_voucher">Specify in Voucher</option>
            </select>
          </FormRow>

          {form.gst_rate_details === 'as_per_company' && (
            <>
              <FormRow
                label="Source of details"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
              </FormRow>
              <FormRow
                label="Taxability Type"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <span className="text-sm text-zinc-400 px-1.5">&nbsp;</span>
              </FormRow>
              <FormRow
                label="GST Rate"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <span className="text-sm text-zinc-400 px-1.5">0 %</span>
              </FormRow>
            </>
          )}

          {form.gst_rate_details === 'specify_here' && (
            <>
              <FormRow
                label="Taxability"
                labelWidth="w-52"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.taxability_type || 'Taxable'}
                  onChange={(e) => setVal('taxability_type', e.target.value)}
                >
                  <option value="Taxable">Taxable</option>
                  <option value="Exempt">Exempt</option>
                  <option value="Nil Rated">Nil Rated</option>
                  <option value="Non-GST">Non-GST</option>
                </select>
              </FormRow>
              {form.taxability_type === 'Taxable' && (
                <FormRow
                  label="GST Rate"
                  labelWidth="w-52"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    className="w-20 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.gst_rate}
                    onChange={(e) => setVal('gst_rate', e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-sm text-zinc-500 ml-1">%</span>
                </FormRow>
              )}
            </>
          )}

          {form.gst_rate_details === 'use_classification' &&
            (() => {
              const cls = gstClassifications.find(
                (c) => String(c.gc_id) === form.rate_classification_id,
              );
              return (
                <>
                  <FormRow
                    label="Classification"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span
                      ref={rateClassRef}
                      tabIndex={0}
                      data-enter-click
                      role="button"
                      className="flex-1 text-left text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 px-1.5 py-0.5 border border-transparent hover:border-zinc-200 hover:bg-zinc-50 focus:border-zinc-800 rounded transition-colors cursor-pointer outline-none"
                      onClick={() => setActivePanel('rate_classification')}
                    >
                      {selectedRateClsName}
                    </span>
                  </FormRow>
                  <FormRow
                    label="Taxability Type"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span className="text-sm text-zinc-500 px-1.5">{cls?.taxability || '—'}</span>
                  </FormRow>
                  <FormRow
                    label="GST Rate"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px]"
                  >
                    <span className="text-sm text-zinc-500 px-1.5">
                      {cls ? `${Number(cls.igst_rate)} %` : '—'}
                    </span>
                  </FormRow>
                </>
              );
            })()}

          <FormRow
            label="Type of Supply"
            labelWidth="w-52"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.type_of_supply}
              onChange={(e) => setVal('type_of_supply', e.target.value)}
            >
              <option value="Goods">Goods</option>
              <option value="Services">Services</option>
              <option value="Capital Goods">Capital Goods</option>
            </select>
          </FormRow>
        </>
      )}

      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-3 mb-1">
        Other Details
      </div>

      <FormRow
        label="Set/Alter other Statutory details"
        labelWidth="w-52"
        className="flex items-center min-h-[26px]"
      >
        <select
          className={selectCls}
          value={form.set_alter_statutory}
          onChange={(e) => {
            const val = e.target.value;
            setVal('set_alter_statutory', val);
            if (val === 'Yes') onOpenOtherStatutory();
          }}
        >
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </FormRow>

      <FormRow
        label="Rate of Duty (eg 5)"
        labelWidth="w-52"
        className="flex items-center min-h-[26px]"
      >
        <div className="flex items-center gap-1">
          <input
            className="w-20 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.rate_of_duty}
            onChange={(e) => setVal('rate_of_duty', e.target.value)}
            placeholder="0"
          />
          <span className="text-sm text-zinc-500">%</span>
        </div>
      </FormRow>
    </div>
  );
}
