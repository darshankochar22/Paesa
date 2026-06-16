import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { VoucherTypeType } from "@/types/entities/VoucherType";

interface VoucherTypeWithConfig extends VoucherTypeType {
  config?: {
    use_effective_dates?: number;
    allow_zero_value_transactions?: number;
    make_voucher_optional?: number;
    allow_narration?: number;
    allow_narration_per_ledger?: number;
    print_after_save?: number;
  };
}

export default function VoucherTypeCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [vts, setVts] = useState<VoucherTypeWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChangeView, setShowChangeView] = useState(false);
  const [activeDetails, setActiveDetails] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await window.api.voucherType.getAll(companyId);
        if (cancelled) return;
        if (res.success) {
          const list = res.voucherTypes ?? [];
          const enriched = await Promise.all(
            list.map(async (vt) => {
              try {
                const configRes = await window.api.voucherType.getConfig(vt.vt_id!);
                return { ...vt, config: configRes.success ? configRes.config : undefined };
              } catch { return vt; }
            })
          );
          if (!cancelled) setVts(enriched);
        } else {
          if (!cancelled) setError(res.error || "Failed to load voucher types.");
        }
      } catch {
        if (!cancelled) setError("Failed to load voucher types.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const filteredVTs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return vts;
    return vts.filter(
      (vt) =>
        vt.name.toLowerCase().includes(q) ||
        (vt.short_name && vt.short_name.toLowerCase().includes(q)) ||
        (vt.category && vt.category.toLowerCase().includes(q))
    );
  }, [vts, searchQuery]);

  const toggleDetails = (id: number) =>
    setActiveDetails((prev) => (prev === id ? null : id));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowChangeView((p) => !p); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/voucher-type"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const changeViewItems = [
    { label: "Ledgers",               path: "/master/coa/ledger"            },
    { label: "Groups",                path: "/master/coa/group"             },
    { label: "Currencies",            path: "/master/coa/currency"          },
    { label: "Voucher Types",         path: "/master/coa/voucher-type"      },
    { label: "GST Registrations",     path: "/master/coa/gst-registration"  },
    { label: "GST Classifications",   path: "/master/coa/gst-classification"},
    { label: "Stock Groups & Items",  path: "/master/coa/stock-group"       },
    { label: "Stock Categories",      path: "/master/coa/stock-category"    },
    { label: "Godowns",               path: "/master/coa/godown"            },
    { label: "Units of Measure",      path: "/master/coa/unit"              },
    { label: "Employees",             path: "/master/coa/employee"          },
  ];

  const yn = (v?: any) => (!!v ? "Yes" : "No");

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800 font-sans">

      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-zinc-700">Voucher Types</span>
        </div>
        <button
          onClick={() => navigate("/master/create/voucher-type")}
          className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white font-medium shadow-sm"
        >
          + Create
        </button>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">

          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Search:</span>
            <input
              className="flex-1 text-xs outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, short name, or category..."
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[10px] text-zinc-400 hover:text-zinc-600">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">Loading voucher types...</div>
            ) : filteredVTs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">No matching voucher types found.</div>
            ) : (
              filteredVTs.map((node) => {
                const nodeId = node.vt_id!;
                const isSelected = activeDetails === nodeId;

                return (
                  <div key={nodeId}>
                    <div
                      className={`group flex items-center px-4 py-2.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer ${isSelected ? "bg-zinc-50" : ""}`}
                      onClick={() => toggleDetails(nodeId)}
                    >
                      <span className="w-16 text-sm font-bold text-zinc-600">
                        {node.short_name || "—"}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-zinc-800 uppercase tracking-wide">
                        {node.name}
                        {!!node.is_predefined && (
                          <span className="text-[9px] font-bold px-1.5 ml-2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
                            PREDEFINED
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 font-bold uppercase">{node.category}</span>
                        <button
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white font-medium shadow-sm"
                          onClick={(e) => { e.stopPropagation(); navigate("/master/alter/voucher-type"); }}
                        >
                          Alter
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="px-6 py-3 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-2 gap-x-6 gap-y-1.5">

                        <div>
                          <span className="text-zinc-400">Numbering Method:</span>{" "}
                          <span className="font-semibold text-zinc-800">{node.numbering_method || "Automatic"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Active:</span>{" "}
                          <span className="font-semibold text-zinc-800">{!!node.is_active ? "Yes" : "No"}</span>
                        </div>

                        {/* Config fields */}
                        {node.config && (
                          <>
                            <div className="col-span-2 border-t border-dashed border-zinc-200 my-1 pt-1 text-[10px] font-bold text-zinc-400 uppercase">
                              Configuration
                            </div>
                            <div>
                              <span className="text-zinc-400">Use Effective Dates:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.use_effective_dates)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Allow Zero Value:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.allow_zero_value_transactions)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Make Optional:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.make_voucher_optional)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Allow Narration:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.allow_narration)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Narration per Ledger:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.allow_narration_per_ledger)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-400">Print after Save:</span>{" "}
                              <span className="font-semibold text-zinc-800">{yn(node.config.print_after_save)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px] select-none shrink-0">
          <button
            onClick={() => setShowChangeView(true)}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Ctrl+H Change View
          </button>
          <button
            onClick={() => navigate("/master/create/voucher-type")}
            className="px-3 py-2.5 text-left hover:bg-zinc-100 border-b border-zinc-100 font-bold uppercase text-zinc-600 tracking-wider transition-colors"
          >
            Alt+C Create
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

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>{vts.length} voucher types</span>
        <span>Startup ERP</span>
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
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Change View
            </div>
            {changeViewItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 border-b border-zinc-50 text-zinc-700 font-medium"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => setShowChangeView(false)}
              className="block w-full text-center px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-50 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}