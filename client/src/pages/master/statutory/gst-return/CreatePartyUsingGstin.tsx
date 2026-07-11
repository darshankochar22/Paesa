import { useState, useEffect, useRef } from 'react';
import { useEscape } from '@/hooks/useEscape';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';

interface CreateResult {
  gstin: string;
  success: boolean;
  ledger_id?: number | null;
  state?: string;
  error?: string;
}

// Mirrors the server's GSTIN_RE (server/gst/reconciliationService.js) so the client
// blocks an invalid GSTIN/UIN at entry, exactly like Tally's "Specify GSTINs/UINs" list.
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;

export default function CreatePartyUsingGstin() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [gstins, setGstins] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Tally creates parties under Sundry Debtors by default (no group prompt on this screen).
  const groupName = 'Sundry Debtors';

  // Focus the first line on mount so the flow is keyboard-first, like Tally.
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Keep exactly one trailing empty row, like Tally's "Specify GSTINs/UINs" list.
  const setRow = (i: number, value: string) => {
    setGstins((prev) => {
      const next = [...prev];
      next[i] = value.toUpperCase();
      const nonEmpty = next.filter((g) => g.trim());
      return [...nonEmpty, ''];
    });
  };

  // Enter through valid rows → next line; invalid → block with an error; Enter on the
  // empty trailing row (or Ctrl+A) → arm Accept. This is the two-step Enter → Accept flow.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      tryAccept();
      return;
    }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = gstins[i].trim().toUpperCase();
    if (!val) {
      tryAccept(); // empty (trailing) line → Accept
      return;
    }
    if (!GSTIN_RE.test(val)) {
      setError('GSTIN/UIN is invalid.');
      return; // stay on this line until it's a valid GSTIN
    }
    setError(null);
    inputRefs.current[i + 1]?.focus();
  };

  const tryAccept = () => {
    const list = gstins.map((g) => g.trim().toUpperCase()).filter(Boolean);
    if (list.length === 0) {
      setError('Enter at least one GSTIN/UIN.');
      return;
    }
    if (list.some((g) => !GSTIN_RE.test(g))) {
      setError('GSTIN/UIN is invalid.');
      return;
    }
    setError(null);
    setConfirmAccept(true);
  };

  // Accept confirmation — Enter / Y = Yes, Esc / N = No. Capture phase + stopPropagation
  // so Esc dismisses the prompt without also triggering the layout's quit-on-Escape.
  useEscape(() => setConfirmAccept(false), confirmAccept);

  useEffect(() => {
    if (!confirmAccept) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        e.stopPropagation();
        setConfirmAccept(false);
        create();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        e.stopPropagation();
        setConfirmAccept(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirmAccept]);

  const create = async () => {
    if (!companyId) return;
    const list = gstins.map((g) => g.trim()).filter(Boolean);
    if (list.length === 0) {
      setError('Enter at least one GSTIN/UIN.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      setNotice(null);
      const res = await window.api.gst.createPartiesFromGstin({
        company_id: companyId,
        group_name: groupName,
        gstins: list,
      });
      if (res.success) {
        const rs = (res.results || []) as CreateResult[];
        const okCount = rs.filter((r) => r.success).length;
        const failed = rs.filter((r) => !r.success);
        // Reset the form clean (like Tally) and report the outcome as a transient popup —
        // failures via the Error box, a clean success via an auto-dismissing notice.
        setGstins(['']);
        inputRefs.current[0]?.focus();
        if (failed.length > 0) {
          setError(failed.map((r) => `${r.gstin} — ${r.error || 'not created'}`).join('\n'));
        } else {
          setNotice(
            `${okCount} party ledger${okCount === 1 ? '' : 's'} created under Sundry Debtors.`,
          );
        }
      } else {
        setError(res.error || 'Failed to create parties.');
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Auto-clear the success notice so the page returns to a clean, empty form (Tally-like).
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <TallyReportLayout
      title="Create Party Using GSTIN/UIN"
      companyName={selectedCompany?.name || 'Company'}
    >
      <div className="w-full flex flex-col items-center font-sans text-xs pt-6 pb-4">
        <div className="w-[420px] border border-black bg-white">
          <div className="text-center font-bold px-2 py-1 border-b border-gray-300">
            Specify GSTINs/UINs
          </div>
          <div className="flex flex-col p-2 gap-0.5 max-h-[60vh] overflow-y-auto">
            {gstins.map((g, i) => {
              const invalid = g.trim().length > 0 && !GSTIN_RE.test(g.trim().toUpperCase());
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-right text-gray-500">{i + 1}.</span>
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    value={g}
                    disabled={saving}
                    onChange={(e) => setRow(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    maxLength={15}
                    placeholder="15-digit GSTIN/UIN"
                    aria-invalid={invalid}
                    className={`flex-1 border px-1 py-0.5 text-xs tabular-nums text-black focus:outline-none focus:border-black ${
                      invalid ? 'border-black border-l-2 font-bold' : 'border-gray-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-gray-300 px-2 py-1.5">
            <span className="text-[10px] text-gray-500">
              Enter: Next line&nbsp;&nbsp;·&nbsp;&nbsp;Ctrl+A: Accept
            </span>
            <button
              onClick={tryAccept}
              disabled={saving}
              className="bg-black px-4 py-1 text-xs font-bold text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-300"
            >
              {saving ? 'Creating…' : 'Accept'}
            </button>
          </div>
        </div>
      </div>

      {error && !confirmAccept && (
        <div
          onClick={() => setError(null)}
          className="fixed bottom-6 right-6 z-50 w-56 cursor-pointer border-2 border-black bg-white text-xs"
        >
          <div className="border-b border-gray-300 px-3 py-1.5 text-center font-bold">Error</div>
          <div className="whitespace-pre-line px-3 py-4 text-center font-bold">{error}</div>
        </div>
      )}

      {notice && !error && !confirmAccept && (
        <div
          onClick={() => setNotice(null)}
          className="fixed bottom-6 right-6 z-50 w-56 cursor-pointer border-2 border-black bg-white text-xs"
        >
          <div className="px-3 py-4 text-center font-bold">{notice}</div>
        </div>
      )}

      {confirmAccept && (
        <div className="fixed bottom-6 right-6 z-50 w-56 border border-black bg-white text-xs">
          <div className="border-b border-gray-300 px-3 py-1.5 text-center font-bold">Accept?</div>
          <div className="flex">
            <button
              onClick={() => {
                setConfirmAccept(false);
                create();
              }}
              disabled={saving}
              className="flex-1 bg-black px-3 py-1.5 font-bold text-white hover:bg-gray-800"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmAccept(false)}
              className="flex-1 border-l border-black bg-white px-3 py-1.5 font-bold text-black hover:bg-gray-100"
            >
              No
            </button>
          </div>
        </div>
      )}
    </TallyReportLayout>
  );
}
