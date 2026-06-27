import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ModalTitleBar,
  ModalFooter,
  ModalFormRow,
  SectionHeading,
  inputCls,
  selectCls,
  useEscapeClose,
} from "./shared";
import ApplicabilityDropdown from "./ApplicabilityDropdown";
import NatureOfPaymentFlatList from "./NatureofPaymentFlatlist";
import { useTdsNatureOfPayments } from "../../hooks/usetdsnatureofpayments";
import { TDS_DEDUCTEE_TYPES, TDS_PAN_STATUSES, type TdsFormState } from "./TDSDetailsModal";
import { TCS_BUYER_LESSEE_TYPES, type TcsFormState } from "./TCSDetailsModal";
import type { ServiceTaxFormState, ExciseFormState, VATFormState } from "./SimpleTaxModals";
import {
  SECTION_META,
  type OtherStatutorySectionKey,
} from "@/config/ledgerStatutoryConfig";

export interface OtherStatutoryForm {
  tds: TdsFormState;
  tcs: TcsFormState;
  serviceTax: ServiceTaxFormState;
  excise: ExciseFormState;
  vat: VATFormState;
}

const FOREIGN_PAN_STATUSES = new Set(["Not Available", "Not Required"]);

const yesNoSelect = selectCls + " max-w-[80px]";

interface OtherStatutoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: OtherStatutoryForm) => void;
  ledgerName?: string;
  visibleSections: OtherStatutorySectionKey[];
  value: OtherStatutoryForm;
  companyId?: number;
  /** Expense/income groups: the TDS section only asks Nature of Payment
   *  (not the deductee-party details shown for balance-sheet groups). */
  tdsNatureOfPaymentOnly?: boolean;
  /** Income/sales groups: the TCS section only asks Nature of Goods. */
  tcsNatureOfGoodsOnly?: boolean;
  /** Persist current edits to the parent without closing (used before delegating
   *  to a Service Tax / Excise / VAT detail sub-modal so inline TDS/TCS edits survive). */
  onCommit: (state: OtherStatutoryForm) => void;
  onTriggerSubModal: (kind: OtherStatutorySectionKey) => void;
  onResetSubModal: (kind: OtherStatutorySectionKey) => void;
}

