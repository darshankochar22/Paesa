import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';

interface PriceLevel {
  index: number;
  name: string;
}

export default function PriceLevelsCOA() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // Data States
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View States
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      try {
        if (window.api?.priceLevels) {
          const result = await window.api.priceLevels.get(companyId);
          if (result?.success && result?.data) {
            // Only show named (non-empty) slots
            const loaded: PriceLevel[] = (result.data as string[])
              .map((name: string, i: number) => ({ index: i, name }))
              .filter((pl) => pl.name.trim() !== '');
            setPriceLevels(loaded);
          }
        }
      } catch (err) {
        setError('Failed to load price levels.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.key === 'F5') {
        e.preventDefault();
        navigate('/master/coa/stock-category');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setShowChangeViewModal((p) => !p);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowExceptionModal((p) => !p);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/master/alter/price-levels');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const filteredLevels = priceLevels.filter((pl) => {
    const matchesSearch = searchQuery.trim()
      ? pl.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    // "Unused" here means empty-named slots; since we already filter those out on load,
    // toggling showUnusedOnly shows nothing — reserved for future use.
    return matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/master/coa')}
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            ← Back
          </button>
          <span className="font-bold text-sm text-zinc-800">Price Levels</span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Unused / Empty
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">
            {priceLevels.length} {priceLevels.length === 1 ? 'level' : 'levels'}
          </span>
          <button
            onClick={() => navigate('/master/alter/price-levels')}
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
          >
            Edit Levels
          </button>
        </div>
      </div>

      {/* Error Bar */}
      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left: Search + List */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Search */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">
              Search:
            </span>
            <input
              type="text"
              placeholder="Search price levels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-inner"
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

          <div className="flex-1 overflow-y-auto min-h-0 bg-white px-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                Loading price levels...
              </div>
            ) : filteredLevels.length === 0 ? (
              <div className="text-xs text-zinc-400 text-center py-8">
                {priceLevels.length === 0
                  ? 'No price levels configured. Use Edit Levels to add some.'
                  : 'No matching price levels found.'}
              </div>
            ) : (
              <div className="py-2">
                {filteredLevels.map((pl) => {
                  return (
                    <div key={pl.index} className="flex flex-col">
                      <div
                        className="flex items-center min-h-[30px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group px-2"
                        onClick={() => navigate('/master/alter/price-levels')}
                      >
                        {/* Index badge */}
                        <span className="w-7 text-[11px] font-mono text-zinc-400 shrink-0 text-right mr-3 select-none">
                          {pl.index + 1}.
                        </span>

                        <div className="flex-1 flex items-center justify-between pr-4">
                          <span className="font-semibold text-zinc-800 text-[13px] group-hover:text-sky-800 transition-colors">
                            {pl.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-zinc-400">Level {pl.index + 1}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => navigate('/master/coa/stock-category')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>Next: Stock Categories</span>
          </button>

          <button
            onClick={() => setShowChangeViewModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+H</span>
            <span>Change View</span>
          </button>

          <button
            onClick={() => setShowExceptionModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+J</span>
            <span>Exception Reports</span>
          </button>

          <button
            onClick={() => navigate('/master/alter/price-levels')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Edit Levels</span>
          </button>

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

      {showChangeViewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Change View</span>
              <button
                onClick={() => setShowChangeViewModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/stock-group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Groups & Items Tree
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/stock-category');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Categories Tree
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/unit');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Units of Measure List
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/godown');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Godowns / Locations Tree
              </button>
              <button
                disabled
                className="w-full text-left px-3 py-2 rounded bg-zinc-100 font-bold text-zinc-400 cursor-not-allowed"
              >
                Price Levels (Active)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100"
              >
                Groups Chart of Accounts
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/ledger');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Ledgers Chart of Accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Exception Reports</span>
              <button
                onClick={() => setShowExceptionModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(true);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${showUnusedOnly ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-black hover:text-white'}`}
              >
                Show Unused / Empty Levels Only
              </button>
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(false);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${!showUnusedOnly ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-black hover:text-white'}`}
              >
                Show All Price Levels
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>Active Tab: Price Levels</span>
        <span>Startup ERP Inventory Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
