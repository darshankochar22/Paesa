import { useState } from "react";
import {
  selectCls,
  ModalChrome,
  ModalTitleBar,
  ModalFooter,
  ModalFormRow,
  SectionHeading,
  useEscapeClose,
} from "./shared";
import ApplicabilityDropdown from "./ApplicabilityDropdown";

/* ── Form shapes ─────────────────────────────────────────────────────────── */

export interface ServiceTaxFormState {
  is_service_tax_applicable: string;
  set_alter_service_tax_details: 0 | 1;
}
export const EMPTY_SERVICE_TAX_FORM: ServiceTaxFormState = {
  is_service_tax_applicable: "Undefined",
  set_alter_service_tax_details: 0,
};

export interface ExciseFormState {
  is_excise_applicable: string;
  set_alter_excise_details: 0 | 1;
}
export const EMPTY_EXCISE_FORM: ExciseFormState = {
  is_excise_applicable: "Not Applicable",
  set_alter_excise_details: 0,
};

export interface VATFormState {
  is_vat_cst_applicable: string;
  set_alter_vat_details: 0 | 1;
}
export const EMPTY_VAT_FORM: VATFormState = {
  is_vat_cst_applicable: "Applicable",
  set_alter_vat_details: 0,
};

/* ── Shared "simple" modal: applicability row (clickable popup) + Yes/No toggle row */

interface SimpleProps<TForm> {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: TForm) => void;
  ledgerName?: string;
  value: TForm;
  applicabilityField: keyof TForm;
  yesNoField: keyof TForm;
  applicabilityLabel: string;
  yesNoLabel: string;
  showYesNo?: boolean;
}

function SimpleTaxModal<TForm extends object>({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
  applicabilityField,
  yesNoField,
  applicabilityLabel,
  yesNoLabel,
  showYesNo = true,
}: SimpleProps<TForm>) {
  const [form, setForm] = useState<TForm>(value);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const update = (key: keyof TForm, val: unknown) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  return (
    <ModalChrome width={520}>
      <ModalTitleBar
        title={`Statutory Details${ledgerName ? ` for ${ledgerName}` : ""}`}
        onClose={onClose}
      />

      <div className="px-6 py-4 space-y-1.5">
        <div className="py-1">
          <ApplicabilityDropdown
            label={applicabilityLabel}
            value={(form[applicabilityField] as string) || "Undefined"}
            onChange={(v) => update(applicabilityField, v)}
          />
        </div>

        {showYesNo && (
          <ModalFormRow label={yesNoLabel} labelWidth="w-56">
            <select
              className={selectCls + " max-w-[80px]"}
              value={form[yesNoField] ? "Yes" : "No"}
              onChange={(e) => update(yesNoField, e.target.value === "Yes" ? 1 : 0)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </ModalFormRow>
        )}
      </div>

      <ModalFooter onClose={onClose} onAccept={() => onAccept(form)} acceptLabel="Ok" />
    </ModalChrome>
  );
}

/* ── Three concrete exports ───────────────────────────────────────────────── */

export function ServiceTaxDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: ServiceTaxFormState) => void;
  ledgerName?: string;
  value: ServiceTaxFormState;
}) {
  return (
    <SimpleTaxModal<ServiceTaxFormState>
      isOpen={isOpen}
      onClose={onClose}
      onAccept={onAccept as (s: ServiceTaxFormState) => void}
      ledgerName={ledgerName}
      value={value}
      applicabilityField="is_service_tax_applicable"
      yesNoField="set_alter_service_tax_details"
      applicabilityLabel="Is service tax applicable"
      yesNoLabel="Set/Alter service tax details"
    />
  );
}

export function ExciseDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: ExciseFormState) => void;
  ledgerName?: string;
  value: ExciseFormState;
}) {
  return (
    <SimpleTaxModal<ExciseFormState>
      isOpen={isOpen}
      onClose={onClose}
      onAccept={onAccept as (s: ExciseFormState) => void}
      ledgerName={ledgerName}
      value={value}
      applicabilityField="is_excise_applicable"
      yesNoField="set_alter_excise_details"
      applicabilityLabel="Is Excise applicable"
      yesNoLabel="Set/Alter excise details"
    />
  );
}

export function VATDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: VATFormState) => void;
  ledgerName?: string;
  value: VATFormState;
}) {
  return (
    <SimpleTaxModal<VATFormState>
      isOpen={isOpen}
      onClose={onClose}
      onAccept={onAccept as (s: VATFormState) => void}
      ledgerName={ledgerName}
      value={value}
      applicabilityField="is_vat_cst_applicable"
      yesNoField="set_alter_vat_details"
      applicabilityLabel="Is VAT/CST applicable"
      yesNoLabel="Set/Alter VAT Details"
    />
  );
}

export { SectionHeading };
