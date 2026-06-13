import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";

const inputCls =
  "bg-transparent outline-none text-[11px] font-mono font-bold text-zinc-950 w-full px-1 py-0.5 border border-transparent focus:border-zinc-300 rounded";

export default function PriceLevelsAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [levels, setLevels] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load existing price levels on mount
  useEffect(() => {
    if (!companyId) return;
    const load = async () => {
      setLoading(true);
      try {
        if (window.api?.priceLevels) {
          const result = await window.api.priceLevels.get(companyId);
          if (result?.success && result?.data && result.data.length > 0) {
            // Strip trailing empty slots, then add one blank at the end
            const saved = (result.data as string[]).filter((n, i, arr) => {
              const anyAfter = arr.slice(i + 1).some((v) => v.trim() !== "");
              return n.trim() !== "" || anyAfter;
            });
            setLevels([...saved, ""]);
          }
        }
      } catch (err) {
        setError("Failed to load price levels.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [companyId]);

  const setLevel = (index: number, value: string) => {
    setLevels((prev) => {
      const next = [...prev];
      next[index] = value;
      // Auto-append a new empty slot when typing in the last row
      if (index === next.length - 1 && value.trim() !== "") {
        next.push("");
      }
      return next;
    });
  };

  const removeLevel = (index: number) => {
    setLevels((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0 || next[next.length - 1].trim() !== "") {
        next.push("");
      }
      return next;
    });
    setTimeout(() => {
      inputRefs.current[Math.max(0, index - 1)]?.focus();
    }, 0);
  };

  const handleSubmit = useCallback(async () => {
    if (!companyId) { setError("No company selected."); return; }

    const trimmed = levels.map((l) => l.trim());
    const filled = trimmed.filter(Boolean);
    if (filled.length === 0) { setError("Enter at least one price level name."); return; }

    setSaving(true);
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
        navigate("/master/coa/price-levels");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update price levels.");
    } finally {
      setSaving(false);
    }
  }, [levels, companyId, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa/price-levels"); }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[index + 1];
      if (next) {
        next.focus();
      } else {
        handleSubmit();
      }
    }
    if (e.key === "Backspace" && levels[index] === "" && levels.length > 1) {
      e.preventDefault();
      removeLevel(index);
    }
  };

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Esc",   label: "Quit",   onClick: () => navigate("/master/coa/price-levels") },
  ];

  const filledCount = levels.filter((l) => l.trim() !== "").length;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950">
      <PageTitleBar title="Alter Price Levels" subtitle={selectedCompany?.name} />

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
            <div className="font-bold text-xs py-3 border-b border-zinc-200 tracking-wide text-zinc-900 uppercase font-mono flex items-center justify-between px-4">
              <span>Price Levels</span>
              <span className="text-zinc-400 font-normal normal-case tracking-normal">
                {filledCount} {filledCount === 1 ? "level" : "levels"}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32 text-xs text-zinc-400">
                Loading...
              </div>
            ) : (
              <>
                {/* Dynamic list */}
                <div className="p-3 space-y-0.5 font-mono">
                  {levels.map((level, i) => {
                    const isLastEmpty = i === levels.length - 1 && level.trim() === "";
                    return (
                      <div key={i} className="flex items-center gap-2 min-h-[24px] group">
                        <span className="text-[11px] text-zinc-400 w-6 text-right shrink-0 select-none">
                          {isLastEmpty ? "+" : `${i + 1}.`}
                        </span>
                        <input
                          ref={(el) => { inputRefs.current[i] = el; }}
                          autoFocus={i === 0}
                          className={inputCls}
                          value={level}
                          onChange={(e) => setLevel(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, i)}
                          placeholder={isLastEmpty ? "Add price level..." : ""}
                        />
                        {!isLastEmpty && (
                          <button
                            onClick={() => removeLevel(i)}
                            className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs shrink-0 px-1"
                            tabIndex={-1}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Hint */}
                <div className="px-4 pb-3 text-[10px] text-zinc-400 font-sans">
                  Press <kbd className="bg-zinc-100 border border-zinc-200 rounded px-1">Enter</kbd> to add next ·{" "}
                  <kbd className="bg-zinc-100 border border-zinc-200 rounded px-1">Backspace</kbd> on empty row to remove
                </div>
              </>
            )}
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 shrink-0 font-sans">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/coa/price-levels")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {saving ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}