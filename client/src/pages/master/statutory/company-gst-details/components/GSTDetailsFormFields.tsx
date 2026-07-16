// All form fields for the Company GST Details dialog.
// Renders the two-column layout (left: HSN/SAC + GST Rate; right: e-Way Bill + Additional Config).
// Pure presentational component — all state lives in CompanyGSTDetailsModal.
//
// Field conventions (match the Ledger master):
//  - text/number inputs  → shared inputCls / numCls (bordered box, focus border)
//  - list-pick dropdowns → bordered box that opens the right-side list panel
//  - Yes/No              → native <select> that toggles in place (no list popup)

import { useEffect, useRef } from 'react';
import { FormRow, inputCls, numCls, selectCls } from '@/components/ui';
import type { CompanyGSTDetails } from '@/types/entities/CompanyGSTDetails';
import type { SlabRow } from './SlabBasedRateDetails';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

interface SectionHeadingProps {
  children: React.ReactNode;
}

function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="font-bold text-zinc-900 border-b border-zinc-200 pb-0.5 tracking-wider uppercase text-[10px]">
      {children}
    </div>
  );
}

// Shared row layout so field spacing/labels stay consistent with every other master.
const ROW_CLASS = 'flex items-center min-h-[26px]';
const LEFT_LABEL = 'w-36';
const RIGHT_LABEL = 'w-60';

// List-pick field: a bordered box (same border behaviour as Ledger's inputs)
// that opens the right-side list panel on click.
const fieldBox = (isActive: boolean) =>
  `text-sm px-1.5 py-0.5 rounded border bg-white/50 cursor-pointer select-none font-medium transition-colors ${
    isActive ? 'border-zinc-800' : 'border-transparent hover:border-zinc-200'
  }`;

