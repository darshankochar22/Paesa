import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner, PageTitleBar } from '@/components/ui';
import type { CompanyPanCinDetails } from '@/types/entities/CompanyPanCinDetails';

export default function PANDetailsCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [panDetails, setPanDetails] = useState<CompanyPanCinDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        let dataLoaded = false;
        if (window.api && window.api.companyPanCinDetails) {
          const result = await window.api.companyPanCinDetails.get(companyId!);
          if (result && result.success && result.exists && result.data) {
            setPanDetails(result.data);
            dataLoaded = true;
          }
        }

        if (!dataLoaded) {
          const localDataRaw = localStorage.getItem(`company_pan_cin_details_${companyId}`);
          if (localDataRaw) {
            setPanDetails(JSON.parse(localDataRaw) as CompanyPanCinDetails);
          } else {
            setPanDetails(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch PAN/CIN details for COA:', err);
        setError('Failed to load statutory details.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        navigate('/master/alter/pan-cin-details');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="PAN/CIN Details" subtitle={selectedCompany?.name} />

      {error && <NotificationBanner type="error" message={error} />}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-xs text-zinc-400 italic">
              Loading statutory details...
            </div>
          ) : !panDetails ? (
            <div className="text-center py-12 text-zinc-500 text-xs space-y-3">
              <p className="italic">
                No PAN/CIN details have been configured for this company yet.
              </p>
              <button
                onClick={() => navigate('/master/create/pan-cin-details')}
                className="text-xs px-4 py-1.5 bg-black text-white hover:bg-black/80 font-medium rounded transition-colors"
              >
                Configure PAN/CIN details
              </button>
            </div>
          ) : (
            <div className="max-w-2xl text-sm border border-zinc-200 rounded p-6 bg-white space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-1 mb-2">
                PAN/CIN Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between max-w-md">
                  <span className="text-zinc-500">PAN/Income tax no.:</span>
                  <span className="font-bold text-zinc-900">{panDetails.pan || '—'}</span>
                </div>
                <div className="flex justify-between max-w-md">
                  <span className="text-zinc-500">Corporate Identity No. (CIN):</span>
                  <span className="font-bold text-zinc-900">{panDetails.cin || '—'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Action Menu */}
        <div className="w-44 border-l border-zinc-200 flex flex-col bg-white text-[10px] select-none shrink-0">
          <button
            onClick={() => navigate('/master/alter/pan-cin-details')}
            className="px-3 py-2.5 text-left hover:bg-black/[0.03] border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Alt+A Alter
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/master/coa')}
            className="px-3 py-2.5 text-left hover:bg-black/[0.03] border-t border-zinc-200 font-bold uppercase text-zinc-500 tracking-wider transition-colors"
          >
            Esc Quit
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-white text-[10px] text-zinc-400 shrink-0">
        <span>Statutory Configuration</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}
