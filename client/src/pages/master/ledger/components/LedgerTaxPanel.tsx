import { FormRow } from "@/components/ui";
import type { LedgerType } from "@/types/api";
import type { StatutoryDetails } from "../hooks/useLedgerForm";
import type { LedgerConfigOptions } from "../config/LedgerConfig";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerTaxPanelProps {
  form: Partial<LedgerType>;
  setField: (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  statutoryForm: StatutoryDetails;
  setStatutoryField: (key: keyof StatutoryDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setStatutoryNumber: (key: keyof StatutoryDetails) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStatutoryForm: React.Dispatch<React.SetStateAction<StatutoryDetails>>;
  groupLineage: {
    isTax: boolean;
  };
  config: LedgerConfigOptions;
}

export default function LedgerTaxPanel({
  form,
  setField,
  statutoryForm,
  setStatutoryField,
  setStatutoryNumber,
  setStatutoryForm,
  groupLineage,
  config,
}: LedgerTaxPanelProps) {

  const showAssessableValueSection = config.assessableValueDetails;
  const showOtherStatutoryOnly = config.otherStatutoryOnly;
  const showDutyTaxSection = (config.dutyTaxDetails || groupLineage.isTax) && !showAssessableValueSection && !showOtherStatutoryOnly;
  
  const showTaxRegistration = config.taxRegistration !== "none";
  const showFullTaxDetails = config.taxRegistration === "full";
  const showPanOnly = config.taxRegistration === "panOnly" || showFullTaxDetails;
  const showBankTaxDetails = config.taxRegistration === "gstinServiceTaxOnly";
  const showGSTINField =
    showFullTaxDetails &&
    form.registration_type &&
    form.registration_type !== "Unknown" &&
    form.registration_type !== "Unregistered/Consumer";

  return (
    <>
      {/* ==============================================
          1. DUTIES & TAXES SECTION
      ============================================== */}
      {showDutyTaxSection && (
        <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Statutory / Duty Details</div>
          <FormRow label="Type of Duty/Tax" labelWidth="w-44" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={statutoryForm.type_of_duty_tax || "GST"}
              onChange={setStatutoryField("type_of_duty_tax")}
            >
              <option value="GST">GST</option>
              <option value="Others">Others</option>
            </select>
          </FormRow>
          <FormRow label="Percentage of Calculation" labelWidth="w-44" className="flex items-center min-h-[26px]">
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right max-w-[100px]`}
              value={statutoryForm.percentage_of_calculation ?? 0}
              onChange={setStatutoryNumber("percentage_of_calculation")}
            />
          </FormRow>
          <FormRow label="Rounding Method" labelWidth="w-44" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={statutoryForm.statutory_details || "Not Applicable"}
              onChange={setStatutoryField("statutory_details")}
            >
              <option value="Not Applicable">Not Applicable</option>
              <option value="Downward Rounding">Downward Rounding</option>
              <option value="Normal Rounding">Normal Rounding</option>
              <option value="Upward Rounding">Upward Rounding</option>
            </select>
          </FormRow>

          {statutoryForm.type_of_duty_tax === "GST" && (
            <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">GST Rate Config</div>
              <FormRow label="GST Applicability" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={statutoryForm.gst_applicability || "Applicable"}
                  onChange={setStatutoryField("gst_applicability")}
                >
                  <option value="Applicable">Applicable</option>
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="Undefined">Undefined</option>
                </select>
              </FormRow>
              {statutoryForm.gst_applicability === "Applicable" && (
                <div className="pl-3 border-l-2 border-zinc-200 space-y-1.5 py-1">
                  <FormRow label="HSN/SAC Code" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={statutoryForm.hsn_sac_code || ""} onChange={setStatutoryField("hsn_sac_code")} />
                  </FormRow>
                  <FormRow label="HSN/SAC Description" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={statutoryForm.hsn_sac_description || ""} onChange={setStatutoryField("hsn_sac_description")} />
                  </FormRow>
                  <FormRow label="IGST Rate (%)" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input
                      type="number"
                      step="0.01"
                      className={`${inputCls} text-right max-w-[100px]`}
                      value={statutoryForm.igst_rate ?? 0}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : Number(e.target.value);
                        setStatutoryForm((f) => ({
                          ...f,
                          igst_rate: val,
                          gst_rate: val,
                          cgst_rate: val / 2,
                          sgst_rate: val / 2,
                        }));
                      }}
                    />
                  </FormRow>
                  <div className="flex items-center text-[10px] text-zinc-500 pl-44 gap-4">
                    <span>CGST: {(statutoryForm.cgst_rate ?? 0).toFixed(2)}%</span>
                    <span>SGST: {(statutoryForm.sgst_rate ?? 0).toFixed(2)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==============================================
          2. ASSESSABLE VALUE / OTHER STATUTORY DETAILS
      ============================================== */}
      {(showAssessableValueSection || showOtherStatutoryOnly) && (
        <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Statutory Details
          </div>

          {showAssessableValueSection && (
            <>
              <FormRow label="Include in Assessable Value calculation for" labelWidth="w-[280px]" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.include_assessable_value || "Not Applicable"}
                  onChange={setField("include_assessable_value")}
                >
                  <option value="Not Applicable">Not Applicable</option>
                  <option value="GST">GST</option>
                  <option value="Excise">Excise</option>
                  <option value="VAT">VAT</option>
                </select>
              </FormRow>

              {form.include_assessable_value && form.include_assessable_value !== "Not Applicable" && (
                <div className="pl-4">
                  <FormRow label="Method of calculation" labelWidth="w-[264px]" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={form.method_of_calculation || "Based on Value"}
                      onChange={setField("method_of_calculation")}
                    >
                      <option value="Based on Value">Based on Value</option>
                      <option value="Based on Quantity">Based on Quantity</option>
                    </select>
                  </FormRow>
                </div>
              )}

              {config.showGstApplicability && (
                <FormRow label="GST applicability" labelWidth="w-[280px]" className="flex items-center min-h-[26px]">
                  <select
                    className={selectCls}
                    value={statutoryForm.gst_applicability || "Not Applicable"}
                    onChange={setStatutoryField("gst_applicability")}
                  >
                    <option value="Applicable">Applicable</option>
                    <option value="Not Applicable">Not Applicable</option>
                    <option value="Undefined">Undefined</option>
                  </select>
                </FormRow>
              )}
            </>
          )}

          <FormRow label="Set/Alter other Statutory details" labelWidth="w-[280px]" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.other_statutory_details ? "Yes" : "No"}
              onChange={(e) =>
                setField("other_statutory_details")({
                  target: { value: e.target.value === "Yes" ? 1 : 0 },
                } as any)
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>
        </div>
      )}

      {/* ==============================================
          3. TAX REGISTRATION DETAILS
      ============================================== */}
      {showTaxRegistration && (
        <div className="p-3 border-t border-zinc-100 bg-white space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Tax Registration Details
          </div>

          {showPanOnly && (
            <FormRow label="PAN/IT No." labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                value={form.pan || ""}
                onChange={setField("pan")}
                maxLength={10}
              />
            </FormRow>
          )}

          {showFullTaxDetails && (
            <>
              <FormRow label="Registration Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.registration_type || "Unknown"}
                  onChange={setField("registration_type")}
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Composition">Composition</option>
                  <option value="Regular">Regular</option>
                  <option value="Unregistered/Consumer">Unregistered/Consumer</option>
                  <option value="Government entity / TDS">Government entity / TDS</option>
                  <option value="Regular - SEZ">Regular - SEZ</option>
                  <option value="Regular-Deemed Exporter">Regular-Deemed Exporter</option>
                  <option value="Regular-Exports (EOU)">Regular-Exports (EOU)</option>
                  <option value="e-Commerce Operator">e-Commerce Operator</option>
                  <option value="Input Service Distributor">Input Service Distributor</option>
                  <option value="Embassy/UN Body">Embassy/UN Body</option>
                  <option value="Non-Resident Taxpayer">Non-Resident Taxpayer</option>
                </select>
              </FormRow>

              <FormRow label="Set/Alter additional GST details" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <select
                  className={selectCls}
                  value={form.additional_gst_details ? "Yes" : "No"}
                  onChange={(e) =>
                    setField("additional_gst_details")({
                      target: { value: e.target.value === "Yes" ? 1 : 0 },
                    } as any)
                  }
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </>
          )}

          {(showGSTINField || showBankTaxDetails) && (
            <FormRow label="GSTIN/UIN" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                value={form.gstin || ""}
                onChange={setField("gstin")}
                maxLength={15}
              />
            </FormRow>
          )}

          {(showFullTaxDetails || showBankTaxDetails) && (
            <FormRow label="Set/Alter service tax details" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={form.service_tax_details ? "Yes" : "No"}
                onChange={(e) =>
                  setField("service_tax_details")({
                    target: { value: e.target.value === "Yes" ? 1 : 0 },
                  } as any)
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          )}
        </div>
      )}
    </>
  );
}