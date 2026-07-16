import { useEffect, useState } from 'react';
import { useEscape } from '@/hooks/useEscape';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import GstPortalLoginDialog from '@/components/tally-ui/GstPortalLoginDialog';
import type { Gstr2FetchResult } from '@/types/api/GstIntegrations';

interface PortalFetchPopupProps {
  open: boolean;
  kind: '2A' | '2B';
  companyId: number;
  fyId: number;
  onClose: () => void;
  /** Called after a successful import so the parent reloads the reconciliation. */
  onImported: () => void;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const NEEDS_LOGIN = /not authenticated|authenticate first|request an otp/i;

// Fetch GSTR-2A/2B from the GST portal for a return period and import it into the
// reconciliation. If the GSTN OTP session is missing/expired, the login dialog opens
// and the fetch retries automatically after authentication.
export default function PortalFetchPopup({
  open,
  kind,
  companyId,
  fyId,
  onClose,
  onImported,
}: PortalFetchPopupProps) {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMsg(null);
    setErr(null);
  }, [open]);

  // Escape via the central stack; while the login dialog is stacked above,
  // this popup steps off the stack so the dialog pops first.
  useEscape(onClose, open && !loginOpen);

  if (!open) return null;

  const period = `${month}${year}`;

  const fetchNow = async () => {
    if (!/^\d{4}$/.test(year)) {
      setErr('Enter the year as YYYY.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(`Downloading GSTR-${kind} for ${period} from the portal…`);
    const call = kind === '2A' ? window.api.gstFiling.fetch2A : window.api.gstFiling.fetch2B;
    const res: Gstr2FetchResult = await call({
      company_id: companyId,
      fy_id: fyId,
      return_period: period,
    });
    setBusy(false);
    if (res.success) {
      if (res.imported) {
        setMsg(
          `Imported ${res.documents} document(s) from ${res.suppliers} supplier(s) ` +
            `(sections: ${(res.sections || []).join(', ')}). Reconciliation updated.`,
        );
        onImported();
      } else {
        setMsg(res.warning || `The portal returned no documents for ${period}.`);
      }
    } else if (NEEDS_LOGIN.test(res.error || '')) {
      setMsg('GSTN session needed — log in with the OTP to continue.');
      setLoginOpen(true);
    } else {
      setMsg(null);
      setErr(res.error || 'Fetch failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-label={`Fetch GSTR-${kind} from portal`}
      className="fixed inset-0 z-[9999] bg-black/10 flex items-start justify-center"
    >
      <div className="mt-24 w-[460px] bg-white border border-black shadow-2xl">
        <div className="flex items-center justify-between bg-black text-white font-bold px-3 py-1.5 text-xs">
          <span>Fetch GSTR-{kind} from GST Portal</span>
          <button onClick={onClose} className="hover:opacity-70" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="px-3 py-3 flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-36 font-medium">Return Period</span>
            <div className="w-36">
              <Select value={month} onChange={(e) => setMonth(e.target.value)} options={MONTHS} />
            </div>
            <div className="w-24">
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="YYYY" />
            </div>
          </div>
          <p>
            Downloads the vendor-filed GSTR-{kind} statement for the period over the live GSTN
            session and matches it against your purchase books.
          </p>
          {msg && <div>{msg}</div>}
          {err && <div className="font-bold">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-300 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={fetchNow} disabled={busy}>
            Fetch from Portal
          </Button>
        </div>
      </div>

      <GstPortalLoginDialog
        open={loginOpen}
        companyId={companyId}
        onClose={() => setLoginOpen(false)}
        onAuthenticated={() => {
          setLoginOpen(false);
          fetchNow();
        }}
      />
    </div>
  );
}
