import { useState } from "react";
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
import {
  EMPTY_TDS_FORM,
  type TdsFormState,
} from "./TDSDetailsModal";
import {
  EMPTY_TCS_FORM,
  type TcsFormState,
} from "./TCSDetailsModal";
import {
  EMPTY_SERVICE_TAX_FORM,
  EMPTY_EXCISE_FORM,
  EMPTY_VAT_FORM,
  ServiceTaxDetailsModal,
  ExciseDetailsModal,
  VATDetailsModal,
  type ServiceTaxFormState,
  type ExciseFormState,
  type VATFormState,
} from "./SimpleTaxModals";
import TDSDetailsModal from "./TDSDetailsModal";
import TCSDetailsModal from "./TCSDetailsModal";
import { useCompany } from "../../../../../context/CompanyContext";

export interface OtherStatutoryForm {
  tds: TdsFormState;
  tcs: TcsFormState;
  serviceTax: ServiceTaxFormState;
  excise: ExciseFormState;
  vat: VATFormState;
}

export const EMPTY_OTHER_STATUTORY: OtherStatutoryForm = {
  tds: { ...EMPTY_TDS_FORM },
  tcs: { ...EMPTY_TCS_FORM },
  serviceTax: { ...EMPTY_SERVICE_TAX_FORM },
  excise: { ...EMPTY_EXCISE_FORM },
  vat: { ...EMPTY_VAT_FORM },
};

const selectCls =
  "bg-transparent text-[12px] outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-300 focus:border-zinc-800 transition-colors rounded-sm cursor-pointer bg-white/50";

interface OtherStatutoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (state: OtherStatutoryForm) => void;
  ledgerName?: string;
  visibleSections: OtherStatutorySectionKey[];
  value: OtherStatutoryForm;
}

type Tier2 =
  | { kind: "tds" }
  | { kind: "tcs" }
  | { kind: "serviceTax" }
  | { kind: "excise" }
  | { kind: "vat" }
  | null;

export default function OtherStatutoryModal({
  isOpen,
  onClose,
  onAccept,
  ledgerName,
  visibleSections,
  value,
}: OtherStatutoryModalProps) {
  const [form, setForm] = useState<OtherStatutoryForm>(value);
  const [activeTier2, setActiveTier2] = useState<Tier2>(null);
  const { selectedCompany } = useCompany();

  useEscapeClose(isOpen, () => {
    if (activeTier2) setActiveTier2(null);
    else onClose();
  });

  if (!isOpen) return null;

  const updateSection = <K extends keyof OtherStatutoryForm>(
    key: K,
    patch: Partial<OtherStatutoryForm[K]>,
  ) => setForm((f) => ({ ...f, [key]: { ...f[key], ...patch } }));

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

  // Reset a section back to its empty/off state (used when flipping Yes -> No).
  const resetSection = (key: OtherStatutorySectionKey) => {
    switch (key) {
      case "tds":
        setForm((f) => ({
          ...f,
          tds: { ...EMPTY_TDS_FORM, tds_pan_it_no: f.tds.tds_pan_it_no, tds_name_on_pan: f.tds.tds_name_on_pan },
        }));
        break;
      case "tcs":
        setForm((f) => ({
          ...f,
          tcs: { ...EMPTY_TCS_FORM, tcs_pan_it_no: f.tcs.tcs_pan_it_no, tcs_name_on_pan: f.tcs.tcs_name_on_pan },
        }));
        break;
      case "serviceTax":
        setForm((f) => ({ ...f, serviceTax: { ...EMPTY_SERVICE_TAX_FORM } }));
        break;
      case "excise":
        setForm((f) => ({ ...f, excise: { ...EMPTY_EXCISE_FORM } }));
        break;
      case "vat":
        setForm((f) => ({ ...f, vat: { ...EMPTY_VAT_FORM } }));
        break;
    }
  };

  // Flip a section's "active" flag to Yes (1) without touching its other fields.
  const activateSection = (key: OtherStatutorySectionKey) => {
    switch (key) {
      case "tds":
        setForm((f) => ({ ...f, tds: { ...f.tds, is_tds_deductable: 1 } }));
        break;
      case "tcs":
        setForm((f) => ({ ...f, tcs: { ...f.tcs, is_tcs_applicable: 1 } }));
        break;
      case "serviceTax":
        setForm((f) => ({
          ...f,
          serviceTax: { ...f.serviceTax, set_alter_service_tax_details: 1 },
        }));
        break;
      case "excise":
        setForm((f) => ({
          ...f,
          excise: { ...f.excise, set_alter_excise_details: 1 },
        }));
        break;
      case "vat":
        setForm((f) => ({ ...f, vat: { ...f.vat, set_alter_vat_details: 1 } }));
        break;
    }
  };

  // Every section now follows the same Yes/No -> Tier-2 pattern as TDS/TCS:
  //   No  -> Yes : flip the active flag, then open that section's Tier-2 modal
  //   Yes -> Yes : already active, just reopen the Tier-2 modal to edit
  //   Yes -> No  : reset the section back to its empty state, no modal
  const onRowClick = (key: OtherStatutorySectionKey) => {
    const isActive = sectionActive(key);
    if (isActive) {
      resetSection(key);
    } else {
      activateSection(key);
      setTimeout(() => setActiveTier2({ kind: key }), 0);
    }
  };

  return (
    <>
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
        <ModalFooter onClose={onClose} onAccept={() => onAccept(form)} acceptLabel="Ok" />
      </ModalChrome>

      {/* Tier-2 detail modals (z-[60] on top of Tier-1's z-50) */}
      {activeTier2?.kind === "tds" && (
        <TDSDetailsModal
          isOpen
          ledgerName={ledgerName}
          value={form.tds}
          onClose={() => setActiveTier2(null)}
          onAccept={(state) => {
            updateSection("tds", state);
            setActiveTier2(null);
          }}
          companyId={selectedCompany?.company_id}
        />
      )}
      {activeTier2?.kind === "tcs" && (
        <TCSDetailsModal
          isOpen
          ledgerName={ledgerName}
          value={form.tcs}
          onClose={() => setActiveTier2(null)}
          onAccept={(state) => {
            updateSection("tcs", state);
            setActiveTier2(null);
          }}
        />
      )}
      {activeTier2?.kind === "serviceTax" && (
        <ServiceTaxDetailsModal
          isOpen
          ledgerName={ledgerName}
          value={form.serviceTax}
          onClose={() => setActiveTier2(null)}
          onAccept={(state) => {
            updateSection("serviceTax", state);
            setActiveTier2(null);
          }}
        />
      )}
      {activeTier2?.kind === "excise" && (
        <ExciseDetailsModal
          isOpen
          ledgerName={ledgerName}
          value={form.excise}
          onClose={() => setActiveTier2(null)}
          onAccept={(state) => {
            updateSection("excise", state);
            setActiveTier2(null);
          }}
        />
      )}
      {activeTier2?.kind === "vat" && (
        <VATDetailsModal
          isOpen
          ledgerName={ledgerName}
          value={form.vat}
          onClose={() => setActiveTier2(null)}
          onAccept={(state) => {
            updateSection("vat", state);
            setActiveTier2(null);
          }}
        />
      )}
    </>
  );
}