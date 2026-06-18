import { useState } from "react";
import {
  inputCls,
  selectCls,
  ModalChrome,
  ModalTitleBar,
  ModalFooter,
  ModalFormRow,
  SectionHeading,
  useEscapeClose,
} from "./shared";
import { TDS_PAN_STATUSES } from "./TDSDetailsModal";

/* ── Static option lists (Tally-aligned) ───────────────────────────────────── */

export const TCS_BUYER_LESSEE_TYPES = [
  "Unknown",
  "AOP (Companies as Members) - Non Resident",
  "AOP (Companies as Members) - Resident",
  "AOP - Non Resident",
  "AOP - Resident",
  "Artificial Juridical Person",
  "Artificial Juridical Person - Non Resident",
  "Artificial Juridical Person - Resident",
  "Association of Persons",
  "Body of Individuals",
  "BOI - Non Resident",
  "BOI - Resident",
  "Company - Non Resident",
  "Company - Resident",
  "Co-Operative Society - Non Resident",
  "Co-Operative Society - Resident",
  "Firm - Non Resident",
  "Firm - Resident",
  "Government",
  "HUF - Non Resident",
  "HUF - Resident",
  "Individual/HUF - Non Resident",
  "Individual/HUF - Resident",
  "Individual - Non Resident",
  "Individual - Resident",
  "Local Authority",
  "Others - Non Resident",
  "Others - Resident",
  "Partnership Firm",
];

/* ── Form shape ───────────────────────────────────────────────────────────── */

export interface TcsFormState {
  is_tcs_applicable: 0 | 1;
  tcs_buyer_lessee_type: string;
  tcs_pan_it_no: string;
  tcs_pan_status: string;
  tcs_name_on_pan: string;
  deductee_ref: string;
  tax_unique_id_no: string;
}

export const EMPTY_TCS_FORM: TcsFormState = {
  is_tcs_applicable: 0,
  tcs_buyer_lessee_type: "Unknown",
  tcs_pan_it_no: "",
  tcs_pan_status: "Unknown",
  tcs_name_on_pan: "",
  deductee_ref: "",
  tax_unique_id_no: "",
};

interface TCSDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: TcsFormState) => void;
  ledgerName?: string;
  value: TcsFormState;
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function TCSDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
}: TCSDetailsModalProps) {
  const [form, setForm] = useState<TcsFormState>(value);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const update = <K extends keyof TcsFormState>(key: K, val: TcsFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const showForeignFields = form.tcs_pan_status === "Not Available";

  return (
    <ModalChrome width={520}>
      <ModalTitleBar
        title={`Statutory Details${ledgerName ? ` for ${ledgerName}` : ""}`}
        onClose={onClose}
      />

      <div className="px-6 py-4 space-y-1.5">
        <SectionHeading>TDS</SectionHeading>
        <ModalFormRow label="Is TDS Deductable" labelWidth="w-56">
          <select
            className={selectCls + " max-w-[80px]"}
            value="No"
            disabled
          >
            <option>No</option>
          </select>
        </ModalFormRow>

        <SectionHeading>TCS</SectionHeading>
        <ModalFormRow label="Is TCS Applicable" labelWidth="w-56">
          <select
            className={selectCls + " max-w-[80px]"}
            value={form.is_tcs_applicable ? "Yes" : "No"}
            onChange={(e) =>
              update("is_tcs_applicable", e.target.value === "Yes" ? 1 : 0)
            }
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </ModalFormRow>

        {form.is_tcs_applicable === 1 && (
          <>
            <ModalFormRow label="Buyer/Lessee type" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[200px]"}
                value={form.tcs_buyer_lessee_type}
                onChange={(e) => update("tcs_buyer_lessee_type", e.target.value)}
              >
                {TCS_BUYER_LESSEE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </ModalFormRow>

            <ModalFormRow
              label="PAN/IT No."
              labelWidth="w-56"
              helper="(PAN is mandatory for e-TCS, should be of 10 Characters)"
            >
              <input
                className={inputCls + " max-w-[200px] uppercase"}
                value={form.tcs_pan_it_no}
                maxLength={10}
                onChange={(e) => update("tcs_pan_it_no", e.target.value.toUpperCase())}
              />
            </ModalFormRow>

            <ModalFormRow label="PAN Status" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[140px]"}
                value={form.tcs_pan_status}
                onChange={(e) => update("tcs_pan_status", e.target.value)}
              >
                {TDS_PAN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === form.tcs_pan_status ? `♦ ${s}` : s}
                  </option>
                ))}
              </select>
            </ModalFormRow>

            <ModalFormRow label="Name on PAN" labelWidth="w-56">
              <input
                className={inputCls + " max-w-[280px]"}
                value={form.tcs_name_on_pan}
                onChange={(e) => update("tcs_name_on_pan", e.target.value)}
              />
            </ModalFormRow>

            {showForeignFields && (
              <>
                <ModalFormRow label="Deductee Ref" labelWidth="w-56">
                  <input
                    className={inputCls + " max-w-[280px]"}
                    value={form.deductee_ref}
                    onChange={(e) => update("deductee_ref", e.target.value)}
                  />
                </ModalFormRow>
                <ModalFormRow
                  label="Tax/Unique Identification Number"
                  labelWidth="w-56"
                  helper="(Country of Residence)"
                >
                  <input
                    className={inputCls + " max-w-[280px]"}
                    value={form.tax_unique_id_no}
                    onChange={(e) => update("tax_unique_id_no", e.target.value)}
                  />
                </ModalFormRow>
              </>
            )}
          </>
        )}
      </div>

      <ModalFooter onClose={onClose} onAccept={() => onAccept(form)} acceptLabel="Ok" />
    </ModalChrome>
  );
}
