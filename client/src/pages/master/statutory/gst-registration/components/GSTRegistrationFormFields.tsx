import React, { useEffect, useRef } from "react";
import type { FormData } from "../hooks/useGSTRegistrationForm";

const TALLY_INDIAN_STATES = [
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttarakhand",
  "Uttar Pradesh",
  "West Bengal",
];

interface GSTRegistrationFormFieldsProps {
  form: FormData;
  setField: (
    key: keyof FormData
  ) => (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  activeField: string;
  setActiveField: (field: string) => void;
  onSubmitPrompt: () => void;
}

interface FieldRowProps {
  label: string;
  required?: boolean;
  indent?: boolean;
  children: React.ReactNode;
}

function FieldRow({ label, required, indent, children }: FieldRowProps) {
  return (
    <div className="flex items-center min-h-[26px]">
      <span className={`w-56 text-zinc-600 font-medium ${indent ? "pl-4" : ""}`}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-3 font-medium">:</span>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );
}

const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950";
const inactiveClass = "border-transparent bg-transparent text-zinc-900";
const getSelectCls = (isActive: boolean) =>
  `px-2 py-0.5 border outline-none w-48 text-[11px] font-bold transition-all ${isActive ? activeClass : `${inactiveClass} bg-transparent`}`;
const getInputCls = (isActive: boolean) =>
  `px-2 py-0.5 border outline-none w-48 text-[11px] font-bold transition-all ${isActive ? activeClass : `${inactiveClass} bg-transparent`}`;

export const getGSTRegistrationFocusableFields = (form: FormData) => {
  const isComposition = form.registration_type === "Composition";
  const showEInvoice = form.registration_type === "Regular";

  const fields: string[] = [
    "registration_status",
    "state_id",
    "address_type",
    "registration_type",
    "assessee_of_other_territory",
    "gstin",
  ];

  if (!isComposition) {
    fields.push("periodicity_of_gstr1");
  }

  fields.push("gst_username", "mode_of_filing");

  if (showEInvoice) {
    fields.push("e_invoice_application");
    if (form.e_invoice_application === "Yes") {
      fields.push("e_invoice_applicable_from", "e_invoice_bill_from_place");
    }
  }

  if (isComposition) {
    fields.push("composition_tax_rate", "composition_tax_calc_basis");
  }

  fields.push("e_way_bill_applicable");
  if (form.e_way_bill_applicable === "Yes") {
    fields.push(
      "e_way_bill_applicable_from",
      "applicable_for_intrastat",
      "goods_dispatched_from"
    );
  }

  return fields;
};

export default function GSTRegistrationFormFields({
  form,
  setField,
  activeField,
  setActiveField,
  onSubmitPrompt,
}: GSTRegistrationFormFieldsProps) {
  const isComposition = form.registration_type === "Composition";
  const showEInvoice = form.registration_type === "Regular";

  const regStatusRef = useRef<HTMLSelectElement>(null);
  const stateIdRef = useRef<HTMLSelectElement>(null);
  const addressTypeRef = useRef<HTMLSelectElement>(null);
  const regTypeRef = useRef<HTMLSelectElement>(null);
  const assesseeOtherRef = useRef<HTMLSelectElement>(null);
  const gstinRef = useRef<HTMLInputElement>(null);
  const periodicityRef = useRef<HTMLSelectElement>(null);
  const gstUsernameRef = useRef<HTMLInputElement>(null);
  const modeOfFilingRef = useRef<HTMLSelectElement>(null);
  const eInvoiceAppRef = useRef<HTMLSelectElement>(null);
  const eInvoiceAppFromRef = useRef<HTMLInputElement>(null);
  const eInvoiceBillFromRef = useRef<HTMLInputElement>(null);
  const compTaxRateRef = useRef<HTMLInputElement>(null);
  const compTaxCalcRef = useRef<HTMLSelectElement>(null);
  const eWayBillAppRef = useRef<HTMLSelectElement>(null);
  const eWayBillAppFromRef = useRef<HTMLInputElement>(null);
  const appIntrastateRef = useRef<HTMLSelectElement>(null);
  const goodsDispatchedRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      registration_status: regStatusRef,
      state_id: stateIdRef,
      address_type: addressTypeRef,
      registration_type: regTypeRef,
      assessee_of_other_territory: assesseeOtherRef,
      gstin: gstinRef,
      periodicity_of_gstr1: periodicityRef,
      gst_username: gstUsernameRef,
      mode_of_filing: modeOfFilingRef,
      e_invoice_application: eInvoiceAppRef,
      e_invoice_applicable_from: eInvoiceAppFromRef,
      e_invoice_bill_from_place: eInvoiceBillFromRef,
      composition_tax_rate: compTaxRateRef,
      composition_tax_calc_basis: compTaxCalcRef,
      e_way_bill_applicable: eWayBillAppRef,
      e_way_bill_applicable_from: eWayBillAppFromRef,
      applicable_for_intrastat: appIntrastateRef,
      goods_dispatched_from: goodsDispatchedRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const fields = getGSTRegistrationFocusableFields(form);
      const idx = fields.indexOf(activeField);
      if (idx === -1) return;

      if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (idx === fields.length - 1) {
          onSubmitPrompt();
        } else {
          setActiveField(fields[idx + 1]);
        }
        return;
      }

      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        if (idx > 0) {
          setActiveField(fields[idx - 1]);
        }
        return;
      }

