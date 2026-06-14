// All form fields for the Company GST Details dialog.
// Renders the two-column layout (left: HSN/SAC + GST Rate; right: e-Way Bill + Additional Config).
// Pure presentational component — all state lives in CompanyGSTDetailsModal.

import { useEffect, useRef } from "react";
import type { CompanyGSTDetails } from "@/types/entities/CompanyGSTDetails";
import type { SlabRow } from "./SlabBasedRateDetails";

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

interface FieldRowProps {
  label: string;
  labelWidth: string;
  subLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function FieldRow({ label, labelWidth, subLabel, disabled, children }: FieldRowProps) {
  return (
    <div
      className="grid items-center min-h-[24px]"
      style={{ gridTemplateColumns: `${labelWidth} 10px 1fr` }}
    >
      <div>
        <span className={disabled ? "text-zinc-400" : "text-zinc-700"}>{label}</span>
        {subLabel && (
          <span className="text-zinc-400 block text-[9px] pl-4 italic leading-tight">{subLabel}</span>
        )}
      </div>
      <span className="text-zinc-400 text-center">:</span>
      <div className="flex items-center">{children}</div>
    </div>
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
  slabRows?: SlabRow[];
  onOpenSlab?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared field classes
// ─────────────────────────────────────────────────────────────────────────────

const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950";
const inactiveClass = "border-transparent bg-transparent text-zinc-900";
const dropdownClass = (isActive: boolean) =>
  `px-2 py-0.5 border cursor-pointer font-bold select-none ${isActive ? activeClass : inactiveClass}`;
const inputClass = (isActive: boolean) =>
  `px-2 py-0.5 border outline-none font-bold ${isActive ? activeClass : inactiveClass}`;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GSTDetailsFormFields({
  form,
  gstRateDetails,
  activeField,
  setActiveField,
  setField,
  slabRows: _slabRows = [],
  onOpenSlab: _onOpenSlab,
}: GSTDetailsFormFieldsProps) {
  const hsnCodeRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  const rateRef = useRef<HTMLInputElement>(null);
  const interLimitRef = useRef<HTMLInputElement>(null);
  const intraLimitRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeField === "hsnSacCode") hsnCodeRef.current?.focus();
    else if (activeField === "description") descRef.current?.focus();
    else if (activeField === "gstRate") rateRef.current?.focus();
    else if (activeField === "interstateThresholdLimit") interLimitRef.current?.focus();
    else if (activeField === "intrastateThresholdLimit") intraLimitRef.current?.focus();
  }, [activeField]);


  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex min-h-0">

      {/* ── LEFT COLUMN ──────────────────────────────────────────────────── */}
      <div className="w-1/2 pr-6 space-y-6">

        {/* Section: HSN/SAC & Related Details */}
        <div className="space-y-3">
          <SectionHeading>HSN/SAC &amp; Related Details</SectionHeading>

          <div className="space-y-1.5 pl-2">

            {/* HSN/SAC Details (dropdown) */}
            <FieldRow label="HSN/SAC Details" labelWidth="140px">
              <div
                onClick={() => setActiveField("hsnSacType")}
                className={`${dropdownClass(activeField === "hsnSacType")} flex-1`}
              >
                ♦ {form.hsnSacType}
              </div>
            </FieldRow>

            {/* Classification — only when hsnSacType is "Use GST Classification" */}
            {form.hsnSacType === "Use GST Classification" && (
              <FieldRow label="Classification" labelWidth="140px">
                <div
                  onClick={() => setActiveField("gstClassification")}
                  className={`${dropdownClass(activeField === "gstClassification")} flex-1`}
                >
                  {form.gstClassification || "Not Selected"}
                </div>
              </FieldRow>
            )}

