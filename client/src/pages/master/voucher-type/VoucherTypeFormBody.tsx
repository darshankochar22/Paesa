import { FormRow } from "@/components/ui";

// ─── Shared field tokens (black / white / zinc only) ───────────────────────────
const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const nameInputCls =
  "w-80 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-52";
const ynSelectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-20";
const lockedCls = "text-zinc-400 cursor-not-allowed bg-zinc-50";

export type YN = "Yes" | "No";

export const CATEGORIES = [
  "Attendance", "Contra", "Credit Note", "Debit Note", "Delivery Note",
  "Job Work In Order", "Job Work Out Order", "Journal", "Manufacturing Journal",
  "Material In", "Material Out", "Memorandum", "Payment", "Payroll",
  "Physical Stock", "Purchase", "Purchase Order", "Receipt", "Receipt Note",
  "Rejection In", "Rejection Out", "Reversing Journal", "Sales", "Sales Order",
  "Stock Journal",
];

export const NUMBERING_METHODS = [
  "Automatic",
  "Automatic (Manual Override)",
  "Manual",
  "Multi-user Auto",
  "None",
] as const;
export type NumberingMethod = (typeof NUMBERING_METHODS)[number];

export const NUMBERING_BEHAVIOURS = [
  "Renumber Vouchers",
  "Retain Original Voucher No.",
] as const;

export interface VTForm {
  name: string;
  alias: string;
  short_name: string; // Abbreviation
  category: string;
  is_active: YN;
  numbering_method: NumberingMethod;
}

export interface VTConfig {
  use_effective_dates: YN;
  allow_zero_value_transactions: YN;
  make_voucher_optional: YN;
  allow_narration: YN;
  allow_narration_per_ledger: YN;
  numbering_behaviour: (typeof NUMBERING_BEHAVIOURS)[number];
  set_alter_additional_numbering: YN;
  show_unused_numbers: YN;
  prevent_duplicate_numbers: YN;
  print_after_save: YN;
  whatsapp_after_save: YN;
}

export const INITIAL_FORM: VTForm = {
  name: "",
  alias: "",
  short_name: "",
  category: "Receipt",
  is_active: "Yes",
  numbering_method: "Automatic",
};

export const INITIAL_CONFIG: VTConfig = {
  use_effective_dates: "No",
  allow_zero_value_transactions: "No",
  make_voucher_optional: "No",
  allow_narration: "Yes",
  allow_narration_per_ledger: "No",
  numbering_behaviour: "Retain Original Voucher No.",
  set_alter_additional_numbering: "No",
  show_unused_numbers: "Yes",
  prevent_duplicate_numbers: "No",
  print_after_save: "No",
  whatsapp_after_save: "No",
};

export const toInt = (v: YN) => (v === "Yes" ? 1 : 0);
export const fromInt = (v: unknown): YN => (v ? "Yes" : "No");

// ─── Yes / No selector ─────────────────────────────────────────────────────────
export function YesNoSelect({
  value,
  onChange,
  disabled,
}: {
  value: YN;
  onChange: (v: YN) => void;
  disabled?: boolean;
}) {
  return (
    <select
      className={`${ynSelectCls} ${disabled ? lockedCls : ""}`}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as YN)}
    >
      <option>Yes</option>
      <option>No</option>
    </select>
  );
}

