// Pure per-voucher-type "can this voucher be accepted?" check. Extracted
// verbatim from Vouchers.tsx's canAccept memo — behavior unchanged.
export function computeCanAccept(form: any, effectiveVoucherType: string): boolean {
  if (form.isSubmitting) return false;

  if (effectiveVoucherType === 'Receipt') {
    if (form.receiptEntryMode === 'single') {
      return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && p.amountRaw !== '');
    }
    const filled = form.receiptDoubleRows.filter((r) => !!r.ledger && r.amountRaw !== '');
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (effectiveVoucherType === 'Payment') {
    if (form.paymentEntryMode === 'single') {
      return (
        !!form.accountLedger &&
        form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
      );
    }
    const filled = form.paymentDoubleRows.filter(
      (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0,
    );
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (effectiveVoucherType === 'Contra') {
    if (form.contraEntryMode === 'single') {
      return !!form.accountLedger && form.particulars.some((p) => !!p.ledger && p.amountRaw !== '');
    }
    const filled = form.contraDoubleRows.filter((r) => !!r.ledger && r.amountRaw !== '');
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (effectiveVoucherType === 'Journal') {
    if (form.journalEntryMode === 'single') {
      return (
        !!form.accountLedger &&
        form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
      );
    }
    const filled = form.journalRows.filter((r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0);
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (
    [
      'Sales',
      'Purchase',
      'Credit Note',
      'Debit Note',
      'Delivery Note',
      'Receipt Note',
      'Rejection In',
      'Rejection Out',
      'Material In',
      'Material Out',
    ].includes(effectiveVoucherType)
  ) {
    const hasValidEntries = form.stockEntries.some(
      (s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0,
    );
    const allFilled =
      effectiveVoucherType === 'Credit Note' ||
      effectiveVoucherType === 'Debit Note' ||
      effectiveVoucherType === 'Rejection In' ||
      effectiveVoucherType === 'Rejection Out' ||
      effectiveVoucherType === 'Material In' ||
      effectiveVoucherType === 'Material Out'
        ? form.stockEntries.every((s) => !s.stockItem || (s.quantityRaw !== '' && s.rateRaw !== ''))
        : true;
    const needsLedger = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
      effectiveVoucherType,
    );
    return (
      !!form.partyLedger &&
      (!needsLedger || !!form.salesPurchaseLedger) &&
      hasValidEntries &&
      allFilled
    );
  }

  if (
    effectiveVoucherType === 'Stock Journal' ||
    effectiveVoucherType === 'Manufacturing Journal'
  ) {
    const filledSource = form.sourceStockEntries.some(
      (s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0,
    );
    const filledDest = form.destinationStockEntries.some(
      (s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0,
    );
    return filledSource || filledDest;
  }

  // Physical Stock: inventory-only, no party/ledger — valid once any item has a quantity.
  if (effectiveVoucherType === 'Physical Stock') {
    return form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0);
  }

  // Order vouchers: party + at least one stock item with quantity
  if (
    ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(
      effectiveVoucherType,
    )
  ) {
    return (
      !!form.partyLedger &&
      form.stockEntries.some((s) => !!s.stockItem && (Number(s.quantityRaw) || 0) > 0)
    );
  }

  if (effectiveVoucherType === 'Memorandum') {
    const filled = form.journalRows.filter((r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0);
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (effectiveVoucherType === 'Reversing Journal') {
    if (form.journalEntryMode === 'single') {
      return (
        !!form.accountLedger &&
        form.particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
      );
    }
    const filled = form.journalRows.filter((r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0);
    return filled.length >= 2 && Math.abs(form.debitTotal - form.creditTotal) < 0.01;
  }

  if (effectiveVoucherType === 'Attendance') {
    return form.attendanceEntries.some(
      (r) => !!r.employee && !!r.attendanceType && Number(r.valueRaw) > 0,
    );
  }

  if (effectiveVoucherType === 'Payroll') {
    return (
      !!form.accountLedger &&
      ((form as any).payrollEntriesFromGroups ?? form.payrollEntries).some(
        (r: any) => !!r.employee && !!r.payHead && Number(r.amountRaw) > 0,
      )
    );
  }

  return false;
}