            {/* HSN/SAC code */}
            {form.hsnSacType === "Specify Details Here" ? (
              <FieldRow label="HSN/SAC" labelWidth="140px">
                <input
                  ref={hsnCodeRef}
                  type="text"
                  maxLength={8}
                  value={form.hsnSacCode}
                  onChange={(e) => setField("hsnSacCode", e.target.value.replace(/\D/g, ""))}
                  onFocus={() => setActiveField("hsnSacCode")}
                  className={`${inputClass(activeField === "hsnSacCode")} w-32`}
                />
              </FieldRow>
            ) : form.hsnSacType === "Not Defined" || form.hsnSacType === "Use GST Classification" ? (
              <FieldRow label="HSN/SAC" labelWidth="140px" disabled>
                <div className="flex-1"></div>
              </FieldRow>
            ) : null}

            {/* Description */}
            {form.hsnSacType === "Specify Details Here" ? (
              <FieldRow label="Description" labelWidth="140px">
                <input
                  ref={descRef}
                  type="text"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  onFocus={() => setActiveField("description")}
                  className={`${inputClass(activeField === "description")} flex-1`}
                />
              </FieldRow>
            ) : form.hsnSacType === "Not Defined" || form.hsnSacType === "Use GST Classification" ? (
              <FieldRow label="Description" labelWidth="140px" disabled>
                <div className="flex-1"></div>
              </FieldRow>
            ) : null}
          </div>
        </div>

        {/* Section: GST Rate & Related Details */}
        <div className="space-y-3">
          <SectionHeading>GST Rate &amp; Related Details</SectionHeading>

          <div className="space-y-1.5 pl-2">

            {/* GST Rate Details (dropdown) */}
            <FieldRow label="GST Rate Details" labelWidth="140px">
              <div
                onClick={() => setActiveField("gstRateDetails")}
                className={`${dropdownClass(activeField === "gstRateDetails")} flex-1`}
              >
                ♦ {gstRateDetails}
              </div>
            </FieldRow>

            {/* Classification — only when gstRateDetails is "Use GST Classification" */}
            {gstRateDetails === "Use GST Classification" && (
              <FieldRow label="Classification" labelWidth="140px">
                <div
                  onClick={() => setActiveField("gstClassification")}
                  className={`${dropdownClass(activeField === "gstClassification")} flex-1`}
                >
                  {form.gstClassification || "Not Selected"}
                </div>
              </FieldRow>
            )}

            {/* Taxability Type */}
            {gstRateDetails === "Specify Details Here" ? (
              <FieldRow label="Taxability Type" labelWidth="140px">
                <div
                  onClick={() => setActiveField("taxabilityType")}
                  className={`${dropdownClass(activeField === "taxabilityType")} flex-1`}
                >
                  {form.taxabilityType}
                </div>
              </FieldRow>
            ) : gstRateDetails === "Not Defined" || gstRateDetails === "Use GST Classification" ? (
              <FieldRow label="Taxability Type" labelWidth="140px" disabled>
                <div className="flex-1"></div>
              </FieldRow>
            ) : null}

