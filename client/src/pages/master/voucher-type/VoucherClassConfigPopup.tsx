import { useState, useEffect, useMemo } from "react";
import type { LedgerType } from "@/types/entities/Ledger";
import type { GroupType } from "@/types/entities/Group";
import type {
  VoucherClassRow,
  ClassAllocationRow,
  ClassAdditionalEntryRow,
} from "@/types/entities/VoucherType";
import { PageTitleBar, MasterFormFooter } from "@/components/ui";
import { useCompany } from "@/context/CompanyContext";
import SelectionPopup, { type SelectionItem } from "@/pages/reports/inventory/SelectionPopup";

// TallyPrime "Voucher Type Class" screen. Opens directly after a class name is
// entered on the Voucher Type. Three sections:
//   1. Restrict groups this class may be used with (Exclude / Include).
//   2. Default Accounting Allocations for all items in the invoice.
//   3. Additional Accounting Entries (taxes / other charges) added to the invoice.
// Data persists inside voucher_type_configs.voucher_classes (JSON), no migration.

interface Props {
  companyId: number;
  voucherClass: VoucherClassRow;
  onClose: () => void;
  onSave: (voucherClass: VoucherClassRow) => void;
}

const newId = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Tax-classification option lists (Tally "List of Classifications" per tax type).
const GST_CLASSIFICATIONS = [
  "Not Applicable", "Branch Transfer Outward",
  "Exports - Exempt", "Exports - LUT/Bond", "Exports - Nil Rated", "Exports - Taxable",
  "High Sea Sales",
  "Interstate Deemed Exports - Exempt", "Interstate Deemed Exports - Nil Rated", "Interstate Deemed Exports - Taxable",
  "Interstate Sales - Exempt", "Interstate Sales - Nil Rated", "Interstate Sales - Taxable",
  "Local Deemed Exports - Exempt", "Local Deemed Exports - Nil Rated", "Local Deemed Exports - Taxable",
  "Local Sales - Exempt", "Local Sales - Nil Rated", "Local Sales - Taxable",
  "Sales from Customs Bonded Warehouse",
  "Sales to SEZ - Exempt", "Sales to SEZ - LUT/Bond", "Sales to SEZ - Nil Rated", "Sales to SEZ - Taxable",
];
const SERVICE_TAX_CLASSIFICATIONS = ["Not Applicable"];
const EXCISE_CLASSIFICATIONS = ["Undefined"];
const TCS_NATURE_OF_GOODS = ["Not Applicable"];

type TaxType = "gst" | "service_tax" | "excise" | "tcs";
const TAX_TYPE_META: { key: TaxType; label: string; list: string[]; listLabel: string }[] = [
  { key: "gst", label: "GST", list: GST_CLASSIFICATIONS, listLabel: "List of Classifications" },
  { key: "service_tax", label: "Service Tax", list: SERVICE_TAX_CLASSIFICATIONS, listLabel: "List of Classifications" },
  { key: "excise", label: "Excise", list: EXCISE_CLASSIFICATIONS, listLabel: "List of Excise Classifications" },
  { key: "tcs", label: "TCS", list: TCS_NATURE_OF_GOODS, listLabel: "List of Nature of Goods" },
];

type Picker =
  | { kind: "exclude" }
  | { kind: "include" }
  | { kind: "ledger"; table: "alloc" | "addl"; rowId: string }
  | { kind: "classification"; taxType: TaxType; rowId: string };

const cell = "border border-zinc-300 px-1.5 py-1 text-xs outline-none focus:border-zinc-800 bg-white w-full";
const th = "border border-zinc-300 px-1.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600 bg-zinc-50 text-left";

