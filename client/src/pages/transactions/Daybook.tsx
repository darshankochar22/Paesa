import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { PageTitleBar, AlertBanner, RightActionPanel } from '../../components/ui';
import { fmt } from '@/lib/format';
import { PageFooterBar } from './ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/shadcn/table';
import { EmptyState } from '@/components/blocks/EmptyState';
import { cn } from '@/lib/utils';
import { todayLocalISO } from '@/lib/date';

const todayISO = todayLocalISO;

const ALL_VOUCHER_TYPES = [
  'All Items',
  'All Contra Vouchers',
  'All Payment Vouchers',
  'Attendance',
  'Contra',
  'Credit Note',
  'Debit Note',
  'Delivery Note',
  'Job Work In Order',
  'Job Work Out Order',
  'Journal',
  'Material In',
  'Material Out',
  'Manufacturing Journal',
  'Memorandum',
  'Payment',
  'Payroll',
  'Physical Stock',
  'Purchase',
  'Receipt',
  'Rejection In',
  'Rejection Out',
  'Reversing Journal',
  'Sales',
  'Sales Order',
  'Stock Journal',
];

interface VoucherRow {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string | null;
  party_name: string | null;
  ledger_names: string | null;
  is_cancelled: number;
  is_optional: number;
  debit_amount: number;
  credit_amount: number;
  inwards_qty: number;
  outwards_qty: number;
  stock_item_name: string | null;
  stock_unit: string | null;
}

const formatDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

// Shared en-IN formatter (returns "" for 0) — see @/lib/format.
const formatAmount = (n: number) => fmt(n);

function getAmountDisplay(v: VoucherRow): { debit: number; credit: number } {
  const dr = Number(v.debit_amount) || 0;
  const cr = Number(v.credit_amount) || 0;
  const amount = Math.max(dr, cr); // use the larger side as the display amount

  const DEBIT_TYPES = new Set(['Sales', 'Debit Note', 'Journal', 'Payment', 'Reversing Journal']);
  const CREDIT_TYPES = new Set(['Purchase', 'Credit Note', 'Receipt', 'Contra', 'Payroll']);

  if (DEBIT_TYPES.has(v.voucher_type)) {
    return { debit: amount, credit: 0 };
  }
  if (CREDIT_TYPES.has(v.voucher_type)) {
    return { debit: 0, credit: amount };
  }

  // Inventory / order vouchers and anything else — show the amount on
  // whichever side the data says is larger (or debit if equal).
  if (cr > dr) return { debit: 0, credit: cr };
  return { debit: dr, credit: 0 };
}

// ── Popups ────────────────────────────────────────────────────────────────────

function ChangeDatePopup({
  currentDate,
  onConfirm,
  onClose,
}: {
  currentDate: string;
  onConfirm: (d: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentDate);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-400 shadow-xl w-64">
        <div className="bg-blue-700 text-white text-sm font-semibold px-3 py-1">Change Date</div>
        <div className="px-4 py-4 flex flex-col gap-3">
          <input
            ref={ref}
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onConfirm(value);
              if (e.key === 'Escape') onClose();
            }}
            className="w-full border border-gray-400 px-2 py-1 text-sm outline-none focus:border-black"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(value)}
              className="text-xs bg-black text-white px-3 py-1 hover:bg-gray-800"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePeriodPopup({
  fromDate,
  toDate,
  onConfirm,
  onClose,
}: {
  fromDate: string;
  toDate: string;
  onConfirm: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-400 shadow-xl w-72">
        <div className="bg-blue-700 text-white text-sm font-semibold px-3 py-1">Change Period</div>
        <div className="px-4 py-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm w-10 shrink-0">From</span>
            <span className="text-sm">:</span>
            <input
              ref={ref}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
              className="flex-1 border border-gray-400 px-2 py-1 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm w-10 shrink-0">To</span>
            <span className="text-sm">:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirm(from, to);
                if (e.key === 'Escape') onClose();
              }}
              className="flex-1 border border-gray-400 px-2 py-1 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(from, to)}
              className="text-xs bg-black text-white px-3 py-1 hover:bg-gray-800"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeVoucherTypePopup({
  currentType,
  onSelect,
  onClose,
}: {
  currentType: string;
  onSelect: (t: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(currentType === 'All Items' ? '' : currentType);
  const filtered = ALL_VOUCHER_TYPES.filter(
    (t) => !search || t.toLowerCase().includes(search.toLowerCase()),
  );
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-gray-400 shadow-xl w-80">
        <div className="bg-blue-700 text-white text-sm font-semibold px-3 py-1">
          Change Voucher Type
        </div>
        <div className="px-3 pt-2 pb-1">
          <div className="text-xs text-gray-500 mb-1">Name of Voucher Type</div>
          <input
            ref={ref}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) onSelect(filtered[0]);
            }}
            className="w-full border border-blue-700 px-2 py-1 text-sm outline-none mb-1"
            placeholder="Search voucher type…"
          />
        </div>
        <div className="bg-blue-700 text-white text-xs font-semibold px-3 py-0.5">
          Voucher Types
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((t) => (
            <div
              key={t}
              onClick={() => onSelect(t)}
              className={cn(
                'px-3 py-1 text-sm cursor-pointer hover:bg-orange-200',
                t === currentType ? 'bg-orange-300 font-semibold' : '',
              )}
            >
              {t}
            </div>
          ))}
        </div>
        <div className="border-t border-gray-300 px-3 py-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
          >
            Esc: Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
