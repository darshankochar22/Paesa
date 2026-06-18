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
import ApplicabilityDropdown from "./ApplicabilityDropdown";

/* ── Static option lists (Tally-aligned) ───────────────────────────────────── */

export const TDS_DEDUCTEE_TYPES = [
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

export const TDS_PAN_STATUSES = [
  "Unknown",
  "Applied",
  "Available",
  "Not Available",
  "Not Required",
];

export const TDS_NATURE_OF_PAYMENT_SUGGESTIONS = [
  "Any",
  "Undefined",
  "Salary",
  "Interest",
  "Rent",
  "Commission",
  "Professional Fees",
  "Royalty",
  "Contractor Payments",
];

/* ── Form shape ───────────────────────────────────────────────────────────── */

export interface TdsFormState {
  is_tds_applicable: string;
  is_tds_deductable: 0 | 1;
  treat_as_tds_expenses: 0 | 1;
  deductee_type: string;
  deduct_tds_in_same_voucher: 0 | 1;
  nature_of_payment: string;
  tds_pan_it_no: string;
  tds_pan_status: string;
  tds_pan_effective_date: string;
  tds_name_on_pan: string;
}

export const EMPTY_TDS_FORM: TdsFormState = {
  is_tds_applicable: "Undefined",
  is_tds_deductable: 0,
  treat_as_tds_expenses: 0,
  deductee_type: "Unknown",
  deduct_tds_in_same_voucher: 0,
  nature_of_payment: "Undefined",
  tds_pan_it_no: "",
  tds_pan_status: "Unknown",
  tds_pan_effective_date: "",
  tds_name_on_pan: "",
};

interface TDSDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: TdsFormState) => void;
  ledgerName?: string;
  value: TdsFormState;
  /** Optional list of available nature-of-payment names. Falls back to a small static list. */
  natureOfPaymentOptions?: string[];
}

/* ── Component ────────────────────────────────────────────────────────────── */

export default function TDSDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
  natureOfPaymentOptions,
}: TDSDetailsModalProps) {
  const [form, setForm] = useState<TdsFormState>(value);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const update = <K extends keyof TdsFormState>(key: K, val: TdsFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const panStatusOptions = TDS_PAN_STATUSES.map((s) => ({ value: s, label: s }));

  const nopList = (natureOfPaymentOptions && natureOfPaymentOptions.length > 0
    ? natureOfPaymentOptions
    : TDS_NATURE_OF_PAYMENT_SUGGESTIONS
  ).map((s) => ({ value: s, label: s }));

  return (
    <ModalChrome width={520}>
      <ModalTitleBar
        title={`Statutory Details${ledgerName ? ` for ${ledgerName}` : ""}`}
        onClose={onClose}
      />

      <div className="px-6 py-4 space-y-1.5">
        <SectionHeading>TDS</SectionHeading>

        <div className="py-1">
          <ApplicabilityDropdown
            label="Is TDS applicable"
            value={form.is_tds_applicable}
            onChange={(v) => update("is_tds_applicable", v)}
          />
        </div>

        <ModalFormRow label="Is TDS Deductable" labelWidth="w-56">
          <select
            className={selectCls + " max-w-[80px]"}
            value={form.is_tds_deductable ? "Yes" : "No"}
            onChange={(e) => update("is_tds_deductable", e.target.value === "Yes" ? 1 : 0)}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </ModalFormRow>

        {form.is_tds_deductable === 1 && (
          <>
            <ModalFormRow label="Treat as TDS Expenses" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[80px]"}
                value={form.treat_as_tds_expenses ? "Yes" : "No"}
                onChange={(e) =>
                  update("treat_as_tds_expenses", e.target.value === "Yes" ? 1 : 0)
                }
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </ModalFormRow>

            <ModalFormRow label="Deductee type" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[200px]"}
                value={form.deductee_type}
                onChange={(e) => update("deductee_type", e.target.value)}
              >
                {TDS_DEDUCTEE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </ModalFormRow>

            <ModalFormRow label="Deduct TDS in Same Voucher" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[80px]"}
                value={form.deduct_tds_in_same_voucher ? "Yes" : "No"}
                onChange={(e) =>
                  update("deduct_tds_in_same_voucher", e.target.value === "Yes" ? 1 : 0)
                }
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </ModalFormRow>

            <ModalFormRow
              label="Nature of Payment"
              labelWidth="w-56"
            >
              <select
                className={selectCls + " max-w-[200px]"}
                value={form.nature_of_payment}
                onChange={(e) => update("nature_of_payment", e.target.value)}
              >
                {nopList.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </ModalFormRow>

            <ModalFormRow
              label="PAN/IT No."
              labelWidth="w-56"
              helper="(PAN is mandatory for e-TDS, should be of 10 Characters)"
            >
              <input
                className={inputCls + " max-w-[200px] uppercase"}
                value={form.tds_pan_it_no}
                maxLength={10}
                onChange={(e) => update("tds_pan_it_no", e.target.value.toUpperCase())}
              />
            </ModalFormRow>

            <ModalFormRow
              label="PAN Effective Date"
              labelWidth="w-56"
              helper="(This has to be provided if the PAN if received after 1-4-2015)"
            >
              <input
                type="date"
                className={inputCls + " max-w-[160px]"}
                value={form.tds_pan_effective_date}
                onChange={(e) => update("tds_pan_effective_date", e.target.value)}
              />
            </ModalFormRow>

            <ModalFormRow label="PAN Status" labelWidth="w-56">
              <select
                className={selectCls + " max-w-[140px]"}
                value={form.tds_pan_status}
                onChange={(e) => update("tds_pan_status", e.target.value)}
              >
                {panStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value === form.tds_pan_status ? `♦ ${opt.label}` : opt.label}
                  </option>
                ))}
              </select>
            </ModalFormRow>

            <ModalFormRow label="Name on PAN" labelWidth="w-56">
              <input
                className={inputCls + " max-w-[280px]"}
                value={form.tds_name_on_pan}
                onChange={(e) => update("tds_name_on_pan", e.target.value)}
              />
            </ModalFormRow>
          </>
        )}
      </div>

      <ModalFooter onClose={onClose} onAccept={() => onAccept(form)} acceptLabel="Ok" />
    </ModalChrome>
  );
}
