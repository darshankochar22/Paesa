import { useState, useEffect } from "react";
import type { LedgerType } from "@/types/entities/Ledger";
import type { VoucherClassRow } from "@/types/entities/VoucherType";
import { YesNoSelect, type YN } from "./VoucherTypeFormBody";

interface Props {
  companyId: number;
  voucherClass: VoucherClassRow;
  onClose: () => void;
  onSave: (voucherClass: VoucherClassRow) => void;
}

export default function VoucherClassConfigPopup({
  companyId,
  voucherClass,
  onClose,
  onSave,
}: Props) {
  const [dutyLedgers, setDutyLedgers] = useState<LedgerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherClassRow>({ ...voucherClass });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await window.api.ledger.getAll(companyId);
        if (!active) return;
        if (res.success) {
          setDutyLedgers((res.ledgers ?? []).filter((l) => l.ledger_type === "Duties & Taxes"));
        } else {
          setError(res.error || "Failed to load ledgers.");
        }
      } catch {
        if (active) setError("Error loading ledgers.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleSave = () => {
    onSave(form);
  };

  const selectCls = "text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-semibold";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[460px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Voucher Type Class</span>
            <span className="text-[10px] text-zinc-400 font-mono">{voucherClass.name}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="flex items-center justify-between border border-zinc-200 rounded px-3 py-2">
            <span className="text-xs font-semibold text-zinc-700">Use Class for GST Details</span>
            <YesNoSelect
              value={form.use_for_gst_details}
              onChange={(v: YN) => setForm((f) => ({ ...f, use_for_gst_details: v }))}
            />
          </div>

          {form.use_for_gst_details === "Yes" && (
            loading ? (
              <div className="text-center py-6 text-zinc-500 text-xs italic">Loading ledgers…</div>
            ) : dutyLedgers.length === 0 ? (
              <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-50 rounded border border-zinc-200">
                No Duties &amp; Taxes ledgers found. Create one under Ledger Create first.
              </div>
            ) : (
              <div className="border border-zinc-200 rounded-lg overflow-hidden divide-y divide-zinc-100">
                {([
                  { key: "cgst_ledger_id", label: "CGST Ledger" },
                  { key: "sgst_ledger_id", label: "SGST/UTGST Ledger" },
                  { key: "igst_ledger_id", label: "IGST Ledger" },
                ] as const).map((row) => (
                  <div key={row.key} className="grid grid-cols-12 items-center px-3 py-2 bg-white gap-2">
                    <div className="col-span-5 text-xs font-semibold text-zinc-600">{row.label}</div>
                    <div className="col-span-7">
                      <select
                        className={selectCls}
                        value={form[row.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [row.key]: e.target.value ? Number(e.target.value) : null }))}
                      >
                        <option value="">Not Applicable</option>
                        {dutyLedgers.map((l) => (
                          <option key={l.ledger_id} value={l.ledger_id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;·&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
