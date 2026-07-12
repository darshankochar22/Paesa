import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type { ExciseDutyClassificationType } from '@/types/api';

export default function ExciseDutyClassificationCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [classifications, setClassifications] = useState<ExciseDutyClassificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await window.api.exciseDutyClassification.getAll(companyId);
      if (res.success) setClassifications(res.classifications ?? []);
      else setError(res.error || 'Failed to load excise duty classifications.');
    } catch {
      setError('Failed to load excise duty classifications.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/create/excise-duty-classification');
      }
      if (e.altKey && e.key.toLowerCase() === 'a' && selectedId) {
        e.preventDefault();
        navigate('/master/alter/excise-duty-classification');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, selectedId]);

  const filtered = useMemo(() => {
    let list = [...classifications];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.duty_code ?? '').toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [classifications, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800 font-mono text-[12px]">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none font-sans shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/master/coa"
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            &larr; Back
          </Link>
          <span className="font-bold text-sm text-zinc-800">
            List of Excise Duty Classifications
          </span>
        </div>
        <Link
          to="/master/create/excise-duty-classification"
          className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
        >
          + Create Classification
        </Link>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full border-r border-zinc-100">
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2 font-sans shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Type name or duty code to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-zinc-400 hover:text-black font-bold px-1.5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[5fr_4fr_3fr] bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-600 shrink-0">
            <div className="py-1.5 px-3 border-r border-zinc-200">Name</div>
            <div className="py-1.5 px-3 border-r border-zinc-200">Duty code</div>
            <div className="py-1.5 px-3">Calculation method</div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">
                No excise duty classifications found.
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.excise_duty_classification_id}
                  onClick={() => setSelectedId(c.excise_duty_classification_id ?? null)}
                  className={`grid grid-cols-[5fr_4fr_3fr] border-b border-zinc-100 cursor-pointer text-[12px] ${
                    selectedId === c.excise_duty_classification_id
                      ? 'bg-zinc-100 font-bold text-black'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="py-1.5 px-3 border-r border-zinc-100 truncate">{c.name}</div>
                  <div className="py-1.5 px-3 border-r border-zinc-100 truncate text-zinc-500">
                    {c.duty_code || '—'}
                  </div>
                  <div className="py-1.5 px-3 truncate text-zinc-500">
                    {c.calculation_methods?.join(', ') || '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right action bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700 font-sans">
          <button
            onClick={() => navigate('/master/create/excise-duty-classification')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
          </button>
          {selectedId && (
            <button
              onClick={() => navigate('/master/alter/excise-duty-classification')}
              className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
            >
              <span className="font-bold text-zinc-900 text-[10px]">Alt+A</span>
              <span>Alter Master</span>
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => navigate('/master/coa')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none font-sans shrink-0">
        <span>Total Classifications: {classifications.length}</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}
