import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type {
  EmployeeCategoryType,
  EmployeeGroupType,
  EmployeeType,
} from '@/types/entities/Employee';

export default function EmployeeCategoryCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [categories, setCategories] = useState<EmployeeCategoryType[]>([]);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChangeView, setShowChangeView] = useState(false);

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
        const [catRes, grpRes, empRes] = await Promise.all([
          window.api.employeeCategory.getAll(companyId),
          window.api.employeeGroup.getAll(companyId),
          window.api.employee.getAll(companyId),
        ]);
        if (cancelled) return;

        if (catRes.success) {
          setCategories(catRes.employeeCategories ?? []);
        } else {
          setError(catRes.error || 'Failed to load categories.');
        }

        if (grpRes.success) setGroups(grpRes.employeeGroups ?? []);
        if (empRes.success) setEmployees(empRes.employees ?? []);
      } catch {
        if (!cancelled) setError('Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.alias && c.alias.toLowerCase().includes(q)),
    );
  }, [categories, searchQuery]);

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
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/create/employee-category');
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
    { label: 'Employees', path: '/master/coa/employee' },
    { label: 'Employee Groups', path: '/master/coa/employee-group' },
    { label: 'Attendance Types', path: '/master/coa/attendance-type' },
    { label: 'Pay Heads', path: '/master/coa/pay-head' },
    { label: 'Payroll Units', path: '/master/coa/payroll-unit' },
    { label: 'Salary Structures', path: '/master/coa/salary-structure' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-zinc-700">Employee Categories</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/master/create/employee-category')}
            className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white font-medium font-sans"
          >
            + Create
          </button>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Search:</span>
            <input
              className="flex-1 text-xs outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 font-sans"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">
                Loading categories...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">
                No matching categories found.
              </div>
            ) : (
              filteredCategories.map((node) => {
                const nodeId = node.employee_category_id!;
                const empCount = employees.filter((e) => e.employee_category_id === nodeId).length;
                const grpCount = groups.filter((g) => g.employee_category_id === nodeId).length;

                return (
                  <div key={nodeId}>
                    <div
                      className="group flex items-center px-4 py-2.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer"
                      onClick={() => navigate('/master/alter/employee-category')}
                    >
                      <span className="flex-1 text-sm font-semibold text-zinc-800 uppercase tracking-wide group-hover:text-sky-800 transition-colors">
                        {node.name}
                        {!!node.is_predefined && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 ml-2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
                            PREDEFINED
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">
                          {grpCount > 0 ? `${grpCount} grp` : ''}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {empCount > 0 ? `${empCount} emp` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px] select-none shrink-0 font-sans">
          <button
            onClick={() => setShowChangeView(true)}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Ctrl+H Change View
          </button>
          <button
            onClick={() => navigate('/master/create/employee-category')}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Alt+C Create
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/master/coa')}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-t border-zinc-200 font-bold uppercase text-zinc-500 tracking-wider transition-colors"
          >
            Esc Quit
          </button>
        </div>
      </div>

      {showChangeView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs"
          onClick={() => setShowChangeView(false)}
        >
          <div
            className="bg-white border border-zinc-200 rounded shadow-xl w-80 max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider font-sans">
              Change View
            </div>
            {changeViewItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-50 text-zinc-700 font-sans font-medium"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setShowChangeView(false)}
              className="block w-full text-center px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-50 font-sans font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none">
        <span>{categories.length} category(ies)</span>
        <span>Startup ERP Payroll Engine</span>
      </div>
    </div>
  );
}