            {/* GST Rate */}
            {gstRateDetails === "Specify Details Here" && form.taxabilityType === "Taxable" ? (
              <FieldRow label="GST Rate" labelWidth="140px">
                <div className="flex items-center gap-1.5 w-32">
                  <input
                    ref={rateRef}
                    type="number"
                    min={0}
                    max={100}
                    value={form.gstRate || ""}
                    onChange={(e) => setField("gstRate", Number(e.target.value))}
                    onFocus={() => setActiveField("gstRate")}
                    className={`${inputClass(activeField === "gstRate")} w-full text-right`}
                  />
                  <span className="font-bold text-zinc-600">%</span>
                </div>
              </FieldRow>
            ) : gstRateDetails === "Not Defined" || gstRateDetails === "Use GST Classification" || (gstRateDetails === "Specify Details Here" && form.taxabilityType !== "Taxable") ? (
              <FieldRow label="GST Rate" labelWidth="140px" disabled>
                <div className="flex items-center gap-1.5 w-32 pl-2">
                  <span className="w-full text-right text-zinc-500 pr-[10px]">0</span>
                  <span className="font-bold text-zinc-500">%</span>
                </div>
              </FieldRow>
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
            <FieldRow label="Interstate Threshold Limit" labelWidth="230px">
              <input
                ref={interLimitRef}
                type="text"
                value={form.interstateThresholdLimit.toLocaleString("en-IN")}
                onChange={(e) =>
                  setField("interstateThresholdLimit", Number(e.target.value.replace(/,/g, "")) || 0)
                }
                onFocus={() => setActiveField("interstateThresholdLimit")}
                className={`${inputClass(activeField === "interstateThresholdLimit")} w-32 text-right`}
              />
            </FieldRow>

            {/* Intrastate Threshold Limit */}
            <FieldRow label="Intrastate Threshold Limit" labelWidth="230px">
              <input
                ref={intraLimitRef}
                type="text"
                value={form.intrastateThresholdLimit.toLocaleString("en-IN")}
                onChange={(e) =>
                  setField("intrastateThresholdLimit", Number(e.target.value.replace(/,/g, "")) || 0)
                }
                onFocus={() => setActiveField("intrastateThresholdLimit")}
                className={`${inputClass(activeField === "intrastateThresholdLimit")} w-32 text-right`}
              />
            </FieldRow>

            {/* Threshold Limit Includes (dropdown) */}
            <FieldRow label="Threshold Limit includes" labelWidth="230px">
              <div
                onClick={() => setActiveField("thresholdLimitIncludes")}
                className={`${dropdownClass(activeField === "thresholdLimitIncludes")} flex-1`}
              >
                {form.thresholdLimitIncludes}
              </div>
            </FieldRow>
          </div>
        </div>

        {/* Section: Additional Configuration */}
        <div className="space-y-3">
          <SectionHeading>Additional Configuration</SectionHeading>

          <div className="space-y-1.5 pl-2">

            {/* Create HSN/SAC Summary For (dropdown) */}
            <FieldRow label="Create HSN/SAC summary for" labelWidth="230px">
              <div
                onClick={() => setActiveField("createHSNSummaryFor")}
                className={`${dropdownClass(activeField === "createHSNSummaryFor")} flex-1`}
              >
                {form.createHSNSummaryFor}
              </div>
            </FieldRow>

            {/* Minimum Length of HSN/SAC */}
            {form.createHSNSummaryFor === "None" ? (
              <FieldRow
                label="Minimum length of HSN/SAC"
                labelWidth="230px"
                subLabel="(based on annual turnover)"
                disabled
              >
                <div className="flex-1"></div>
              </FieldRow>
            ) : (
              <FieldRow
                label="Minimum length of HSN/SAC"
                labelWidth="230px"
                subLabel="(based on annual turnover)"
              >
                <div
                  onClick={() => setActiveField("minimumHSNLength")}
                  className={`${dropdownClass(activeField === "minimumHSNLength")} w-16 text-right`}
                >
                  {form.minimumHSNLength}
                </div>
              </FieldRow>
            )}

            {/* Show GST Advances (Yes/No dropdown) */}
            <FieldRow
              label="Show GST Advances for adjustments in transaction"
              labelWidth="230px"
            >
              <div
                onClick={() => setActiveField("showGSTAdvances")}
                className={`${dropdownClass(activeField === "showGSTAdvances")} flex-1`}
              >
                {form.showGSTAdvances ? "Yes" : "No"}
              </div>
            </FieldRow>

            {/* Update GST Status (Yes/No dropdown) */}
            <FieldRow
              label="Update GST Status of Vouchers after Master Alteration"
              labelWidth="230px"
              subLabel="(Set this to No, to update from GST Reports)"
            >
              <div
                onClick={() => setActiveField("updateGSTStatus")}
                className={`${dropdownClass(activeField === "updateGSTStatus")} flex-1`}
              >
                {form.updateGSTStatus ? "Yes" : "No"}
              </div>
            </FieldRow>

            {/* Set/Alter GST Returns (Yes/No dropdown) */}
            <FieldRow
              label="Set/Alter details for downloading GST Returns"
              labelWidth="230px"
            >
              <div
                onClick={() => setActiveField("gstReturnsConfigured")}
                className={`${dropdownClass(activeField === "gstReturnsConfigured")} flex-1`}
              >
                {form.gstReturnsConfigured ? "Yes" : "No"}
              </div>
            </FieldRow>
          </div>
        </div>
      </div>
    </div>
  );
}
