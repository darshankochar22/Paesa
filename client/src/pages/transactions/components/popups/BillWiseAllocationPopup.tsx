import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useCompany } from '../../../../context/CompanyContext';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { openField } from '../../lib/voucherNav';

interface PendingBill {
  bill_name: string;
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
  bill_type: 'New Ref' | 'Agst Ref' | 'Advance' | 'On Account';
  amount: number;
  credit_period?: string;
  due_date?: string;
}

interface Props {
  ledgerId: number;
  ledgerName: string;
  totalAmount: number;
  dcType: 'Dr' | 'Cr';
  voucherDate: string;
  voucherNumber?: string;
  initialAllocations?: BillReference[];
  onClose: () => void;
  onSave: (allocations: BillReference[]) => void;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const hasDueDate = (t: BillReference['bill_type']) => t === 'New Ref' || t === 'Agst Ref';

function formatDateDisplay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Plain Indian-grouped number (no ₹) for the dense Pending Bills columns, so
// large amounts don't crowd their neighbours.
function formatAmount(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BillWiseAllocationPopup({
  ledgerId,
  ledgerName,
  totalAmount,
  dcType,
  voucherDate,
  voucherNumber,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const defaultRefName = String(voucherNumber ?? '').trim();
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
  const [agstHighlight, setAgstHighlight] = useState(0);
  const [agstListPos, setAgstListPos] = useState<{ top: number; left: number } | null>(null);
  const AGST_LIST_WIDTH = 460;
  const hydratedRef = useRef(false);
  const didFocusRef = useRef(false);
  const agstDropdownRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Keep the keyboard-highlighted Pending Bills row scrolled into view.
  useEffect(() => {
    if (activeAgstRow === null) return;
    const dropdown = agstDropdownRefs.current[activeAgstRow];
    const items = dropdown?.querySelectorAll<HTMLElement>('[data-bill-item]');
    items?.[agstHighlight]?.scrollIntoView({ block: 'nearest' });
  }, [agstHighlight, activeAgstRow]);

  useEffect(() => {
    if (activeAgstRow === null) return;
    const handler = (e: MouseEvent) => {
      const dropdown = agstDropdownRefs.current[activeAgstRow];
      if (dropdown && !dropdown.contains(e.target as Node)) {
        setActiveAgstRow(null);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        setActiveAgstRow(null);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [activeAgstRow]);

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

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (initialAllocations.length > 0) {
      setAllocations(initialAllocations.map((a) => ({ ...a, ledger_id: ledgerId })));
    } else {
      const cp = checkCreditDays === 1 ? String(defaultCreditPeriod || '') : '';
      const dd =
        checkCreditDays === 1 && defaultCreditPeriod > 0
          ? addDays(voucherDate, defaultCreditPeriod)
          : '';
      setAllocations([
        {
          ledger_id: ledgerId,
          bill_name: defaultRefName,
          bill_type: 'New Ref',
          amount: totalAmount,
          credit_period: cp,
          due_date: dd,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, totalAmount, initialAllocations]);

  useEffect(() => {
    if (initialAllocations.length === 0 && checkCreditDays === 1 && defaultCreditPeriod > 0) {
      setAllocations((prev) =>
        prev.map((row, i) =>
          i === 0 && !row.credit_period
            ? {
                ...row,
                credit_period: String(defaultCreditPeriod),
                due_date: addDays(voucherDate, defaultCreditPeriod),
              }
            : row,
        ),
      );
    }
  }, [defaultCreditPeriod, checkCreditDays, voucherDate, initialAllocations.length]);

  useEffect(() => {
    if (didFocusRef.current || allocations.length === 0) return;
    didFocusRef.current = true;
    const t = setTimeout(
      () => openField(document.querySelector('[data-bw-type="0"]') as HTMLElement | null),
      0,
    );
    return () => clearTimeout(t);
  }, [allocations.length]);

  const allocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const remaining = totalAmount - allocated;

  const getDefaultRow = (type: BillReference['bill_type'], amount: number): BillReference => {
    const shouldAutoFill = checkCreditDays === 1 && defaultCreditPeriod > 0;
    const base: BillReference = {
      ledger_id: ledgerId,
      bill_name: '',
      bill_type: type,
      amount,
      credit_period: '',
      due_date: '',
    };

    if (type === 'On Account') {
      base.bill_name = 'On Account';
    } else if (type === 'New Ref') {
      base.bill_name = defaultRefName;
      base.credit_period = shouldAutoFill ? String(defaultCreditPeriod) : '';
      base.due_date = shouldAutoFill ? addDays(voucherDate, defaultCreditPeriod) : '';
    } else if (type === 'Advance') {
      base.bill_name = '';
    } else if (type === 'Agst Ref') {
      if (pendingBills.length > 0) {
        const first = pendingBills[0];
        base.bill_name = first.bill_name;
        base.credit_period = first.credit_period || '';
        base.due_date = first.due_date || '';
        base.amount = first.balance == null ? amount : Math.min(amount, first.balance);
      }
    }
    return base;
  };

  const handleAdd = () => {
    if (Math.abs(remaining) < 0.01) {
      setError('Total is fully allocated.');
      return;
    }
    setError(null);
    const type: BillReference['bill_type'] = remaining > 0 ? 'New Ref' : 'On Account';
    const newRow = getDefaultRow(type, Math.abs(remaining));
    setAllocations((prev) => [...prev, newRow]);
  };

  const handleRemove = (i: number) => {
    if (allocations.length === 1) {
      setError('At least one row is required.');
      return;
    }
    setError(null);
    setAllocations((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleChange = (i: number, field: keyof BillReference, value: any) => {
    setError(null);
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== i) return row;
        let updated = { ...row, [field]: value };

        if (field === 'bill_type') {
          updated = getDefaultRow(value as BillReference['bill_type'], row.amount);
        }

        if (field === 'credit_period' && hasDueDate(updated.bill_type)) {
          const days = parseInt(value);
          if (!isNaN(days) && days > 0) {
            updated.due_date = addDays(voucherDate, days);
          } else {
            updated.due_date = '';
          }
        }

        if (field === 'bill_name' && updated.bill_type === 'Agst Ref') {
          const selected = pendingBills.find((b) => b.bill_name === value);
          if (selected) {
            updated.credit_period = selected.credit_period || '';
            updated.due_date = selected.due_date || '';
          }
        }

        return updated;
      }),
    );
  };

  const handleSelectPendingBill = (rowIdx: number, bill: PendingBill) => {
    setAllocations((prev) =>
      prev.map((row, idx) => {
        if (idx !== rowIdx) return row;
        return {
          ...row,
          bill_name: bill.bill_name,
          credit_period: bill.credit_period || '',
          due_date: bill.due_date || '',
          amount: bill.balance == null ? row.amount : bill.balance,
        };
      }),
    );
    setActiveAgstRow(null);
    // Tally: picking the bill drops the cursor onto this row's Amount field.
    requestAnimationFrame(() =>
      (document.querySelector(`[data-bw-amount="${rowIdx}"]`) as HTMLElement | null)?.focus(),
    );
  };

  // Open the Pending Bills list for a row, highlighting its current selection.
  // The list is a viewport-fixed panel (so it isn't clipped by the narrow
  // popup) anchored just below the row's Name cell.
  const openAgstList = (rowIdx: number) => {
    const current = allocations[rowIdx]?.bill_name;
    const idx = pendingBills.findIndex((b) => b.bill_name === current);
    setAgstHighlight(idx >= 0 ? idx : 0);
    const input = document.querySelector(`[data-bw-name="${rowIdx}"]`) as HTMLElement | null;
    if (input) {
      const r = input.getBoundingClientRect();
      const left = Math.max(8, Math.min(r.left - 96, window.innerWidth - AGST_LIST_WIDTH - 8));
      setAgstListPos({ top: r.bottom + 2, left });
    }
    setActiveAgstRow(rowIdx);
  };

  // Keyboard flow inside the Agst Ref name cell: arrows move the highlight,
  // Enter opens the list (closed) or picks the highlighted bill (open). Every
  // handled key is claimed so the shell's Enter-nav doesn't also fire.
  const handleAgstKeyDown = (e: ReactKeyboardEvent, rowIdx: number) => {
    const open = activeAgstRow === rowIdx;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return openAgstList(rowIdx);
      setAgstHighlight((h) => Math.min(pendingBills.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return openAgstList(rowIdx);
      setAgstHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!open) return openAgstList(rowIdx);
      const bill = pendingBills[agstHighlight];
      if (bill) handleSelectPendingBill(rowIdx, bill);
    }
  };

  const handleSave = () => {
    if (
      allocations.some(
        (a) => a.bill_type !== 'On Account' && a.bill_type !== 'Advance' && !a.bill_name.trim(),
      )
    ) {
      setError('Name is required for all references except On Account.');
      return;
    }
    for (const a of allocations) {
      if (a.bill_type !== 'Agst Ref') continue;
      const bill = pendingBills.find((b) => b.bill_name === a.bill_name);
      if (bill && bill.balance != null && (Number(a.amount) || 0) > bill.balance + 0.005) {
        setError(
          `Amount for "${a.bill_name}" exceeds its outstanding balance of ${formatCurrency(bill.balance)}.`,
        );
        return;
      }
    }
    if (remaining <= -0.01) {
      setError(`Remaining ${formatCurrency(remaining)} must be zero.`);
      return;
    }
    let advSeq = 0;
    const named = allocations.map((a) => {
      if (a.bill_type === 'Advance') {
        advSeq += 1;
        if (!a.bill_name.trim()) return { ...a, bill_name: `Adv-${advSeq}` };
      }
      return a;
    });
    const final =
      remaining >= 0.01
        ? [
            ...named,
            {
              ledger_id: ledgerId,
              bill_name: 'On Account',
              bill_type: 'On Account' as const,
              amount: Math.round(remaining * 100) / 100,
              credit_period: '',
              due_date: '',
            },
          ]
        : named;
    onSave(final);
  };

  const wefLabel = formatDateDisplay(voucherDate);
  const inputCls =
    'text-xs px-2 py-1 bg-white border border-gray-400 outline-none focus:border-black';

  return (
    <VoucherPopupShell
      size="tally"
      headerVariant="stacked"
      bodyClassName="px-3 py-0 flex flex-col"
      title={`Bill-wise Details for : ${ledgerName}`}
      headerRight={
        <span>
          Up to:{' '}
          <span className="font-bold text-black">
            {formatCurrency(totalAmount)} {dcType}
          </span>
        </span>
      }
      onClose={onClose}
      onAccept={handleSave}
    >
      {error && (
        <div className="mt-2 border border-gray-400 border-l-2 border-l-black text-black font-semibold text-xs px-2 py-1.5 flex justify-between items-center">
          <span>&bull; {error}</span>
          <button onClick={() => setError(null)} className="font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 border-b border-gray-400 py-1.5 text-[10px] font-bold text-black gap-1">
        <div className="col-span-3">Type of Ref</div>
        <div className="col-span-2">Name</div>
        <div className="col-span-3 text-center leading-tight">
          Due Date, or
          <br />
          Credit Days
          <br />
          <span className="font-normal text-[9px] text-gray-600">(wef: {wefLabel})</span>
        </div>
        <div className="col-span-3 text-right">Amount</div>
        <div className="col-span-1 text-right">
          Dr/
          <br />
          Cr
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {allocations.map((row, i) => (
          <div
            key={i}
            className="group relative grid grid-cols-12 items-start py-1.5 bg-white gap-1"
          >
            <div className="col-span-3">
              <select
                data-bw-type={i}
                value={row.bill_type}
                onChange={(e) => {
                  handleChange(i, 'bill_type', e.target.value);
                  // Tally: choosing "Agst Ref" drops the cursor straight onto the
                  // Name cell with the Pending Bills list already open.
                  if (e.target.value === 'Agst Ref') {
                    requestAnimationFrame(() =>
                      (
                        document.querySelector(`[data-bw-name="${i}"]`) as HTMLElement | null
                      )?.focus(),
                    );
                  }
                }}
                className={`${inputCls} px-1 w-full font-medium`}
              >
                <option value="New Ref">New Ref</option>
                <option value="Agst Ref">Agst Ref</option>
                <option value="Advance">Advance</option>
                <option value="On Account">On Account</option>
              </select>
            </div>

            <div className="col-span-2 relative">
              {row.bill_type === 'On Account' ? (
                <span className="text-xs text-gray-400 py-1 inline-block">&mdash;</span>
              ) : row.bill_type === 'Agst Ref' ? (
                <div
                  className="relative"
                  ref={(el) => {
                    agstDropdownRefs.current[i] = el;
                  }}
                >
                  <input
                    type="text"
                    data-bw-name={i}
                    value={row.bill_name}
                    readOnly
                    onFocus={() => openAgstList(i)}
                    onKeyDown={(e) => handleAgstKeyDown(e, i)}
                    placeholder={loadingBills ? '...' : 'Select'}
                    className={`${inputCls} w-full font-semibold cursor-pointer`}
                  />
                  {activeAgstRow === i && agstListPos && (
                    <div
                      data-ledger-panel
                      style={{
                        position: 'fixed',
                        top: agstListPos.top,
                        left: agstListPos.left,
                        width: AGST_LIST_WIDTH,
                        maxWidth: 'calc(100vw - 16px)',
                      }}
                      className="bg-white border border-gray-400 shadow-2xl z-[60] max-h-72 overflow-y-auto"
                    >
                      <div className="bg-white text-black text-[11px] font-bold px-3 py-1.5 sticky top-0 border-b border-gray-400">
                        Pending Bills
                      </div>
                      <div className="grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1.3fr_1.3fr] gap-3 bg-white text-[10px] font-bold text-gray-600 px-3 py-1.5 border-b border-gray-300 sticky top-[30px]">
                        <div>Name</div>
                        <div className="text-center">Bill Date</div>
                        <div className="text-center">Due Date</div>
                        <div className="text-right">Balance</div>
                        <div className="text-right">Final Balance</div>
                      </div>
                      {pendingBills.length === 0 ? (
                        <div className="text-xs text-gray-500 px-3 py-2 text-center">
                          No pending bills
                        </div>
                      ) : (
                        pendingBills.map((bill, bIdx) => (
                          <button
                            key={bill.bill_name}
                            data-bill-item
                            onClick={() => handleSelectPendingBill(i, bill)}
                            onMouseEnter={() => setAgstHighlight(bIdx)}
                            className={`grid grid-cols-[minmax(0,1.4fr)_1fr_1fr_1.3fr_1.3fr] gap-3 w-full items-center text-left text-[11px] px-3 py-1.5 border-b border-gray-100 last:border-0 ${
                              bIdx === agstHighlight ? 'bg-gray-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="font-semibold truncate">{bill.bill_name}</div>
                            <div className="text-center whitespace-nowrap text-gray-600">
                              {formatDateDisplay(bill.bill_date ?? undefined)}
                            </div>
                            <div className="text-center whitespace-nowrap text-gray-600">
                              {formatDateDisplay(bill.due_date ?? undefined)}
                            </div>
                            <div className="text-right font-mono tabular-nums whitespace-nowrap">
                              {bill.balance == null ? '' : formatAmount(bill.balance)}
                            </div>
                            <div className="text-right font-mono tabular-nums whitespace-nowrap">
                              {bill.final_balance == null ? '' : formatAmount(bill.final_balance)}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={row.bill_name}
                  onChange={(e) => handleChange(i, 'bill_name', e.target.value)}
                  placeholder="Ref"
                  className={`${inputCls} w-full font-semibold`}
                />
              )}
            </div>

            <div className="col-span-3 flex flex-col items-center gap-0.5">
              {hasDueDate(row.bill_type) ? (
                <>
                  <input
                    type="text"
                    value={row.credit_period ?? ''}
                    onChange={(e) => handleChange(i, 'credit_period', e.target.value)}
                    placeholder="Days"
                    className={`${inputCls} text-center w-16 font-mono font-medium`}
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

            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                data-bw-amount={i}
                value={row.amount || ''}
                onChange={(e) => handleChange(i, 'amount', Number(e.target.value) || 0)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  (document.querySelector(`[data-bw-drcr="${i}"]`) as HTMLElement | null)?.focus();
                }}
                className={`${inputCls} text-right w-full font-mono font-semibold`}
              />
            </div>

            <div className="col-span-1 text-right">
              <div
                data-bw-drcr={i}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  if (i < allocations.length - 1) {
                    (
                      document.querySelector(`[data-bw-type="${i + 1}"]`) as HTMLElement | null
                    )?.focus();
                  } else {
                    handleSave();
                  }
                }}
                className="text-xs font-bold text-gray-700 py-1 inline-block px-1 outline-none focus:ring-1 focus:ring-black"
              >
                {dcType}
              </div>
            </div>

            <button
              onClick={() => handleRemove(i)}
              className="absolute -right-2 top-1 text-gray-300 group-hover:text-black text-sm font-bold font-sans leading-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAdd}
        className="mt-2 text-[10px] uppercase tracking-wider font-bold text-gray-600 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100 flex items-center gap-1 select-none self-start"
      >
        + Add Split Row
      </button>

      {/* Grand total pinned to the bottom of the tall panel, matching Tally. */}
      <div className="mt-auto grid grid-cols-12 items-center py-1.5 border-t border-black gap-1 font-bold">
        <div className="col-span-8" />
        <div className="col-span-3 text-right text-xs font-mono text-black">
          {formatCurrency(allocated)}
        </div>
        <div className="col-span-1 text-right text-xs text-black">{dcType}</div>
      </div>
    </VoucherPopupShell>
  );
}