// ─── Inline "List of Voucher Types" side panel (no overlap — sits as a flex
//     column between the form and the RightActionPanel, Stock-Group style) ───────
export function CategoryListPanel({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-64 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-200">
        <span>List of Voucher Types</span>
        <button onClick={onClose} className="text-sm font-bold font-sans hover:text-zinc-500">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {CATEGORIES.map((cat) => (
          <div
            key={cat}
            onClick={() => { onSelect(cat); onClose(); }}
            className={[
              "px-3 py-1.5 text-sm cursor-pointer select-none border-b border-zinc-100",
              cat === selected ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-800",
            ].join(" ")}
          >
            {cat}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── The reusable 3-column form body shared by Create & Alter ───────────────────
export function VoucherTypeFormBody({
  form,
  setForm,
  config,
  setConfig,
  showCategoryPanel,
  setShowCategoryPanel,
  lockIdentity = false,
  nameAutoFocus = false,
}: {
  form: VTForm;
  setForm: React.Dispatch<React.SetStateAction<VTForm>>;
  config: VTConfig;
  setConfig: React.Dispatch<React.SetStateAction<VTConfig>>;
  showCategoryPanel: boolean;
  setShowCategoryPanel: (v: boolean) => void;
  lockIdentity?: boolean;
  nameAutoFocus?: boolean;
}) {
  const setF = (key: keyof VTForm) => (v: string) => setForm((f) => ({ ...f, [key]: v }));
  const setC = (key: keyof VTConfig) => (v: YN) => setConfig((c) => ({ ...c, [key]: v }));

  const method = form.numbering_method;
  const isAuto = method === "Automatic" || method === "Multi-user Auto";
  const isManualOverride = method === "Automatic (Manual Override)";
  const isManual = method === "Manual";

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
        <div className="p-4 space-y-3 max-w-[1120px]">

          {/* Identity — Name + alias */}
          <FormRow label="Name" required labelWidth="w-40" className="flex items-center min-h-[26px]">
            <input
              autoFocus={nameAutoFocus}
              disabled={lockIdentity}
              className={`${nameInputCls} ${lockIdentity ? lockedCls : ""}`}
              value={form.name}
              onChange={(e) => setF("name")(e.target.value)}
              placeholder="e.g. Cash Payment"
            />
          </FormRow>
          <FormRow label="(alias)" labelWidth="w-40" className="flex items-center min-h-[26px]">
            <input
              disabled={lockIdentity}
              className={`${nameInputCls} ${lockIdentity ? lockedCls : ""}`}
              value={form.alias}
              onChange={(e) => setF("alias")(e.target.value)}
            />
          </FormRow>

          <div className="flex border border-zinc-200 rounded mt-2">

            {/* ── General ── */}
            <div className="w-[520px] shrink-0 min-w-0 overflow-hidden p-3 border-r border-zinc-200 space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">General</div>

              <FormRow label="Select type of voucher" labelWidth="w-56" className="flex items-center min-h-[26px]">
                {lockIdentity ? (
                  <span className={`${inputCls} ${lockedCls}`}>{form.category}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCategoryPanel(!showCategoryPanel)}
                    className="flex-1 text-left text-sm px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 focus:outline-none rounded bg-white/50 transition-colors"
                  >
                    {form.category || <span className="text-zinc-400">Select…</span>}
                  </button>
                )}
              </FormRow>

              <FormRow label="Abbreviation" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <input
                  disabled={lockIdentity}
                  className={`${inputCls} ${lockIdentity ? lockedCls : ""}`}
                  value={form.short_name}
                  onChange={(e) => setF("short_name")(e.target.value)}
                  maxLength={6}
                />
              </FormRow>

              <FormRow label="Activate this Voucher Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={form.is_active} onChange={setF("is_active") as (v: YN) => void} disabled={lockIdentity} />
              </FormRow>

              <FormRow label="Method of Voucher Numbering" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <select
                  disabled={lockIdentity}
                  className={`${selectCls} ${lockIdentity ? lockedCls : ""}`}
                  value={form.numbering_method}
                  onChange={(e) => setF("numbering_method")(e.target.value)}
                >
                  {NUMBERING_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </FormRow>

              {/* Conditional numbering sub-fields */}
              {isAuto && (
                <>
                  <FormRow label="Numbering behaviour on insertion/deletion" labelWidth="w-56" className="flex items-center min-h-[26px]">
                    <select
                      className={selectCls}
                      value={config.numbering_behaviour}
                      onChange={(e) => setConfig((c) => ({ ...c, numbering_behaviour: e.target.value as VTConfig["numbering_behaviour"] }))}
                    >
                      {NUMBERING_BEHAVIOURS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Set/Alter additional numbering details" labelWidth="w-56" className="flex items-center min-h-[26px]">
                    <YesNoSelect value={config.set_alter_additional_numbering} onChange={setC("set_alter_additional_numbering")} />
                  </FormRow>
                  {config.numbering_behaviour === "Retain Original Voucher No." && (
                    <FormRow label="Show unused vch nos. in transactions" labelWidth="w-56" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={config.show_unused_numbers} onChange={setC("show_unused_numbers")} />
                    </FormRow>
                  )}
                </>
              )}
              {(isManualOverride || isManual) && (
                <FormRow label="Prevent creating duplicate Voucher Nos." labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={config.prevent_duplicate_numbers} onChange={setC("prevent_duplicate_numbers")} />
                </FormRow>
              )}

              <div className="border-t border-zinc-100 my-1" />

              <FormRow label="Use effective dates for vouchers" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.use_effective_dates} onChange={setC("use_effective_dates")} />
              </FormRow>
              <FormRow label="Allow zero-valued transactions" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.allow_zero_value_transactions} onChange={setC("allow_zero_value_transactions")} />
              </FormRow>
              <FormRow label="Make this voucher type as 'Optional' by default" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.make_voucher_optional} onChange={setC("make_voucher_optional")} />
              </FormRow>
              <FormRow label="Allow narration in voucher" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.allow_narration} onChange={setC("allow_narration")} />
              </FormRow>
              <FormRow label="Provide narrations for each ledger in voucher" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.allow_narration_per_ledger} onChange={setC("allow_narration_per_ledger")} />
              </FormRow>
            </div>

            {/* ── Printing ── */}
            <div className="w-[300px] shrink-0 min-w-0 overflow-hidden p-3 border-r border-zinc-200 space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Printing</div>
              <FormRow label="Print voucher after saving" labelWidth="w-40" className="flex items-center min-h-[26px]">
                <YesNoSelect value={config.print_after_save} onChange={setC("print_after_save")} />
              </FormRow>
            </div>

            {/* ── Name of Class ── */}
            <div className="flex-1 min-w-0 overflow-hidden p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Name of Class</div>
            </div>

          </div>

          {/* WhatsApp — full-width row below the grid (matches Tally layout) */}
          <FormRow label="WhatsApp voucher after saving" labelWidth="w-56" className="flex items-center min-h-[26px] mt-2">
            <YesNoSelect value={config.whatsapp_after_save} onChange={setC("whatsapp_after_save")} />
          </FormRow>
        </div>
        <div className="flex-1" />
      </div>

      {showCategoryPanel && (
        <CategoryListPanel
          selected={form.category}
          onSelect={(v) => setForm((f) => ({ ...f, category: v }))}
          onClose={() => setShowCategoryPanel(false)}
        />
      )}
    </>
  );
}
