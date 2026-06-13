import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { CompanyTCSDetails } from "@/types/entities/CompanyTCSDetails";

export default function TCSDetailsCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [tcsDetails, setTcsDetails] = useState<CompanyTCSDetails | null>(null);
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
        if (window.api && window.api.companyTcsDetails) {
          const result = await window.api.companyTcsDetails.get(companyId!);
          if (result && result.success && result.exists && result.data) {
            setTcsDetails(result.data);
            dataLoaded = true;
          }
        }

        if (!dataLoaded) {
          const localDataRaw = localStorage.getItem(`company_tcs_details_${companyId}`);
          if (localDataRaw) {
            setTcsDetails(JSON.parse(localDataRaw) as CompanyTCSDetails);
          } else {
            setTcsDetails(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch TCS details for COA:", err);
        setError("Failed to load statutory details.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        navigate("/master/alter/tcs-details");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      {/* Title Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-zinc-700">Company TCS Collector Details</span>
        </div>
        <button
          onClick={() => navigate("/master/alter/tcs-details")}
          className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2.5 py-0.5 bg-white font-medium font-sans"
        >
          Alter Details
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs font-bold font-sans">
          • {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-xs text-zinc-400 italic">
              Loading statutory details...
            </div>
          ) : !tcsDetails ? (
            <div className="text-center py-12 text-zinc-500 text-xs space-y-3">
              <p className="italic">No TCS details have been configured for this company yet.</p>
              <button
                onClick={() => navigate("/master/create/tcs-details")}
                className="text-xs px-4 py-1.5 bg-black text-white hover:bg-zinc-800 font-medium rounded transition-colors"
              >
                Configure TCS details
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8 max-w-4xl text-[11px] font-mono">
              {/* Column 1: TAN & Collector Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-1 mb-2">
                    Registration & Collector Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">TAN Registration Number:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.tanRegNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Account Number (TAN):</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.tan || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Collector Type:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.collectorType || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Branch / Division:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.collectorBranch || "—"}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-1 mb-2">
                    Rate & Exemption details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ignore IT Exemption Limit:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.ignoreItExemption ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Person Responsible Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200 pb-1 mb-2">
                  Details of Person Responsible
                </h3>
                {tcsDetails.setAlterPersonResponsible ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Name:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.personResponsibleName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Designation:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.personResponsibleDesignation || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">PAN:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.personResponsiblePan || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Mobile / Phone:</span>
                      <span className="font-bold text-zinc-900">{tcsDetails.personResponsiblePhone || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Email:</span>
                      <span className="font-bold text-zinc-900 text-right break-all">{tcsDetails.personResponsibleEmail || "—"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">Not Altered / Configured</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Action Menu */}
        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px] select-none shrink-0 font-sans">
          <button
            onClick={() => navigate("/master/alter/tcs-details")}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Alt+A Alter
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate("/master/coa")}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-t border-zinc-200 font-bold uppercase text-zinc-500 tracking-wider transition-colors"
          >
            Esc Quit
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 shrink-0">
        <span>Statutory Configuration</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}