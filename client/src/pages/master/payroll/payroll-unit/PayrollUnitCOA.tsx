import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type { PayrollUnitType } from '@/types/entities/Payroll';

export default function PayrollUnitCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const [units, setUnits] = useState<PayrollUnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChangeView, setShowChangeView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.payrollUnit.getAll(companyId);
        if (cancelled) return;
        if (res.success) setUnits(res.payrollUnits ?? []);
        else setError(res.error || 'Failed to load.');
      } catch {
        if (!cancelled) setError('Failed to load units.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = units;
    if (q)
      result = result.filter(
        (u) =>
          u.symbol?.toLowerCase().includes(q) ||
          u.formal_name?.toLowerCase().includes(q) ||
          u.name?.toLowerCase().includes(q),
      );
    if (showUnusedOnly) result = result.filter((u) => (u.is_predefined ? false : true));
    return result.sort((a, b) => (a.symbol || '').localeCompare(b.symbol || ''));
  }, [units, searchQuery, showUnusedOnly]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowChangeView((p) => !p);
      }
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setShowUnusedOnly((p) => !p);
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/create/payroll-unit');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const changeViewItems = [
    { label: 'Ledgers', path: '/master/coa/ledger' },
    { label: 'Groups', path: '/master/coa/group' },
    { label: 'Stock Groups & Items', path: '/master/coa/stock-group' },
    { label: 'Stock Categories', path: '/master/coa/stock-category' },
    { label: 'Godowns', path: '/master/coa/godown' },
    { label: 'Units of Measure', path: '/master/coa/unit' },
    { label: 'Employee Groups', path: '/master/coa/employee-group' },
    { label: 'Employees', path: '/master/coa/employee' },
    { label: 'Attendance Types', path: '/master/coa/attendance-type' },
    { label: 'Pay Heads', path: '/master/coa/pay-head' },
    { label: 'Salary Structures', path: '/master/coa/salary-structure' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-zinc-700">Payroll Units</span>
          {showUnusedOnly && (
            <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-medium">
              Unused Only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/master/create/payroll-unit')}
            className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white"
          >
            + Create
          </button>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Search:</span>
            <input
              className="flex-1 text-xs outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-zinc-400 hover:text-zinc-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading units...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No matching units found.</div>
            ) : (
              filtered.map((u) => {
                const uId = u.payroll_unit_id!;
                const isPredefined = !!u.is_predefined;
                return (
                  <div key={uId}>
                    <div
                      className="group flex items-center px-4 py-1.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer"
                      onClick={() =>
                        navigate('/master/alter/payroll-unit', { state: { unitId: uId } })
                      }
                    >
                      <span className="flex-1 text-sm font-medium text-zinc-700 group-hover:text-sky-800 transition-colors">
                        {isPredefined ? '◆ ' : '◇ '}
                        {u.symbol || u.name}
                      </span>
                      <span className="text-xs text-zinc-400 mr-2">{u.unit_type}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px]">
          <button
            onClick={() => setShowUnusedOnly((p) => !p)}
            className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600"
          >
            Ctrl+J Exception
          </button>
          <button
            onClick={() => setShowChangeView(true)}
            className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600"
          >
            Ctrl+H Change View
          </button>
          <button
            onClick={() => navigate('/master/create/payroll-unit')}
            className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600"
          >
            Alt+C Create
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/master/coa')}
            className="px-3 py-2 text-left hover:bg-zinc-100 border-t border-zinc-200 font-medium text-zinc-500"
          >
            Esc Quit
          </button>
        </div>
      </div>

      {/* Change View Modal */}
      {showChangeView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs"
          onClick={() => setShowChangeView(false)}
        >
          <div
            className="bg-white border border-zinc-200 rounded shadow-xl w-80 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase">
              Change View
            </div>
            {changeViewItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="block w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 border-b border-zinc-50"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setShowChangeView(false)}
              className="block w-full text-center px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>{filtered.length} unit(s)</span>
        <span>Startup ERP Payroll Engine</span>
      </div>
    </div>
  );
}
