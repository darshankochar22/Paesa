import type { useVoucherForm } from "../hooks/useVoucherForm";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
}

export default function AttendanceVoucher({ form }: Props) {
  const focusValue = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-att-value="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const proceedToNextRow = (idx: number) => {
    if (idx === form.attendanceEntries.length - 1) {
      form.handleAddAttendanceRow();
    }
    setTimeout(() => {
      (document.querySelector(`[data-employee="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  return (
    <>
      {/* Attendance Header - matching Tally screenshot columns */}
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-zinc-100 text-xs font-bold text-zinc-800">
        <div className="flex-1 min-w-[200px]">Employee Name</div>
        <div className="w-40">Employee Number</div>
        <div className="w-48">Attendance/Production Type</div>
        <div className="w-32 text-right">Value</div>
      </div>

      {/* Attendance Entries */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {form.attendanceEntries.map((row, idx) => {
          const isEmployeeActive =
            form.activeField?.type === "employee" &&
            form.activeField.rowId === row.id;
          const isAttTypeActive =
            form.activeField?.type === "attendanceType" &&
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
                      const nextEl = document.querySelector(`[data-att-type="${idx + 1}"]`) as HTMLInputElement;
                      if (nextEl) nextEl.focus();
                    }
                  }}
                  autoComplete="off"
                />
                {form.attendanceEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemoveAttendanceRow(row.id)}
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

              {/* Attendance/Production Type */}
              <div className="w-48">
                <input
                  data-att-type={idx + 1}
                  type="text"
                  className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isAttTypeActive ? form.ledgerSearchTerm : (row.attendanceType?.name ?? "")}
                  placeholder={row.employee ? "Select Type…" : ""}
                  onFocus={() =>
                    form.handleFieldFocus({ type: "attendanceType", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!row.attendanceType)
                      form.handleFieldFocus({ type: "attendanceType", rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && row.attendanceType) {
                      e.preventDefault();
                      focusValue(idx);
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              {/* Value (Days / Hours) */}
              <div className="w-32 text-right">
                <input
                  data-att-value={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                  value={row.valueRaw}
                  placeholder={row.attendanceType ? "0" : ""}
                  onChange={(e) =>
                    form.handleUpdateAttendanceRow(row.id, { valueRaw: e.target.value })
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
        {Array.from({ length: Math.max(0, 10 - form.attendanceEntries.length) }).map((_, i) => (
          <div
            key={`att-f-${i}`}
            className="flex border-b border-zinc-50 min-h-[26px] px-3"
          />
        ))}
      </div>
    </>
  );
}