export default function VoucherClassConfigPopup({ companyId, voucherClass, onClose, onSave }: Props) {
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Normalise so classes saved before this screen existed still open cleanly.
  const [form, setForm] = useState<VoucherClassRow>({
    exclude_groups: [],
    include_groups: [],
    default_allocations: [],
    additional_entries: [],
    ...voucherClass,
  });

  const [picker, setPicker] = useState<Picker | null>(null);
  const [pickIdx, setPickIdx] = useState(0);
  const [pickSearch, setPickSearch] = useState("");
  // Allocation row whose "Tax classification details" sub-popup is open.
  const [taxClassRowId, setTaxClassRowId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ledgerRes, groupRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (!active) return;
        if (ledgerRes.success) setLedgers(ledgerRes.ledgers ?? []);
        if (groupRes.success) setGroups(groupRes.groups ?? []);
        if (!ledgerRes.success || !groupRes.success)
          setError(ledgerRes.error || groupRes.error || "Failed to load masters.");
      } catch {
        if (active) setError("Error loading masters.");
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Esc closes the class screen (unless a picker is open — it handles its own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !picker) { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const groupName = (id: number) => groups.find((g) => g.group_id === id)?.name ?? `#${id}`;
  const ledgerName = (id?: number) => (id ? ledgers.find((l) => l.ledger_id === id)?.name ?? `#${id}` : "");

  // ── Group restriction ──────────────────────────────────────────────────────
  const excl = form.exclude_groups ?? [];
  const incl = form.include_groups ?? [];
  const addGroup = (side: "exclude" | "include", id: number) =>
    setForm((f) => {
      const key = side === "exclude" ? "exclude_groups" : "include_groups";
      const cur = f[key] ?? [];
      return cur.includes(id) ? f : { ...f, [key]: [...cur, id] };
    });
  const removeGroup = (side: "exclude" | "include", id: number) =>
    setForm((f) => {
      const key = side === "exclude" ? "exclude_groups" : "include_groups";
      return { ...f, [key]: (f[key] ?? []).filter((g) => g !== id) };
    });

  // ── Allocation / additional-entry tables ───────────────────────────────────
  const allocs = form.default_allocations ?? [];
  const addl = form.additional_entries ?? [];
  const patchAlloc = (id: string, p: Partial<ClassAllocationRow>) =>
    setForm((f) => ({ ...f, default_allocations: (f.default_allocations ?? []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const patchAddl = (id: string, p: Partial<ClassAdditionalEntryRow>) =>
    setForm((f) => ({ ...f, additional_entries: (f.additional_entries ?? []).map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const addAllocRow = () =>
    setForm((f) => ({ ...f, default_allocations: [...(f.default_allocations ?? []), { id: newId("alloc") }] }));
  const addAddlRow = () =>
    setForm((f) => ({ ...f, additional_entries: [...(f.additional_entries ?? []), { id: newId("addl") }] }));
  const removeAlloc = (id: string) =>
    setForm((f) => ({ ...f, default_allocations: (f.default_allocations ?? []).filter((r) => r.id !== id) }));
  const removeAddl = (id: string) =>
    setForm((f) => ({ ...f, additional_entries: (f.additional_entries ?? []).filter((r) => r.id !== id) }));

  // ── Picker plumbing ─────────────────────────────────────────────────────────
  const openPicker = (p: Picker) => { setPicker(p); setPickIdx(0); setPickSearch(""); };
  const pickerItems: SelectionItem[] = useMemo(() => {
    if (!picker) return [];
    const q = pickSearch.trim().toLowerCase();
    if (picker.kind === "exclude" || picker.kind === "include") {
      const taken = new Set(picker.kind === "exclude" ? excl : incl);
      return groups
        .filter((g) => g.group_id != null && !taken.has(g.group_id) && g.name.toLowerCase().includes(q))
        .map((g) => ({ id: g.group_id!, name: g.name }));
    }
    if (picker.kind === "classification") {
      const list = TAX_TYPE_META.find((m) => m.key === picker.taxType)?.list ?? [];
      return list.filter((c) => c.toLowerCase().includes(q)).map((c) => ({ id: c, name: c }));
    }
    return ledgers
      .filter((l) => l.name.toLowerCase().includes(q))
      .map((l) => ({ id: l.ledger_id!, name: l.name }));
  }, [picker, pickSearch, groups, ledgers, excl, incl]);

  const acceptPick = (i: number) => {
    const item = pickerItems[i];
    if (!item || !picker) { setPicker(null); return; }
    if (picker.kind === "exclude" || picker.kind === "include") {
      addGroup(picker.kind, Number(item.id));
    } else if (picker.kind === "classification") {
      const row = allocs.find((r) => r.id === picker.rowId);
      patchAlloc(picker.rowId, { tax_classifications: { ...(row?.tax_classifications ?? {}), [picker.taxType]: item.name } });
    } else if (picker.table === "alloc") {
      patchAlloc(picker.rowId, { ledger_id: Number(item.id), ledger_name: item.name });
    } else {
      patchAddl(picker.rowId, { ledger_id: Number(item.id), ledger_name: item.name });
    }
    setPicker(null);
  };

  const GroupList = ({ side }: { side: "exclude" | "include" }) => {
    const ids = side === "exclude" ? excl : incl;
    return (
      <div className="flex-1 border border-zinc-300">
        <div className="px-2 py-1 bg-zinc-50 border-b border-zinc-300 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
          {side === "exclude" ? "Exclude these Groups" : "Include these Groups"}
        </div>
        <div className="divide-y divide-zinc-100 min-h-[80px]">
          {ids.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-zinc-400 italic">None</div>
          ) : (
            ids.map((id) => (
              <div key={id} className="flex items-center justify-between px-2 py-1 text-xs">
                <span className="truncate">{groupName(id)}</span>
                <button onClick={() => removeGroup(side, id)} className="text-zinc-300 hover:text-zinc-900 font-bold px-1">&times;</button>
              </div>
            ))
          )}
        </div>
        <button
          onClick={() => openPicker({ kind: side })}
          className="w-full text-[10px] font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-900 border-t border-zinc-300 py-1"
        >
          + Add group
        </button>
      </div>
    );
  };

  const LedgerCell = ({ table, rowId, value }: { table: "alloc" | "addl"; rowId: string; value?: string }) => (
    <button
      onClick={() => openPicker({ kind: "ledger", table, rowId })}
      className={`${cell} text-left ${value ? "" : "text-zinc-400"}`}
    >
      {value || "select…"}
    </button>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white select-none">
      {/* Header — black title bar, matching the rest of the Voucher Type form */}
      <PageTitleBar title="Voucher Type Class" subtitle={selectedCompany?.name} subtitleCenter />

      <div className="flex-1 min-h-0 overflow-y-auto p-3">
      <div className="max-w-[1100px] mx-auto space-y-6 py-2">
        {/* "Class: <name>" — the name typed in Name of Class, shown at the top (Tally layout) */}
        <div className="text-center border-b border-zinc-300 pb-2">
          <span className="text-sm font-bold">Class: </span>
          <span className="text-sm font-bold">{form.name}</span>
        </div>

        {error && (
          <div className="border border-zinc-400 text-xs px-3 py-2 flex justify-between items-center">
            <span>• {error}</span>
            <button onClick={() => setError(null)} className="font-bold">&times;</button>
          </div>
        )}

        {/* 1. Group restriction */}
        <section>
          <p className="text-[11px] italic text-zinc-600 mb-1">
            If you wish to restrict the groups to which this class can be used, specify them here.
          </p>
          <div className="flex gap-3">
            <GroupList side="exclude" />
            <GroupList side="include" />
          </div>
        </section>

        {/* 2. Default Accounting Allocations */}
        <section>
          <p className="text-[11px] font-semibold text-zinc-700 mb-1">
            Default Accounting Allocations for all items in Invoice (except for the items specified below)
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Ledger Name</th>
                <th className={th}>Set/Alter Tax Class ?</th>
                <th className={`${th} text-right`}>Percentage %</th>
                <th className={th}>Rounding Method</th>
                <th className={`${th} text-right`}>Rounding Limit</th>
                <th className={th}>Override using Item Default ?</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {allocs.map((r) => (
                <tr key={r.id}>
                  <td className="p-0 w-[24%]"><LedgerCell table="alloc" rowId={r.id} value={ledgerName(r.ledger_id)} /></td>
                  <td className="p-0">
                    <select
                      className={cell}
                      value={r.set_alter_tax_class ?? "No"}
                      onChange={(e) => {
                        const v = e.target.value as "Yes" | "No";
                        patchAlloc(r.id, { set_alter_tax_class: v });
                        if (v === "Yes") setTaxClassRowId(r.id);   // open Tax classification details
                      }}
                    >
                      <option>No</option><option>Yes</option>
                    </select>
                  </td>
                  <td className="p-0 w-[12%] relative">
                    <input className={`${cell} text-right pr-5`} type="number" value={r.percentage ?? ""} onChange={(e) => patchAlloc(r.id, { percentage: e.target.value === "" ? undefined : Number(e.target.value) })} />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 pointer-events-none">%</span>
                  </td>
                  <td className="p-0"><input className={cell} value={r.rounding_method ?? ""} onChange={(e) => patchAlloc(r.id, { rounding_method: e.target.value })} placeholder="Not Applicable" /></td>
                  <td className="p-0 w-[10%]"><input className={`${cell} text-right`} type="number" value={r.rounding_limit ?? ""} onChange={(e) => patchAlloc(r.id, { rounding_limit: e.target.value === "" ? undefined : Number(e.target.value) })} /></td>
                  <td className="p-0 w-[14%]">
                    <select className={cell} value={r.override_item_default ?? "No"} onChange={(e) => patchAlloc(r.id, { override_item_default: e.target.value as "Yes" | "No" })}>
                      <option>No</option><option>Yes</option>
                    </select>
                  </td>
                  <td className="p-0 w-8 text-center"><button onClick={() => removeAlloc(r.id)} className="text-zinc-300 hover:text-zinc-900 font-bold px-2">&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addAllocRow} className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-900">+ Add allocation</button>
        </section>

        {/* 3. Additional Accounting Entries */}
        <section>
          <p className="text-[11px] font-semibold text-zinc-700 mb-1">
            Additional Accounting Entries (e.g. Taxes / Other charges) to be added in Invoice
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Ledger Name</th>
                <th className={th}>Type of Calculation</th>
                <th className={`${th} text-right`}>Value Basis</th>
                <th className={th}>Rounding Method</th>
                <th className={`${th} text-right`}>Rounding Limit</th>
                <th className={th}>Remove if Zero ?</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {addl.map((r) => (
                <tr key={r.id}>
                  <td className="p-0 w-[24%]"><LedgerCell table="addl" rowId={r.id} value={ledgerName(r.ledger_id)} /></td>
                  <td className="p-0"><input className={cell} value={r.type_of_calculation ?? ""} onChange={(e) => patchAddl(r.id, { type_of_calculation: e.target.value })} /></td>
                  <td className="p-0 w-[12%]"><input className={`${cell} text-right`} type="number" value={r.value_basis ?? ""} onChange={(e) => patchAddl(r.id, { value_basis: e.target.value === "" ? undefined : Number(e.target.value) })} /></td>
                  <td className="p-0"><input className={cell} value={r.rounding_method ?? ""} onChange={(e) => patchAddl(r.id, { rounding_method: e.target.value })} placeholder="Not Applicable" /></td>
                  <td className="p-0 w-[10%]"><input className={`${cell} text-right`} type="number" value={r.rounding_limit ?? ""} onChange={(e) => patchAddl(r.id, { rounding_limit: e.target.value === "" ? undefined : Number(e.target.value) })} /></td>
                  <td className="p-0 w-[12%]">
                    <select className={cell} value={r.remove_if_zero ?? "No"} onChange={(e) => patchAddl(r.id, { remove_if_zero: e.target.value as "Yes" | "No" })}>
                      <option>No</option><option>Yes</option>
                    </select>
                  </td>
                  <td className="p-0 w-8 text-center"><button onClick={() => removeAddl(r.id)} className="text-zinc-300 hover:text-zinc-900 font-bold px-2">&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addAddlRow} className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-900">+ Add entry</button>
        </section>
      </div>
      </div>

      {/* Footer — white action bar, matching the master form chrome */}
      <MasterFormFooter onCancel={onClose} onSubmit={() => onSave(form)} submitLabel="Accept" cancelLabel="Cancel" />

      {/* Tax classification details — opens when "Set/Alter Tax Class?" is set to Yes */}
      {taxClassRowId && (() => {
        const row = allocs.find((r) => r.id === taxClassRowId);
        if (!row) return null;
        const tc = row.tax_classifications ?? {};
        return (
          <div className="fixed inset-0 z-40 flex items-start justify-center bg-zinc-900/30 pt-24 select-none" role="dialog">
            <div className="bg-white border border-zinc-400 shadow-xl w-[420px]">
              <div className="px-3 py-1.5 bg-zinc-900 text-white text-xs font-semibold text-center">
                Tax classification details for : {row.ledger_name || "—"}
              </div>
              <div className="flex px-3 py-1 border-b border-zinc-300 text-[10px] font-bold uppercase tracking-wide text-zinc-600 bg-zinc-50">
                <span className="w-32">Tax Type</span>
                <span className="flex-1">Classification</span>
              </div>
              {TAX_TYPE_META.map((m) => (
                <div key={m.key} className="flex items-center px-3 py-1.5 border-b border-zinc-100">
                  <span className="w-32 text-xs font-bold text-zinc-800">{m.label}</span>
                  <button
                    onClick={() => openPicker({ kind: "classification", taxType: m.key, rowId: row.id })}
                    className={`flex-1 text-left text-xs px-2 py-1 border border-zinc-300 hover:border-zinc-800 bg-white ${tc[m.key] ? "" : "text-zinc-400"}`}
                  >
                    {tc[m.key] || "select…"}
                  </button>
                </div>
              ))}
              <div className="flex justify-end gap-2 px-3 py-2 bg-zinc-50 border-t border-zinc-300">
                <button onClick={() => setTaxClassRowId(null)} className="text-xs px-4 py-1 bg-zinc-950 text-white hover:bg-zinc-800 font-semibold">Accept</button>
              </div>
            </div>
          </div>
        );
      })()}

      {picker && (
        <SelectionPopup
          title={picker.kind === "ledger" ? "Select Ledger" : picker.kind === "classification" ? "Select Classification" : picker.kind === "exclude" ? "Select Group (Exclude)" : "Select Group (Include)"}
          fieldLabel={picker.kind === "ledger" ? "Name of Ledger" : picker.kind === "classification" ? "Classification" : "Name of Group"}
          listLabel={picker.kind === "ledger" ? "List of Ledgers" : picker.kind === "classification" ? (TAX_TYPE_META.find((m) => m.key === picker.taxType)?.listLabel ?? "List") : "List of Groups"}
          items={pickerItems}
          index={pickIdx}
          search={pickSearch}
          onSearchChange={(v) => { setPickSearch(v); setPickIdx(0); }}
          onIndexChange={setPickIdx}
          onAccept={acceptPick}
          onCancel={() => setPicker(null)}
          emptyText="No records found."
        />
      )}
    </div>
  );
}
