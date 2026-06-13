import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";

const MAX_LEVELS = 10;

const inputCls =
  "bg-transparent outline-none text-[11px] font-mono font-bold text-zinc-950 w-full px-1 py-0.5 border border-transparent focus:border-zinc-300 rounded";

export default function PriceLevelsAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [levels, setLevels] = useState<string[]>(Array(MAX_LEVELS).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load existing price levels
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      try {
        if (window.api?.priceLevels) {
          const result = await window.api.priceLevels.get(companyId);
          if (result?.success && result?.data) {
            const loaded = Array(MAX_LEVELS).fill("");
            result.data.forEach((name: string, i: number) => {
              if (i < MAX_LEVELS) loaded[i] = name;
            });
            setLevels(loaded);
          }
        }
      } catch (err) {
        console.error("Failed to load price levels:", err);
      }
    };
    load();
  }, [companyId]);

  const setLevel = (index: number, value: string) => {
    setLevels((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!companyId) { setError("No company selected."); return; }

    const trimmed = levels.map((l) => l.trim());
    const filled = trimmed.filter(Boolean);
    if (filled.length === 0) { setError("Enter at least one price level name."); return; }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.api?.priceLevels) {
        const result = await window.api.priceLevels.save({
          company_id: companyId,
          levels: trimmed,
        });
        if (!result.success) throw new Error(result.error || "Save failed.");
      }
      setSuccess("Price levels updated successfully.");
      setTimeout(() => {
        setSuccess(null);
        navigate("/master/alter");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save price levels.");
    } finally {
      setLoading(false);
    }
  }, [levels, companyId, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/alter");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < MAX_LEVELS - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSubmit();
      }
    }
  };

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/alter") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="Company Price Levels" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-4 py-2 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-50">
          <div className="max-w-sm mx-auto bg-white border border-zinc-200 rounded shadow-sm overflow-hidden">
            {/* Header */}
            <div className="text-center font-bold text-xs py-3 border-b border-zinc-200 tracking-wide text-zinc-900 uppercase font-mono">
              Company Price Levels
            </div>

            {/* Numbered list of inputs */}
            <div className="p-3 space-y-0.5 font-mono">
              {levels.map((level, i) => (
                <div key={i} className="flex items-center gap-2 min-h-[24px]">
                  <span className="text-[11px] text-zinc-400 w-6 text-right shrink-0 select-none">
                    {i + 1}.
                  </span>
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    autoFocus={i === 0}
                    className={inputCls}
                    value={level}
                    onChange={(e) => setLevel(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/alter")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}