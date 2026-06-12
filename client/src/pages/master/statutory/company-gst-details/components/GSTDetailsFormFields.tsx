// All form fields for the Company GST Details dialog.
// Renders the two-column layout (left: HSN/SAC + GST Rate; right: e-Way Bill + Additional Config).
// Pure presentational component — all state lives in CompanyGSTDetailsModal.

import type { CompanyGSTDetails } from "@/types/entities/CompanyGSTDetails";

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
  children: React.ReactNode;
}

function FieldRow({ label, labelWidth, subLabel, children }: FieldRowProps) {
  return (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: `${labelWidth} 10px 1fr` }}
    >
      <div>
        <span className="text-zinc-700">{label}</span>
        {subLabel && (
          <span className="text-zinc-400 block text-[9px] pl-4 italic">{subLabel}</span>
        )}
      </div>
      <span className="text-zinc-400 text-center">:</span>
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface GSTDetailsFormFieldsProps {
  form: CompanyGSTDetails;
  gstRateDetails: "Not Defined" | "Specified Here";
  activeField: string;
  setActiveField: (field: string) => void;
  setField: (key: keyof CompanyGSTDetails, value: unknown) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared field classes
// ─────────────────────────────────────────────────────────────────────────────

const activeClass = "bg-amber-100 border-amber-300";
const inactiveClass = "border-transparent";
const dropdownClass = (isActive: boolean) =>
  `px-2 py-0.5 border cursor-pointer font-bold ${isActive ? activeClass : inactiveClass}`;
const inputClass = (isActive: boolean) =>
  `px-2 py-0.5 bg-transparent border outline-none font-bold ${isActive ? activeClass : inactiveClass}`;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GSTDetailsFormFields({
  form,
  gstRateDetails,
  activeField,
  setActiveField,
  setField,
}: GSTDetailsFormFieldsProps) {
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
                className={dropdownClass(activeField === "hsnSacType")}
              >
                ♦ {form.hsnSacType}
              </div>
            </FieldRow>

            {/* HSN/SAC code — only visible when type is not "Not Defined" */}
            {form.hsnSacType !== "Not Defined" && (
              <FieldRow label="HSN/SAC" labelWidth="140px">
                <input
                  type="text"
                  maxLength={8}
                  value={form.hsnSacCode}
                  onChange={(e) => setField("hsnSacCode", e.target.value.replace(/\D/g, ""))}
                  onFocus={() => setActiveField("hsnSacCode")}
                  className={`${inputClass(activeField === "hsnSacCode")} w-32`}
                />
              </FieldRow>
            )}

            {/* Description — only visible when type is not "Not Defined" */}
            {form.hsnSacType !== "Not Defined" && (
              <FieldRow label="Description" labelWidth="140px">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  onFocus={() => setActiveField("description")}
                  className={`${inputClass(activeField === "description")} flex-1`}
                />
              </FieldRow>
            )}
          </div>
        </div>

        {/* Section: GST Rate & Related Details */}
        <div className="space-y-3">
          <SectionHeading>GST Rate &amp; Related Details</SectionHeading>

          <div className="space-y-1.5 pl-2">

            {/* GST Rate Details (dropdown: Not Defined / Specified Here) */}
            <FieldRow label="GST Rate Details" labelWidth="140px">
              <div
                onClick={() => setActiveField("gstRateDetails")}
                className={dropdownClass(activeField === "gstRateDetails")}
              >
                ♦ {gstRateDetails}
              </div>
            </FieldRow>

            {/* Taxability Type — only when "Specified Here" */}
            {gstRateDetails === "Specified Here" && (
              <FieldRow label="Taxability Type" labelWidth="140px">
                <div
                  onClick={() => setActiveField("taxabilityType")}
                  className={dropdownClass(activeField === "taxabilityType")}
                >
                  {form.taxabilityType}
                </div>
              </FieldRow>
            )}

            {/* GST Rate — only when Specified Here + Taxable */}
            {gstRateDetails === "Specified Here" && form.taxabilityType === "Taxable" && (
              <FieldRow label="GST Rate" labelWidth="140px">
                <div className="flex items-center gap-1.5 w-32">
                  <input
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
            )}
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
                className={dropdownClass(activeField === "thresholdLimitIncludes")}
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
                className={dropdownClass(activeField === "createHSNSummaryFor")}
              >
                {form.createHSNSummaryFor}
              </div>
            </FieldRow>

            {/* Minimum Length of HSN/SAC */}
            <FieldRow
              label="Minimum length of HSN/SAC"
              labelWidth="230px"
              subLabel="(based on annual turnover)"
            >
              <input
                type="number"
                min={2}
                max={8}
                value={form.minimumHSNLength}
                onChange={(e) => setField("minimumHSNLength", Number(e.target.value))}
                onFocus={() => setActiveField("minimumHSNLength")}
                className={`${inputClass(activeField === "minimumHSNLength")} w-16 text-right`}
              />
            </FieldRow>

            {/* Show GST Advances (Yes/No dropdown) */}
            <FieldRow
              label="Show GST Advances for adjustments in transaction"
              labelWidth="230px"
            >
              <div
                onClick={() => setActiveField("showGSTAdvances")}
                className={dropdownClass(activeField === "showGSTAdvances")}
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
                className={dropdownClass(activeField === "updateGSTStatus")}
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
                className={dropdownClass(activeField === "gstReturnsConfigured")}
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
