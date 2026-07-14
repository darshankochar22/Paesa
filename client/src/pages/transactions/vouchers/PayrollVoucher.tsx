import type { useVoucherForm } from '../hooks/useVoucherForm';

interface Props {
  form: ReturnType<typeof useVoucherForm>;
}

export default function PayrollVoucher({ form }: Props) {
  const groups = (form as any).payrollGroups ?? [];

  const isAccountActive = form.activeField?.type === 'account';

  // Dr/Cr for a payhead: Deductions credit the employee, everything else (Earnings,
  // Employer contributions, Reimbursements, Bonus) debits — matching TallyPrime.
  const drCr = (payHead: any): 'Dr' | 'Cr' =>
    /deduction/i.test(payHead?.pay_head_type ?? '') ? 'Cr' : 'Dr';

  // ── focus helpers ──────────────────────────────────────────────────────────
  const focusCategory = (groupId: string) =>
    setTimeout(() => {
      (
        document.querySelector(`[data-payroll-cat="${groupId}"]`) as HTMLInputElement | null
      )?.focus();
    }, 50);

  const focusEmployee = (groupId: string, empRowId: string) =>
    setTimeout(() => {
      (
        document.querySelector(
          `[data-payroll-emp="${groupId}-${empRowId}"]`,
        ) as HTMLInputElement | null
      )?.focus();
    }, 50);

  const focusPayHead = (groupId: string, empRowId: string, phRowId: string) =>
    setTimeout(() => {
      (
        document.querySelector(
          `[data-payroll-ph="${groupId}-${empRowId}-${phRowId}"]`,
        ) as HTMLInputElement | null
      )?.focus();
    }, 50);

  // Focus the last pay-head input of an employee via the live DOM — avoids reading
  // stale payrollGroups from the render-time closure after a row was just appended.
  const focusLastPayHead = (groupId: string, empRowId: string) =>
    setTimeout(() => {
      const nodes = document.querySelectorAll(`[data-payroll-ph^="${groupId}-${empRowId}-"]`);
      (nodes[nodes.length - 1] as HTMLInputElement | null)?.focus();
    }, 60);

  const focusAmount = (groupId: string, empRowId: string, phRowId: string) =>
    setTimeout(() => {
      (
        document.querySelector(
          `[data-payroll-amt="${groupId}-${empRowId}-${phRowId}"]`,
        ) as HTMLInputElement | null
      )?.focus();
    }, 50);

  return (
    <>
      {/* Account field */}
      <div className="border-b border-gray-200 shrink-0 px-3 py-1 bg-white">
        <div className="flex items-center min-h-[22px]">
          <span className="text-sm text-black shrink-0 w-20">Account</span>
          <span className="text-sm text-black mr-2 shrink-0">:</span>
          <input
            type="text"
            className="flex-1 max-w-xs text-sm bg-transparent outline-none px-1 border border-transparent focus:border-gray-800 font-mono font-semibold"
            value={isAccountActive ? form.ledgerSearchTerm : (form.accountLedger?.name ?? '')}
            placeholder="Select Account…"
            onFocus={() => form.handleFieldFocus({ type: 'account' })}
            onChange={(e) => {
              form.setLedgerSearchTerm(e.target.value);
              if (!form.accountLedger) form.handleFieldFocus({ type: 'account' });
            }}
            autoComplete="off"
          />
        </div>
        {form.accountLedger && (
          <div className="flex items-center min-h-[18px] ml-20">
            <span className="text-xs text-gray-500 italic">
              Cur Bal:{' '}
              <span className="font-semibold text-gray-700">{form.accountBalance || '0.00'}</span>
            </span>
          </div>
        )}
      </div>

      {/* Particulars header */}
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-gray-100 text-xs font-bold text-gray-800">
        <div className="flex-1">Particulars</div>
        <div className="w-28 text-right pr-1">Amount</div>
        <div className="w-7" />
      </div>

      {/* Payroll Groups */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {groups.map((group: any) => {
          const isCatActive =
            form.activeField?.type === 'payrollCategory' &&
            (form.activeField as any).groupId === group.id;

          const groupTotal = group.employeeRows.reduce(
            (gSum: number, e: any) =>
              gSum +
              e.payHeadRows.reduce(
                (eSum: number, ph: any) => eSum + (Number(ph.amountRaw) || 0),
                0,
              ),
            0,
          );

          return (
            <div key={group.id}>
              {/* Category row */}
              <div className="flex items-center border-b border-gray-100 min-h-[24px] px-3 py-0.5 bg-gray-50">
                <input
                  data-payroll-cat={group.id}
                  type="text"
                  className="flex-1 text-xs bg-transparent outline-none px-0 border border-transparent focus:border-gray-800 font-semibold text-gray-800"
                  value={isCatActive ? form.ledgerSearchTerm : (group.category?.name ?? '')}
                  placeholder="Select Category…"
                  onFocus={() =>
                    form.handleFieldFocus({ type: 'payrollCategory', groupId: group.id } as any)
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!group.category)
                      form.handleFieldFocus({ type: 'payrollCategory', groupId: group.id } as any);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && group.category) {
                      e.preventDefault();
                      // Move to first employee of this group
                      const firstEmp = group.employeeRows[0];
                      if (firstEmp) focusEmployee(group.id, firstEmp.id);
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      form.handleFieldBlur();
                    }
                  }}
                  autoComplete="off"
                />
                <span className="flex items-center ml-auto shrink-0">
                  <span className="w-28 text-right text-xs font-semibold text-gray-800 tabular-nums px-1">
                    {groupTotal > 0
                      ? groupTotal.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ''}
                  </span>
                  <span className="w-7" />
                </span>
              </div>

              {/* Employee rows */}
              {group.employeeRows.map((empRow: any) => {
                const isEmpActive =
                  form.activeField?.type === 'payrollEmployee' &&
                  (form.activeField as any).groupId === group.id &&
                  (form.activeField as any).empRowId === empRow.id;

                const empTotal = empRow.payHeadRows.reduce(
                  (s: number, ph: any) => s + (Number(ph.amountRaw) || 0),
                  0,
                );

                return (
                  <div key={empRow.id}>
                    {/* Employee name row */}
                    <div className="flex items-center border-b border-gray-100 min-h-[22px] px-3 pl-8 py-0.5">
                      <input
                        data-payroll-emp={`${group.id}-${empRow.id}`}
                        type="text"
                        className="flex-1 text-xs bg-transparent outline-none px-0 border border-transparent focus:border-gray-800 font-semibold"
                        value={isEmpActive ? form.ledgerSearchTerm : (empRow.employee?.name ?? '')}
                        placeholder="Select Employee…"
                        onFocus={() =>
                          form.handleFieldFocus({
                            type: 'payrollEmployee',
                            groupId: group.id,
                            empRowId: empRow.id,
                          } as any)
                        }
                        onChange={(e) => {
                          form.setLedgerSearchTerm(e.target.value);
                          if (!empRow.employee)
                            form.handleFieldFocus({
                              type: 'payrollEmployee',
                              groupId: group.id,
                              empRowId: empRow.id,
                            } as any);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && empRow.employee) {
                            e.preventDefault();
                            // Move to first payhead of this employee
                            const firstPh = empRow.payHeadRows[0];
                            if (firstPh) focusPayHead(group.id, empRow.id, firstPh.id);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            form.handleFieldBlur();
                            // Backtrack to category
                            focusCategory(group.id);
                          }
                        }}
                        autoComplete="off"
                      />
                      {empTotal > 0 && (
                        <span className="flex items-center ml-auto shrink-0">
                          <span className="w-28 text-right text-xs font-semibold font-mono text-gray-800 px-1">
                            {empTotal.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="w-7 text-right text-xs font-semibold text-gray-600">
                            Dr
                          </span>
                        </span>
                      )}
                    </div>

                    {/* PayHead rows */}
                    {empRow.payHeadRows.map((phRow: any, phIdx: number) => {
                      const isPhActive =
                        form.activeField?.type === 'payrollPayHead' &&
                        (form.activeField as any).groupId === group.id &&
                        (form.activeField as any).empRowId === empRow.id &&
                        (form.activeField as any).phRowId === phRow.id;

                      return (
                        <div
                          key={phRow.id}
                          className="flex items-center border-b border-gray-50 min-h-[20px] px-3 pl-16 py-0.5"
                        >
                          <input
                            data-payroll-ph={`${group.id}-${empRow.id}-${phRow.id}`}
                            type="text"
                            className="w-48 text-xs bg-transparent outline-none px-0 border border-transparent focus:border-gray-800 text-gray-700"
                            value={isPhActive ? form.ledgerSearchTerm : (phRow.payHead?.name ?? '')}
                            placeholder={empRow.employee ? 'Select Pay Head…' : ''}
                            onFocus={() =>
                              form.handleFieldFocus({
                                type: 'payrollPayHead',
                                groupId: group.id,
                                empRowId: empRow.id,
                                phRowId: phRow.id,
                              } as any)
                            }
                            onChange={(e) => {
                              form.setLedgerSearchTerm(e.target.value);
                              if (!phRow.payHead)
                                form.handleFieldFocus({
                                  type: 'payrollPayHead',
                                  groupId: group.id,
                                  empRowId: empRow.id,
                                  phRowId: phRow.id,
                                } as any);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && phRow.payHead) {
                                e.preventDefault();
                                focusAmount(group.id, empRow.id, phRow.id);
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                form.handleFieldBlur();
                                // Backtrack to employee
                                focusEmployee(group.id, empRow.id);
                              }
                            }}
                            autoComplete="off"
                          />
                          <input
                            data-payroll-amt={`${group.id}-${empRow.id}-${phRow.id}`}
                            type="text"
                            inputMode="decimal"
                            className="w-28 text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-gray-800 font-mono font-semibold ml-auto"
                            value={phRow.amountRaw}
                            placeholder={phRow.payHead ? '0.00' : ''}
                            onChange={(e) =>
                              (form as any).handleUpdatePayrollPayHeadRow(
                                group.id,
                                empRow.id,
                                phRow.id,
                                { amountRaw: e.target.value },
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                // Add new payhead row if this is the last one, else move to next payhead picker
                                const isLast = phIdx === empRow.payHeadRows.length - 1;
                                if (isLast && phRow.payHead && Number(phRow.amountRaw) > 0) {
                                  (form as any).handleAddPayrollPayHeadRow(group.id, empRow.id);
                                  // Focus the newly appended payhead picker (read live DOM, not stale state)
                                  focusLastPayHead(group.id, empRow.id);
                                } else if (!isLast) {
                                  const nextPh = empRow.payHeadRows[phIdx + 1];
                                  if (nextPh) focusPayHead(group.id, empRow.id, nextPh.id);
                                }
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                // Backtrack to payhead picker
                                focusPayHead(group.id, empRow.id, phRow.id);
                              }
                            }}
                          />
                          <span className="w-7 text-right text-xs font-semibold text-gray-600 shrink-0">
                            {phRow.payHead ? drCr(phRow.payHead) : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 8 - groups.length) }).map((_: any, i: number) => (
          <div key={`pay-f-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
      </div>

      {/* Grand total footer */}
      <div className="flex border-t border-black shrink-0 px-3 py-1 bg-gray-50">
        <div className="flex-1 text-xs font-bold text-gray-700">Total</div>
        <div className="w-28 text-right text-xs font-bold font-mono text-gray-900 px-1">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ''}
        </div>
        <div className="w-7 text-right text-xs font-bold text-gray-700">Dr</div>
      </div>
    </>
  );
}
