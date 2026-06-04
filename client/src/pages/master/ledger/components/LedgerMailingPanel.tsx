import { FormRow } from "@/components/ui";
import { INDIAN_STATES } from "@/constants/states";
import type { LedgerType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerMailingPanelProps {
  form: Partial<LedgerType>;
  setField: (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  groupLineage: {
    hideMailingExtras: boolean;
  };
}

export default function LedgerMailingPanel({
  form,
  setField,
  groupLineage,
}: LedgerMailingPanelProps) {
  return (
    <div className="p-3 border-t border-zinc-100 bg-white">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Mailing Details</div>
      <div className="space-y-1">
        <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
          <input className={inputCls} value={form.mailing_name || ""} onChange={setField("mailing_name")} />
        </FormRow>
        <div className="flex items-start min-h-[26px]">
          <span className="w-20 text-sm shrink-0 pt-1 text-zinc-400 font-medium">Address</span>
          <span className="text-zinc-400 mr-2 shrink-0 pt-1">:</span>
          <div className="flex-1 space-y-1">
            <input className={`${inputCls} w-full`} value={form.address1 || ""} onChange={setField("address1")} />
            <input className={`${inputCls} w-full`} value={form.address2 || ""} onChange={setField("address2")} />
          </div>
        </div>
        {!groupLineage.hideMailingExtras && (
          <>
            <FormRow label="State" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.state || "Select"} onChange={setField("state")}>
                <option value="Select">Select</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormRow>
            <FormRow label="Country" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.country || ""} onChange={setField("country")} />
            </FormRow>
            <FormRow label="Pincode" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.pincode || ""} onChange={setField("pincode")} />
            </FormRow>
          </>
        )}
      </div>
    </div>
  );
}
