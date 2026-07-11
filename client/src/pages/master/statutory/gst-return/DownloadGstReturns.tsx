import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { TallyReportLayout } from '@/components/tally-ui/TallyReportLayout';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import GstPortalLoginDialog from '@/components/tally-ui/GstPortalLoginDialog';
import type { Gstr2FetchResult } from '@/types/api/GstIntegrations';

// Tally's Exchange → Download GST Returns: one screen to pull the inward statements
// (GSTR-2A / GSTR-2B) for a registration across a period range, authenticate over an
// OTP session, download+reconcile each with a progress bar, then jump to the recon.
// (GSTR-1/3B are the taxpayer's own outward/summary returns — filed, not reconciled
// against the portal here — so this download screen covers the ITC statements.)

const MONTHS = [
  ['01', 'Jan'],
  ['02', 'Feb'],
  ['03', 'Mar'],
  ['04', 'Apr'],
  ['05', 'May'],
  ['06', 'Jun'],
  ['07', 'Jul'],
  ['08', 'Aug'],
  ['09', 'Sep'],
  ['10', 'Oct'],
  ['11', 'Nov'],
  ['12', 'Dec'],
];
const monthOptions = MONTHS.map(([value, label]) => ({ value, label }));
const fmtMon = (mmyyyy: string) =>
  `${MONTHS[Number(mmyyyy.slice(0, 2)) - 1][1]}-${mmyyyy.slice(4)}`;

const NEEDS_LOGIN = /not authenticated|authenticate first|request an otp/i;

