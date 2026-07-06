// Pure ledger-selection-panel computations (items + title) for the voucher entry
// screen. Extracted verbatim from Vouchers.tsx's panelItems / panelTitle memos.
export function computePanelItems(form: any, effectiveVoucherType: string): any[] {
  const af = form.activeField;
  if (!af) return [];

  if (af.type === 'stockItem') return form.allStockItems;
  if (af.type === 'stockGodown') return form.allGodowns;
  if (af.type === 'employee') return form.allEmployees;
  // Only user-created attendance/production types appear — the old pre-seeded
  // (predefined) ones are hidden so the list starts at just "Create".
  if (af.type === 'attendanceType')
    return form.allAttendanceTypes.filter((t: any) => !t.is_predefined);
  if (af.type === 'payHead') return form.allPayHeads;

  if (af.type === 'account') {
    if (effectiveVoucherType === 'Journal') {
      return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
    }
    if (effectiveVoucherType === 'Payroll') {
      return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
    }
    // Account field is always cash/bank for all three single-entry types
    return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
  }

  if (af.type === 'payrollCategory') {
    return (form as any).allEmployeeCategories ?? [];
  }

  if (af.type === 'payrollEmployee') {
    return form.allEmployees;
  }

  if (af.type === 'payrollPayHead') {
    return form.allPayHeads;
  }

  if (af.type === 'party') {
    // Credit Note: party may be Cash, a Bank Accounts ledger, Sundry Debtor,
    // Sundry Creditor or Bank OD ledger only.
    if (effectiveVoucherType === 'Credit Note') {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, [
          'bank accounts',
          'bank od accounts',
          'bank od a/c',
          'cash-in-hand',
          'sundry debtors',
          'sundry creditors',
        ]),
      );
    }
    if (
      effectiveVoucherType === 'Debit Note' ||
      effectiveVoucherType === 'Material In' ||
      effectiveVoucherType === 'Material Out'
    ) {
      return form.allLedgers;
    }
    // Purchase Order / Sales Order / Delivery Note / Rejection In / Rejection Out —
    // Tally's "List of Ledger Accounts": parties (Sundry Debtors + Creditors),
    // Bank Accounts, Bank OD A/c, Branch/Divisions, Cash.
    if (
      effectiveVoucherType === 'Purchase Order' ||
      effectiveVoucherType === 'Sales Order' ||
      effectiveVoucherType === 'Delivery Note' ||
      effectiveVoucherType === 'Receipt Note' ||
      effectiveVoucherType === 'Rejection In' ||
      effectiveVoucherType === 'Rejection Out' ||
      effectiveVoucherType === 'Job Work In Order' ||
      effectiveVoucherType === 'Job Work Out Order'
    ) {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, [
          'sundry debtors',
          'sundry creditors',
          'bank accounts',
          'bank od accounts',
          'bank od a/c',
          'branch/divisions',
          'branch / divisions',
          'cash-in-hand',
        ]),
      );
    }
    const isPurchaseLike =
      effectiveVoucherType === 'Purchase' ||
      effectiveVoucherType === 'Receipt Note' ||
      effectiveVoucherType === 'Rejection Out' ||
      effectiveVoucherType === 'Material In';
    return form.allLedgers.filter((l) =>
      form.checkLedgerGroup(l, [
        'bank accounts',
        'bank od accounts',
        'bank od a/c',
        'cash-in-hand',
        isPurchaseLike ? 'sundry creditors' : 'sundry debtors',
      ]),
    );
  }

  if (af.type === 'salesPurchase') {
    // Credit Note: ledger account is a Sales or Purchase Accounts ledger only.
    if (effectiveVoucherType === 'Credit Note') {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, ['sales accounts', 'purchase accounts']),
      );
    }
    // Debit Note = purchase return → Ledger account is a Purchase Accounts ledger only.
    if (effectiveVoucherType === 'Debit Note') {
      return form.allLedgers.filter((l) =>
        form.checkLedgerGroup(l, ['purchase accounts']),
      );
    }
    if (
      effectiveVoucherType === 'Rejection In' ||
      effectiveVoucherType === 'Rejection Out'
    ) {
      return form.allLedgers;
    }
    const isPurchaseLike =
      effectiveVoucherType === 'Purchase' ||
      effectiveVoucherType === 'Receipt Note' ||
      effectiveVoucherType === 'Rejection Out' ||
      effectiveVoucherType === 'Purchase Order';
    return form.allLedgers.filter((l) =>
      form.checkLedgerGroup(l, isPurchaseLike ? ['purchase accounts'] : ['sales accounts']),
    );
  }

  // Journal Particulars: all ledgers except cash/bank
  if (effectiveVoucherType === 'Journal' && af.type === 'particular') {
    return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
  }

  // Contra Particulars: also restricted to cash/bank (destination side)
  // In double-entry mode, all rows are restricted to cash/bank
  if (effectiveVoucherType === 'Contra' && af.type === 'particular') {
    return form.allLedgers.filter((l) => form.checkIsCashOrBank(l));
  }

  // Receipt double-entry: Dr rows = all ledgers, Cr rows = all ledgers
  if (
    effectiveVoucherType === 'Receipt' &&
    form.receiptEntryMode === 'double' &&
    af.type === 'particular'
  ) {
    return form.allLedgers;
  }

  // Payment double-entry: all ledgers visible for both Dr and Cr
  if (
    effectiveVoucherType === 'Payment' &&
    form.paymentEntryMode === 'double' &&
    af.type === 'particular'
  ) {
    return form.allLedgers;
  }

  // Payment single-entry: Particulars are Dr — all ledgers except cash/bank
  if (
    effectiveVoucherType === 'Payment' &&
    form.paymentEntryMode === 'single' &&
    af.type === 'particular'
  ) {
    return form.allLedgers.filter((l) => !form.checkIsCashOrBank(l));
  }

  return form.allLedgers;
}

