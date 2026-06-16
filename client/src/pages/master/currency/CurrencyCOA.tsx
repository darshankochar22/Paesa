import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { CurrencyType } from "@/types/entities/Currency";

export default function CurrencyCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [currencies, setCurrencies] = useState<CurrencyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChangeView, setShowChangeView] = useState(false);
  const [activeDetails, setActiveDetails] = useState<number | null>(null);

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
        const res = await window.api.currency.getAll(companyId);
        if (cancelled) return;
        if (res.success) {
          setCurrencies(res.currencies ?? []);
        } else {
          setError(res.error || "Failed to load currencies.");
        }
      } catch {
        if (!cancelled) setError("Failed to load currency list.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const filteredCurrencies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return currencies;
    return currencies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.iso_code && c.iso_code.toLowerCase().includes(q))
    );
  }, [currencies, searchQuery]);

  const toggleDetails = (id: number) => {
    setActiveDetails((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      if (e.ctrlKey && e.key === "h") {
        e.preventDefault();
        setShowChangeView((p) => !p);
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/create/currency");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const changeViewItems = [
    { label: "Ledgers", path: "/master/coa/ledger" },
    { label: "Groups", path: "/master/coa/group" },
    { label: "Currencies", path: "/master/coa/currency" },
    { label: "Voucher Types", path: "/master/coa/voucher-type" },
    { label: "GST Registrations", path: "/master/coa/gst-registration" },
    { label: "GST Classifications", path: "/master/coa/gst-classification" },
    { label: "Stock Groups & Items", path: "/master/coa/stock-group" },
    { label: "Stock Categories", path: "/master/coa/stock-category" },
    { label: "Godowns", path: "/master/coa/godown" },
    { label: "Units of Measure", path: "/master/coa/unit" },
    { label: "Employees", path: "/master/coa/employee" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800 animate-fade-in">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">
            &larr; Back
          </Link>
          <span className="text-sm font-semibold text-zinc-700">Currencies</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/master/create/currency")}
            className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white font-medium font-sans"
          >
            + Create
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium font-sans">Search:</span>
            <input
              className="flex-1 text-xs outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ISO..."
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 font-sans"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">Loading currencies...</div>
            ) : filteredCurrencies.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">No matching currencies found.</div>
            ) : (
              filteredCurrencies.map((node) => {
                const nodeId = node.currency_id!;
                const isSelected = activeDetails === nodeId;

                return (
                  <div key={nodeId}>
                    <div
                      className={`group flex items-center px-4 py-2.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer ${
                        isSelected ? "bg-zinc-50" : ""
                      }`}
                      onClick={() => toggleDetails(nodeId)}
                    >
                      <span className="w-16 text-sm font-bold text-zinc-600">
                        {node.symbol || "—"}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-zinc-800 uppercase tracking-wide">
                        {node.name}
                        {!!node.is_predefined && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 ml-2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200 font-sans">
                            PREDEFINED
                          </span>
                        )}
                        {!!node.is_default && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 ml-2 bg-emerald-50 text-emerald-600 rounded tracking-wider border border-emerald-200 font-sans">
                            DEFAULT BASE
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400 font-bold uppercase">
                          {node.iso_code}
                        </span>
                        <button
                          className="text-[10px] text-zinc-500 hover:text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white font-medium font-sans"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/master/alter/currency");
                          }}
                        >
                          Alter
                        </button>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="px-6 py-3 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-2 gap-x-6 gap-y-1.5">
                        <div>
                          <span className="text-zinc-400">Formal Name:</span>{" "}
                          <span className="font-semibold text-zinc-800">{node.formal_name || "—"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Decimal Symbol:</span>{" "}
                          <span className="font-semibold text-zinc-800">{node.decimal_symbol || "."}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Decimal Places:</span>{" "}
                          <span className="font-semibold text-zinc-800">{node.decimal_places}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Word After Decimal:</span>{" "}
                          <span className="font-semibold text-zinc-800">{node.decimal_places_in_words || "—"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Suffix to Amount:</span>{" "}
                          <span className="font-semibold text-zinc-800">{!!node.suffix_symbol_to_amount ? "Yes" : "No"}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Show in Millions:</span>{" "}
                          <span className="font-semibold text-zinc-800">{!!node.show_amount_in_millions ? "Yes" : "No"}</span>
                        </div>
                      </div>
                    )}
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
            onClick={() => navigate("/master/create/currency")}
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

      {showChangeView && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs"
          onClick={() => setShowChangeView(false)}
        >
          <div
            className="bg-white border border-zinc-200 rounded shadow-xl w-80 max-h-96 overflow-y-auto animate-scale-up"
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
        <span>{currencies.length} currencies</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}
