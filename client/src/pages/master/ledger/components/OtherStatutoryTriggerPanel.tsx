import { FormRow } from "@/components/ui";
import type { OtherStatutoryForm } from "./statutory/OtherStatutoryModal";

const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface OtherStatutoryTriggerPanelProps {
  form: OtherStatutoryForm;
  onOpen: () => void;
  onEnable: () => void;
  onDisable: () => void;
}

export default function OtherStatutoryTriggerPanel({
  form,
  onOpen,
  onEnable,
  onDisable,
}: OtherStatutoryTriggerPanelProps) {
  const isActive =
    form.tds.is_tds_deductable === 1 ||
    form.tcs.is_tcs_applicable === 1 ||
    form.serviceTax.set_alter_service_tax_details === 1 ||
    form.excise.set_alter_excise_details === 1 ||
    form.vat.set_alter_vat_details === 1;

  return (
    <div className="p-3 border-t border-zinc-100 bg-white">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
        Statutory Details
      </div>
      <FormRow
        label="Set/Alter other Statutory details"
        labelWidth="w-60"
        className="flex items-center min-h-[26px]"
      >
        <select
          className={selectCls + " max-w-[80px]"}
          value={isActive ? "Yes" : "No"}
          onChange={(e) => {
            if (e.target.value === "Yes" && !isActive) {
              onEnable();
            } else if (isActive && e.target.value === "No") {
              onDisable();
            }
          }}
        >
          <option>No</option>
          <option>Yes</option>
        </select>
      </FormRow>
    </div>
  );
}