// Converts month name like "April" + FY start "2026-04-01" → date range
function getMonthStartDate(monthName: string, fyStart: string): string {
  const months = [
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
    'January',
    'February',
    'March',
  ];

  const idx = months.indexOf(monthName);

  if (idx === -1) {
    return todayLocalISO();
  }

  const fyYear = new Date(fyStart).getFullYear();

  // April-Dec = fyYear, Jan-Mar = fyYear+1
  const year = idx <= 8 ? fyYear : fyYear + 1;
  const month = idx <= 8 ? idx + 4 : idx - 8;

  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function getMonthEndDate(monthName: string, fyStart: string): string {
  const start = getMonthStartDate(monthName, fyStart);
  const [y, m] = start.split('-').map(Number);

  const d = new Date(Date.UTC(y, m, 0));

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Daybook() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [allVouchers, setAllVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const monthParam = searchParams.get('month');
  const [error, setError] = useState<string | null>(null);

  const [fromDate, setFromDate] = useState(() => {
    if (monthParam && activeFY?.start_date) {
      return getMonthStartDate(monthParam, activeFY.start_date);
    }
    return todayISO();
  });

  const [toDate, setToDate] = useState(() => {
    if (monthParam && activeFY?.start_date) {
      return getMonthEndDate(monthParam, activeFY.start_date);
    }
    return todayISO();
  });
  useEffect(() => {
    if (monthParam && activeFY?.start_date) {
      setFromDate(getMonthStartDate(monthParam, activeFY.start_date));
      setToDate(getMonthEndDate(monthParam, activeFY.start_date));
    }
  }, [monthParam, activeFY]);
  const isSingleDay = fromDate === toDate;

  const [voucherTypeFilter, setVoucherTypeFilter] = useState('All Items');
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showPeriodPopup, setShowPeriodPopup] = useState(false);
  const [showTypePopup, setShowTypePopup] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // Filtered list based on type filter
  const vouchers = allVouchers.filter((v) => {
    if (voucherTypeFilter === 'All Items') return true;
    if (voucherTypeFilter === 'All Contra Vouchers') return v.voucher_type === 'Contra';
    if (voucherTypeFilter === 'All Payment Vouchers') return v.voucher_type === 'Payment';
    return v.voucher_type === voucherTypeFilter;
  });

  const fetchDaybook = useCallback(async () => {
    if (!companyId || !fyId || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await window.api.voucher.getDaybook(companyId, fyId, fromDate, toDate);
      if (res.success) {
        setAllVouchers(res.vouchers || []);
        setSelectedIndex(0);
      } else {
        setError(res.error || 'Failed to fetch daybook');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, fromDate, toDate]);

  useEffect(() => {
    fetchDaybook();
  }, [fetchDaybook]);

  const periodLabel = isSingleDay
    ? fromDate === todayISO()
      ? `For ${formatDate(fromDate)}`
      : formatDate(fromDate)
    : `${formatDate(fromDate)} to ${formatDate(toDate)}`;

  const anyPopup = showDatePopup || showPeriodPopup || showTypePopup;

  // ── Navigate to EDITABLE voucher form on click/Enter ─────────────────────
  // Tries the edit route first; adjust the path to match your router setup.
  // Common patterns: /transactions/vouchers/edit/:id  OR  /transactions/voucher/:id/edit
  const openVoucher = useCallback(
    (voucherId: number) => {
      // Attendance vouchers appear with a negative id (stored in a separate table) —
      // VoucherView/voucher.getById resolves negative ids back to attendanceService.
      navigate(`/transactions/voucher/${voucherId}`);
    },
    [navigate],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (anyPopup) return;
      if (e.key === 'F2' && !e.altKey) {
        e.preventDefault();
        setShowDatePopup(true);
      }
      if (e.key === 'F2' && e.altKey) {
        e.preventDefault();
        setShowPeriodPopup(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setShowTypePopup(true);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/transactions/vouchers');
      }
      if (e.altKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        navigate('/transactions/voucher-list');
      }
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        navigate('/utilities/banking');
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((p) => Math.min(p + 1, vouchers.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((p) => Math.max(p - 1, 0));
      }
      if (e.key === 'Enter' && vouchers.length > 0) {
        e.preventDefault();
        openVoucher(vouchers[selectedIndex].voucher_id);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [navigate, selectedIndex, vouchers, anyPopup, openVoucher]);

  const daybookActions = [
    { key: 'F2', label: 'Date', onClick: () => setShowDatePopup(true) },
    { key: 'Alt+F2', label: 'Period', onClick: () => setShowPeriodPopup(true) },
    { key: 'F3', label: 'Company', onClick: () => {} },
    { key: 'F4', label: 'Voucher Type', onClick: () => setShowTypePopup(true) },
    {
      key: 'Alt+V',
      label: 'Voucher Register',
      onClick: () => navigate('/transactions/voucher-list'),
    },
    { key: 'B', label: 'Basis of Values', onClick: () => {} },
    { key: 'H', label: 'Change View', onClick: () => {} },
    { key: 'J', label: 'Exception Reports', onClick: () => {} },
    { key: 'L', label: 'Save View', onClick: () => {} },
    { key: 'F', label: 'Apply Filter', onClick: () => {} },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/') },
  ];

  const listTitle =
    voucherTypeFilter === 'All Items' ? 'Day Book' : `List of ${voucherTypeFilter} Vouchers`;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 text-xs select-none">
      <PageTitleBar title={listTitle} subtitle={selectedCompany?.name} />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Period info bar (NO inline F2/F4 buttons — those are in the right panel) */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 shrink-0 text-[11px]">
            <span className="font-semibold text-zinc-700">{periodLabel}</span>
            {voucherTypeFilter !== 'All Items' && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="text-zinc-500">{voucherTypeFilter}</span>
              </>
            )}
            <span className="ml-auto text-zinc-400">
              {vouchers.length} voucher{vouchers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && <EmptyState message="Loading…" className="py-8 italic text-xs" />}
            {!loading && vouchers.length === 0 && (
              <EmptyState
                message="No vouchers found for this period."
                className="py-8 italic text-xs"
              />
            )}
            {!loading && vouchers.length > 0 && (
              <Table className="border-collapse w-full">
                <TableHeader>
                  <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                    <TableHead className="text-left  text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[10%]">
                      Date
                    </TableHead>
                    <TableHead className="text-left  text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[35%]">
                      Particulars
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">
                      Vch Type
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[10%]">
                      Vch No.
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">
                      Debit Amount
                    </TableHead>
                    <TableHead className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 h-auto w-[15%]">
                      Credit Amount
                    </TableHead>
                  </TableRow>
                  <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                    <TableHead className="px-3 py-0.5 h-auto" />
                    <TableHead className="px-3 py-0.5 h-auto" />
                    <TableHead className="px-3 py-0.5 h-auto" />
                    <TableHead className="px-3 py-0.5 h-auto" />
                    <TableHead className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5 h-auto">
                      Inwards Qty
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5 h-auto">
                      Outwards Qty
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {vouchers.map((v, idx) => {
                    const isSelected = idx === selectedIndex;
                    const { debit, credit } = getAmountDisplay(v);
                    // Material In/Out are inventory-only: show the stock item as
                    // particulars and the quantity (In→Debit, Out→Credit).
                    const isMatIn = v.voucher_type === 'Material In';
                    const isMatOut = v.voucher_type === 'Material Out';
                    const unitSuffix = v.stock_unit ? ` ${v.stock_unit}` : '';
                    const debitQty = isMatIn ? Number(v.inwards_qty) || 0 : 0;
                    const creditQty = isMatOut ? Number(v.outwards_qty) || 0 : 0;
                    const debitText =
                      debitQty > 0
                        ? `${debitQty.toLocaleString('en-IN')}${unitSuffix}`
                        : debit > 0
                          ? formatAmount(debit)
                          : '';
                    const creditText =
                      creditQty > 0
                        ? `${creditQty.toLocaleString('en-IN')}${unitSuffix}`
                        : credit > 0
                          ? formatAmount(credit)
                          : '';

                    return (
                      <TableRow
                        key={v.voucher_id}
                        onClick={() => {
                          setSelectedIndex(idx);
                          openVoucher(v.voucher_id);
                        }}
                        data-state={isSelected ? 'selected' : undefined}
                        className={cn(
                          'border-b border-zinc-100 cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-blue-50 data-[state=selected]:bg-blue-50'
                            : 'hover:bg-zinc-50',
                          v.is_cancelled ? 'opacity-40 line-through' : '',
                        )}
                      >
                        <TableCell className="px-3 py-1.5 text-zinc-600 text-[12px]">
                          {formatDate(v.date)}
                        </TableCell>

                        <TableCell className="px-3 py-1.5 font-semibold text-zinc-900 text-[12px]">
                          {isMatIn || isMatOut
                            ? v.stock_item_name || v.narration || '—'
                            : v.party_name || v.ledger_names || v.narration || '—'}
                        </TableCell>

                        <TableCell
                          className={cn(
                            'px-3 py-1.5 text-right text-[12px]',
                            isSelected ? 'font-bold text-zinc-900' : 'text-zinc-600',
                          )}
                        >
                          {v.voucher_type}
                        </TableCell>

                        <TableCell className="px-3 py-1.5 text-right text-zinc-500 text-[12px]">
                          {v.is_optional
                            ? `(Optional) ${v.voucher_number || ''}`
                            : v.voucher_number || '—'}
                        </TableCell>

                        {/* Debit column — amount for Dr-primary types; inwards qty for Material In */}
                        <TableCell
                          className={cn(
                            'px-3 py-1.5 text-right text-[12px]',
                            debitText ? 'font-bold text-zinc-900' : 'text-zinc-300',
                          )}
                        >
                          {debitText}
                        </TableCell>

                        {/* Credit column — amount for Cr-primary types; outwards qty for Material Out */}
                        <TableCell
                          className={cn(
                            'px-3 py-1.5 text-right text-[12px]',
                            creditText ? 'font-bold text-zinc-900' : 'text-zinc-300',
                          )}
                        >
                          {creditText}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <RightActionPanel actions={daybookActions} />
      </div>

      <PageFooterBar
        countLabel={`${vouchers.length} voucher${vouchers.length !== 1 ? 's' : ''} · ${periodLabel}`}
        onBack={() => navigate('/')}
      />

      {showDatePopup && (
        <ChangeDatePopup
          currentDate={fromDate}
          onConfirm={(d) => {
            setFromDate(d);
            setToDate(d);
            setShowDatePopup(false);
          }}
          onClose={() => setShowDatePopup(false)}
        />
      )}
      {showPeriodPopup && (
        <ChangePeriodPopup
          fromDate={fromDate}
          toDate={toDate}
          onConfirm={(from, to) => {
            const f = from <= to ? from : to;
            const t = from <= to ? to : from;
            setFromDate(f);
            setToDate(t);
            setShowPeriodPopup(false);
          }}
          onClose={() => setShowPeriodPopup(false)}
        />
      )}
      {showTypePopup && (
        <ChangeVoucherTypePopup
          currentType={voucherTypeFilter}
          onSelect={(t) => {
            setVoucherTypeFilter(t);
            setSelectedIndex(0);
            setShowTypePopup(false);
          }}
          onClose={() => setShowTypePopup(false)}
        />
      )}
    </div>
  );
}
