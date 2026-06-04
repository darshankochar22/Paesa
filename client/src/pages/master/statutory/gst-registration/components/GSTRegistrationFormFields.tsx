import { FormRow } from "@/components/ui";
import { INDIAN_STATES } from "@/constants/states";
import type { FormData } from "../hooks/useGSTRegistrationForm";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface GSTRegistrationFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function GSTRegistrationFormFields({
  form,
  setField,
}: GSTRegistrationFormFieldsProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-2xl bg-white border-r border-zinc-100 font-sans">
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Registration Details</div>
        
        <FormRow label="GSTIN / UIN" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            autoFocus
            className={inputCls}
            placeholder="e.g. 27AAAAA1111A1Z1"
            value={form.gstin}
            onChange={setField("gstin")}
            maxLength={15}
          />
        </FormRow>

        <FormRow label="State Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.state_id} onChange={setField("state_id")}>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </FormRow>

        <FormRow label="Registration Type" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.registration_type} onChange={setField("registration_type")}>
            <option>Regular</option>
            <option>Composition</option>
          </select>
        </FormRow>

        <FormRow label="Assessee of Other Territory" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.assessee_of_other_territory} onChange={setField("assessee_of_other_territory")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        <FormRow label="Periodicity of GSTR1" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.periodicity_of_gstr1} onChange={setField("periodicity_of_gstr1")}>
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>
        </FormRow>

        <FormRow label="GST Registration Status" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.registration_status} onChange={setField("registration_status")}>
            <option>Active</option>
            <option>Suspended</option>
            <option>Inactive</option>
          </select>
        </FormRow>
      </div>

      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Legal & Filing Identifiers</div>
        
        <FormRow label="Legal Name of Business" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input className={inputCls} placeholder="As per PAN card" value={form.legal_name} onChange={setField("legal_name")} />
        </FormRow>

        <FormRow label="Trade Name of Business" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input className={inputCls} placeholder="Brand or DBA name" value={form.trade_name} onChange={setField("trade_name")} />
        </FormRow>

        <FormRow label="GST Portal Username" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input className={inputCls} placeholder="Optional portal user ID" value={form.gst_username} onChange={setField("gst_username")} />
        </FormRow>

        <FormRow label="Filing Mode" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.mode_of_filing} onChange={setField("mode_of_filing")}>
            <option>Online</option>
            <option>Offline</option>
          </select>
        </FormRow>
      </div>

      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Dates & E-Billing Details</div>

        <FormRow label="Registration Date" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input type="date" className={inputCls} value={form.registration_date} onChange={setField("registration_date")} />
        </FormRow>

        <FormRow label="Effective From" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input type="date" className={inputCls} value={form.effective_from} onChange={setField("effective_from")} />
        </FormRow>

        <FormRow label="E-Way Bill Applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.e_way_bill_applicable} onChange={setField("e_way_bill_applicable")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        {form.e_way_bill_applicable === "Yes" && (
          <FormRow label="E-Way Bill Applicable From" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input type="date" className={inputCls} value={form.e_way_bill_applicable_from} onChange={setField("e_way_bill_applicable_from")} />
          </FormRow>
        )}

        <FormRow label="E-Invoice Applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.e_invoice_application} onChange={setField("e_invoice_application")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        {form.e_invoice_application === "Yes" && (
          <FormRow label="E-Invoice Billing Details" labelWidth="w-64" className="flex items-start">
            <textarea
              rows={2}
              className="flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs"
              placeholder="Billing threshold, office address details..."
              value={form.e_invoice_details}
              onChange={setField("e_invoice_details")}
            />
          </FormRow>
        )}

        <FormRow label="Applicable for Intrastat" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select className={selectCls} value={form.applicable_for_intrastat} onChange={setField("applicable_for_intrastat")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>
      </div>
    </div>
  );
}