export default function OtherStatutoryModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  visibleSections,
  value,
  companyId,
  tdsNatureOfPaymentOnly,
  tcsNatureOfGoodsOnly,
  onCommit,
  onTriggerSubModal,
  onResetSubModal,
}: OtherStatutoryModalProps) {
  const [form, setForm] = useState<OtherStatutoryForm>(value);
  const [nopOpen, setNopOpen] = useState(false);
  const navigate = useNavigate();
  const { items: nopItems, loading: nopLoading } = useTdsNatureOfPayments(companyId ?? 0);

  // Re-sync from parent each time the modal (re)mounts/opens.
  useEffect(() => {
    if (isOpen) setForm(value);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const setTds = <K extends keyof TdsFormState>(k: K, v: TdsFormState[K]) =>
    setForm((f) => ({ ...f, tds: { ...f.tds, [k]: v } }));
  const setTcs = <K extends keyof TcsFormState>(k: K, v: TcsFormState[K]) =>
    setForm((f) => ({ ...f, tcs: { ...f.tcs, [k]: v } }));

  // Nature of Payment selector (shared by both TDS variants).
  const natureOfPaymentRow = (
    <ModalFormRow label="Nature of Payment" labelWidth="w-56">
      <div className="relative">
        <button
          type="button"
          onClick={() => setNopOpen((v) => !v)}
          className={selectCls + " max-w-[240px] text-left flex items-center justify-between"}
        >
          <span className="truncate">{form.tds.nature_of_payment}</span>
          <span className="text-zinc-400 ml-1">▾</span>
        </button>
        {nopOpen && (
          <div className="absolute z-50 top-full left-0 mt-1 w-[300px] h-[260px] border border-zinc-300 shadow-lg rounded-sm overflow-hidden bg-white">
            <NatureOfPaymentFlatList
              items={nopItems}
              loading={nopLoading}
              selectedValue={form.tds.nature_of_payment}
              onSelect={(v) => { setTds("nature_of_payment", v); setNopOpen(false); }}
              onCreate={() => { setNopOpen(false); navigate("/master/create/tds-nature-of-payment"); }}
              onClose={() => setNopOpen(false)}
            />
          </div>
        )}
      </div>
    </ModalFormRow>
  );

  // ── TDS ──────────────────────────────────────────────────────────────────
  const renderTDS = () => {
    const tds = form.tds;
    const showForeign = FOREIGN_PAN_STATUSES.has(tds.tds_pan_status);

    // Expense/income groups: Is TDS Applicable Yes/No, then Nature of Payment.
    if (tdsNatureOfPaymentOnly) {
      return (
        <section key="tds" className="space-y-1.5">
          <SectionHeading>TDS</SectionHeading>
          <ModalFormRow label="Is TDS Applicable" labelWidth="w-56">
            <select
              className={yesNoSelect}
              value={tds.is_tds_deductable ? "Yes" : "No"}
              onChange={(e) => setTds("is_tds_deductable", e.target.value === "Yes" ? 1 : 0)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </ModalFormRow>
          {tds.is_tds_deductable === 1 && natureOfPaymentRow}
        </section>
      );
    }

    return (
      <section key="tds" className="space-y-1.5">
        <SectionHeading>TDS</SectionHeading>
        <ModalFormRow label="Is TDS Deductable" labelWidth="w-56">
          <select
            className={yesNoSelect}
            value={tds.is_tds_deductable ? "Yes" : "No"}
            onChange={(e) => setTds("is_tds_deductable", e.target.value === "Yes" ? 1 : 0)}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </ModalFormRow>

        {tds.is_tds_deductable === 1 && (
          <>
            <ModalFormRow label="Treat as TDS Expenses" labelWidth="w-56">
              <select
                className={yesNoSelect}
                value={tds.treat_as_tds_expenses ? "Yes" : "No"}
                onChange={(e) => setTds("treat_as_tds_expenses", e.target.value === "Yes" ? 1 : 0)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </ModalFormRow>

            <ApplicabilityDropdown
              label="Deductee type"
              title="Deductee Types"
              value={tds.deductee_type}
              options={TDS_DEDUCTEE_TYPES}
              onChange={(v) => setTds("deductee_type", v)}
            />

            <ModalFormRow label="Deduct TDS in Same Voucher" labelWidth="w-56">
              <select
                className={yesNoSelect}
                value={tds.deduct_tds_in_same_voucher ? "Yes" : "No"}
                onChange={(e) => setTds("deduct_tds_in_same_voucher", e.target.value === "Yes" ? 1 : 0)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </ModalFormRow>

            <ModalFormRow
              label="PAN/IT No."
              labelWidth="w-56"
              helper="(PAN is mandatory for e-TDS, should be of 10 Characters)"
            >
              <input
                className={inputCls + " max-w-[200px] uppercase"}
                value={tds.tds_pan_it_no}
                maxLength={10}
                onChange={(e) => setTds("tds_pan_it_no", e.target.value.toUpperCase())}
              />
            </ModalFormRow>

            <ApplicabilityDropdown
              label="PAN Status"
              title="PAN Status"
              value={tds.tds_pan_status}
              options={TDS_PAN_STATUSES}
              onChange={(v) => setTds("tds_pan_status", v)}
            />

            {showForeign && (
              <>
                <ModalFormRow label="Deductee Ref" labelWidth="w-56">
                  <input className={inputCls + " max-w-[280px]"} value={tds.deductee_ref} onChange={(e) => setTds("deductee_ref", e.target.value)} />
                </ModalFormRow>
                <ModalFormRow label="Tax/Unique Identification Number" labelWidth="w-56" helper="(Country of Residence)">
                  <input className={inputCls + " max-w-[280px]"} value={tds.tax_unique_id_no} onChange={(e) => setTds("tax_unique_id_no", e.target.value)} />
                </ModalFormRow>
              </>
            )}

            <ModalFormRow label="Name on PAN" labelWidth="w-56">
              <input className={inputCls + " max-w-[280px]"} value={tds.tds_name_on_pan} onChange={(e) => setTds("tds_name_on_pan", e.target.value)} />
            </ModalFormRow>
          </>
        )}
      </section>
    );
  };

  // ── TCS ──────────────────────────────────────────────────────────────────
  const renderTCS = () => {
    const tcs = form.tcs;
    const showForeign = FOREIGN_PAN_STATUSES.has(tcs.tcs_pan_status);

    // Income/sales groups: Is TCS Applicable Yes/No, then Nature of Goods.
    if (tcsNatureOfGoodsOnly) {
      return (
        <section key="tcs" className="space-y-1.5">
          <SectionHeading>TCS</SectionHeading>
          <ModalFormRow label="Is TCS Applicable" labelWidth="w-56">
            <select
              className={yesNoSelect}
              value={tcs.is_tcs_applicable ? "Yes" : "No"}
              onChange={(e) => setTcs("is_tcs_applicable", e.target.value === "Yes" ? 1 : 0)}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </ModalFormRow>
          {tcs.is_tcs_applicable === 1 && (
            <ModalFormRow label="Nature of Goods" labelWidth="w-56">
              <input
                className={inputCls + " max-w-[280px]"}
                value={tcs.tcs_nature_of_goods ?? ""}
                onChange={(e) => setTcs("tcs_nature_of_goods", e.target.value)}
              />
            </ModalFormRow>
          )}
        </section>
      );
    }

    return (
      <section key="tcs" className="space-y-1.5">
        <SectionHeading>TCS</SectionHeading>
        <ModalFormRow label="Is TCS Applicable" labelWidth="w-56">
          <select
            className={yesNoSelect}
            value={tcs.is_tcs_applicable ? "Yes" : "No"}
            onChange={(e) => setTcs("is_tcs_applicable", e.target.value === "Yes" ? 1 : 0)}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </ModalFormRow>

        {tcs.is_tcs_applicable === 1 && (
          <>
            <ApplicabilityDropdown
              label="Buyer/Lessee type"
              title="Collectee Types"
              value={tcs.tcs_buyer_lessee_type}
              options={TCS_BUYER_LESSEE_TYPES}
              onChange={(v) => setTcs("tcs_buyer_lessee_type", v)}
            />

            <ModalFormRow
              label="PAN/IT No."
              labelWidth="w-56"
              helper="(PAN is mandatory for e-TCS, should be of 10 Characters)"
            >
              <input
                className={inputCls + " max-w-[200px] uppercase"}
                value={tcs.tcs_pan_it_no}
                maxLength={10}
                onChange={(e) => setTcs("tcs_pan_it_no", e.target.value.toUpperCase())}
              />
            </ModalFormRow>

            <ApplicabilityDropdown
              label="PAN Status"
              title="PAN Status"
              value={tcs.tcs_pan_status}
              options={TDS_PAN_STATUSES}
              onChange={(v) => setTcs("tcs_pan_status", v)}
            />

            {showForeign && (
              <>
                <ModalFormRow label="Deductee Ref" labelWidth="w-56">
                  <input className={inputCls + " max-w-[280px]"} value={tcs.deductee_ref} onChange={(e) => setTcs("deductee_ref", e.target.value)} />
                </ModalFormRow>
                <ModalFormRow label="Tax/Unique Identification Number" labelWidth="w-56" helper="(Country of Residence)">
                  <input className={inputCls + " max-w-[280px]"} value={tcs.tax_unique_id_no} onChange={(e) => setTcs("tax_unique_id_no", e.target.value)} />
                </ModalFormRow>
              </>
            )}

            <ModalFormRow label="Name on PAN" labelWidth="w-56">
              <input className={inputCls + " max-w-[280px]"} value={tcs.tcs_name_on_pan} onChange={(e) => setTcs("tcs_name_on_pan", e.target.value)} />
            </ModalFormRow>
          </>
        )}
      </section>
    );
  };

  // ── Service Tax / Excise / VAT — applicability inline, details delegated ───
  const renderSimple = (
    key: "serviceTax" | "excise" | "vat",
    applicabilityField: string,
    applicabilityLabel: string,
    yesNoField: string,
    yesNoLabel: string,
  ) => {
    const sec = form[key] as Record<string, any>;
    return (
      <section key={key} className="space-y-1.5">
        <SectionHeading>{SECTION_META[key].label}</SectionHeading>
        <ApplicabilityDropdown
          label={applicabilityLabel}
          value={sec[applicabilityField] || "Undefined"}
          onChange={(v) => setForm((f) => ({ ...f, [key]: { ...(f[key] as object), [applicabilityField]: v } }))}
        />
        <ModalFormRow label={yesNoLabel} labelWidth="w-56">
          <select
            className={yesNoSelect}
            value={sec[yesNoField] ? "Yes" : "No"}
            onChange={(e) => {
              const yes = e.target.value === "Yes";
              const next = { ...form, [key]: { ...(form[key] as object), [yesNoField]: yes ? 1 : 0 } };
              setForm(next);
              onCommit(next); // preserve inline TDS/TCS edits before delegating
              if (yes) onTriggerSubModal(key);
              else onResetSubModal(key);
            }}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </ModalFormRow>
      </section>
    );
  };

  const renderSection = (key: OtherStatutorySectionKey) => {
    switch (key) {
      case "tds": return renderTDS();
      case "tcs": return renderTCS();
      case "serviceTax":
        return renderSimple("serviceTax", "is_service_tax_applicable", "Is service tax applicable", "set_alter_service_tax_details", "Set/Alter service tax details");
      case "excise":
        return renderSimple("excise", "is_excise_applicable", "Is Excise applicable", "set_alter_excise_details", "Set/Alter excise details");
      case "vat":
        return renderSimple("vat", "is_vat_cst_applicable", "Is VAT/CST applicable", "set_alter_vat_details", "Set/Alter VAT Details");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 flex items-stretch justify-center p-6">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[1100px] max-w-[96vw] flex flex-col">
        <ModalTitleBar title={`Statutory Details for ${ledgerName || "Ledger"}`} onClose={onClose} />
        <div className="flex-1 px-12 py-8 space-y-8 overflow-y-auto">
          {visibleSections.length === 0 && (
            <div className="text-[12px] text-zinc-500 italic">
              No statutory sections are applicable for this group.
            </div>
          )}
          {visibleSections.map(renderSection)}
        </div>
        <ModalFooter onClose={onClose} onAccept={() => onAccept(form)} acceptLabel="Ok" />
      </div>
    </div>
  );
}