export function computePanelTitle(form: any, effectiveVoucherType: string): string {
  const af = form.activeField;
  if (!af) return 'List of Ledger Accounts';
  if (af.type === 'stockItem') return 'List of Stock Items';
  if (af.type === 'stockGodown') return 'List of Godowns';
  if (af.type === 'employee') return 'List of Employees';
  if (af.type === 'attendanceType') return 'List of Attendance / Production Types';
  if (af.type === 'payHead') return 'List of Pay Heads';
  if (af.type === 'payrollCategory') return 'List of Categories';
  if (af.type === 'payrollEmployee') return 'List of Employees';
  if (af.type === 'payrollPayHead') return 'List of Pay Heads';
  if (af.type === 'account') {
    if (effectiveVoucherType === 'Journal') return 'List of Ledger Accounts';
    if (effectiveVoucherType === 'Payroll') return 'List of Cash / Bank Accounts';
    return 'List of Cash / Bank Accounts';
  }
  if (af.type === 'party')
    return effectiveVoucherType === 'Credit Note' ||
      effectiveVoucherType === 'Purchase Order' ||
      effectiveVoucherType === 'Sales Order' ||
      effectiveVoucherType === 'Delivery Note' ||
      effectiveVoucherType === 'Rejection In' ||
      effectiveVoucherType === 'Rejection Out' ||
      effectiveVoucherType === 'Job Work In Order' ||
      effectiveVoucherType === 'Job Work Out Order'
      ? 'List of Ledger Accounts'
      : 'List of Party Accounts';
  if (af.type === 'salesPurchase') {
    if (
      effectiveVoucherType === 'Credit Note' ||
      effectiveVoucherType === 'Purchase Order' ||
      effectiveVoucherType === 'Sales Order'
    )
      return 'List of Ledger Accounts';
    if (effectiveVoucherType === 'Receipt Note') return 'List of Purchase Ledgers';
    return `List of ${form.voucherType} Ledgers`;
  }
  return 'List of Ledger Accounts';
}
