import React from 'react';
import { FormRow } from '@/components/ui';
import type { FormData } from '../hooks/useGSTRegistrationForm';

const TALLY_INDIAN_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttarakhand',
  'Uttar Pradesh',
  'West Bengal',
];

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors';

const rowCls = 'flex items-center min-h-[26px]';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold text-black uppercase tracking-wider border-b border-zinc-200 pb-1 pt-4 mb-1">
      {children}
    </div>
  );
}

interface GSTRegistrationFormFieldsProps {
  form: FormData;
  setField: (
    key: keyof FormData,
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export default function GSTRegistrationFormFields({
  form,
  setField,
}: GSTRegistrationFormFieldsProps) {
  const isComposition = form.registration_type === 'Composition';
  const showEInvoice = form.registration_type === 'Regular';
  const eWayOn = form.e_way_bill_applicable === 'Yes';

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
      <div className="p-3 space-y-1 max-w-5xl">
        <FormRow label="Registration status" labelWidth="w-56" className={rowCls}>
          <select
            autoFocus
            className={selectCls}
            value={form.registration_status}
            onChange={setField('registration_status')}
          >
            <option>Active</option>
            <option>Suspended</option>
            <option>Inactive</option>
          </select>
        </FormRow>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 items-start">
          {/* LEFT COLUMN — GST / Connected / e-Invoice / Composition */}
          <div className="space-y-1">
            <SectionLabel>GST Registration Details</SectionLabel>

            <FormRow label="State" labelWidth="w-56" className={rowCls} required>
              <select className={selectCls} value={form.state_id} onChange={setField('state_id')}>
                <option value="Not Applicable">Not Applicable</option>
                {TALLY_INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Address type" labelWidth="w-56" className={rowCls}>
              <select
                className={selectCls}
                value={form.address_type}
                onChange={setField('address_type')}
              >
                <option>Primary</option>
              </select>
            </FormRow>

            <FormRow label="Registration type" labelWidth="w-56" className={rowCls} required>
              <select
                className={selectCls}
                value={form.registration_type}
                onChange={setField('registration_type')}
              >
                <option>Regular</option>
                <option>Composition</option>
                <option>Regular - SEZ</option>
              </select>
            </FormRow>

            <FormRow label="Assessee of Other Territory" labelWidth="w-56" className={rowCls}>
              <select
                className={selectCls}
                value={form.assessee_of_other_territory}
                onChange={setField('assessee_of_other_territory')}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="GSTIN/UIN" labelWidth="w-56" className={rowCls} required>
              <input
                className={`${inputCls} uppercase tracking-wider`}
                placeholder="e.g. 27AAAAA1111A1Z1"
                value={form.gstin}
                onChange={setField('gstin')}
                maxLength={15}
              />
            </FormRow>

            {!isComposition && (
              <FormRow label="Periodicity of GSTR-1" labelWidth="w-56" className={rowCls}>
                <select
                  className={selectCls}
                  value={form.periodicity_of_gstr1}
                  onChange={setField('periodicity_of_gstr1')}
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                </select>
              </FormRow>
            )}

            <SectionLabel>Connected GST Details</SectionLabel>

            <FormRow label="GST Username" labelWidth="w-56" className={rowCls}>
              <input
                className={inputCls}
                placeholder="Optional portal user ID"
                value={form.gst_username}
                onChange={setField('gst_username')}
              />
            </FormRow>

            <FormRow label="Mode of Filing" labelWidth="w-56" className={rowCls}>
              <select
                className={selectCls}
                value={form.mode_of_filing}
                onChange={setField('mode_of_filing')}
              >
                <option>Not Applicable</option>
                <option>DSC</option>
                <option>EVC</option>
              </select>
            </FormRow>

            {showEInvoice && (
              <>
                <SectionLabel>e-Invoice Details</SectionLabel>

                <FormRow label="e-Invoicing applicable" labelWidth="w-56" className={rowCls}>
                  <select
                    className={selectCls}
                    value={form.e_invoice_application}
                    onChange={setField('e_invoice_application')}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>

                {form.e_invoice_application === 'Yes' && (
                  <>
                    <FormRow label="Applicable from" labelWidth="w-56" className={rowCls}>
                      <input
                        type="date"
                        className={inputCls}
                        value={form.e_invoice_applicable_from}
                        onChange={setField('e_invoice_applicable_from')}
                      />
                    </FormRow>

                    <FormRow label="Invoice bill from place" labelWidth="w-56" className={rowCls}>
                      <input
                        className={inputCls}
                        placeholder="e.g. Panaji"
                        value={form.e_invoice_bill_from_place}
                        onChange={setField('e_invoice_bill_from_place')}
                      />
                    </FormRow>
                  </>
                )}
              </>
            )}

            {isComposition && (
              <>
                <SectionLabel>Tax Rate Details for Turnover</SectionLabel>

                <FormRow label="Tax Rate for taxable turnover" labelWidth="w-56" className={rowCls}>
                  <div className="flex items-center gap-1">
                    <input
                      className={`${inputCls} w-20 text-right`}
                      placeholder="1"
                      value={form.composition_tax_rate}
                      onChange={setField('composition_tax_rate')}
                    />
                    <span className="text-sm text-black">%</span>
                  </div>
                </FormRow>

                <FormRow label="Calculate tax based on" labelWidth="w-56" className={rowCls}>
                  <select
                    className={selectCls}
                    value={form.composition_tax_calc_basis}
                    onChange={setField('composition_tax_calc_basis')}
                  >
                    <option>Taxable Value</option>
                    <option>Taxable, Exempt, &amp; Nil Rated Values</option>
                  </select>
                </FormRow>
              </>
            )}
          </div>

          {/* RIGHT COLUMN — e-Way Bill Details */}
          <div className="space-y-1">
            <SectionLabel>e-Way Bill Details</SectionLabel>

            <FormRow label="e-Way Bill applicable" labelWidth="w-56" className={rowCls}>
              <select
                className={selectCls}
                value={form.e_way_bill_applicable}
                onChange={setField('e_way_bill_applicable')}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Applicable from" labelWidth="w-56" className={rowCls}>
              <input
                type="date"
                className={inputCls}
                value={form.e_way_bill_applicable_from}
                onChange={setField('e_way_bill_applicable_from')}
              />
            </FormRow>

            <FormRow label="Applicable for intrastate" labelWidth="w-56" className={rowCls}>
              <select
                className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                value={form.applicable_for_intrastat}
                onChange={setField('applicable_for_intrastat')}
                disabled={!eWayOn}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Goods dispatched from" labelWidth="w-56" className={rowCls}>
              <select
                className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                value={form.goods_dispatched_from}
                onChange={setField('goods_dispatched_from')}
                disabled={!eWayOn}
              >
                <option>Primary</option>
              </select>
            </FormRow>
          </div>
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}
