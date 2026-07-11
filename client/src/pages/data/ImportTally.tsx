import { useEffect, useRef, useState } from 'react';
import { PageTitleBar, Button, Input } from '@/components/ui';
import type {
  TallyPreview,
  TallyFolderImportSummary,
  TallyFolderImportProgress,
} from '@/types/api/Tally';

// Import from TallyPrime — pick a native Tally data folder (.1800 files) and
// import everything into a brand-new company. Strict black/white/gray theme.

type Phase = 'idle' | 'selected' | 'importing' | 'done' | 'error';

const todayFyStart = () => {
  // Default to the current Indian FY start (1 Apr).
  const now = new Date();
  const y = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `${y}-04-01`;
};

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline gap-3 py-0.5">
    <span className="w-40 shrink-0 text-sm text-gray-500">{label}</span>
    <span className="text-sm text-black">{value}</span>
  </div>
);

export default function ImportTally() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [folder, setFolder] = useState('');
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [fyStart, setFyStart] = useState(todayFyStart());
  const [preview, setPreview] = useState<TallyPreview | null>(null);
  const [progress, setProgress] = useState<TallyFolderImportProgress | null>(null);
  const [summary, setSummary] = useState<TallyFolderImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsub = useRef<null | (() => void)>(null);

  useEffect(() => () => unsub.current?.(), []);

  const reset = () => {
    setPhase('idle');
    setFolder('');
    setDataDir(null);
    setPreview(null);
    setProgress(null);
    setSummary(null);
    setError(null);
  };

  const pick = async () => {
    setError(null);
    const res = await window.api.tally.pickFolder();
    if (!res.success) return setError(res.error || 'Could not open folder picker.');
    if (res.canceled) return;
    if (!res.valid || !res.dataDir) {
      setFolder(res.folder || '');
      setDataDir(null);
      return setError(
        res.error || 'That folder has no TallyPrime data (Manager.1800 / TranMgr.1800).',
      );
    }
    setFolder(res.folder || res.dataDir);
    setDataDir(res.dataDir);
    setPhase('selected');
    setPreview(null);
    // preview counts
    const pv = await window.api.tally.previewFolder({ folder: res.dataDir });
    if (pv.success && pv.preview) setPreview(pv.preview);
    else if (!pv.success) setError(pv.error || 'Could not read the folder.');
  };

  const runImport = async () => {
    if (!dataDir || !companyName.trim()) return;
    setError(null);
    setPhase('importing');
    setProgress({ phase: 'extract' });
    unsub.current = window.api.tally.onImportProgress((info) => setProgress(info));
    const res = await window.api.tally.importFolder({
      folder: dataDir,
      company_name: companyName.trim(),
      fy_start: fyStart,
      preserve_numbers: true,
    });
    unsub.current?.();
    unsub.current = null;
    if (res.success && res.summary) {
      setSummary(res.summary);
      setPhase('done');
    } else {
      setError(res.error || 'Import failed.');
      setPhase('error');
    }
  };

  const progressLabel = () => {
    if (!progress) return 'Starting…';
    switch (progress.phase) {
      case 'extract':
        return 'Decoding TallyPrime data…';
      case 'extracted':
        return 'Decoded. Creating company…';
      case 'company':
        return 'Creating company…';
      case 'masters':
        return 'Importing groups, ledgers & stock items…';
      case 'vouchers':
        return `Importing vouchers… ${progress.done ?? 0} / ${progress.total ?? 0}`;
      default:
        return 'Working…';
    }
  };
  const pct =
    progress?.phase === 'vouchers' && progress.total
      ? Math.round((100 * (progress.done ?? 0)) / progress.total)
      : progress?.phase === 'masters'
        ? 8
        : progress?.phase === 'extract'
          ? 2
          : 0;

  return (
    <div className="flex flex-col h-full bg-white">
      <PageTitleBar title="Import from TallyPrime" subtitle="Native data folder (.1800)" />

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-3xl">
        {/* Step 1 — folder */}
        <div className="mb-8">
          <div className="text-xs font-semibold tracking-wide text-gray-500 mb-2">
            1 · SELECT DATA FOLDER
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={pick}>
              Choose folder…
            </Button>
            <span className="text-sm text-gray-600 truncate">{folder || 'No folder selected'}</span>
          </div>
          {dataDir && <div className="mt-1 text-xs text-gray-400">Found data at: {dataDir}</div>}
        </div>

        {/* Preview */}
        {preview && phase !== 'done' && (
          <div className="mb-8 border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold tracking-wide text-gray-500 mb-2">
              DETECTED IN THIS FOLDER
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
              <Row label="Groups" value={preview.groups} />
              <Row label="Ledgers" value={preview.ledgers} />
              <Row label="Stock items" value={preview.stockItems} />
              <Row label="Units" value={preview.units} />
              <Row label="Vouchers" value={preview.vouchers} />
              <Row
                label="Balanced"
                value={`${preview.balancedVouchers} / ${
                  preview.balancedVouchers + preview.unbalancedVouchers
                }`}
              />
            </div>
          </div>
        )}

        {/* Step 2 — company details */}
        {dataDir && phase !== 'done' && (
          <div className="mb-8 border-t border-gray-200 pt-4">
            <div className="text-xs font-semibold tracking-wide text-gray-500 mb-3">
              2 · NEW COMPANY
            </div>
            <div className="space-y-3 max-w-md">
              <label className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-black">Company name</span>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. URMILA POLYBAGS"
                  disabled={phase === 'importing'}
                />
              </label>
              <label className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-black">Books beginning</span>
                <Input
                  type="date"
                  value={fyStart}
                  onChange={(e) => setFyStart(e.target.value)}
                  disabled={phase === 'importing'}
                />
              </label>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 border-l-2 border-black bg-gray-50 px-3 py-2 text-sm text-black">
            {error}
          </div>
        )}

        {/* Import action / progress */}
        {dataDir && phase !== 'done' && (
          <div className="border-t border-gray-200 pt-4">
            {phase === 'importing' ? (
              <div>
                <div className="text-sm text-black mb-2">{progressLabel()}</div>
                <div className="h-1.5 w-full bg-gray-100">
                  <div className="h-full bg-black transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  This runs once and can take up to a minute for large companies. Please don't close
                  the app.
                </div>
              </div>
            ) : (
              <Button onClick={runImport} disabled={!companyName.trim()}>
                Import as new company
              </Button>
            )}
          </div>
        )}

        {/* Done */}
        {phase === 'done' && summary && (
          <div className="border border-black">
            <div className="bg-black px-4 py-2 text-sm font-semibold text-white">
              Import complete
            </div>
            <div className="px-4 py-4">
              <Row label="Company" value={summary.company.name} />
              <Row
                label="Financial years"
                value={summary.financialYears.map((f) => f.start.slice(0, 7)).join(', ')}
              />
              <div className="my-3 border-t border-gray-200" />
              <Row label="Groups" value={summary.masters.groups?.created ?? 0} />
              <Row label="Ledgers" value={summary.masters.ledgers?.created ?? 0} />
              <Row label="Stock items" value={summary.masters.stockItems?.created ?? 0} />
              <Row label="Units" value={summary.masters.units?.created ?? 0} />
              <Row
                label="Vouchers"
                value={
                  <>
                    <span className="font-semibold">{summary.vouchers.created}</span> imported
                    {summary.vouchers.failed > 0 && (
                      <span className="text-gray-500">
                        {' '}
                        · {summary.vouchers.failed} skipped (statutory / unbalanced)
                      </span>
                    )}
                  </>
                }
              />
              <div className="mt-4 border-t border-gray-200 pt-3 text-sm text-black">
                Restart the app, then switch to <strong>{summary.company.name}</strong> to see it.
              </div>
              <div className="mt-4">
                <Button variant="secondary" onClick={reset}>
                  Import another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
