import { useState, useEffect, useRef } from "react";
import { useCompany } from "../../../../context/CompanyContext";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

interface PendingBill {
  bill_name: string;
  // Order references (a party's open Purchase/Sales Order numbers) appear in
  // the list name-only: date / balance columns are null (is_order = 1).
  bill_date: string | null;
  due_date: string | null;
  credit_period: string | null;
  balance: number | null;
  final_balance: number | null;
  is_order?: number;
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

// Due date / credit days only apply to references that track a credit period.
const hasDueDate = (t: BillReference["bill_type"]) => t === "New Ref" || t === "Agst Ref";

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
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const hydratedRef = useRef(false);
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
      if (e.key === "Escape") {
        // Close only the dropdown — stop the shell's window-level Esc handler
        // from also closing the whole popup.
        e.stopPropagation();
        e.preventDefault();
        setActiveAgstRow(null);
      }
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

  // Initialize allocations — once per mount. Guarding with a ref stops a parent
  // re-render that passes a fresh [] (new identity) from wiping in-progress edits.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
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
      // No name, no due date — the whole amount sits on account.
      base.bill_name = "On Account";
    } else if (type === "New Ref") {
      // User types the new reference name; carries a credit period.
      base.bill_name = "";
      base.credit_period = shouldAutoFill ? String(defaultCreditPeriod) : "";
      base.due_date = shouldAutoFill ? addDays(voucherDate, defaultCreditPeriod) : "";
    } else if (type === "Advance") {
      // Advance: user types a reference name, but advances carry no due date.
      base.bill_name = "";
    } else if (type === "Agst Ref") {
      // Settle against an existing pending bill.
      if (pendingBills.length > 0) {
        const first = pendingBills[0];
        base.bill_name = first.bill_name;
        base.credit_period = first.credit_period || "";
        base.due_date = first.due_date || "";
        base.amount = first.balance == null ? amount : Math.min(amount, first.balance);
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

        if (field === "credit_period" && hasDueDate(updated.bill_type)) {
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
          // An order reference has no posted balance — keep the typed amount.
          amount: bill.balance == null ? row.amount : bill.balance,
        };
      })
    );
    setActiveAgstRow(null);
  };

  const handleSave = () => {
    if (allocations.some((a) => a.bill_type !== "On Account" && a.bill_type !== "Advance" && !a.bill_name.trim())) {
      setError("Name is required for all references except On Account.");
      return;
    }
    // Agst Ref cannot settle more than the referenced bill's outstanding balance.
    for (const a of allocations) {
      if (a.bill_type !== "Agst Ref") continue;
      const bill = pendingBills.find((b) => b.bill_name === a.bill_name);
      if (bill && bill.balance != null && (Number(a.amount) || 0) > bill.balance + 0.005) {
        setError(`Amount for "${a.bill_name}" exceeds its outstanding balance of ${formatCurrency(bill.balance)}.`);
        return;
      }
    }
    // Rows must not exceed the voucher total.
    if (remaining <= -0.01) {
      setError(`Remaining ${formatCurrency(remaining)} must be zero.`);
      return;
    }
    // Auto-name empty Advance references (Adv-1, Adv-2, …).
    let advSeq = 0;
    const named = allocations.map((a) => {
      if (a.bill_type === "Advance") {
        advSeq += 1;
        if (!a.bill_name.trim()) return { ...a, bill_name: `Adv-${advSeq}` };
      }
      return a;
    });
    // Tally behavior: any unallocated residue is booked On Account automatically.
    const final = remaining >= 0.01
      ? [...named, {
          ledger_id: ledgerId,
          bill_name: "On Account",
          bill_type: "On Account" as const,
          amount: Math.round(remaining * 100) / 100,
          credit_period: "",
          due_date: "",
        }]
      : named;
    onSave(final);
  };

  const wefLabel = formatDateDisplay(voucherDate);
  const inputCls = "text-xs px-2 py-1 bg-white border border-gray-400 outline-none focus:border-black";

  return (
    <VoucherPopupShell
      title={`Bill-wise Details for : ${ledgerName}`}
      headerRight={<span>Up to: <span className="font-bold text-black">{formatCurrency(totalAmount)} {dcType}</span></span>}
      onClose={onClose}
      onAccept={handleSave}
    >
      {/* Info bar */}
      <div className="border-b border-gray-300 pb-2 mb-3 flex justify-between items-center text-xs font-semibold text-gray-700">
        <div>
          Total:{" "}
          <span className="font-mono text-black text-sm">
            {formatCurrency(totalAmount)} {dcType}
          </span>
        </div>
        <div className="flex gap-4">
          <span>
            Allocated:{" "}
            <span className="font-mono text-black">
              {formatCurrency(allocated)}
            </span>
          </span>
          <span>
            Remaining:{" "}
            <span className={`font-mono ${Math.abs(remaining) < 0.01 ? "text-gray-500" : "text-black font-bold"}`}>
              {formatCurrency(remaining)}
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {error && (
          <div className="border border-gray-400 border-l-2 border-l-black text-black font-semibold text-xs px-3 py-2 flex justify-between items-center">
            <span>&bull; {error}</span>
            <button onClick={() => setError(null)} className="font-bold">&times;</button>
          </div>
        )}

        <div className="border border-gray-300">
          {/* Column headers */}
          <div className="grid grid-cols-12 bg-white border-b border-gray-400 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black gap-1">
            <div className="col-span-2">Type of Ref</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3 text-center leading-tight">
              Due Date, or<br/>Credit Days<br/><span className="normal-case text-[9px] text-gray-600">(New Ref wef: {wefLabel}; Agst Ref wef bill date)</span>
            </div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-center">Dr/Cr</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-gray-200">
            {allocations.map((row, i) => (
              <div key={i} className="grid grid-cols-12 items-start px-3 py-2 bg-white gap-1">
                {/* Type of Ref */}
                <div className="col-span-2">
                  <select
                    value={row.bill_type}
                    onChange={(e) => handleChange(i, "bill_type", e.target.value)}
                    className={`${inputCls} px-1.5 w-full font-medium`}
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
                    // On Account carries no reference name.
                    <span className="text-xs text-gray-400 py-1 inline-block">&mdash;</span>
                  ) : row.bill_type === "Agst Ref" ? (
                    <div className="relative" ref={(el) => { agstDropdownRefs.current[i] = el; }}>
                      <input
                        type="text"
                        value={row.bill_name}
                        readOnly
                        onFocus={() => setActiveAgstRow(i)}
                        placeholder={loadingBills ? "Loading..." : "Select bill"}
                        className={`${inputCls} w-full font-semibold cursor-pointer`}
                      />
                      {activeAgstRow === i && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-400 shadow-xl z-30 max-h-48 overflow-y-auto">
                          <div className="bg-white text-black text-[10px] font-bold px-2 py-1 sticky top-0 border-b border-gray-400">Pending Bills</div>
                          <div className="grid grid-cols-5 bg-white text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-300">
                            <div className="col-span-1">Name</div>
                            <div className="col-span-1 text-center">Bill Date</div>
                            <div className="col-span-1 text-center">Due Date</div>
                            <div className="col-span-1 text-right">Balance</div>
                            <div className="col-span-1 text-right">Final Balance</div>
                          </div>
                          {pendingBills.length === 0 ? (
                            <div className="text-xs text-gray-500 px-2 py-2 text-center">No pending bills</div>
                          ) : (
                            pendingBills.map((bill) => (
                              <button
                                key={bill.bill_name}
                                onClick={() => handleSelectPendingBill(i, bill)}
                                className="grid grid-cols-5 w-full text-left text-[10px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 last:border-0"
                              >
                                <div className="col-span-1 font-semibold">{bill.bill_name}</div>
                                <div className="col-span-1 text-center">{formatDateDisplay(bill.bill_date ?? undefined)}</div>
                                <div className="col-span-1 text-center">{formatDateDisplay(bill.due_date ?? undefined)}</div>
                                <div className="col-span-1 text-right font-mono">{bill.balance == null ? "" : formatCurrency(bill.balance)}</div>
                                <div className="col-span-1 text-right font-mono">{bill.final_balance == null ? "" : formatCurrency(bill.final_balance)}</div>
                              </button>
                            ))
                          )}
                          <button
                            onClick={() => setActiveAgstRow(null)}
                            className="w-full text-[10px] text-gray-500 py-1 hover:bg-gray-50 border-t border-gray-300"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // New Ref / Advance — type the reference name.
                    <input
                      type="text"
                      value={row.bill_name}
                      onChange={(e) => handleChange(i, "bill_name", e.target.value)}
                      placeholder="Ref name"
                      className={`${inputCls} w-full font-semibold`}
                    />
                  )}
                </div>

                {/* Due Date / Credit Days — only for New Ref & Agst Ref */}
                <div className="col-span-3 flex flex-col items-center gap-0.5">
                  {hasDueDate(row.bill_type) ? (
                    <>
                      <input
                        type="text"
                        value={row.credit_period ?? ""}
                        onChange={(e) => handleChange(i, "credit_period", e.target.value)}
                        placeholder="Days"
                        className={`${inputCls} text-center w-20 font-mono font-medium`}
                      />
                      {row.due_date && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          ( {formatDateDisplay(row.due_date)} )
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 py-1">&mdash;</span>
                  )}
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <input
                    type="number"
                    step="0.01"
                    value={row.amount || ""}
                    onChange={(e) => handleChange(i, "amount", Number(e.target.value) || 0)}
                    className={`${inputCls} text-right w-full font-mono font-semibold`}
                  />
                </div>

                {/* Dr/Cr */}
                <div className="col-span-1 text-center text-xs font-bold text-gray-700 py-1">
                  {dcType}
                </div>

                {/* Remove */}
                <div className="col-span-1 text-center">
                  <button onClick={() => handleRemove(i)}
                    className="text-gray-400 hover:text-black text-sm font-bold font-sans">&times;</button>
                </div>
              </div>
            ))}
          </div>

          {/* Total row */}
          <div className="grid grid-cols-12 items-center px-3 py-2 bg-white border-t border-black gap-1 font-bold">
            <div className="col-span-8" />
            <div className="col-span-2 text-right text-xs font-mono text-black">
              {formatCurrency(allocated)}
            </div>
            <div className="col-span-1 text-center text-xs text-black">{dcType}</div>
            <div className="col-span-1" />
          </div>
        </div>

        <button onClick={handleAdd}
          className="text-[10px] uppercase tracking-wider font-bold text-gray-600 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100 flex items-center gap-1 select-none">
          + Add Split Row
        </button>
      </div>
    </VoucherPopupShell>
  );
}
