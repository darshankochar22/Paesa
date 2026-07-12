import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, NotificationBanner } from '@/components/ui';
import { PageFooterBar } from './ui';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
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
import { exportRowsToCsv, type CsvColumn } from '@/lib/exportCsv';

const VOUCHER_TYPES = [
  'All',
  'Receipt',
  'Payment',
  'Contra',
  'Journal',
  'Sales',
  'Purchase',
  'Credit Note',
  'Debit Note',
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
  debit_amount: number;
  credit_amount: number;
  inwards_qty: number;
  outwards_qty: number;
}

const formatDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

const formatAmount = (n: number) => {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/* ── Side-panel voucher type popup (same pattern as Daybook's F4 popup) ── */
function ChangeVoucherTypePopup({
  currentType,
  onSelect,
  onClose,
}: {
  currentType: string;
  onSelect: (t: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState(currentType === 'All' ? '' : currentType);
  const filtered = VOUCHER_TYPES.filter(
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

export default function VoucherList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedCompany, activeFY } = useCompany();

  const typeParam = searchParams.get('type') || 'All';
  const monthParam = searchParams.get('month');

  const selectedType = VOUCHER_TYPES.includes(typeParam) ? typeParam : 'All';

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('type', type);
    params.delete('month');
    setSearchParams(params);
  };

  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showTypePopup, setShowTypePopup] = useState(false);
  const exportRef = useRef<() => void>(() => {});

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchVouchers = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any =
        selectedType === 'All'
          ? await window.api.voucher.getAll(companyId, fyId)
          : await window.api.voucher.getByType(companyId, fyId, selectedType);
      if (res.success) {
        setVouchers(res.vouchers || []);
        setSelectedIndex(0);
      } else setError(res.error || 'Failed to fetch vouchers');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, selectedType]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (showTypePopup) return;
      if (e.key === 'F4') {
        e.preventDefault();
        setShowTypePopup(true);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/transactions/vouchers');
      }
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        navigate('/transactions/daybook');
      }
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        navigate('/utilities/banking');
      }
      if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        exportRef.current();
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        // Attendance rows carry a negative id (separate table) — not editable here yet.
        if (filtered[selectedIndex].voucher_id >= 0)
          navigate(`/transactions/voucher/${filtered[selectedIndex].voucher_id}`);
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [navigate, selectedIndex, showTypePopup]);

  const listActions = [
    { key: 'Alt+C', label: 'New Voucher', onClick: () => navigate('/transactions/vouchers') },
    { key: 'F4', label: 'Voucher Type', onClick: () => setShowTypePopup(true) },
    { key: 'Alt+D', label: 'Day Book', onClick: () => navigate('/transactions/daybook') },
    { key: 'Alt+B', label: 'Banking', onClick: () => navigate('/utilities/banking') },
    { key: 'Alt+E', label: 'Export', onClick: () => exportRef.current() },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/') },
  ];

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const filtered = vouchers.filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      v.voucher_number?.toLowerCase().includes(q) ||
      v.party_name?.toLowerCase().includes(q) ||
      v.ledger_names?.toLowerCase().includes(q) ||
      v.narration?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (monthParam) {
      const dateObj = new Date(v.date);
      if (isNaN(dateObj.getTime())) return true;
      const monthIndex = dateObj.getMonth(); // 0-11
      const targetMonthIndex = monthNames.indexOf(monthParam);
      if (targetMonthIndex !== -1 && monthIndex !== targetMonthIndex) {
        return false;
      }
    }
    return true;
  });

  const handleRowClick = (idx: number) => {
    setSelectedIndex(idx);
    // Attendance rows carry a negative id (separate table) — not editable here yet.
    if (filtered[idx].voucher_id < 0) return;
    navigate(`/transactions/voucher/${filtered[idx].voucher_id}`);
  };

  const listTitle =
    selectedType === 'All' ? 'Voucher Register' : `List of ${selectedType} Vouchers`;

  // Download every voucher currently in the register (honours type/month/search filters).
  const handleExport = useCallback(() => {
    if (!filtered.length) {
      setError('No vouchers to export.');
      return;
    }
    const period = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';
    const metadata = [
      `Report,${listTitle}`,
      `Company,${selectedCompany?.name || 'Company'}`,
      `Type,${selectedType}`,
      monthParam ? `Month,${monthParam}` : '',
      period ? `Period,${period}` : '',
      `Generated At,${new Date().toLocaleString('en-IN')}`,
      '',
    ].filter(Boolean);
    const columns: CsvColumn<VoucherRow>[] = [
      { header: 'Date', value: (v) => formatDate(v.date) },
      { header: 'Voucher Type', value: (v) => v.voucher_type },
      { header: 'Voucher No', value: (v) => v.voucher_number },
      { header: 'Particulars', value: (v) => v.party_name || v.ledger_names || v.narration || '' },
      { header: 'Narration', value: (v) => v.narration || '' },
      {
        header: 'Debit Amount',
        value: (v) => (v.debit_amount ? Number(v.debit_amount).toFixed(2) : ''),
      },
      {
        header: 'Credit Amount',
        value: (v) => (v.credit_amount ? Number(v.credit_amount).toFixed(2) : ''),
      },
      { header: 'Inwards Qty', value: (v) => v.inwards_qty || '' },
      { header: 'Outwards Qty', value: (v) => v.outwards_qty || '' },
      { header: 'Cancelled', value: (v) => (v.is_cancelled ? 'Yes' : '') },
    ];
    const base =
      selectedType === 'All'
        ? 'voucher_register'
        : `${selectedType.toLowerCase().replace(/\s+/g, '_')}_vouchers`;
    exportRowsToCsv(base, columns, filtered, metadata);
  }, [filtered, selectedCompany, activeFY, listTitle, selectedType, monthParam]);
  exportRef.current = handleExport;

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      <PageTitleBar
        title={listTitle}
        subtitle={selectedCompany?.name}
        actions={
          <Button
            onClick={() => navigate('/transactions/vouchers')}
            size="xs"
            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded uppercase tracking-wider"
          >
            + New Voucher
          </Button>
        }
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Period / type info bar — no inline type tabs; type is changed via F4 side panel */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 shrink-0 text-[11px]">
            <span className="font-semibold text-zinc-700">
              {selectedType === 'All' ? 'All Vouchers' : selectedType}
            </span>
            <span className="ml-auto text-zinc-400">
              {filtered.length} voucher{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by voucher no, party, narration…"
              className="h-auto max-w-sm rounded border-zinc-300 bg-white px-2.5 py-1.5 text-xs flex-1"
            />
            {monthParam && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded text-[11px] font-semibold">
                <span>
                  Month: <strong>{monthParam}</strong>
                </span>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.delete('month');
                    setSearchParams(params);
                  }}
                  className="text-amber-600 hover:text-amber-950 font-bold ml-1"
                  title="Clear month filter"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {error && (
            <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Tally-style table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && <EmptyState message="Loading…" className="py-8 italic" />}

            {!loading && filtered.length === 0 && (
              <EmptyState
                message={
                  vouchers.length === 0
                    ? 'No vouchers found. Create your first voucher.'
                    : 'No results match your search.'
                }
                className="py-8 italic"
              />
            )}

            {!loading && filtered.length > 0 && (
              <Card className="gap-0 py-0 rounded-none ring-0 border-0 bg-transparent shadow-none">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                      <TableHead className="h-auto text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[10%]">
                        Date
                      </TableHead>
                      <TableHead className="h-auto text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[35%]">
                        Particulars
                      </TableHead>
                      <TableHead className="h-auto text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">
                        Vch Type
                      </TableHead>
                      <TableHead className="h-auto text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[10%]">
                        Vch No.
                      </TableHead>
                      <TableHead className="h-auto text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">
                        Debit Amount
                      </TableHead>
                      <TableHead className="h-auto text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">
                        Credit Amount
                      </TableHead>
                    </TableRow>
                    <TableRow className="border-b border-zinc-300 hover:bg-transparent">
                      <TableHead className="h-auto px-3 py-0.5"></TableHead>
                      <TableHead className="h-auto px-3 py-0.5"></TableHead>
                      <TableHead className="h-auto px-3 py-0.5"></TableHead>
                      <TableHead className="h-auto px-3 py-0.5"></TableHead>
                      <TableHead className="h-auto text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5">
                        Inwards Qty
                      </TableHead>
                      <TableHead className="h-auto text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5">
                        Outwards Qty
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <TableRow
                          key={v.voucher_id}
                          onClick={() => handleRowClick(idx)}
                          className={cn(
                            'border-b border-zinc-100 cursor-pointer transition-colors',
                            isSelected ? 'bg-zinc-100 hover:bg-zinc-100' : 'hover:bg-zinc-50',
                            v.is_cancelled ? 'opacity-50' : '',
                          )}
                        >
                          <TableCell className="px-3 py-1.5 text-zinc-800 text-[12px]">
                            {formatDate(v.date)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 font-bold text-zinc-900 text-[12px]">
                            {v.party_name || v.ledger_names || v.narration || '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'px-3 py-1.5 text-right text-[12px]',
                              idx === 0 ? 'font-bold text-zinc-900' : 'text-zinc-700',
                            )}
                          >
                            {v.voucher_type}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-zinc-700 text-[12px]">
                            {v.voucher_number || '—'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'px-3 py-1.5 text-right text-[12px]',
                              v.debit_amount ? 'font-bold text-zinc-900' : 'text-zinc-400',
                            )}
                          >
                            {v.debit_amount ? formatAmount(v.debit_amount) : ''}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-[12px] text-zinc-700">
                            {v.credit_amount ? formatAmount(v.credit_amount) : ''}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </div>

        <RightActionPanel actions={listActions} />
      </div>

      <PageFooterBar
        countLabel={`${filtered.length} voucher${filtered.length !== 1 ? 's' : ''}`}
        onBack={() => navigate('/')}
      />

      {showTypePopup && (
        <ChangeVoucherTypePopup
          currentType={selectedType}
          onSelect={(t) => {
            handleTypeChange(t);
            setShowTypePopup(false);
          }}
          onClose={() => setShowTypePopup(false)}
        />
      )}
    </div>
  );
}