      // Handle Quick Y/N shortcuts for Yes/No dropdowns
      if (
        activeField === "assessee_of_other_territory" ||
        activeField === "e_invoice_application" ||
        activeField === "e_way_bill_applicable" ||
        activeField === "applicable_for_intrastat"
      ) {
        const key = e.key.toLowerCase();
        if (key === "y" || key === "n") {
          e.preventDefault();
          const val = key === "y" ? "Yes" : "No";
          setField(activeField as keyof FormData)({ target: { value: val } } as any);
          if (idx < fields.length - 1) {
            setActiveField(fields[idx + 1]);
          } else {
            onSubmitPrompt();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeField, form, onSubmitPrompt, setField, setActiveField]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 font-mono text-zinc-800 text-[11px] select-none">
      <div className="max-w-6xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6">
        {/* Screen Header */}
        <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-6 tracking-wide text-zinc-900 uppercase">
          GST Details
        </div>

        {/* Registration Status */}
        <div className="flex items-center mb-6 max-w-sm">
          <span className="w-56 font-bold text-zinc-700">Registration status</span>
          <span className="text-zinc-400 mr-3 font-bold">:</span>
          <select
            ref={regStatusRef}
            className={getSelectCls(activeField === "registration_status")}
            value={form.registration_status}
            onChange={setField("registration_status")}
            onFocus={() => setActiveField("registration_status")}
          >
            <option>Active</option>
            <option>Suspended</option>
            <option>Inactive</option>
          </select>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start border-t border-zinc-100 pt-6">

          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* GST Registration Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                GST Registration Details
              </div>

              <FieldRow label="State" required>
                <select
                  ref={stateIdRef}
                  className={getSelectCls(activeField === "state_id")}
                  value={form.state_id}
                  onChange={setField("state_id")}
                  onFocus={() => setActiveField("state_id")}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  {TALLY_INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Address type">
                <select
                  ref={addressTypeRef}
                  className={getSelectCls(activeField === "address_type")}
                  value={form.address_type}
                  onChange={setField("address_type")}
                  onFocus={() => setActiveField("address_type")}
                >
                  <option>Primary</option>
                </select>
              </FieldRow>

              <FieldRow label="Registration type" required>
                <select
                  ref={regTypeRef}
                  className={getSelectCls(activeField === "registration_type")}
                  value={form.registration_type}
                  onChange={setField("registration_type")}
                  onFocus={() => setActiveField("registration_type")}
                >
                  <option>Regular</option>
                  <option>Composition</option>
                  <option>Regular - SEZ</option>
                </select>
              </FieldRow>

              <FieldRow label="Assessee of Other Territory">
                <select
                  ref={assesseeOtherRef}
                  className={getSelectCls(activeField === "assessee_of_other_territory")}
                  value={form.assessee_of_other_territory}
                  onChange={setField("assessee_of_other_territory")}
                  onFocus={() => setActiveField("assessee_of_other_territory")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              <FieldRow label="GSTIN/UIN" required>
                <input
                  ref={gstinRef}
                  className={`${getInputCls(activeField === "gstin")} uppercase tracking-wider`}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={form.gstin}
                  onChange={setField("gstin")}
                  onFocus={() => setActiveField("gstin")}
                  maxLength={15}
                />
              </FieldRow>

              {/* Periodicity only for Regular / Regular-SEZ */}
              {!isComposition && (
                <FieldRow label="Periodicity of GSTR-1">
                  <select
                    ref={periodicityRef}
                    className={getSelectCls(activeField === "periodicity_of_gstr1")}
                    value={form.periodicity_of_gstr1}
                    onChange={setField("periodicity_of_gstr1")}
                    onFocus={() => setActiveField("periodicity_of_gstr1")}
                  >
                    <option>Monthly</option>
                    <option>Quarterly</option>
                  </select>
                </FieldRow>
              )}
            </div>

            {/* Connected GST Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                Connected GST Details
              </div>

              <FieldRow label="GST Username">
                <input
                  ref={gstUsernameRef}
                  className={getInputCls(activeField === "gst_username")}
                  placeholder="Optional portal user ID"
                  value={form.gst_username}
                  onChange={setField("gst_username")}
                  onFocus={() => setActiveField("gst_username")}
                />
              </FieldRow>

              <FieldRow label="Mode of Filing">
                <select
                  ref={modeOfFilingRef}
                  className={getSelectCls(activeField === "mode_of_filing")}
                  value={form.mode_of_filing}
                  onChange={setField("mode_of_filing")}
                  onFocus={() => setActiveField("mode_of_filing")}
                >
                  <option>Not Applicable</option>
                  <option>DSC</option>
                  <option>EVC</option>
                </select>
              </FieldRow>
            </div>

            {/* e-Invoice Details — Regular only */}
            {showEInvoice && (
              <div className="space-y-2.5">
                <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                  e-Invoice Details
                </div>

                <FieldRow label="e-Invoicing applicable">
                  <select
                    ref={eInvoiceAppRef}
                    className={getSelectCls(activeField === "e_invoice_application")}
                    value={form.e_invoice_application}
                    onChange={setField("e_invoice_application")}
                    onFocus={() => setActiveField("e_invoice_application")}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FieldRow>

                {form.e_invoice_application === "Yes" && (
                  <>
                    <FieldRow label="Applicable from" indent>
                      <input
                        ref={eInvoiceAppFromRef}
                        type="date"
                        className={getInputCls(activeField === "e_invoice_applicable_from")}
                        value={form.e_invoice_applicable_from}
                        onChange={setField("e_invoice_applicable_from")}
                        onFocus={() => setActiveField("e_invoice_applicable_from")}
                      />
                    </FieldRow>

                    <FieldRow label="Invoice bill from place" indent>
                      <input
                        ref={eInvoiceBillFromRef}
                        className={getInputCls(activeField === "e_invoice_bill_from_place")}
                        placeholder="e.g. Panaji"
                        value={form.e_invoice_bill_from_place}
                        onChange={setField("e_invoice_bill_from_place")}
                        onFocus={() => setActiveField("e_invoice_bill_from_place")}
                      />
                    </FieldRow>
                  </>
                )}
              </div>
            )}

            {/* Tax Rate Details — Composition only */}
            {isComposition && (
              <div className="space-y-2.5">
                <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                  Tax Rate Details for Turnover
                </div>

                <FieldRow label="Tax Rate for taxable turnover">
                  <div className="flex items-center gap-1">
                    <input
                      ref={compTaxRateRef}
                      className={`${getInputCls(activeField === "composition_tax_rate")} w-20 text-right`}
                      placeholder="1"
                      value={form.composition_tax_rate}
                      onChange={setField("composition_tax_rate")}
                      onFocus={() => setActiveField("composition_tax_rate")}
                    />
                    <span className="font-bold text-zinc-500">%</span>
                  </div>
                </FieldRow>

                <FieldRow label="Calculate tax based on">
                  <select
                    ref={compTaxCalcRef}
                    className={`${getSelectCls(activeField === "composition_tax_calc_basis")} w-64`}
                    value={form.composition_tax_calc_basis}
                    onChange={setField("composition_tax_calc_basis")}
                    onFocus={() => setActiveField("composition_tax_calc_basis")}
                  >
                    <option>Taxable Value</option>
                    <option>Taxable, Exempt, &amp; Nil Rated Values</option>
                  </select>
                </FieldRow>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* e-Way Bill Details — always visible */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                e-Way Bill Details
              </div>

              <FieldRow label="e-Way Bill applicable">
                <select
                  ref={eWayBillAppRef}
                  className={getSelectCls(activeField === "e_way_bill_applicable")}
                  value={form.e_way_bill_applicable}
                  onChange={setField("e_way_bill_applicable")}
                  onFocus={() => setActiveField("e_way_bill_applicable")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              {/* Always rendered — disabled when "No", matching Tally behaviour */}
              <FieldRow label="Applicable from" indent>
                <input
                  ref={eWayBillAppFromRef}
                  type="date"
                  className={`${getInputCls(activeField === "e_way_bill_applicable_from")} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.e_way_bill_applicable_from}
                  onChange={setField("e_way_bill_applicable_from")}
                  onFocus={() => setActiveField("e_way_bill_applicable_from")}
                  disabled={form.e_way_bill_applicable === "No"}
                />
              </FieldRow>

              <FieldRow label="Applicable for intrastate" indent>
                <select
                  ref={appIntrastateRef}
                  className={`${getSelectCls(activeField === "applicable_for_intrastat")} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.applicable_for_intrastat}
                  onChange={setField("applicable_for_intrastat")}
                  onFocus={() => setActiveField("applicable_for_intrastat")}
                  disabled={form.e_way_bill_applicable === "No"}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              <FieldRow label="Goods dispatched from" indent>
                <select
                  ref={goodsDispatchedRef}
                  className={`${getSelectCls(activeField === "goods_dispatched_from")} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.goods_dispatched_from}
                  onChange={setField("goods_dispatched_from")}
                  onFocus={() => setActiveField("goods_dispatched_from")}
                  disabled={form.e_way_bill_applicable === "No"}
                >
                  <option>Primary</option>
                </select>
              </FieldRow>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}