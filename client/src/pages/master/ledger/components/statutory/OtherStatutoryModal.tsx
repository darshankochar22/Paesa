import { useState, useEffect } from "react";
import {
  ModalChrome,
  ModalTitleBar,
  ModalFooter,
  useEscapeClose,
} from "./shared";
import {
  SECTION_META,
  type OtherStatutorySectionKey,
} from "@/config/ledgerStatutoryConfig";
import { FormRow } from "@/components/ui";
import type { TdsFormState } from "./TDSDetailsModal";
import type { TcsFormState } from "./TCSDetailsModal";
import type {
  ServiceTaxFormState,
  ExciseFormState,
  VATFormState,
} from "./SimpleTaxModals";

export interface OtherStatutoryForm {
  tds: TdsFormState;
  tcs: TcsFormState;
  serviceTax: ServiceTaxFormState;
  excise: ExciseFormState;
  vat: VATFormState;
}

const selectCls =
  "bg-transparent text-[12px] outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-300 focus:border-zinc-800 transition-colors rounded-sm cursor-pointer bg-white/50";

interface OtherStatutoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: OtherStatutoryForm) => void;
  ledgerName?: string;
  visibleSections: OtherStatutorySectionKey[];
  value: OtherStatutoryForm;
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
  onTriggerSubModal,
  onResetSubModal,
}: OtherStatutoryModalProps) {
  const [form, setForm] = useState<OtherStatutoryForm>(value);

  useEffect(() => {
    if (isOpen) {
      setForm(value);
    }
  }, [isOpen, value]);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const sectionActive = (key: OtherStatutorySectionKey): boolean => {
    switch (key) {
      case "tds":
        return form.tds.is_tds_deductable === 1;
      case "tcs":
        return form.tcs.is_tcs_applicable === 1;
      case "serviceTax":
        return form.serviceTax.set_alter_service_tax_details === 1;
      case "excise":
        return form.excise.set_alter_excise_details === 1;
      case "vat":
        return form.vat.set_alter_vat_details === 1;
    }
  };

  const onRowClick = (key: OtherStatutorySectionKey) => {
    const isActive = sectionActive(key);
    if (isActive) {
      onResetSubModal(key);
      setForm((f) => {
        const next = { ...f };
        if (key === "tds") next.tds = { ...f.tds, is_tds_deductable: 0 };
        if (key === "tcs") next.tcs = { ...f.tcs, is_tcs_applicable: 0 };
        if (key === "serviceTax") next.serviceTax = { ...f.serviceTax, set_alter_service_tax_details: 0 };
        if (key === "excise") next.excise = { ...f.excise, set_alter_excise_details: 0 };
        if (key === "vat") next.vat = { ...f.vat, set_alter_vat_details: 0 };
        return next;
      });
    } else {
      onTriggerSubModal(key);
    }
  };

  return (
    <ModalChrome width={520}>
      <ModalTitleBar
        title={`Statutory Details for ${ledgerName || "Ledger"}`}
        onClose={onClose}
      />
      <div className="px-6 py-4 space-y-2">
        {visibleSections.length === 0 && (
          <div className="text-[12px] text-zinc-500 italic">
            No statutory sections are applicable for this group.
          </div>
        )}
        {visibleSections.map((key) => {
          const meta = SECTION_META[key];
          const isActive = sectionActive(key);
          return (
            <FormRow
              key={key}
              label={`Set/Alter ${meta.label} details`}
              labelWidth="w-60"
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50"
            >
              <select
                className={selectCls + " max-w-[80px]"}
                value={isActive ? "Yes" : "No"}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onRowClick(key)}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          );
        })}
      </div>
      <ModalFooter
        onClose={onClose}
        onAccept={() => onAccept(form)}
        acceptLabel="Ok"
      />
    </ModalChrome>
  );
}