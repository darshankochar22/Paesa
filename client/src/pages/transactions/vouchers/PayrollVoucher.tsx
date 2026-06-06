import type { useVoucherForm } from "../hooks/useVoucherForm";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
}

export default function PayrollVoucher({ form }: Props) {
  const focusAmount = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-pay-amount="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const proceedToNextRow = (idx: number) => {
    if (idx === form.payrollEntries.length - 1) {
      form.handleAddPayrollRow();
    }
    setTimeout(() => {
      (document.querySelector(`[data-employee="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const isAccountActive = form.activeField?.type === "account";

  return (
    <>
      {/* Account field - matching Tally screenshot layout */}
      <div className="border-b border-zinc-200 shrink-0 px-3 py-1 bg-white">
        <div className="flex items-center min-h-[22px]">
          <span className="text-sm text-black shrink-0 w-20">Account</span>
          <span className="text-sm text-black mr-2 shrink-0">:</span>
          <input
            type="text"
            className="flex-1 max-w-xs text-sm bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
            value={isAccountActive ? form.ledgerSearchTerm : (form.accountLedger?.name ?? "")}
            placeholder="Select Account…"
            onFocus={() => form.handleFieldFocus({ type: "account" })}
            onChange={(e) => {
              form.setLedgerSearchTerm(e.target.value);
              if (!form.accountLedger) form.handleFieldFocus({ type: "account" });
            }}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center min-h-[18px] ml-20">
          <span className="text-xs text-zinc-500 italic">
            Cur Bal: <span className="font-semibold text-zinc-700">{form.accountBalance || "0.00"}</span>
          </span>
        </div>
      </div>

      {/* Particulars separator - matching Tally screenshot */}
      <div className="border-b border-black shrink-0 px-3 py-0.5 bg-zinc-100">
        <span className="text-xs font-bold text-zinc-800">Particulars</span>
      </div>

      {/* Payroll Header */}
      <div className="flex border-b border-zinc-200 shrink-0 px-3 py-0.5 bg-zinc-50 text-[10px] font-bold text-zinc-600">
        <div className="flex-1 min-w-[200px]">Employee Name</div>
        <div className="w-40">Employee Number</div>
        <div className="w-48">Pay Head</div>
        <div className="w-32 text-right">Amount</div>
      </div>

      {/* Payroll Entries */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {form.payrollEntries.map((row, idx) => {
          const isEmployeeActive =
            form.activeField?.type === "employee" &&
            form.activeField.rowId === row.id;
          const isPayHeadActive =
            form.activeField?.type === "payHead" &&
            form.activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="flex items-center border-b border-zinc-100 min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
            >
              {/* Employee Name */}
              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                <input
                  data-employee={idx + 1}
                  type="text"
                  className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isEmployeeActive ? form.ledgerSearchTerm : (row.employee?.name ?? "")}
                  placeholder={idx === 0 ? "Select Employee…" : ""}
                  onFocus={() =>
                    form.handleFieldFocus({ type: "employee", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!row.employee)
                      form.handleFieldFocus({ type: "employee", rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && row.employee) {
                      e.preventDefault();
                      const nextEl = document.querySelector(`[data-pay-head="${idx + 1}"]`) as HTMLInputElement;
                      if (nextEl) nextEl.focus();
                    }
                  }}
                  autoComplete="off"
                />
                {form.payrollEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemovePayrollRow(row.id)}
                    className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Employee Number */}
              <div className="w-40 text-xs font-mono text-zinc-500 select-none">
                {row.employee?.employee_code || "—"}
              </div>

              {/* Pay Head */}
              <div className="w-48">
                <input
                  data-pay-head={idx + 1}
                  type="text"
                  className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isPayHeadActive ? form.ledgerSearchTerm : (row.payHead?.name ?? "")}
                  placeholder={row.employee ? "Select Pay Head…" : ""}
                  onFocus={() =>
                    form.handleFieldFocus({ type: "payHead", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!row.payHead)
                      form.handleFieldFocus({ type: "payHead", rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && row.payHead) {
                      e.preventDefault();
                      focusAmount(idx);
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              {/* Amount */}
              <div className="w-32 text-right">
                <input
                  data-pay-amount={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                  value={row.amountRaw}
                  placeholder={row.payHead ? "0.00" : ""}
                  onChange={(e) =>
                    form.handleUpdatePayrollRow(row.id, { amountRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      proceedToNextRow(idx);
                    }
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 10 - form.payrollEntries.length) }).map((_, i) => (
          <div
            key={`pay-f-${i}`}
            className="flex border-b border-zinc-50 min-h-[26px] px-3"
          />
        ))}
      </div>

      {/* Grand total footer */}
      <div className="flex border-t border-zinc-300 shrink-0 px-3 py-1 bg-zinc-50 border-b border-zinc-200">
        <div className="flex-1 text-xs font-bold text-zinc-700">Total</div>
        <div className="w-32 text-right text-xs font-bold font-mono text-zinc-900 pr-0">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "0.00"}
        </div>
      </div>
    </>
  );
}