// Inclusive list of MMYYYY periods from → to (chronological). Empty if from > to.
export function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let m = Number(from.slice(0, 2));
  let y = Number(from.slice(2));
  const tm = Number(to.slice(0, 2));
  const ty = Number(to.slice(2));
  let guard = 0;
  while ((y < ty || (y === ty && m <= tm)) && guard++ < 240) {
    out.push(`${String(m).padStart(2, '0')}${y}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

interface ResultRow {
  ret: '2A' | '2B';
  period: string;
  ok: boolean;
  imported: boolean;
  documents: number;
  message: string;
}

export default function DownloadGstReturns() {
  const { selectedCompany, activeFY } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regId, setRegId] = useState<string>('');
  const [want2A, setWant2A] = useState(true);
  const [want2B, setWant2B] = useState(true);

  const now = new Date();
  const defMonth = String(now.getMonth() + 1).padStart(2, '0');
  const defYear = String(now.getFullYear());
  const [fromM, setFromM] = useState(defMonth);
  const [fromY, setFromY] = useState(defYear);
  const [toM, setToM] = useState(defMonth);
  const [toY, setToY] = useState(defYear);

  const [mode, setMode] = useState<'confirm' | 'configure' | 'downloading' | 'done'>('confirm');
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '', percent: 0 });
  const [results, setResults] = useState<ResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    window.api.gstRegistration
      .getAll(companyId)
      .then((r) => {
        if (r.success && r.gstRegistrations?.length) {
          setRegistrations(r.gstRegistrations);
          setRegId(String(r.gstRegistrations[0].gst_id));
        }
      })
      .catch(() => {});
  }, [companyId]);

  const activeReg = registrations.find((r) => String(r.gst_id) === regId);
  const regLabel = activeReg
    ? `${activeReg.state_id || 'GST'} Registration${activeReg.gstin ? ` (${activeReg.gstin})` : ''}`
    : 'All Registrations';

  const periods = useMemo(
    () => monthRange(`${fromM}${fromY}`, `${toM}${toY}`),
    [fromM, fromY, toM, toY],
  );
  const returns = useMemo(
    () => [...(want2A ? ['2A' as const] : []), ...(want2B ? ['2B' as const] : [])],
    [want2A, want2B],
  );
  const returnTypeLabel = returns.length
    ? returns.map((r) => `GSTR-${r}`).join(', ')
    : '(none selected)';

  // Build the (return × period) work list, then download+reconcile each with progress.
  const runDownload = async () => {
    if (!companyId || !fyId) return;
    const steps: { ret: '2A' | '2B'; period: string }[] = [];
    for (const ret of returns) for (const period of periods) steps.push({ ret, period });
    if (!steps.length) {
      setError('Select at least one return type and a valid period range.');
      return;
    }

    setMode('downloading');
    setError(null);
    const collected: ResultRow[] = [];

    for (let i = 0; i < steps.length; i++) {
      const { ret, period } = steps[i];
      setProgress({
        current: i + 1,
        total: steps.length,
        label: `${regLabel} — GSTR-${ret} — ${fmtMon(period)} (${i + 1}/${steps.length})`,
        percent: Math.round((i / steps.length) * 100),
      });
      const call = ret === '2A' ? window.api.gstFiling.fetch2A : window.api.gstFiling.fetch2B;
      const res: Gstr2FetchResult = await call({
        company_id: companyId,
        fy_id: fyId,
        return_period: period,
      });

      if (!res.success && NEEDS_LOGIN.test(res.error || '')) {
        // Session dropped mid-run — prompt OTP, then restart the whole download.
        setResults(collected);
        setMode('confirm');
        setLoginOpen(true);
        return;
      }
      collected.push({
        ret,
        period,
        ok: res.success,
        imported: !!res.imported,
        documents: res.documents || 0,
        message: res.success
          ? res.imported
            ? `${res.documents} document(s)`
            : res.warning || 'No documents'
          : res.error || 'Failed',
      });
    }

    setProgress((p) => ({ ...p, percent: 100 }));
    setResults(collected);
    setMode('done');
  };

  // Download starts an OTP session first (like Tally), then runs the work list.
  const handleDownload = async () => {
    if (!companyId) return;
    if (!returns.length) {
      setError('Select at least one return type.');
      return;
    }
    if (!periods.length) {
      setError('The "From" period must be on or before the "To" period.');
      return;
    }
    const status = await window.api.gstFiling.getStatus(companyId);
    if (!status?.configured) {
      setError('GST portal is not configured — set the WHITEBOOKS_* credentials in .env.');
      return;
    }
    if (!status.gstSession) {
      setLoginOpen(true); // onAuthenticated → runDownload()
      return;
    }
    runDownload();
  };

  const leftSubtitle = (
    <>
      <div className="flex gap-4">
        <span className="w-32">GST Registration</span>
        <span className="font-bold">: {regLabel}</span>
      </div>
      <div className="flex gap-4">
        <span className="w-32">Return Type</span>
        <span className="font-bold">: {returnTypeLabel}</span>
      </div>
    </>
  );

  return (
    <TallyReportLayout
      title="Download GST Returns"
      companyName={selectedCompany?.name || 'Company'}
      leftSubtitle={leftSubtitle}
      rightSubtitle={
        <div>
          {fmtMon(`${fromM}${fromY}`)} to {fmtMon(`${toM}${toY}`)}
        </div>
      }
    >
      {companyId && (
        <GstPortalLoginDialog
          open={loginOpen}
          companyId={companyId}
          onClose={() => setLoginOpen(false)}
          onAuthenticated={() => {
            setLoginOpen(false);
            runDownload();
          }}
        />
      )}

      <div className="flex justify-center pt-16">
        <div className="w-[620px] border border-zinc-400 bg-white">
          <div className="text-center font-bold underline py-2 border-b border-zinc-300">
            Download GST Returns
          </div>

          {/* ── Confirm / Configure ─────────────────────────────────────────── */}
          {(mode === 'confirm' || mode === 'configure') && (
            <div className="px-6 py-4 text-xs">
              <Row label="GST Registration">
                {mode === 'configure' && registrations.length > 1 ? (
                  <Select
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    options={registrations.map((r) => ({
                      value: String(r.gst_id),
                      label: `${r.state_id || 'GST'} (${r.gstin || '—'})`,
                    }))}
                  />
                ) : (
                  <span className="font-bold">{regLabel}</span>
                )}
              </Row>

              <Row label="Return Type">
                {mode === 'configure' ? (
                  <div className="flex gap-4">
                    <Check label="GSTR-2A" checked={want2A} onChange={setWant2A} />
                    <Check label="GSTR-2B" checked={want2B} onChange={setWant2B} />
                  </div>
                ) : (
                  <span className="font-bold">{returnTypeLabel}</span>
                )}
              </Row>

              <Row label="From">
                {mode === 'configure' ? (
                  <PeriodPick m={fromM} y={fromY} setM={setFromM} setY={setFromY} />
                ) : (
                  <span className="font-bold">{fmtMon(`${fromM}${fromY}`)}</span>
                )}
              </Row>

              <Row label="To">
                {mode === 'configure' ? (
                  <PeriodPick m={toM} y={toY} setM={setToM} setY={setToY} />
                ) : (
                  <span className="font-bold">{fmtMon(`${toM}${toY}`)}</span>
                )}
              </Row>

              {error && (
                <div className="mt-2 font-bold text-black border-l-2 border-black pl-2">
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMode(mode === 'configure' ? 'confirm' : 'configure')}
                >
                  {mode === 'configure' ? 'Done' : 'Configure'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleDownload}>
                  Download
                </Button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-3 text-center">
                {periods.length} period(s) × {returns.length} return(s) ={' '}
                {periods.length * returns.length} download(s). An OTP login is requested if no GST
                session is active.
              </p>
            </div>
          )}

          {/* ── Downloading (progress bar) ──────────────────────────────────── */}
          {mode === 'downloading' && (
            <div className="px-6 py-8 text-center">
              <div className="text-xs mb-3">{progress.label}</div>
              <div className="text-2xl font-bold mb-2">{progress.percent}%</div>
              <div className="h-3 w-full border border-black bg-white">
                <div className="h-full bg-black" style={{ width: `${progress.percent}%` }} />
              </div>
              <div className="text-[10px] text-zinc-500 mt-3">Downloading and reconciling…</div>
            </div>
          )}

          {/* ── Done (summary) ──────────────────────────────────────────────── */}
          {mode === 'done' && (
            <div className="px-6 py-4 text-xs">
              <div className="font-bold underline mb-2">Download &amp; Reconciliation Summary</div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-300 text-left">
                    <th className="py-1">Return</th>
                    <th className="py-1">Period</th>
                    <th className="py-1 text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-zinc-100">
                      <td className="py-1">GSTR-{r.ret}</td>
                      <td className="py-1">{fmtMon(r.period)}</td>
                      <td className={`py-1 text-right ${r.ok ? '' : 'font-bold'}`}>{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-center gap-3 mt-6">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/master/statutory/gstr2a/reconciliation')}
                >
                  Open GSTR-2A Reconciliation
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/master/statutory/gstr2b/reconciliation')}
                >
                  Open GSTR-2B Reconciliation
                </Button>
                <Button variant="primary" size="sm" onClick={() => setMode('confirm')}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </TallyReportLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-36 text-zinc-600">{label}</span>
      <span>:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="font-bold">{label}</span>
    </label>
  );
}

function PeriodPick({
  m,
  y,
  setM,
  setY,
}: {
  m: string;
  y: string;
  setM: (v: string) => void;
  setY: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <div className="w-28">
        <Select value={m} onChange={(e) => setM(e.target.value)} options={monthOptions} />
      </div>
      <input
        value={y}
        onChange={(e) => setY(e.target.value)}
        placeholder="YYYY"
        className="w-20 h-8 px-2 border border-zinc-300 text-xs outline-none focus:border-zinc-800"
      />
    </div>
  );
}
