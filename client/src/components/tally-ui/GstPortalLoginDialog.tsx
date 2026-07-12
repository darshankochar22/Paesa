import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEscape } from '@/hooks/useEscape';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { IntegrationStatus } from '@/types/api/GstIntegrations';

interface GstPortalLoginDialogProps {
  open: boolean;
  companyId: number;
  onClose: () => void;
  /** Called once the OTP is verified and the GSTN session is active. */
  onAuthenticated?: () => void;
}

// Tally-style GSTN portal login. Credentials (GSTIN, GSTN username, GSP keys) live in
// .env on the developer side — this dialog only drives the OTP handshake:
// Send OTP → taxpayer's registered mobile → enter OTP → session active (~50 min).
export default function GstPortalLoginDialog({
  open,
  companyId,
  onClose,
  onAuthenticated,
}: GstPortalLoginDialogProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [step, setStep] = useState<'send' | 'otp'>('send');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStep('send');
    setOtp('');
    setMsg(null);
    setErr(null);
    window.api.gstFiling
      .getStatus(companyId)
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open, companyId]);

  // Escape via the central stack: registered above the screen while open,
  // so one Escape closes only this dialog.
  useEscape(onClose, open);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  if (!open) return null;

  const configured = !!status?.configured;

  const sendOtp = async () => {
    setBusy(true);
    setErr(null);
    setMsg('Sending OTP to the GSTN-registered mobile…');
    const r = await window.api.gstFiling.requestOtp(companyId);
    setBusy(false);
    if (r.success) {
      setStep('otp');
      setMsg('OTP sent. Enter it below.');
    } else {
      setMsg(null);
      setErr(r.error || 'Could not send OTP');
    }
  };

  const verify = async () => {
    if (!otp.trim()) {
      setErr('Enter the OTP.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg('Verifying OTP…');
    const a = await window.api.gstFiling.authenticate({ company_id: companyId, otp: otp.trim() });
    setBusy(false);
    if (a.success) {
      setMsg('GSTN session active.');
      onAuthenticated?.();
      onClose();
    } else {
      setMsg(null);
      setErr(a.error || 'OTP verification failed');
    }
  };

  const logout = async () => {
    setBusy(true);
    setErr(null);
    setMsg('Closing GSTN session…');
    const r = await window.api.gstFiling.logout();
    setBusy(false);
    if (r.success) {
      setStep('send');
      setOtp('');
      setStatus((s) => (s ? { ...s, gstSession: false } : s));
      setMsg('Logged out.');
    } else {
      setMsg(null);
      setErr(r.error || 'Logout failed');
    }
  };

  const row = (label: string, value: ReactNode) => (
    <div className="flex items-center gap-2 px-3 py-1 text-xs">
      <span className="w-36 text-black">{label}</span>
      <span>:</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label="GST Portal Login"
      className="fixed inset-0 z-[10000] bg-black/[0.06] flex items-start justify-center"
    >
      <div className="mt-24 w-[460px] bg-white border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between bg-black text-white font-bold px-3 py-1.5 text-xs">
          <span>GST Portal Login (GSTN Session)</span>
          <button onClick={onClose} className="hover:text-black" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="py-2 border-b border-gray-200">
          {row('GSTIN', status?.gstin || '—')}
          {row('Provider', status?.provider || '—')}
          {row('Mode', status?.sandbox === false ? 'Production' : 'Sandbox')}
          {row(
            'Session',
            status?.gstSession ? 'Active' : step === 'otp' ? 'Awaiting OTP' : 'Not logged in',
          )}
        </div>

        {!configured ? (
          <div className="px-3 py-3 text-xs">
            GST portal connection is not configured. Set{' '}
            <span className="font-bold">GST_PROVIDER=whitebooks</span> and the{' '}
            <span className="font-bold">WHITEBOOKS_*</span> credentials in .env, then restart.
          </div>
        ) : (
          <div className="px-3 py-3 flex flex-col gap-2">
            {step === 'otp' && (
              <div className="flex items-center gap-2">
                <span className="w-36 text-xs text-black">OTP</span>
                <Input
                  ref={otpRef}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      verify();
                    }
                  }}
                />
              </div>
            )}
            {msg && <div className="text-xs text-black">{msg}</div>}
            {err && <div className="text-xs font-bold">{err}</div>}
          </div>
        )}

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-200 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {configured && step === 'send' && status?.gstSession && (
            <Button variant="secondary" size="sm" onClick={logout} disabled={busy}>
              Logout
            </Button>
          )}
          {configured && step === 'send' && (
            <Button variant="primary" size="sm" onClick={sendOtp} disabled={busy}>
              {status?.gstSession ? 'Re-login — Send OTP' : 'Send OTP'}
            </Button>
          )}
          {configured && step === 'otp' && (
            <>
              <Button variant="secondary" size="sm" onClick={sendOtp} disabled={busy}>
                Resend OTP
              </Button>
              <Button variant="primary" size="sm" onClick={verify} disabled={busy}>
                Verify &amp; Login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
