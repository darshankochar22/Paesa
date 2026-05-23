import { useState, useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CompanyType } from "../types/api";
import { useCompany } from "./CompanyContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function StartupSelect() {
  const { setSelectedCompany } = useCompany();
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [dataPath, setDataPath] = useState<string>("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [result, pathResult] = await Promise.all([
          window.api.company.getAll(),
          window.api.app.getDataPath(),
        ]);
        const list: CompanyType[] = Array.isArray(result?.companies)
          ? result.companies
          : Array.isArray(result)
          ? result
          : [];
        setCompanies(list);
        setDataPath(pathResult ? `${pathResult}/startup.db` : "");
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    searchRef.current?.focus();
  }, [loading]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setHighlightedIdx(0);
  }, [search]);

  useEffect(() => {
    const row = listRef.current?.querySelector(`[data-idx="${highlightedIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [highlightedIdx]);

  const handleSelect = (company: CompanyType) => {
    setSelectedCompany(company);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightedIdx]) {
        handleSelect(filtered[highlightedIdx]);
      }
    }
  };

  const getPeriod = (company: CompanyType) => {
    if (company.financial_year_beginning_from) {
      const start = new Date(company.financial_year_beginning_from);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      const fmt = (d: Date) => {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${d.getDate()}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
      };
      return `${fmt(start)} to ${fmt(end)}`;
    }
    return "";
  };

  return (
    <div className="flex-1 flex items-start justify-center bg-white px-16 py-8 overflow-auto">

      {/* Panel — fixed width */}
      <div className="w-[700px] bg-white border border-zinc-400 shadow-lg flex flex-col overflow-hidden">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-300 shrink-0">
          <span className="font-semibold text-zinc-900 text-base">Select Company</span>
          <button className="text-zinc-400 hover:text-zinc-900 text-xl leading-none font-bold">&times;</button>
        </div>

        {/* Search box */}
        <div className="px-4 py-2 border-b border-zinc-300 shrink-0">
          <input
            ref={searchRef}
            type="text"
            className="w-full text-base outline-none px-2 py-1 border border-zinc-400 focus:border-zinc-800 bg-white transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* "List of Companies" header + column labels + quick actions — all in one block */}
        <div className="shrink-0 border-b border-zinc-300">

          {/* Dark header */}
          <div className="px-4 py-1 bg-zinc-800 text-white text-sm font-semibold">
            List of Companies
          </div>

          {/* Two-column layout: col headers left, quick actions right */}
          <div className="flex items-start">

            {/* Column headers */}
            <div className="flex-1 grid grid-cols-[1fr_110px_180px] px-4 py-2">
              <span className="text-sm text-zinc-500">Data Path/Name</span>
              <span className="text-sm text-zinc-500">Number</span>
              <span className="text-sm text-zinc-500 text-right">Period</span>
            </div>

            {/* Quick actions — right aligned */}
            <div className="flex flex-col items-end px-4 py-2 text-sm gap-0.5 border-l border-zinc-200 w-52 shrink-0">
              <Link to="/company" className="text-zinc-900 hover:underline font-medium">
                Create Company
              </Link>
              <span className="text-zinc-400 cursor-not-allowed">Select Remote Company</span>
              <span className="text-zinc-400 cursor-not-allowed">Specify Path</span>
              <span className="text-zinc-400 cursor-not-allowed">Select from Drive</span>
            </div>

          </div>
        </div>

        {/* Data path row */}
        {dataPath && (
          <div className="px-4 py-1 border-b border-zinc-200 bg-zinc-50 shrink-0">
            <span className="text-xs text-zinc-500 font-mono truncate block">{dataPath}</span>
          </div>
        )}

        {/* Company rows */}
        <div ref={listRef} className="overflow-y-auto" style={{ minHeight: "280px", maxHeight: "460px" }}>
          {loading ? (
            <div className="text-sm text-zinc-400 px-4 py-3">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-zinc-400 px-4 py-3">
              {search ? `No companies matching "${search}"` : "No companies found."}
            </div>
          ) : (
            filtered.map((company, idx) => {
              const isHighlighted = idx === highlightedIdx;
              return (
                <div
                  key={company.company_id || company.name}
                  data-idx={idx}
                  onClick={() => handleSelect(company)}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`
                    grid grid-cols-[1fr_110px_180px] px-4 py-1.5 cursor-pointer
                    border-b border-zinc-100 text-[15px]
                    ${isHighlighted
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-800"
                    }
                  `}
                >
                  <span className="truncate">{company.name}</span>
                  <span className="tabular-nums">
                    ({String(company.company_id || "").padStart(6, "0")})
                  </span>
                  <span className="text-right text-sm">
                    {getPeriod(company)}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

export default function StartupGuard({ children }: { children: ReactNode }) {
  const { selectedCompany } = useCompany();
  const location = useLocation();

  if (!selectedCompany && location.pathname !== "/company") {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <StartupSelect />
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
}