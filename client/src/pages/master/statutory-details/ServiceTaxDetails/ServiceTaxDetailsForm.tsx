import { useEffect, useState } from 'react';
import { FormRow } from '@/components/ui';
import {
  type ServiceTaxDetails,
  type ServiceTaxCategory,
  ORGANISATION_TYPES,
  COMPUTATION_BASIS,
  DEFAULT_SERVICE_TAX_CATEGORY,
} from '@/types/entities/ServiceTaxDetails';

// Rate Details rows shown inside the "Service Tax Details" popup.
const RATE_FIELDS: { key: keyof ServiceTaxCategory; label: string }[] = [
  { key: 'serviceTaxRate', label: 'Service tax' },
  { key: 'educationCessRate', label: 'Education cess' },
  { key: 'secondaryEducationCessRate', label: 'Secondary education cess' },
  { key: 'swachhBharatCessRate', label: 'Swachh Bharat cess' },
  { key: 'krishiKalyanCessRate', label: 'Krishi Kalyan cess' },
];

// ─── Shared field tokens (black / white / zinc only) ───────────────────────────
const inputCls =
  'w-72 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'w-72 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const dateCls =
  'w-44 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

const LABEL_W = 'w-80';

export function ServiceTaxDetailsForm({
  form,
  setField,
  firstFieldAutoFocus = false,
}: {
  form: ServiceTaxDetails;
  setField: <K extends keyof ServiceTaxDetails>(key: K, value: ServiceTaxDetails[K]) => void;
  firstFieldAutoFocus?: boolean;
}) {
  const YesNo = ({ label, field }: { label: string; field: keyof ServiceTaxDetails }) => (
    <FormRow label={label} labelWidth={LABEL_W} className="flex items-center min-h-[26px]">
      <select
        className={selectCls}
        value={Number(form[field]) ? 'Yes' : 'No'}
        onChange={(e) =>
          setField(field, (e.target.value === 'Yes' ? 1 : 0) as ServiceTaxDetails[typeof field])
        }
      >
        <option>No</option>
        <option>Yes</option>
      </select>
    </FormRow>
  );

  // ── "Service Tax Details" popup, opened from Set/alter = Yes ──
  const [showRatePopup, setShowRatePopup] = useState(false);
  // The single rate set lives in the first category row (preserves any others).
  const cat: ServiceTaxCategory = form.categories[0] ?? { ...DEFAULT_SERVICE_TAX_CATEGORY };
  const updCat = (patch: Partial<ServiceTaxCategory>) => {
    const next = [...form.categories];
    next[0] = { ...cat, ...patch };
    setField('categories', next);
  };
  useEffect(() => {
    if (!showRatePopup) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowRatePopup(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showRatePopup]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
      <div className="p-6 max-w-[920px]">
        <div className="text-center text-sm font-bold text-zinc-800 mb-4">Service Tax Details</div>

        <FormRow
          label="Service tax registration number"
          labelWidth={LABEL_W}
          className="flex items-center min-h-[26px]"
        >
          <input
            autoFocus={firstFieldAutoFocus}
            className={inputCls}
            value={form.serviceTaxRegistrationNumber}
            onChange={(e) => setField('serviceTaxRegistrationNumber', e.target.value)}
          />
        </FormRow>

        <FormRow
          label="Type of organisation"
          labelWidth={LABEL_W}
          className="flex items-center min-h-[26px]"
        >
          <select
            className={selectCls}
            value={form.typeOfOrganisation}
            onChange={(e) =>
              setField(
                'typeOfOrganisation',
                e.target.value as ServiceTaxDetails['typeOfOrganisation'],
              )
            }
          >
            {ORGANISATION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </FormRow>

        {/* Monthly format & computation basis — only for Individual/Proprietory/One Person Company (Issue #146) */}
        {form.typeOfOrganisation === ORGANISATION_TYPES[0] && (
          <>
            <YesNo label="Is Monthly format" field="isMonthlyFormat" />

            <FormRow
              label="Compute tax liability based on"
              labelWidth={LABEL_W}
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={form.computeTaxLiabilityBasedOn}
                onChange={(e) =>
                  setField(
                    'computeTaxLiabilityBasedOn',
                    e.target.value as ServiceTaxDetails['computeTaxLiabilityBasedOn'],
                  )
                }
              >
                {COMPUTATION_BASIS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormRow>
          </>
        )}

        <FormRow
          label="Set/alter service tax details"
          labelWidth={LABEL_W}
          className="flex items-center min-h-[26px]"
        >
          <select
            className={selectCls}
            value={Number(form.setAlterServiceTaxDetails) ? 'Yes' : 'No'}
            onChange={(e) => {
              const yes = e.target.value === 'Yes';
              setField(
                'setAlterServiceTaxDetails',
                (yes ? 1 : 0) as ServiceTaxDetails['setAlterServiceTaxDetails'],
              );
              if (yes) setShowRatePopup(true);
            }}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>
        {Number(form.setAlterServiceTaxDetails) === 1 && (
          <div className="pl-[20rem]">
            <button
              type="button"
              className="text-xs text-zinc-500 underline hover:text-zinc-800"
              onClick={() => setShowRatePopup(true)}
            >
              {cat.name ? `${cat.name} — edit rate details` : 'Set rate details'}
            </button>
          </div>
        )}

        <YesNo
          label="Define service category and tax details as masters"
          field="defineServiceCategoryAsMasters"
        />

        <YesNo label="Is reverse charge applicable" field="isReverseChargeApplicable" />

        <FormRow
          label="Deactivate from"
          labelWidth={LABEL_W}
          className="flex items-center min-h-[26px]"
        >
          <input
            type="date"
            className={dateCls}
            value={form.deactivateFrom}
            onChange={(e) => setField('deactivateFrom', e.target.value)}
          />
        </FormRow>

        <div className="mt-6 pt-3 border-t border-zinc-100 text-[11px] italic text-zinc-400">
          Note: Service tax registration &amp; computation details are used in service tax Challan,
          Forms &amp; Returns.
        </div>
      </div>
      <div className="flex-1" />

      {/* ── Service Tax Details popup (Name + Rate Details) ── */}
      {showRatePopup && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
          data-enter-nav
        >
          <div className="bg-white border border-zinc-800 shadow-2xl w-[480px]">
            <div className="text-center font-bold text-sm py-3 border-b border-zinc-200">
              Service Tax Details
            </div>
            <div className="px-6 py-5">
              <FormRow label="Name" labelWidth="w-52" className="flex items-center min-h-[28px]">
                <input
                  autoFocus
                  className={inputCls}
                  value={cat.name}
                  onChange={(e) => updCat({ name: e.target.value })}
                />
              </FormRow>

              <div className="text-center text-[13px] font-bold text-zinc-800 mt-4 mb-2">
                Rate Details
              </div>
              {RATE_FIELDS.map((f) => (
                <FormRow
                  key={String(f.key)}
                  label={f.label}
                  labelWidth="w-52"
                  className="flex items-center min-h-[26px]"
                >
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 rounded text-right"
                      value={Number(cat[f.key]) || ''}
                      onChange={(e) => updCat({ [f.key]: Number(e.target.value) || 0 })}
                    />
                    <span className="text-sm text-zinc-500">%</span>
                  </span>
                </FormRow>
              ))}
            </div>

            <div className="border-t border-zinc-200 px-4 py-2.5 flex justify-end">
              <button
                data-enter-accept
                onClick={() => setShowRatePopup(false)}
                className="text-xs px-5 py-1 bg-zinc-900 text-white hover:bg-black font-bold rounded"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
