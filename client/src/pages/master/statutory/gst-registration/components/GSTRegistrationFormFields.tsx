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
  "West Bengal"
];

interface GSTRegistrationFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

interface FieldRowProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function FieldRow({ label, required, children }: FieldRowProps) {
  return (
    <div className="flex items-center min-h-[26px]">
      <span className="w-56 text-zinc-600 font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-3 font-medium">:</span>
      <div className="flex-1 flex items-center">{children}</div>
    </div>
  );
}

export default function GSTRegistrationFormFields({
  form,
  setField,
}: GSTRegistrationFormFieldsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 font-mono text-zinc-800 text-[11px] select-none">
      <div className="max-w-6xl mx-auto bg-white border border-zinc-200 rounded shadow-sm p-6">
        {/* Screen Header */}
        <div className="text-center font-bold text-xs border-b border-zinc-200 pb-3 mb-6 tracking-wide text-zinc-900 uppercase">
          GST Details
        </div>

        {/* Top Section: Registration Status */}
        <div className="flex items-center mb-6 max-w-sm">
          <span className="w-56 font-bold text-zinc-700">Registration status</span>
          <span className="text-zinc-400 mr-3 font-bold">:</span>
          <select
            className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none font-bold text-zinc-950 bg-white"
            value={form.registration_status}
            onChange={setField("registration_status")}
          >
            <option>Active</option>
            <option>Suspended</option>
            <option>Inactive</option>
          </select>
        </div>

        {/* Main Columns Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start border-t border-zinc-100 pt-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            
            {/* Section: GST Registration Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                GST Registration Details
              </div>

              <FieldRow label="State" required>
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.state_id}
                  onChange={setField("state_id")}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  {TALLY_INDIAN_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </FieldRow>

              <FieldRow label="Address type">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.address_type}
                  onChange={setField("address_type")}
                >
                  <option>Primary</option>
                </select>
              </FieldRow>

              <FieldRow label="Registration type" required>
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
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
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.assessee_of_other_territory}
                  onChange={setField("assessee_of_other_territory")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              <FieldRow label="GSTIN/UIN" required>
                <input
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 uppercase text-[11px] font-bold text-zinc-950 tracking-wider"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={form.gstin}
                  onChange={setField("gstin")}
                  maxLength={15}
                />
              </FieldRow>

              <FieldRow label="Periodicity of GSTR-1">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.periodicity_of_gstr1}
                  onChange={setField("periodicity_of_gstr1")}
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </FieldRow>
            </div>

            {/* Section: Connected GST Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                Connected GST Details
              </div>

              <FieldRow label="GST Username">
                <input
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  placeholder="Optional portal user ID"
                  value={form.gst_username}
                  onChange={setField("gst_username")}
                />
              </FieldRow>

              <FieldRow label="Mode of Filing">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.mode_of_filing}
                  onChange={setField("mode_of_filing")}
                >
                  <option>Not Applicable</option>
                  <option>DSC</option>
                  <option>EVC</option>
                </select>
              </FieldRow>
            </div>

            {/* Section: e-Invoice Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                e-Invoice Details
              </div>

              <FieldRow label="e-Invoicing applicable">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.e_invoice_application}
                  onChange={setField("e_invoice_application")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              {form.e_invoice_application === "Yes" && (
                <>
                  <FieldRow label="Applicable from">
                    <input
                      type="date"
                      className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                      value={form.e_invoice_applicable_from}
                      onChange={setField("e_invoice_applicable_from")}
                    />
                  </FieldRow>

                  <FieldRow label="Invoice bill from place">
                    <input
                      className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                      placeholder="e.g. Panaji"
                      value={form.e_invoice_bill_from_place}
                      onChange={setField("e_invoice_bill_from_place")}
                    />
                  </FieldRow>
                </>
              )}
            </div>

            {/* Section: Tax Rate Details for Turnover (Dynamic for Composition) */}
            {form.registration_type === "Composition" && (
              <div className="space-y-2.5">
                <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                  Tax Rate Details for Turnover
                </div>

                <FieldRow label="Tax Rate for taxable turnover">
                  <div className="flex items-center gap-1">
                    <input
                      className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-20 text-[11px] font-bold text-zinc-950 text-right"
                      placeholder="1"
                      value={form.composition_tax_rate}
                      onChange={setField("composition_tax_rate")}
                    />
                    <span className="font-bold text-zinc-500">%</span>
                  </div>
                </FieldRow>

                <FieldRow label="Calculate tax based on">
                  <select
                    className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-64 text-[11px] font-bold text-zinc-950"
                    value={form.composition_tax_calc_basis}
                    onChange={setField("composition_tax_calc_basis")}
                  >
                    <option>Taxable Value</option>
                    <option>Taxable, Exempt, & Nil Rated Values</option>
                  </select>
                </FieldRow>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            
            {/* Section: e-Way Bill Details */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                e-Way Bill Details
              </div>

              <FieldRow label="e-Way Bill applicable">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.e_way_bill_applicable}
                  onChange={setField("e_way_bill_applicable")}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FieldRow>

              {form.e_way_bill_applicable === "Yes" && (
                <>
                  <FieldRow label="Applicable from">
                    <input
                      type="date"
                      className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                      value={form.e_way_bill_applicable_from}
                      onChange={setField("e_way_bill_applicable_from")}
                    />
                  </FieldRow>

                  <FieldRow label="Applicable for intrastate">
                    <select
                      className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                      value={form.applicable_for_intrastat}
                      onChange={setField("applicable_for_intrastat")}
                    >
                      <option>No</option>
                      <option>Yes</option>
                    </select>
                  </FieldRow>
                </>
              )}

              <FieldRow label="Goods dispatched from">
                <select
                  className="bg-transparent border border-zinc-200 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.goods_dispatched_from}
                  onChange={setField("goods_dispatched_from")}
                >
                  <option>Primary</option>
                </select>
              </FieldRow>
            </div>

            {/* Section: Legal & Business Identifiers */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                Business Details
              </div>

              <FieldRow label="Legal Name of Business">
                <input
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-64 text-[11px] font-bold text-zinc-950"
                  placeholder="As per PAN card"
                  value={form.legal_name}
                  onChange={setField("legal_name")}
                />
              </FieldRow>

              <FieldRow label="Trade Name of Business">
                <input
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-64 text-[11px] font-bold text-zinc-950"
                  placeholder="Brand or DBA name"
                  value={form.trade_name}
                  onChange={setField("trade_name")}
                />
              </FieldRow>
            </div>

            {/* Section: Statutory Registration Dates */}
            <div className="space-y-2.5">
              <div className="font-bold text-zinc-950 border-b border-zinc-150 pb-1 uppercase tracking-wider text-[10px]">
                Filing Dates
              </div>

              <FieldRow label="Registration Date">
                <input
                  type="date"
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.registration_date}
                  onChange={setField("registration_date")}
                />
              </FieldRow>

              <FieldRow label="Effective From">
                <input
                  type="date"
                  className="bg-transparent border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 rounded px-2 py-0.5 outline-none bg-white w-48 text-[11px] font-bold text-zinc-950"
                  value={form.effective_from}
                  onChange={setField("effective_from")}
                />
              </FieldRow>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
