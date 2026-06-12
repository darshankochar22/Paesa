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

const selectCls =
  "bg-white border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none w-48 text-[11px] font-bold text-zinc-950";
const inputCls =
  "bg-white border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none w-48 text-[11px] font-bold text-zinc-950";

export default function GSTRegistrationFormFields({
  form,
  setField,
}: GSTRegistrationFormFieldsProps) {
  const isComposition = form.registration_type === "Composition";
  const showEInvoice = form.registration_type === "Regular";

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
            className={selectCls}
            value={form.registration_status}
            onChange={setField("registration_status")}
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
                  className={selectCls}
                  value={form.state_id}
                  onChange={setField("state_id")}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  {TALLY_INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Address type">
                <select
                  className={selectCls}
                  value={form.address_type}
                  onChange={setField("address_type")}
                >
                  <option>Primary</option>
                </select>
              </FieldRow>

              <FieldRow label="Registration type" required>
                <select
                  className={selectCls}
                  value={form.registration_type}
                  onChange={setField("registration_type")}
                >
                  <option>Regular</option>
                  <option>Composition</option>
                  <option>Regular - SEZ</option>
                </select>
              </FieldRow>

              <FieldRow label="Assessee of Other Territory">
                <select
                  className={selectCls}
                  value={form.assessee_of_other_territory}
                  onChange={setField("assessee_of_other_territory")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              <FieldRow label="GSTIN/UIN" required>
                <input
                  className={`${inputCls} uppercase tracking-wider`}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={form.gstin}
                  onChange={setField("gstin")}
                  maxLength={15}
                />
              </FieldRow>

              {/* Periodicity only for Regular / Regular-SEZ */}
              {!isComposition && (
                <FieldRow label="Periodicity of GSTR-1">
                  <select
                    className={selectCls}
                    value={form.periodicity_of_gstr1}
                    onChange={setField("periodicity_of_gstr1")}
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
                  className={inputCls}
                  placeholder="Optional portal user ID"
                  value={form.gst_username}
                  onChange={setField("gst_username")}
                />
              </FieldRow>

              <FieldRow label="Mode of Filing">
                <select
                  className={selectCls}
                  value={form.mode_of_filing}
                  onChange={setField("mode_of_filing")}
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
                    className={selectCls}
                    value={form.e_invoice_application}
                    onChange={setField("e_invoice_application")}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FieldRow>

                {form.e_invoice_application === "Yes" && (
                  <>
                    <FieldRow label="Applicable from" indent>
                      <input
                        type="date"
                        className={inputCls}
                        value={form.e_invoice_applicable_from}
                        onChange={setField("e_invoice_applicable_from")}
                      />
                    </FieldRow>

                    <FieldRow label="Invoice bill from place" indent>
                      <input
                        className={inputCls}
                        placeholder="e.g. Panaji"
                        value={form.e_invoice_bill_from_place}
                        onChange={setField("e_invoice_bill_from_place")}
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
                      className={`${inputCls} w-20 text-right`}
                      placeholder="1"
                      value={form.composition_tax_rate}
                      onChange={setField("composition_tax_rate")}
                    />
                    <span className="font-bold text-zinc-500">%</span>
                  </div>
                </FieldRow>

                <FieldRow label="Calculate tax based on">
                  <select
                    className={`${selectCls} w-64`}
                    value={form.composition_tax_calc_basis}
                    onChange={setField("composition_tax_calc_basis")}
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
                  className={selectCls}
                  value={form.e_way_bill_applicable}
                  onChange={setField("e_way_bill_applicable")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              {/* Always rendered — disabled when "No", matching Tally behaviour */}
              <FieldRow label="Applicable from" indent>
                <input
                  type="date"
                  className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.e_way_bill_applicable_from}
                  onChange={setField("e_way_bill_applicable_from")}
                  disabled={form.e_way_bill_applicable === "No"}
                />
              </FieldRow>

              <FieldRow label="Applicable for intrastate" indent>
                <select
                  className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.applicable_for_intrastat}
                  onChange={setField("applicable_for_intrastat")}
                  disabled={form.e_way_bill_applicable === "No"}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              <FieldRow label="Goods dispatched from" indent>
                <select
                  className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                  value={form.goods_dispatched_from}
                  onChange={setField("goods_dispatched_from")}
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