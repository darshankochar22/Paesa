import { useState, useEffect, useRef } from "react";
import type { GroupType } from "../../../../../types/api";
import LedgerForm from "./LedgerForm";
import StockItemForm from "./StockItemForm";
import GodownForm from "./GodownForm";

interface Props {
  companyId: number;
  initialType?: "ledger" | "stockItem" | "godown";
  onClose: () => void;
  onSuccess: (type: "ledger" | "stockItem" | "godown", created: any) => void;
}

export default function InlineMasterPopup({
  companyId,
  initialType = "ledger",
  onClose,
  onSuccess,
}: Props) {
  const [type, setType] = useState<"ledger" | "stockItem" | "godown">(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    alias: "",
    group_id: "",
    opening_balance: 0,
    is_bill_wise: 0,
    allow_cost_centres: 0,
  });

  const [stockItemForm, setStockItemForm] = useState({
    name: "",
    alias: "",
    sg_id: "",
    unit_id: "",
    opening_qty: 0,
    opening_rate: 0,
    opening_value: 0,
  });

  const [godownForm, setGodownForm] = useState({
    name: "",
    alias: "",
    address: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [gRes, sgRes, uRes] = await Promise.all([
          window.api.group.getAll(companyId),
          window.api.stockGroup.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (!active) return;

        if (gRes.success) {
          const grps: GroupType[] = gRes.groups ?? [];
          setGroups(grps);
          const defaultGroup =
            grps.find((g: any) => g.name === "Capital Account") ?? grps[0];
          if (defaultGroup) {
            setLedgerForm((prev) => ({
              ...prev,
              group_id: String(defaultGroup.group_id),
            }));
          }
        }

        if (sgRes.success) {
          const sgs: any[] = sgRes.stockGroups ?? [];
          setStockGroups(sgs);
          if (sgs[0]) {
            setStockItemForm((prev) => ({ ...prev, sg_id: String(sgs[0].sg_id) }));
          }
        }

        if (uRes.success) {
          const us: any[] = uRes.units ?? [];
          setUnits(us);
          if (us[0]) {
            setStockItemForm((prev) => ({
              ...prev,
              unit_id: String(us[0].unit_id),
            }));
          }
        }
      } catch (err) {
        console.error("InlineMasterPopup: failed to load options", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [companyId]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, [type]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [type, ledgerForm, stockItemForm, godownForm]);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (type === "ledger") {
        if (!ledgerForm.name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        const res = await window.api.ledger.create({
          company_id: companyId,
          name: ledgerForm.name.trim(),
          alias: ledgerForm.alias.trim() || undefined,
          group_id: ledgerForm.group_id ? Number(ledgerForm.group_id) : undefined,
          opening_balance: Number(ledgerForm.opening_balance) || 0,
          is_bill_wise: ledgerForm.is_bill_wise,
          allow_cost_centres: ledgerForm.allow_cost_centres,
          ledger_type: "General",
          registration_type: "Unregistered",
        });
        if (res.success && res.ledger) onSuccess("ledger", res.ledger);
        else setError(res.error || "Failed to create ledger.");
      } else if (type === "stockItem") {
        if (!stockItemForm.name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        const res = await window.api.stockItem.create({
          company_id: companyId,
          name: stockItemForm.name.trim(),
          alias: stockItemForm.alias.trim() || undefined,
          group_id: stockItemForm.sg_id ? Number(stockItemForm.sg_id) : undefined,
          unit_id: stockItemForm.unit_id ? Number(stockItemForm.unit_id) : undefined,
          opening_quantity: Number(stockItemForm.opening_qty) || 0,
          opening_rate: Number(stockItemForm.opening_rate) || 0,
          opening_value: Number(stockItemForm.opening_value) || 0,
        });
        if (res.success && res.item) onSuccess("stockItem", res.item);
        else setError(res.error || "Failed to create stock item.");
      } else if (type === "godown") {
        if (!godownForm.name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        const res = await window.api.godown.create({
          company_id: companyId,
          name: godownForm.name.trim(),
          alias: godownForm.alias.trim() || undefined,
          address: godownForm.address.trim() || undefined,
        });
        if (res.success && res.godown) onSuccess("godown", res.godown);
        else setError(res.error || "Failed to create godown.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };


  const handleLedgerFormChange = (updates: Partial<typeof ledgerForm>) => {
    setLedgerForm((prev) => ({ ...prev, ...updates }));
  };

  const handleStockItemFormChange = (updates: Partial<typeof stockItemForm>) => {
    setStockItemForm((prev) => ({ ...prev, ...updates }));
  };

  const handleGodownFormChange = (updates: Partial<typeof godownForm>) => {
    setGodownForm((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-[480px] overflow-hidden flex flex-col max-h-[90vh]">

        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <span className="text-xs font-bold uppercase tracking-wider">
            Inline Master Creation
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-bold text-sm leading-none"
          >
            &times;
          </button>
        </div>

        <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex gap-4 select-none">
          {(["ledger", "stockItem", "godown"] as const).map((t) => (
            <label
              key={t}
              className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-zinc-700"
            >
              <input
                type="radio"
                checked={type === t}
                onChange={() => {
                  setType(t);
                  setError(null);
                }}
                className="accent-zinc-900"
              />
              {t === "ledger" ? "Ledger" : t === "stockItem" ? "Stock Item" : "Godown"}
            </label>
          ))}
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded flex justify-between items-center font-medium">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="text-red-500 font-bold">
                &times;
              </button>
            </div>
          )}

          {type === "ledger" && (
            <LedgerForm
              form={ledgerForm}
              groups={groups}
              nameInputRef={nameInputRef}
              onChange={handleLedgerFormChange}
            />
          )}

          {type === "stockItem" && (
            <StockItemForm
              form={stockItemForm}
              stockGroups={stockGroups}
              units={units}
              onChange={handleStockItemFormChange}
            />
          )}

          {type === "godown" && (
            <GodownForm
              form={godownForm}
              onChange={handleGodownFormChange}
            />
          )}
        </div>

        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-medium">
            Alt+A: Accept &nbsp;·&nbsp; Esc: Close
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm transition-all active:scale-95"
            >
              {loading ? "Creating…" : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
