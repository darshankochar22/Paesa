import { useState, useEffect, useRef } from "react";
import type { GroupType } from "@/types/api";

interface Props {
  companyId: number;
  initialType?: "ledger" | "stockItem" | "godown";
  onClose: () => void;
  onSuccess: (type: "ledger" | "stockItem" | "godown", created: any) => void;
}

export default function InlineMasterPopup({ companyId, initialType = "ledger", onClose, onSuccess }: Props) {
  const [type, setType] = useState<"ledger" | "stockItem" | "godown">(initialType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lists for dropdowns
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [stockGroups, setStockGroups] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Focus ref for name input
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Forms states
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
    group_id: "",
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

  // Load lists
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
          setGroups(gRes.groups || []);
          // Set default group to "Capital Account" or first group
          const defaultGroup = gRes.groups?.find((g: any) => g.name === "Capital Account") || gRes.groups?.[0];
          if (defaultGroup) {
            setLedgerForm(prev => ({ ...prev, group_id: String(defaultGroup.group_id) }));
          }
        }
        if (sgRes.success) {
          setStockGroups(sgRes.stockGroups || []);
          if (sgRes.stockGroups?.[0]) {
            setStockItemForm(prev => ({ ...prev, group_id: String(sgRes.stockGroups[0].sg_id) }));
          }
        }
        if (uRes.success) {
          setUnits(uRes.units || []);
          if (uRes.units?.[0]) {
            setStockItemForm(prev => ({ ...prev, unit_id: String(uRes.units[0].unit_id) }));
          }
        }
      } catch (err) {
        console.error("Failed to load options for inline creation", err);
      }
    })();
    return () => { active = false; };
  }, [companyId]);

  // Autofocus on mount or type change
  useEffect(() => {
    nameInputRef.current?.focus();
  }, [type]);

  // Alt+A keyboard listener inside popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [type, ledgerForm, stockItemForm, godownForm, groups, stockGroups, units]);

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
        const payload = {
          company_id: companyId,
          name: ledgerForm.name.trim(),
          alias: ledgerForm.alias.trim() || undefined,
          group_id: ledgerForm.group_id ? Number(ledgerForm.group_id) : undefined,
          opening_balance: Number(ledgerForm.opening_balance) || 0,
          is_bill_wise: ledgerForm.is_bill_wise,
          allow_cost_centres: ledgerForm.allow_cost_centres,
          ledger_type: "General",
          registration_type: "Unregistered",
        };
        const res = await window.api.ledger.create(payload);
        if (res.success && res.ledger) {
          onSuccess("ledger", res.ledger);
        } else {
          setError(res.error || "Failed to create ledger.");
        }
      } else if (type === "stockItem") {
        if (!stockItemForm.name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        const payload = {
          company_id: companyId,
          name: stockItemForm.name.trim(),
          alias: stockItemForm.alias.trim() || undefined,
          group_id: stockItemForm.group_id ? Number(stockItemForm.group_id) : undefined,
          unit_id: stockItemForm.unit_id ? Number(stockItemForm.unit_id) : undefined,
          opening_qty: Number(stockItemForm.opening_qty) || 0,
          opening_rate: Number(stockItemForm.opening_rate) || 0,
          opening_value: Number(stockItemForm.opening_value) || 0,
        };
        const res = await window.api.stockItem.create(payload);
        if (res.success && res.item) {
          onSuccess("stockItem", res.item);
        } else {
          setError(res.error || "Failed to create stock item.");
        }
      } else if (type === "godown") {
        if (!godownForm.name.trim()) {
          setError("Name is required.");
          setLoading(false);
          return;
        }
        const payload = {
          company_id: companyId,
          name: godownForm.name.trim(),
          alias: godownForm.alias.trim() || undefined,
          address: godownForm.address.trim() || undefined,
        };
        const res = await window.api.godown.create(payload);
        if (res.success && res.godown) {
          onSuccess("godown", res.godown);
        } else {
          setError(res.error || "Failed to create godown.");
        }
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-[480px] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <span className="text-xs font-bold uppercase tracking-wider">Inline Master Creation</span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm leading-none">&times;</button>
        </div>

        {/* Master Type Selection */}
        <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex gap-4 select-none">
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-zinc-700">
            <input
              type="radio"
              checked={type === "ledger"}
              onChange={() => setType("ledger")}
              className="accent-zinc-900"
            />
            Ledger
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-zinc-700">
            <input
              type="radio"
              checked={type === "stockItem"}
              onChange={() => setType("stockItem")}
              className="accent-zinc-900"
            />
            Stock Item
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-zinc-700">
            <input
              type="radio"
              checked={type === "godown"}
              onChange={() => setType("godown")}
              className="accent-zinc-900"
            />
            Godown
          </label>
        </div>

        {/* Content & Form */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded flex justify-between items-center font-medium">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
            </div>
          )}

          {/* LEDGER FORM */}
          {type === "ledger" && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={ledgerForm.name}
                  onChange={e => setLedgerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Sales Account"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 transition-colors w-full font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alias</label>
                <input
                  type="text"
                  value={ledgerForm.alias}
                  onChange={e => setLedgerForm(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Optional alias"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 transition-colors w-full font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Under Group</label>
                <select
                  value={ledgerForm.group_id}
                  onChange={e => setLedgerForm(prev => ({ ...prev, group_id: e.target.value }))}
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                >
                  {groups.map(g => (
                    <option key={g.group_id} value={g.group_id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Opening Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={ledgerForm.opening_balance}
                  onChange={e => setLedgerForm(prev => ({ ...prev, opening_balance: Number(e.target.value) || 0 }))}
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between border border-zinc-200 rounded p-2 bg-zinc-50">
                  <span className="text-xs font-semibold text-zinc-600">Bill-wise Details?</span>
                  <select
                    value={ledgerForm.is_bill_wise}
                    onChange={e => setLedgerForm(prev => ({ ...prev, is_bill_wise: Number(e.target.value) }))}
                    className="text-xs outline-none bg-transparent font-bold text-zinc-800 cursor-pointer"
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border border-zinc-200 rounded p-2 bg-zinc-50">
                  <span className="text-xs font-semibold text-zinc-600">Cost Centres?</span>
                  <select
                    value={ledgerForm.allow_cost_centres}
                    onChange={e => setLedgerForm(prev => ({ ...prev, allow_cost_centres: Number(e.target.value) }))}
                    className="text-xs outline-none bg-transparent font-bold text-zinc-800 cursor-pointer"
                  >
                    <option value={0}>No</option>
                    <option value={1}>Yes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STOCK ITEM FORM */}
          {type === "stockItem" && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Item Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={stockItemForm.name}
                  onChange={e => setStockItemForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Dell Monitor 24"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alias</label>
                <input
                  type="text"
                  value={stockItemForm.alias}
                  onChange={e => setStockItemForm(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Optional alias"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Stock Group</label>
                  <select
                    value={stockItemForm.group_id}
                    onChange={e => setStockItemForm(prev => ({ ...prev, group_id: e.target.value }))}
                    className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                  >
                    {stockGroups.map(sg => (
                      <option key={sg.group_id} value={sg.group_id}>{sg.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Unit of Measure</label>
                  <select
                    value={stockItemForm.unit_id}
                    onChange={e => setStockItemForm(prev => ({ ...prev, unit_id: e.target.value }))}
                    className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                  >
                    {units.map(u => (
                      <option key={u.unit_id} value={u.unit_id}>{u.symbol} ({u.formal_name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 mt-2" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Opening Balance Details</div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Qty</label>
                  <input
                    type="number"
                    value={stockItemForm.opening_qty}
                    onChange={e => {
                      const qty = Number(e.target.value) || 0;
                      setStockItemForm(prev => ({
                        ...prev,
                        opening_qty: qty,
                        opening_value: qty * prev.opening_rate
                      }));
                    }}
                    className="text-xs px-2 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Rate</label>
                  <input
                    type="number"
                    value={stockItemForm.opening_rate}
                    onChange={e => {
                      const rate = Number(e.target.value) || 0;
                      setStockItemForm(prev => ({
                        ...prev,
                        opening_rate: rate,
                        opening_value: prev.opening_qty * rate
                      }));
                    }}
                    className="text-xs px-2 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-medium"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Value</label>
                  <input
                    type="number"
                    value={stockItemForm.opening_value}
                    onChange={e => setStockItemForm(prev => ({ ...prev, opening_value: Number(e.target.value) || 0 }))}
                    className="text-xs px-2 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* GODOWN FORM */}
          {type === "godown" && (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Godown Name</label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={godownForm.name}
                  onChange={e => setGodownForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Warehouse A"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Alias</label>
                <input
                  type="text"
                  value={godownForm.alias}
                  onChange={e => setGodownForm(prev => ({ ...prev, alias: e.target.value }))}
                  placeholder="Optional alias"
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Address</label>
                <textarea
                  value={godownForm.address}
                  onChange={e => setGodownForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street details, city, etc."
                  rows={3}
                  className="text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 resize-none w-full font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-medium">Shortcuts: Alt+A Accept / Esc Close</span>
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
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm transition-all hover:shadow active:scale-95 duration-100"
            >
              {loading ? "Creating..." : "Accept"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
