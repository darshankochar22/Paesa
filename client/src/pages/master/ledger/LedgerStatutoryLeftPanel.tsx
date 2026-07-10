import { FormRow } from '@/components/ui';
import {
  EMPTY_TDS,
  EMPTY_TCS,
  EMPTY_SERVICE_TAX,
  EMPTY_EXCISE,
  EMPTY_VAT,
} from './hooks/ledgerFormTypes';

// Statutory Details LEFT panel shared by the Ledger Create & Alter screens
// (GST/TDS/excise applicability fields) — extracted from LedgerAlter.tsx
// (markup unchanged; LedgerCreate had an identical copy).
/* eslint-disable @typescript-eslint/no-explicit-any */

const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

interface Props {
  statutoryForm: any;
  setStatutoryField: any;
  setStatutoryNumber: any;
  setOtherStatutory: any;
  setShowOtherStatutoryModal: any;
  groupLineage: any;
  currentConfig: any;
  assessableGstSelected: any;
  isOtherStatutoryActive: any;
  statutorySections: any;
  inputCls: string;
}

export default function LedgerStatutoryLeftPanel({
  statutoryForm,
  setStatutoryField,
  setStatutoryNumber,
  setOtherStatutory,
  setShowOtherStatutoryModal,
  groupLineage,
  currentConfig,
  assessableGstSelected,
  isOtherStatutoryActive,
  statutorySections,
  inputCls,
}: Props) {
  return (
    <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
        Statutory Details
      </div>

      {currentConfig.assessableValueCalc && (
        <>
          <FormRow
            label="Include in Assessable Value calculation"
            labelWidth="w-60"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={statutoryForm.include_in_assessable_value_calculation || 'Not Applicable'}
              onChange={setStatutoryField('include_in_assessable_value_calculation')}
            >
              <option value="Not Applicable">Not Applicable</option>
              <option value="Excise">Excise</option>
              <option value="Excise & GST">Excise & GST</option>
              <option value="Excise & VAT">Excise & VAT</option>
              <option value="GST">GST</option>
              <option value="VAT">VAT</option>
            </select>
          </FormRow>

          {assessableGstSelected && (
            <>
              <FormRow
                label="Appropriate to"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutoryForm.appropriate_to || 'Goods'}
                  onChange={setStatutoryField('appropriate_to')}
                >
                  <option value="Goods">Goods</option>
                  <option value="Goods and Services">Goods and Services</option>
                  <option value="Services">Services</option>
                </select>
              </FormRow>
              <FormRow
                label="Method of calculation"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutoryForm.method_of_calculation || 'Based on Quantity'}
                  onChange={setStatutoryField('method_of_calculation')}
                >
                  <option value="Based on Quantity">Based on Quantity</option>
                  <option value="Based on Value">Based on Value</option>
                </select>
              </FormRow>
            </>
          )}
        </>
      )}

      {currentConfig.gstApplicabilitySection && (
        <>
          <FormRow
            label="GST applicability"
            labelWidth="w-60"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={statutoryForm.gst_applicability || 'Applicable'}
              onChange={setStatutoryField('gst_applicability')}
            >
              <option value="Applicable">Applicable</option>
              <option value="Not Applicable">Not Applicable</option>
              <option value="Undefined">Undefined</option>
            </select>
          </FormRow>

          {(statutoryForm.gst_applicability || 'Applicable') === 'Applicable' && (
            <>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
                HSN/SAC & Related Details
              </div>
              <FormRow
                label="HSN/SAC Details"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutoryForm.hsn_sac_source || 'As per Company/Group'}
                  onChange={setStatutoryField('hsn_sac_source')}
                >
                  <option value="As per Company/Group">As per Company/Group</option>
                  <option value="As per Stock Item">As per Stock Item</option>
                  <option value="Specify Details Here">Specify Details Here</option>
                </select>
              </FormRow>

              {statutoryForm.hsn_sac_source === 'Specify Details Here' ? (
                <>
                  <FormRow
                    label="HSN/SAC"
                    labelWidth="w-60"
                    className="flex items-center min-h-[26px]"
                  >
                    <input
                      className={inputCls}
                      value={statutoryForm.hsn_sac_code || ''}
                      onChange={setStatutoryField('hsn_sac_code')}
                    />
                  </FormRow>
                  <FormRow
                    label="Description"
                    labelWidth="w-60"
                    className="flex items-center min-h-[26px]"
                  >
                    <input
                      className={inputCls}
                      value={statutoryForm.hsn_sac_description || ''}
                      onChange={setStatutoryField('hsn_sac_description')}
                    />
                  </FormRow>
                </>
              ) : (
                <FormRow
                  label="Source of details"
                  labelWidth="w-60"
                  className="flex items-center min-h-[26px]"
                >
                  <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
                </FormRow>
              )}

              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 mb-1">
                GST Rate & Related Details
              </div>
              <FormRow
                label="GST Rate Details"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutoryForm.gst_rate_source || 'As per Company/Group'}
                  onChange={setStatutoryField('gst_rate_source')}
                >
                  <option value="As per Company/Group">As per Company/Group</option>
                  <option value="As per Stock Item">As per Stock Item</option>
                  <option value="Specify Details Here">Specify Details Here</option>
                </select>
              </FormRow>

              {statutoryForm.gst_rate_source === 'Specify Details Here' ? (
                <>
                  <FormRow
                    label="Taxability Type"
                    labelWidth="w-60"
                    className="flex items-center min-h-[26px]"
                  >
                    <select
                      className={selectCls}
                      value={statutoryForm.taxability_type || 'Taxable'}
                      onChange={setStatutoryField('taxability_type')}
                    >
                      <option value="Taxable">Taxable</option>
                      <option value="Exempt">Exempt</option>
                      <option value="Nil Rated">Nil Rated</option>
                    </select>
                  </FormRow>
                  <FormRow
                    label="GST Rate"
                    labelWidth="w-60"
                    className="flex items-center min-h-[26px]"
                  >
                    <input
                      type="number"
                      step="0.01"
                      className={`${inputCls} text-right max-w-[100px]`}
                      value={statutoryForm.gst_rate ?? 0}
                      onChange={setStatutoryNumber('gst_rate')}
                    />
                    <span className="text-xs text-zinc-400 ml-1">%</span>
                  </FormRow>
                </>
              ) : (
                <FormRow
                  label="Source of details"
                  labelWidth="w-60"
                  className="flex items-center min-h-[26px]"
                >
                  <span className="text-sm text-zinc-400 italic px-1.5">Not Available</span>
                </FormRow>
              )}

              <FormRow
                label="Type of Supply"
                labelWidth="w-60"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutoryForm.type_of_supply || 'Services'}
                  onChange={setStatutoryField('type_of_supply')}
                >
                  <option value="Goods">Goods</option>
                  <option value="Services">Services</option>
                </select>
              </FormRow>
            </>
          )}
        </>
      )}

      {statutorySections.length > 0 && (
        <FormRow
          label="Set/Alter other Statutory details"
          labelWidth="w-60"
          className="flex items-center min-h-[26px]"
        >
          <select
            className={selectCls}
            value={isOtherStatutoryActive ? 'Yes' : 'No'}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'Yes') {
                if (
                  !isOtherStatutoryActive &&
                  statutorySections.includes('tds') &&
                  !groupLineage.isInventory &&
                  !groupLineage.isTax &&
                  !groupLineage.isMiscExpense
                ) {
                  setOtherStatutory((prev) => ({
                    ...prev,
                    tds: { ...prev.tds, is_tds_deductable: 1 },
                  }));
                }
                setShowOtherStatutoryModal(true);
              } else if (val === 'No' && isOtherStatutoryActive) {
                setOtherStatutory({
                  tds: { ...EMPTY_TDS },
                  tcs: { ...EMPTY_TCS },
                  serviceTax: { ...EMPTY_SERVICE_TAX },
                  excise: { ...EMPTY_EXCISE },
                  vat: { ...EMPTY_VAT },
                });
              }
            }}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </FormRow>
      )}
    </div>
  );
}
