import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useCompany } from '../../context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type { FYType } from '../../types/api';

const FY_YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);

export default function FinancialYears() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY, availableFYs, switchFY } = useCompany();
  const [showCreate, setShowCreate] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Keyboard navigation selection index
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const companyId = selectedCompany?.company_id;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const sortedFYs = useMemo(() => {
    return [...availableFYs].sort((a, b) => a.start_date.localeCompare(b.start_date));
  }, [availableFYs]);

  // Handle Create Financial Year
  const handleCreate = async () => {
    if (!newStartDate || !companyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.fy.create({
        company_id: companyId,
        start_date: newStartDate,
      });
      if (!result.success) {
        setError(result.error || 'Failed to create financial year');
      } else {
        setNewStartDate('');
        setShowCreate(false);
        window.dispatchEvent(new Event('fy-reload'));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Financial Year
  const handleDelete = async (fy: FYType) => {
    if (!fy.fy_id) return;
    if (!!fy.is_active) {
      setError('Cannot delete the active financial year');
      return;
    }
    if (!!fy.is_closed) {
      setError('Cannot delete a closed financial year');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.fy.delete(fy.fy_id);
      if (!result.success) {
        setError(result.error || 'Failed to delete financial year');
      } else {
        window.dispatchEvent(new Event('fy-reload'));
        if (activeFY?.fy_id === fy.fy_id) {
          const remaining = availableFYs.filter((f) => f.fy_id !== fy.fy_id);
          if (remaining.length > 0) {
            switchFY(remaining[0]);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Switch / Set Active
  const handleSetActive = async (fy: FYType) => {
    if (!fy.fy_id || fy.fy_id === activeFY?.fy_id) return;
    if (!!fy.is_closed) {
      setError('Cannot activate a closed financial year');
      return;
    }
    setLoading(true);
    try {
      await switchFY(fy);
      setError(null);
    } catch (e) {
      setError('Failed to switch active financial year');
    } finally {
      setLoading(false);
    }
  };

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Esc: Go back to Gateway
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/');
      }

      // 2. Alt+C: Toggle Create Form
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setShowCreate((prev) => !prev);
        setError(null);
      }

      // 3. Ctrl+A: Accept/Create new year if form is open
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (showCreate && newStartDate) {
          e.preventDefault();
          handleCreate();
        }
      }

      // 4. Arrow Down
      if (e.key === 'ArrowDown' && !showCreate) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < sortedFYs.length - 1 ? prev + 1 : prev));
      }

      // 5. Arrow Up
      if (e.key === 'ArrowUp' && !showCreate) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      }

      // 6. Enter to Activate selected year
      if (e.key === 'Enter' && !showCreate && sortedFYs.length > 0) {
        const selected = sortedFYs[selectedIndex];
        if (selected && selected.fy_id !== activeFY?.fy_id) {
          e.preventDefault();
          handleSetActive(selected);
        }
      }

      // 7. Ctrl+D to Delete selected year
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        if (!showCreate && sortedFYs.length > 0) {
          const selected = sortedFYs[selectedIndex];
          if (selected) {
            e.preventDefault();
            handleDelete(selected);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showCreate, newStartDate, sortedFYs, selectedIndex, activeFY, companyId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm font-medium"
          >
            ← Back
          </button>
          <span className="font-bold text-sm text-zinc-800">Financial Years Management</span>
          <span className="bg-zinc-100 border border-zinc-200 text-zinc-600 text-[10px] font-semibold px-2 py-0.5 rounded">
            {sortedFYs.length} Total Years
          </span>
        </div>

        {/* Header Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCreate((prev) => !prev);
              setError(null);
            }}
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm transition-colors"
          >
            {showCreate ? 'Cancel Creation' : '+ New Year'}
          </button>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Scrollable Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full overflow-y-auto p-6">
          {/* Creation Drawer */}
          {showCreate && (
            <div className="mb-6 p-5 border border-zinc-200 rounded-lg bg-zinc-50/50 shadow-inner flex flex-col gap-4 max-w-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Add New Financial Year
                </span>
                <span className="text-[10px] text-zinc-400">Press Ctrl+A to Save</span>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Select Start Date
                  </label>
                  <select
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="border border-zinc-300 rounded px-3 py-1.5 text-xs bg-white text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-sm w-full sm:w-64 font-medium"
                  >
                    <option value="">— Select Start Date —</option>
                    {FY_YEARS.map((y) => (
                      <option key={y} value={`${y}-04-01`}>
                        1 Apr {y} — 31 Mar {y + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2 mt-4 sm:mt-0 pt-3">
                  <button
                    onClick={handleCreate}
                    disabled={loading || !newStartDate}
                    className="text-xs font-semibold px-4 py-1.5 rounded text-white bg-black hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {loading ? 'Creating...' : 'Create Year'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCreate(false);
                      setNewStartDate('');
                    }}
                    className="text-xs font-semibold px-3 py-1.5 rounded border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Premium List of Financial Year Cards */}
          <div className="flex flex-col gap-2 max-w-3xl">
            {sortedFYs.length === 0 ? (
              <div className="text-center py-16 text-zinc-400 text-xs border border-zinc-200 border-dashed rounded-lg bg-zinc-50">
                No financial years found. Click "+ New Year" or press Alt+C to add one.
              </div>
            ) : (
              sortedFYs.map((fy, idx) => {
                const isActive = activeFY?.fy_id === fy.fy_id;
                const isClosed = !!fy.is_closed;
                const isHighlighted = idx === selectedIndex && !showCreate;

                return (
                  <div
                    key={fy.fy_id}
                    onClick={() => !showCreate && setSelectedIndex(idx)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg transition-all duration-150 cursor-pointer select-none group ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-sm'
                        : isHighlighted
                          ? 'border-zinc-500 bg-zinc-50 shadow-md ring-1 ring-zinc-500'
                          : 'border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50/50'
                    }`}
                  >
                    {/* Date Span and Index */}
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-[11px] font-bold text-zinc-400 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-zinc-900 tracking-wide">
                          {formatDate(fy.start_date)} — {formatDate(fy.end_date)}
                        </span>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                          FY {new Date(fy.start_date).getFullYear()}-
                          {String(new Date(fy.end_date).getFullYear()).slice(-2)}
                        </span>
                      </div>
                    </div>

                    {/* Status & Action Badges */}
                    <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                      {/* Status Tag */}
                      <div className="flex items-center">
                        {isActive && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-inner uppercase tracking-wider">
                            Active
                          </span>
                        )}
                        {isClosed && (
                          <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-inner uppercase tracking-wider">
                            Closed
                          </span>
                        )}
                        {!isActive && !isClosed && (
                          <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Dynamic Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {!isActive && !isClosed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetActive(fy);
                            }}
                            className="text-[10px] text-sky-700 bg-white hover:bg-sky-50 px-2 py-1 border border-sky-300 rounded shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity font-semibold uppercase tracking-wider"
                          >
                            Set Active
                          </button>
                        )}
                        {!isActive && !isClosed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(fy);
                            }}
                            className="text-[10px] text-red-700 bg-white hover:bg-red-50 px-2 py-1 border border-red-200 rounded shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity font-semibold uppercase tracking-wider"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right-Hand Tally Action Sidebar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => {
              setShowCreate((prev) => !prev);
              setError(null);
            }}
            className={`flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400 ${
              showCreate ? 'bg-zinc-200' : ''
            }`}
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>{showCreate ? 'Close Panel' : 'New Year'}</span>
          </button>

          {!showCreate && sortedFYs.length > 0 && (
            <button
              onClick={() => {
                const selected = sortedFYs[selectedIndex];
                if (selected) handleSetActive(selected);
              }}
              disabled={sortedFYs[selectedIndex]?.fy_id === activeFY?.fy_id}
              className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left shadow-sm hover:border-zinc-400"
            >
              <span className="font-bold text-zinc-900 text-[10px]">Enter</span>
              <span>Set Active</span>
            </button>
          )}

          {!showCreate && sortedFYs.length > 0 && (
            <button
              onClick={() => {
                const selected = sortedFYs[selectedIndex];
                if (selected) handleDelete(selected);
              }}
              disabled={
                !!sortedFYs[selectedIndex]?.is_active || !!sortedFYs[selectedIndex]?.is_closed
              }
              className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left shadow-sm hover:border-zinc-400"
            >
              <span className="font-bold text-zinc-900 text-[10px]">Ctrl+D</span>
              <span>Delete Year</span>
            </button>
          )}

          <div className="flex-1"></div>

          <div className="px-2 py-2 border-t border-zinc-200 text-[10px] text-zinc-400 flex flex-col gap-1 select-none">
            <span className="font-bold uppercase tracking-wider">Quick Guides:</span>
            <span>• Use ↑ / ↓ to navigate list.</span>
            <span>• Hit Enter to switch active.</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>Active Company: {selectedCompany?.name || 'None'}</span>
        <span>
          Active FY:{' '}
          {activeFY
            ? `${formatDate(activeFY.start_date)} — ${formatDate(activeFY.end_date)}`
            : 'None'}
        </span>
      </div>
    </div>
  );
}
