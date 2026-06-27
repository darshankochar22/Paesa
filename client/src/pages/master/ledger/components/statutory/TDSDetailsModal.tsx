import { useRef, useState } from "react";
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
import NatureOfPaymentFlatList from "./NatureofPaymentFlatlist";
import { useNavigate } from "react-router-dom";
import { useTdsNatureOfPayments } from "../../hooks/usetdsnatureofpayments";

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

const FOREIGN_PAN_STATUSES = new Set(["Not Available", "Not Required"]);

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
  // foreign / no-PAN fields
  deductee_ref: string;
  tax_unique_id_no: string;
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
  deductee_ref: "",
  tax_unique_id_no: "",
};

interface TDSDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: TdsFormState) => void;
  ledgerName?: string;
  value: TdsFormState;
  companyId: number;
}

export default function TDSDetailsModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  value,
  companyId,
}: TDSDetailsModalProps) {
  const [form, setForm] = useState<TdsFormState>(value);
  const [nopPopupOpen, setNopPopupOpen] = useState(false);
  const nopFieldRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { items: natureOfPaymentItems, loading: nopLoading } =
    useTdsNatureOfPayments(companyId);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const update = <K extends keyof TdsFormState>(key: K, val: TdsFormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const panStatusOptions = TDS_PAN_STATUSES.map((s) => ({ value: s, label: s }));
  const showForeignFields = FOREIGN_PAN_STATUSES.has(form.tds_pan_status);

  const handleSelectNop = (val: string) => {
    update("nature_of_payment", val);
    setNopPopupOpen(false);
  };

  const handleCreateNop = () => {
    setNopPopupOpen(false);
    navigate("/master/create/tds-nature-of-payment");
  };

  return (
    <ModalChrome width={520}>
      <ModalTitleBar
        title={`Statutory Details${ledgerName ? ` for ${ledgerName}` : ""} (Secondary)`}
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
            onChange={(e) =>
              update("is_tds_deductable", e.target.value === "Yes" ? 1 : 0)
            }
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
                  <option key={s} value={s}>{s}</option>
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

            <ModalFormRow label="Nature of Payment" labelWidth="w-56">
              <div className="relative" ref={nopFieldRef}>
                <button
                  type="button"
                  onClick={() => setNopPopupOpen((v) => !v)}
                  className={selectCls + " max-w-[200px] text-left flex items-center justify-between"}
                >
                  <span className="truncate">{form.nature_of_payment}</span>
                  <span className="text-zinc-400 ml-1">▾</span>
                </button>

                {nopPopupOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-[280px] h-[260px] border border-zinc-300 shadow-lg rounded-sm overflow-hidden">
                    <NatureOfPaymentFlatList
                      items={natureOfPaymentItems}
                      loading={nopLoading}
                      selectedValue={form.nature_of_payment}
                      onSelect={handleSelectNop}
                      onCreate={handleCreateNop}
                      onClose={() => setNopPopupOpen(false)}
                    />
                  </div>
                )}
              </div>
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

            {/* Deductee Ref + Tax ID — shown when PAN is Not Available or Not Required */}
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