// Native Yes/No <select> — toggles in place, exactly like Ledger (no list popup).
// Module-scoped so it is not remounted on every parent render (which would drop focus).
function YesNoSelect({
  field,
  value,
  selectRef,
  setActiveField,
  onSelectValue,
}: {
  field: keyof CompanyGSTDetails;
  value: boolean;
  selectRef: React.Ref<HTMLSelectElement>;
  setActiveField: (field: string) => void;
  onSelectValue: (field: string, val: string) => void;
}) {
  return (
    <select
      ref={selectRef}
      className={selectCls}
      value={value ? 'Yes' : 'No'}
      onFocus={() => setActiveField(field)}
      onChange={(e) => onSelectValue(field, e.target.value)}
    >
      <option value="No">No</option>
      <option value="Yes">Yes</option>
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface GSTDetailsFormFieldsProps {
  form: CompanyGSTDetails;
  gstRateDetails: string;
  activeField: string;
  setActiveField: (field: string) => void;
  setField: (key: keyof CompanyGSTDetails, value: unknown) => void;
  /** Applies a chosen value (drives Yes/No selects + list picks) with side effects. */
  onSelectValue: (field: string, val: string) => void;
  slabRows?: SlabRow[];
  onOpenSlab?: () => void;
  hasGSTRegistrations?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GSTDetailsFormFields({
  form,
  gstRateDetails,
  activeField,
  setActiveField,
  setField,
  onSelectValue,
  slabRows: _slabRows = [],
  onOpenSlab: _onOpenSlab,
  hasGSTRegistrations,
}: GSTDetailsFormFieldsProps) {
  const hsnCodeRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const interLimitRef = useRef<HTMLInputElement>(null);
  const intraLimitRef = useRef<HTMLInputElement>(null);
  const advanceDateRef = useRef<HTMLInputElement>(null);
  const stateWiseRef = useRef<HTMLSelectElement>(null);
  const showAdvancesRef = useRef<HTMLSelectElement>(null);
  const updateStatusRef = useRef<HTMLSelectElement>(null);
  const gstReturnsRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (activeField === 'hsnSacCode') hsnCodeRef.current?.focus();
    else if (activeField === 'description') descRef.current?.focus();
    else if (activeField === 'gstRate') rateRef.current?.focus();
    else if (activeField === 'interstateThresholdLimit') interLimitRef.current?.focus();
    else if (activeField === 'intrastateThresholdLimit') intraLimitRef.current?.focus();
    else if (activeField === 'gstAdvancesApplicableFrom') advanceDateRef.current?.focus();
    else if (activeField === 'setStateWiseThresholdLimit') stateWiseRef.current?.focus();
    else if (activeField === 'showGSTAdvances') showAdvancesRef.current?.focus();
    else if (activeField === 'updateGSTStatus') updateStatusRef.current?.focus();
    else if (activeField === 'gstReturnsConfigured') gstReturnsRef.current?.focus();
  }, [activeField]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex min-h-0">
      {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
      <div className="w-1/2 pr-6 space-y-6">
        {/* Section: HSN/SAC & Related Details */}
        <div className="space-y-3">
          <SectionHeading>HSN/SAC &amp; Related Details</SectionHeading>

          <div className="space-y-1.5 pl-2">
            {/* HSN/SAC Details (list) */}
            <FormRow label="HSN/SAC Details" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
              <div
                onClick={() => setActiveField('hsnSacType')}
                className={`${fieldBox(activeField === 'hsnSacType')} w-full`}
              >
                {form.hsnSacType}
              </div>
            </FormRow>

            {/* Classification — only when hsnSacType is "Use GST Classification" */}
            {form.hsnSacType === 'Use GST Classification' && (
              <FormRow label="Classification" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <div
                  onClick={() => setActiveField('gstClassification')}
                  className={`${fieldBox(activeField === 'gstClassification')} w-full`}
                >
                  {form.gstClassification || 'Not Selected'}
                </div>
              </FormRow>
            )}

            {/* HSN/SAC code */}
            {form.hsnSacType === 'Specify Details Here' ? (
              <FormRow label="HSN/SAC" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <input
                  ref={hsnCodeRef}
                  type="text"
                  maxLength={8}
                  value={form.hsnSacCode}
                  onChange={(e) => setField('hsnSacCode', e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setActiveField('hsnSacCode')}
                  className={`${inputCls} w-32`}
                />
              </FormRow>
            ) : form.hsnSacType === 'Not Defined' ||
              form.hsnSacType === 'Use GST Classification' ? (
              <FormRow label="HSN/SAC" labelWidth={LEFT_LABEL} className={ROW_CLASS} disabled>
                <div className="w-full"></div>
              </FormRow>
            ) : null}

            {/* Description */}
            {form.hsnSacType === 'Specify Details Here' ? (
              <FormRow label="Description" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <input
                  ref={descRef}
                  type="text"
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  onFocus={() => setActiveField('description')}
                  className={`${inputCls} w-full`}
                />
              </FormRow>
            ) : form.hsnSacType === 'Not Defined' ||
              form.hsnSacType === 'Use GST Classification' ? (
              <FormRow label="Description" labelWidth={LEFT_LABEL} className={ROW_CLASS} disabled>
                <div className="w-full"></div>
              </FormRow>
            ) : null}
          </div>
        </div>

        {/* Section: GST Rate & Related Details */}
        <div className="space-y-3">
          <SectionHeading>GST Rate &amp; Related Details</SectionHeading>

          <div className="space-y-1.5 pl-2">
            {/* GST Rate Details (list) */}
            <FormRow label="GST Rate Details" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
              <div
                onClick={() => setActiveField('gstRateDetails')}
                className={`${fieldBox(activeField === 'gstRateDetails')} w-full`}
              >
                {gstRateDetails}
              </div>
            </FormRow>

            {/* Classification — only when gstRateDetails is "Use GST Classification" */}
            {gstRateDetails === 'Use GST Classification' && (
              <FormRow label="Classification" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <div
                  onClick={() => setActiveField('gstClassification')}
                  className={`${fieldBox(activeField === 'gstClassification')} w-full`}
                >
                  {form.gstClassification || 'Not Selected'}
                </div>
              </FormRow>
            )}

            {/* Taxability Type */}
            {gstRateDetails === 'Specify Details Here' ? (
              <FormRow label="Taxability Type" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <div
                  onClick={() => setActiveField('taxabilityType')}
                  className={`${fieldBox(activeField === 'taxabilityType')} w-full`}
                >
                  {form.taxabilityType}
                </div>
              </FormRow>
            ) : gstRateDetails === 'Not Defined' || gstRateDetails === 'Use GST Classification' ? (
              <FormRow
                label="Taxability Type"
                labelWidth={LEFT_LABEL}
                className={ROW_CLASS}
                disabled
              >
                <div className="w-full"></div>
              </FormRow>
            ) : null}

            {/* GST Rate */}
            {gstRateDetails === 'Specify Details Here' && form.taxabilityType === 'Taxable' ? (
              <FormRow label="GST Rate" labelWidth={LEFT_LABEL} className={ROW_CLASS}>
                <div className="flex items-center gap-1.5 w-32">
                  <input
                    ref={rateRef}
                    type="number"
                    min={0}
                    max={100}
                    value={form.gstRate || ''}
                    onChange={(e) => setField('gstRate', Number(e.target.value))}
                    onFocus={() => setActiveField('gstRate')}
                    className={`${numCls} w-full`}
                  />
                  <span className="font-bold text-zinc-600">%</span>
                </div>
              </FormRow>
            ) : gstRateDetails === 'Not Defined' ||
              gstRateDetails === 'Use GST Classification' ||
              (gstRateDetails === 'Specify Details Here' && form.taxabilityType !== 'Taxable') ? (
              <FormRow label="GST Rate" labelWidth={LEFT_LABEL} className={ROW_CLASS} disabled>
                <div className="flex items-center gap-1.5 w-32 pl-2">
                  <span className="w-full text-right text-zinc-500 pr-[10px]">0</span>
                  <span className="font-bold text-zinc-500">%</span>
                </div>
              </FormRow>
            ) : null}
          </div>
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="w-[1px] bg-zinc-200 shrink-0" />

      {/* ── RIGHT COLUMN ─────────────────────────────────────────────────── */}
      <div className="w-1/2 pl-6 space-y-6">
        {/* Section: e-Way Bill Details */}
        <div className="space-y-3">
          <SectionHeading>e-Way Bill Details</SectionHeading>

          <div className="space-y-1.5 pl-2">
            {/* Interstate Threshold Limit */}
            <FormRow
              label="Interstate Threshold Limit"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
            >
              <input
                ref={interLimitRef}
                type="text"
                value={form.interstateThresholdLimit.toLocaleString('en-IN')}
                onChange={(e) =>
                  setField(
                    'interstateThresholdLimit',
                    Number(e.target.value.replace(/,/g, '')) || 0,
                  )
                }
                onFocus={() => setActiveField('interstateThresholdLimit')}
                className={`${numCls} w-32`}
              />
            </FormRow>

            {hasGSTRegistrations ? (
              <FormRow
                label="Set State-wise Threshold Limit"
                labelWidth={RIGHT_LABEL}
                className={ROW_CLASS}
              >
                <YesNoSelect
                  field="setStateWiseThresholdLimit"
                  value={form.setStateWiseThresholdLimit}
                  selectRef={stateWiseRef}
                  setActiveField={setActiveField}
                  onSelectValue={onSelectValue}
                />
              </FormRow>
            ) : (
              <FormRow
                label="Intrastate Threshold Limit"
                labelWidth={RIGHT_LABEL}
                className={ROW_CLASS}
              >
                <input
                  ref={intraLimitRef}
                  type="text"
                  value={form.intrastateThresholdLimit.toLocaleString('en-IN')}
                  onChange={(e) =>
                    setField(
                      'intrastateThresholdLimit',
                      Number(e.target.value.replace(/,/g, '')) || 0,
                    )
                  }
                  onFocus={() => setActiveField('intrastateThresholdLimit')}
                  className={`${numCls} w-32`}
                />
              </FormRow>
            )}

            {/* Threshold Limit Includes (list) */}
            <FormRow
              label="Threshold Limit includes"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
            >
              <div
                onClick={() => setActiveField('thresholdLimitIncludes')}
                className={`${fieldBox(activeField === 'thresholdLimitIncludes')} w-full`}
              >
                {form.thresholdLimitIncludes}
              </div>
            </FormRow>
          </div>
        </div>

        {/* Section: Additional Configuration */}
        <div className="space-y-3">
          <SectionHeading>Additional Configuration</SectionHeading>

          <div className="space-y-1.5 pl-2">
            {/* Create HSN/SAC Summary For (list) */}
            <FormRow
              label="Create HSN/SAC summary for"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
            >
              <div
                onClick={() => setActiveField('createHSNSummaryFor')}
                className={`${fieldBox(activeField === 'createHSNSummaryFor')} w-full`}
              >
                {form.createHSNSummaryFor}
              </div>
            </FormRow>

            {/* Minimum Length of HSN/SAC */}
            {form.createHSNSummaryFor === 'None' ? (
              <FormRow
                label="Minimum length of HSN/SAC"
                labelWidth={RIGHT_LABEL}
                className={ROW_CLASS}
                subLabel="(based on annual turnover)"
                disabled
              >
                <div className="w-full"></div>
              </FormRow>
            ) : (
              <FormRow
                label="Minimum length of HSN/SAC"
                labelWidth={RIGHT_LABEL}
                className={ROW_CLASS}
                subLabel="(based on annual turnover)"
              >
                <div
                  onClick={() => setActiveField('minimumHSNLength')}
                  className={`${fieldBox(activeField === 'minimumHSNLength')} w-16 text-right`}
                >
                  {form.minimumHSNLength}
                </div>
              </FormRow>
            )}

            {/* Show GST Advances (Yes/No) */}
            <FormRow
              label="Show GST Advances for adjustments in transaction"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
            >
              <YesNoSelect
                field="showGSTAdvances"
                value={form.showGSTAdvances}
                selectRef={showAdvancesRef}
                setActiveField={setActiveField}
                onSelectValue={onSelectValue}
              />
            </FormRow>

            {form.showGSTAdvances && (
              <FormRow
                label="Applicable from"
                labelWidth={RIGHT_LABEL}
                className={ROW_CLASS}
                subLabel="(Enter a Date after the period when you have reported your liabilities in Returns using Journal Vouchers)"
              >
                <input
                  ref={advanceDateRef}
                  type="date"
                  className={`${inputCls} w-full uppercase`}
                  value={form.gstAdvancesApplicableFrom || ''}
                  onChange={(e) => setField('gstAdvancesApplicableFrom', e.target.value)}
                  onFocus={() => setActiveField('gstAdvancesApplicableFrom')}
                />
              </FormRow>
            )}

            {/* Update GST Status (Yes/No) */}
            <FormRow
              label="Update GST Status of Vouchers after Master Alteration"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
              subLabel="(Set this to No, to update from GST Reports)"
            >
              <YesNoSelect
                field="updateGSTStatus"
                value={form.updateGSTStatus}
                selectRef={updateStatusRef}
                setActiveField={setActiveField}
                onSelectValue={onSelectValue}
              />
            </FormRow>

            {/* Set/Alter GST Returns (Yes/No) */}
            <FormRow
              label="Set/Alter details for downloading GST Returns"
              labelWidth={RIGHT_LABEL}
              className={ROW_CLASS}
            >
              <YesNoSelect
                field="gstReturnsConfigured"
                value={form.gstReturnsConfigured}
                selectRef={gstReturnsRef}
                setActiveField={setActiveField}
                onSelectValue={onSelectValue}
              />
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  );
}
