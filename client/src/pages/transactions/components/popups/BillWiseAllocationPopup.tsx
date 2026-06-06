import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "../../../../context/CompanyContext";

interface PendingBill {
  bill_name: string;
  bill_date: string;
  due_date: string;
  credit_period: string;
  balance: number;
  final_balance: number;
}

interface BillReference {
  ledger_id: number;
  bill_name: string;
  bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
  amount: number;
  credit_period?: string;
  due_date?: string;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  totalAmount: number;
  dcType: "Dr" | "Cr";
  voucherDate: string;
  initialAllocations?: BillReference[];
  onClose: () => void;
  onSave: (allocations: BillReference[]) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatCurrency(n: number) {
  return `\u20b9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillWiseAllocationPopup({
  ledgerId,
  ledgerName,
  totalAmount,
  dcType,
  voucherDate,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [allocations, setAllocations] = useState<BillReference[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [defaultCreditPeriod, setDefaultCreditPeriod] = useState(0);
  const [checkCreditDays, setCheckCreditDays] = useState(0);
  const [loadingBills, setLoadingBills] = useState(false);
  const [activeAgstRow, setActiveAgstRow] = useState<number | null>(null);
  const nameInputRefs = useRef<(HTMLInputElement | HTMLSelectElement | null)[]>([]);
  const agstDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Close pending-bills dropdown on outside click or Escape
  useEffect(() => {
    if (activeAgstRow === null) return;
    const handler = (e: MouseEvent) => {
      const dropdown = agstDropdownRefs.current[activeAgstRow];
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setActiveAgstRow(null);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveAgstRow(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [activeAgstRow]);

  // Fetch pending bills on mount
  useEffect(() => {
    if (!companyId || !fyId || !ledgerId) return;
    setLoadingBills(true);
    window.api.voucher
      .getPendingBills(ledgerId, companyId, fyId)
      .then((res: any) => {
        if (res.success) {
          setPendingBills(res.pendingBills || []);
          setDefaultCreditPeriod(res.defaultCreditPeriod || 0);
          setCheckCreditDays(res.checkCreditDays || 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBills(false));
  }, [ledgerId, companyId, fyId]);

  // Initialize allocations
  useEffect(() => {
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a, ledger_id: ledgerId })));
    } else {
      const cp = checkCreditDays === 1 ? String(defaultCreditPeriod || "") : "";
      const dd = (checkCreditDays === 1 && defaultCreditPeriod > 0) ? addDays(voucherDate, defaultCreditPeriod) : "";
      setAllocations([{
        ledger_id: ledgerId,
        bill_name: "",
        bill_type: "New Ref",
        amount: totalAmount,
        credit_period: cp,
        due_date: dd,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, totalAmount, initialAllocations]);

  // Update default credit period when fetched
  useEffect(() => {
    if (initialAllocations.length === 0 && checkCreditDays === 1 && defaultCreditPeriod > 0) {
      setAllocations((prev) =>
        prev.map((row, i) =>
          i === 0 && !row.credit_period
            ? { ...row, credit_period: String(defaultCreditPeriod), due_date: addDays(voucherDate, defaultCreditPeriod) }
            : row
        )
      );
    }
  }, [defaultCreditPeriod, checkCreditDays, voucherDate, initialAllocations.length]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocations, remaining, onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getDefaultRow = (type: BillReference["bill_type"], amount: number): BillReference => {
    const shouldAutoFill = checkCreditDays === 1 && defaultCreditPeriod > 0;
    const base: BillReference = {
      ledger_id: ledgerId,
      bill_name: "",
      bill_type: type,
      amount,
      credit_period: "",
      due_date: "",
    };

    if (type === "On Account") {
      base.bill_name = "On Account";
      base.credit_period = "";
      base.due_date = "";
    } else if (type === "New Ref") {
      base.bill_name = "New Ref";
      base.credit_period = shouldAutoFill ? String(defaultCreditPeriod) : "";
      base.due_date = shouldAutoFill ? addDays(voucherDate, defaultCreditPeriod) : "";
    } else if (type === "Advance") {
      base.credit_period = shouldAutoFill ? String(defaultCreditPeriod) : "";
      base.due_date = shouldAutoFill ? addDays(voucherDate, defaultCreditPeriod) : "";
    } else if (type === "Agst Ref") {
      if (pendingBills.length > 0) {
        const first = pendingBills[0];
        base.bill_name = first.bill_name;
        base.credit_period = first.credit_period || "";
        base.due_date = first.due_date || "";
        base.amount = Math.min(amount, first.balance);
      }
    }
    return base;
  };

  const handleAdd = () => {
    if (Math.abs(remaining) < 0.01) { setError("Total is fully allocated."); return; }
    setError(null);
    const type: BillReference["bill_type"] = remaining > 0 ? "New Ref" : "On Account";
    const newRow = getDefaultRow(type, Math.abs(remaining));
    setAllocations((prev) => [...prev, newRow]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) { setError("At least one row is required."); return; }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof BillReference, value: any) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== i) return row;
        let updated = { ...row, [field]: value };

        if (field === "bill_type") {
          // Reset row when type changes
          updated = getDefaultRow(value as BillReference["bill_type"], row.amount);
        }

        if (field === "credit_period" && updated.bill_type !== "On Account") {
          const days = parseInt(value);
          if (!isNaN(days) && days > 0) {
            updated.due_date = addDays(voucherDate, days);
          } else {
            updated.due_date = "";
          }
        }

        if (field === "bill_name" && updated.bill_type === "Agst Ref") {
          const selected = pendingBills.find((b) => b.bill_name === value);
          if (selected) {
            updated.credit_period = selected.credit_period || "";
            updated.due_date = selected.due_date || "";
          }
        }

        return updated;
      })
    );
  };

  const handleSelectPendingBill = (rowIdx: number, bill: PendingBill) => {
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIdx) return row;
        return {
          ...row,
          bill_name: bill.bill_name,
          credit_period: bill.credit_period || "",
          due_date: bill.due_date || "",
          amount: bill.balance,
        };
      })
    );
    setActiveAgstRow(null);
  };

  const handleSave = () => {
    if (allocations.some((a) => a.bill_type !== "On Account" && !a.bill_name.trim())) {
      setError("Name is required for all references except On Account.");
      return;
    }
    if (Math.abs(remaining) >= 0.01) {
      setError(`Remaining ${formatCurrency(remaining)} must be zero.`);
      return;
    }
    onSave(allocations);
  };

  const wefLabel = formatDateDisplay(voucherDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-[720px] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">Bill-wise Details</span>
            <span className="text-[10px] text-zinc-400 font-mono">{ledgerName}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white font-bold text-sm">&times;</button>
        </div>

        {/* Title bar */}
        <div className="bg-white border-b border-zinc-200 px-4 py-2 text-center select-none">
          <div className="text-sm font-semibold text-zinc-900">
            Bill-wise Details for : <span className="font-bold">{ledgerName}</span>
          </div>
          <div className="text-xs font-semibold text-zinc-700 mt-0.5">
            Up to: {formatCurrency(totalAmount)} {dcType}
          </div>
        </div>

        {/* Info bar */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div>
            Total:{" "}
            <span className="font-mono text-zinc-900 text-sm">
              {formatCurrency(totalAmount)} {dcType}
            </span>
          </div>
          <div className="flex gap-4">
            <span>
              Allocated:{" "}
              <span className="font-mono text-emerald-700">
                {formatCurrency(allocated)}
              </span>
            </span>
            <span>
              Remaining:{" "}
              <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-zinc-500" : remaining > 0 ? "text-zinc-700" : "text-rose-600"}`}>
                {formatCurrency(remaining)}
              </span>
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded flex justify-between items-center">
              <span>&bull; {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-12 bg-zinc-100 border-b border-zinc-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 gap-1">
              <div className="col-span-2">Type of Ref</div>
              <div className="col-span-3">Name</div>
              <div className="col-span-3 text-center leading-tight">
                Due Date, or<br/>Credit Days<br/><span className="normal-case text-[9px] text-zinc-500">(wef: {wefLabel})</span>
              </div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-1 text-center">Dr/Cr</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-zinc-100">
              {allocations.map((row, i) => (
                <div key={i} className="grid grid-cols-12 items-start px-3 py-2 bg-white gap-1">
                  {/* Type of Ref */}
                  <div className="col-span-2">
                    <select
                      value={row.bill_type}
                      onChange={(e) => handleChange(i, "bill_type", e.target.value)}
                      className="text-xs px-1.5 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                    >
                      <option value="New Ref">New Ref</option>
                      <option value="Agst Ref">Agst Ref</option>
                      <option value="Advance">Advance</option>
                      <option value="On Account">On Account</option>
                    </select>
                  </div>

                  {/* Name */}
                  <div className="col-span-3 relative">
                    {row.bill_type === "On Account" ? (
                      <input
                        type="text"
                        value="On Account"
                        disabled
                        className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none w-full disabled:bg-zinc-50 disabled:text-zinc-500 font-semibold"
                      />
                    ) : row.bill_type === "New Ref" ? (
                      <select
                        ref={(el) => { nameInputRefs.current[i] = el; }}
                        value={row.bill_name || "New Ref"}
                        onChange={(e) => handleChange(i, "bill_name", e.target.value)}
                        className="text-xs px-1.5 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 bg-white w-full font-medium"
                      >
                        <option value="Advance">Advance</option>
                        <option value="Agst Ref">Agst Ref</option>
                        <option value="New Ref">New Ref</option>
                        <option value="On Account">On Account</option>
                      </select>
                    ) : row.bill_type === "Agst Ref" ? (
                      <div className="relative" ref={(el) => { agstDropdownRefs.current[i] = el; }}>
                        <input
                          ref={(el) => { nameInputRefs.current[i] = el; }}
                          type="text"
                          value={row.bill_name}
                          readOnly
                          onFocus={() => setActiveAgstRow(i)}
                          placeholder={loadingBills ? "Loading..." : "Select bill"}
                          className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold cursor-pointer"
                        />
                        {activeAgstRow === i && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-300 rounded shadow-xl z-30 max-h-48 overflow-y-auto">
                            <div className="bg-blue-800 text-white text-[10px] font-bold px-2 py-1 sticky top-0">Pending Bills</div>
                            <div className="grid grid-cols-5 bg-zinc-100 text-[9px] font-bold text-zinc-600 px-2 py-1 border-b border-zinc-200">
                              <div className="col-span-1">Name</div>
                              <div className="col-span-1 text-center">Bill Date</div>
                              <div className="col-span-1 text-center">Due Date</div>
                              <div className="col-span-1 text-right">Balance</div>
                              <div className="col-span-1 text-right">Final Balance</div>
                            </div>
                            {pendingBills.length === 0 ? (
                              <div className="text-xs text-zinc-500 px-2 py-2 text-center">No pending bills</div>
                            ) : (
                              pendingBills.map((bill) => (
                                <button
                                  key={bill.bill_name}
                                  onClick={() => handleSelectPendingBill(i, bill)}
                                  className="grid grid-cols-5 w-full text-left text-[10px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50 last:border-0"
                                >
                                  <div className="col-span-1 font-semibold">{bill.bill_name}</div>
                                  <div className="col-span-1 text-center">{formatDateDisplay(bill.bill_date)}</div>
                                  <div className="col-span-1 text-center">{formatDateDisplay(bill.due_date)}</div>
                                  <div className="col-span-1 text-right font-mono">{formatCurrency(bill.balance)}</div>
                                  <div className="col-span-1 text-right font-mono">{formatCurrency(bill.final_balance)}</div>
                                </button>
                              ))
                            )}
                            <button
                              onClick={() => setActiveAgstRow(null)}
                              className="w-full text-[10px] text-zinc-500 py-1 hover:bg-zinc-50 border-t border-zinc-200"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        ref={(el) => { nameInputRefs.current[i] = el; }}
                        type="text"
                        value={row.bill_name}
                        onChange={(e) => handleChange(i, "bill_name", e.target.value)}
                        placeholder="Ref name"
                        className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-semibold"
                      />
                    )}
                  </div>

                  {/* Due Date / Credit Days */}
                  <div className="col-span-3 flex flex-col items-center gap-0.5">
                    {row.bill_type === "On Account" ? (
                      <span className="text-xs text-zinc-400 py-1">&mdash;</span>
                    ) : (
                      <>
                        <input
                          type="text"
                          value={row.credit_period ?? ""}
                          onChange={(e) => handleChange(i, "credit_period", e.target.value)}
                          placeholder="Days"
                          className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-center w-20 font-mono font-medium"
                        />
                        {row.due_date && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ( {formatDateDisplay(row.due_date)} )
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Amount */}
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount || ""}
                      onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                      className="text-xs px-2 py-1 border border-zinc-300 rounded outline-none focus:border-zinc-800 text-right w-full font-mono font-semibold"
                    />
                  </div>

                  {/* Dr/Cr */}
                  <div className="col-span-1 text-center text-xs font-bold text-zinc-700 py-1">
                    {dcType}
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 text-center">
                    <button onClick={() => handleRemove(i)}
                      className="text-zinc-400 hover:text-rose-600 text-sm font-bold font-sans">&times;</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div className="grid grid-cols-12 items-center px-3 py-2 bg-zinc-50 border-t border-zinc-200 gap-1">
              <div className="col-span-8" />
              <div className="col-span-2 text-right text-xs font-bold font-mono text-zinc-900">
                {formatCurrency(allocated)}
              </div>
              <div className="col-span-1 text-center text-xs font-bold text-zinc-700">{dcType}</div>
              <div className="col-span-1" />
            </div>
          </div>

          <button onClick={handleAdd}
            className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 rounded px-2.5 py-1 hover:bg-zinc-50 flex items-center gap-1 select-none">
            + Add Split Row
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept &nbsp;&middot;&nbsp; Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">
              Cancel
            </button>
            <button onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95">
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
