import { FormRow } from '@/components/ui';
import type { LedgerType } from '@/types/api';
import type { StatutoryDetails } from '../hooks/useLedgerForm';
import type { LedgerConfigOptions } from '../config/LedgerConfig';
import { useCompany } from '@/context/CompanyContext';
import { isTaxFeatureEnabled } from '@/lib/taxFeatures';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

interface LedgerTaxPanelProps {
  form: Partial<LedgerType>;
  setField: (
    key: keyof LedgerType,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  statutoryForm: StatutoryDetails;
  setStatutoryField: (
    key: keyof StatutoryDetails,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setStatutoryNumber: (
    key: keyof StatutoryDetails,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStatutoryForm: React.Dispatch<React.SetStateAction<StatutoryDetails>>;
  groupLineage: {
    isTax: boolean;
  };
  config: LedgerConfigOptions;
  vatActive: boolean;
  exciseActive: boolean;
  onGSTDetailsChange: (val: 'Yes' | 'No') => void;
  onServiceTaxDetailsChange: (val: 'Yes' | 'No') => void;
  onVATDetailsChange: (val: 'Yes' | 'No') => void;
  onExciseDetailsChange: (val: 'Yes' | 'No') => void;
}

function useTaxPanelVisibility(
  config: LedgerConfigOptions,
  groupLineage: { isTax: boolean },
  statutoryForm: StatutoryDetails,
  form: Partial<LedgerType>,
) {
  // Payment gateway ledger: only GSTIN/UIN under Tax Registration Details
  if (form.behave_as_payment_gateway) {
    return {
      dutyTaxSection: false,
      taxRegistrationSection: true,
      panField: false,
      fullRegistrationFields: false,
      gstinField: true,
      serviceTaxField: false,
      vatField: false,
      exciseField: false,
    };
  }

  const isFull = config.taxRegistration === 'full';
  const isGstinServiceTaxOnly = config.taxRegistration === 'gstinServiceTaxOnly';
  const isPanOnly = config.taxRegistration === 'panOnly';

  const assessableGstSelected =
    config.assessableValueCalc && statutoryForm.include_in_assessable_value_calculation === 'GST';

  const registrationKnown =
    !!form.registration_type &&
    form.registration_type !== 'Unknown' &&
    form.registration_type !== 'Unregistered/Consumer';

  return {
    // For isTax groups, DutyTaxSection is rendered in left panel by LedgerCreate/Alter
    dutyTaxSection: (config.dutyTaxDetails || groupLineage.isTax) && !groupLineage.isTax,
    taxRegistrationSection: config.taxRegistration !== 'none',
    panField: isPanOnly || isFull || isGstinServiceTaxOnly,
    fullRegistrationFields:
      isFull && !assessableGstSelected && config.registrationTypeFields !== false,
    gstinField:
      ((isFull && !assessableGstSelected && registrationKnown) || isGstinServiceTaxOnly) &&
      config.gstinDetails !== false,
    serviceTaxField: (isFull || isGstinServiceTaxOnly) && config.serviceTaxDetails !== false,
    vatField: (isFull || isGstinServiceTaxOnly) && config.vatDetails === true,
    exciseField: (isFull || isGstinServiceTaxOnly) && config.exciseDetails === true,
  };
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
  vatActive,
  exciseActive,
  onGSTDetailsChange,
  onServiceTaxDetailsChange,
  onVATDetailsChange,
  onExciseDetailsChange,
}: LedgerTaxPanelProps) {
  const visibility = useTaxPanelVisibility(config, groupLineage, statutoryForm, form);
  // F11 tax features — hide each tax's Set/Alter field when its flag is off.
  const { features } = useCompany();
  const vatEnabled = isTaxFeatureEnabled(features, 'vat');
  const exciseEnabled = isTaxFeatureEnabled(features, 'excise');

  return (
    <>
      {visibility.dutyTaxSection && (
        <DutyTaxSection
          statutoryForm={statutoryForm}
          setStatutoryField={setStatutoryField}
          setStatutoryNumber={setStatutoryNumber}
          setStatutoryForm={setStatutoryForm}
        />
      )}

      {visibility.taxRegistrationSection && (
        <div className="p-3 border-t border-zinc-100 bg-white space-y-1">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Tax Registration Details
          </div>

          {visibility.panField && (
            <FormRow
              label="PAN/IT No."
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <input
                className={inputCls}
                value={form.pan || ''}
                onChange={setField('pan')}
                maxLength={10}
              />
            </FormRow>
          )}

          {visibility.fullRegistrationFields && (
            <>
              <FormRow
                label="Registration Type"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.registration_type || 'Unknown'}
                  onChange={setField('registration_type')}
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

              <FormRow
                label="Set/Alter additional GST details"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.additional_gst_details ? 'Yes' : 'No'}
                  onChange={(e) => onGSTDetailsChange(e.target.value as 'Yes' | 'No')}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </FormRow>
            </>
          )}

          {visibility.gstinField && (
            <FormRow label="GSTIN/UIN" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                value={form.gstin || ''}
                onChange={setField('gstin')}
                maxLength={15}
              />
            </FormRow>
          )}

          {visibility.serviceTaxField && (
            <FormRow
              label="Set/Alter service tax details"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={form.service_tax_details ? 'Yes' : 'No'}
                onChange={(e) => onServiceTaxDetailsChange(e.target.value as 'Yes' | 'No')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          )}

          {visibility.vatField && vatEnabled && (
            <FormRow
              label="Set/Alter VAT Details"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={vatActive ? 'Yes' : 'No'}
                onChange={(e) => onVATDetailsChange(e.target.value as 'Yes' | 'No')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          )}

          {visibility.exciseField && exciseEnabled && (
            <FormRow
              label="Set/Alter excise details"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={exciseActive ? 'Yes' : 'No'}
                onChange={(e) => onExciseDetailsChange(e.target.value as 'Yes' | 'No')}
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

const DUTY_TAX_TYPES = [
  'CENVAT',
  'CST',
  'GST',
  'Krishi Kalyan Cess',
  'Others',
  'Service Tax',
  'Swachh Bharat Cess',
  'TCS',
  'TDS',
  'VAT',
];
// Rounding method is offered for these types only (not Others/TCS/TDS) — per #154 screenshots.
const ROUNDING_TYPES = new Set([
  'CENVAT',
  'CST',
  'GST',
  'Krishi Kalyan Cess',
  'Service Tax',
  'Swachh Bharat Cess',
  'VAT',
]);
// Base types that show "Percentage of calculation"; GST is decided by its tax type below.
const PERCENTAGE_TYPES = new Set(['CENVAT', 'CST', 'Others', 'VAT']);

export function DutyTaxSection({
  statutoryForm,
  setStatutoryField,
  setStatutoryNumber,
}: {
  statutoryForm: StatutoryDetails;
  setStatutoryField: (
    key: keyof StatutoryDetails,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setStatutoryNumber: (
    key: keyof StatutoryDetails,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  setStatutoryForm?: React.Dispatch<React.SetStateAction<StatutoryDetails>>;
}) {
  // F11 tax features — drop a Type of Duty/Tax option when its flag is off (CENVAT
  // is an excise credit ledger; GST/Service Tax etc. are not gated yet).
  const { features } = useCompany();
  const typeEnabled = (t: string) => {
    if (t === 'VAT') return isTaxFeatureEnabled(features, 'vat');
    if (t === 'TDS') return isTaxFeatureEnabled(features, 'tds');
    if (t === 'TCS') return isTaxFeatureEnabled(features, 'tcs');
    if (t === 'CENVAT') return isTaxFeatureEnabled(features, 'excise');
    return true;
  };
  const dutyType = statutoryForm.type_of_duty_tax || 'Others';
  const gstTaxType = statutoryForm.gst_tax_type || 'IGST';
  const valuationType = statutoryForm.valuation_type || 'Any';
  const roundingMethod = statutoryForm.statutory_details || 'Not Applicable';

  const isGstCess = dutyType === 'GST' && gstTaxType === 'Cess';
  // Quantity-based cess is charged per unit, not as a percentage.
  const showRatePerUnit = isGstCess && valuationType === 'Based on Quantity';
  const showPercentage = !showRatePerUnit && (PERCENTAGE_TYPES.has(dutyType) || dutyType === 'GST');
  const showRounding = ROUNDING_TYPES.has(dutyType);
  const showRoundingLimit = showRounding && roundingMethod !== 'Not Applicable';
  // CENVAT uses a slightly different helper than the rest (per screenshots).
  const percentageHelper =
    dutyType === 'CENVAT' ? '(To use as common ledger, set as 0%)' : '(0% for common ledger)';

  return (
    <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
      <FormRow
        label="Type of Duty/Tax"
        labelWidth="w-52"
        className="flex items-center min-h-[26px]"
      >
        <select
          className={selectCls}
          value={dutyType}
          onChange={setStatutoryField('type_of_duty_tax')}
        >
          {DUTY_TAX_TYPES.filter(typeEnabled).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FormRow>

      {dutyType === 'CENVAT' && (
        <FormRow label="Duty Head" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <input
            className={inputCls}
            list="cenvat-duty-heads"
            value={statutoryForm.duty_head || ''}
            onChange={setStatutoryField('duty_head')}
          />
          <datalist id="cenvat-duty-heads">
            <option value="Basic Excise Duty" />
          </datalist>
        </FormRow>
      )}

      {dutyType === 'GST' && (
        <>
          <FormRow label="Tax type" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={gstTaxType}
              onChange={setStatutoryField('gst_tax_type')}
            >
              <option value="IGST">IGST</option>
              <option value="CGST">CGST</option>
              <option value="SGST/UTGST">SGST/UTGST</option>
              <option value="Cess">Cess</option>
            </select>
          </FormRow>
          {isGstCess && (
            <FormRow
              label="Valuation type"
              labelWidth="w-52"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={valuationType}
                onChange={setStatutoryField('valuation_type')}
              >
                <option value="Any">Any</option>
                <option value="Based on Quantity">Based on Quantity</option>
                <option value="Based on Value">Based on Value</option>
              </select>
            </FormRow>
          )}
        </>
      )}

      {dutyType === 'Service Tax' && (
        <FormRow label="Tax head" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={statutoryForm.service_tax_head || 'Any'}
            onChange={setStatutoryField('service_tax_head')}
          >
            <option value="Any">Any</option>
            <option value="Education Cess">Education Cess</option>
            <option value="Secondary Education Cess">Secondary Education Cess</option>
            <option value="Service Tax">Service Tax</option>
          </select>
        </FormRow>
      )}

      {dutyType === 'TCS' && (
        <FormRow
          label="Nature of goods/contract/license/lease"
          labelWidth="w-52"
          className="flex items-center min-h-[26px]"
        >
          <input
            className={inputCls}
            value={statutoryForm.nature_of_goods || ''}
            onChange={setStatutoryField('nature_of_goods')}
          />
        </FormRow>
      )}

      {dutyType === 'TDS' && (
        <FormRow
          label="Nature of payment"
          labelWidth="w-52"
          className="flex items-center min-h-[26px]"
        >
          <input
            className={inputCls}
            value={statutoryForm.nature_of_goods || ''}
            onChange={setStatutoryField('nature_of_goods')}
          />
        </FormRow>
      )}

      {showRatePerUnit && (
        <FormRow label="Rate per unit" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <div className="flex flex-col gap-0.5">
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right max-w-[100px]`}
              value={statutoryForm.rate_per_unit ?? 0}
              onChange={setStatutoryNumber('rate_per_unit')}
            />
            {(statutoryForm.rate_per_unit ?? 0) === 0 && (
              <span className="text-[10px] text-zinc-400 px-1">(0% for common ledger)</span>
            )}
          </div>
        </FormRow>
      )}

      {showPercentage && (
        <FormRow
          label="Percentage of calculation"
          labelWidth="w-52"
          className="flex items-center min-h-[26px]"
        >
          <div className="flex flex-col gap-0.5">
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right max-w-[100px]`}
              value={statutoryForm.percentage_of_calculation ?? 0}
              onChange={setStatutoryNumber('percentage_of_calculation')}
            />
            {(statutoryForm.percentage_of_calculation ?? 0) === 0 && (
              <span className="text-[10px] text-zinc-400 px-1">{percentageHelper}</span>
            )}
          </div>
        </FormRow>
      )}

      {showRounding && (
        <>
          <FormRow
            label="Rounding method"
            labelWidth="w-52"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={roundingMethod}
              onChange={setStatutoryField('statutory_details')}
            >
              <option value="Not Applicable">Not Applicable</option>
              <option value="Downward Rounding">Downward Rounding</option>
              <option value="Normal Rounding">Normal Rounding</option>
              <option value="Upward Rounding">Upward Rounding</option>
            </select>
          </FormRow>

          {showRoundingLimit && (
            <FormRow
              label="Rounding limit"
              labelWidth="w-52"
              className="flex items-center min-h-[26px]"
            >
              <input
                type="number"
                step="0.01"
                className={`${inputCls} text-right max-w-[100px]`}
                value={statutoryForm.rounding_limit ?? 0}
                onChange={setStatutoryNumber('rounding_limit')}
              />
            </FormRow>
          )}
        </>
      )}
    </div>
  );
}
