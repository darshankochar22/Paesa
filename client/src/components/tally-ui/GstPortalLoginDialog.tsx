import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEscape } from '@/hooks/useEscape';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { IntegrationStatus } from '@/types/api/GstIntegrations';
import type { GSTRegistrationType } from '@/types/entities/GSTRegistration';

interface GstPortalLoginDialogProps {
  open: boolean;
  companyId: number;
  onClose: () => void;
  /** Called once the OTP is verified and the GSTN session is active. */
  onAuthenticated?: () => void;
}

// Tally-style GSTN portal login. GSP credentials (client id/secret, email) live in .env;
// the taxpayer picks one of the company's GST Registrations and drives the OTP handshake:
// List of GST Sessions → pick registration → Send OTP (registered mobile/e-mail) → enter
// OTP → session active (~50 min). The chosen registration's GSTN username + GSTIN + state
// are resolved server-side from gst_registrations.
type Step = 'list' | 'confirm' | 'otp';

const regName = (r: GSTRegistrationType) =>
  (r.trade_name || r.legal_name || '').trim() || 'GST Registration';

export default function GstPortalLoginDialog({
  open,
  companyId,
  onClose,
  onAuthenticated,
}: GstPortalLoginDialogProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [regs, setRegs] = useState<GSTRegistrationType[]>([]);
  const [step, setStep] = useState<Step>('list');
  const [selectedGstin, setSelectedGstin] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const otpRef = useRef<HTMLInputElement>(null);

  const refreshStatus = () =>
    window.api.gstFiling
      .getStatus(companyId)
      .then(setStatus)
      .catch(() => setStatus(null));

  useEffect(() => {
    if (!open) return;
    setStep('list');
    setSelectedGstin(null);
    setOtp('');
    setMsg(null);
    setErr(null);
    refreshStatus();
    window.api.gstRegistration
      .getAll(companyId)
      .then((r) => setRegs((r?.success && r.gstRegistrations) || []))
      .catch(() => setRegs([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId]);

  // Escape via the central stack: registered above the screen while open,
  // so one Escape closes only this dialog.
  useEscape(onClose, open);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  const configured = !!status?.configured;
  const activeGstin = status?.gstSession ? status?.activeGstin || null : null;

  const { activeRegs, inactiveRegs } = useMemo(() => {
    const active: GSTRegistrationType[] = [];
    const inactive: GSTRegistrationType[] = [];
    for (const r of regs) {
      if (activeGstin && r.gstin === activeGstin) active.push(r);
      else inactive.push(r);
    }
    return { activeRegs: active, inactiveRegs: inactive };
  }, [regs, activeGstin]);

  const selected = regs.find((r) => r.gstin === selectedGstin) || null;

  if (!open) return null;

  const pick = (r: GSTRegistrationType) => {
    setErr(null);
    setMsg(null);
    setSelectedGstin(r.gstin || null);
    setStep('confirm');
  };

  const sendOtp = async () => {
    if (!selected?.gstin) return;
    setBusy(true);
    setErr(null);
    setMsg('Sending OTP to the registered mobile & e-mail…');
    const r = await window.api.gstFiling.requestOtp(companyId, selected.gstin);
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
    if (!selected?.gstin) return;
    setBusy(true);
    setErr(null);
    setMsg('Verifying OTP…');
    const a = await window.api.gstFiling.authenticate({
      company_id: companyId,
      gstin: selected.gstin,
      otp: otp.trim(),
    });
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
      setOtp('');
      await refreshStatus();
      setStep('list');
      setSelectedGstin(null);
      setMsg('Logged out.');
    } else {
      setMsg(null);
      setErr(r.error || 'Logout failed');
    }
  };

  const factRow = (label: string, value: ReactNode) => (
    <div className="flex items-center gap-2 px-3 py-1 text-xs">
      <span className="w-36 text-black">{label}</span>
      <span>:</span>
      <span className="font-bold">{value}</span>
    </div>
  );

  const sessionRow = (r: GSTRegistrationType, isActive: boolean) => (
    <button
      key={r.gst_id ?? r.gstin}
      onClick={() => pick(r)}
      className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-black/[0.04] border-b border-gray-100"
    >
      <span className="flex items-center gap-2">
        <span className="font-bold">{regName(r)}</span>
        {!r.gst_username && (
          <span className="text-[10px] uppercase tracking-wide text-black border border-gray-300 px-1">
            no portal username
          </span>
        )}
        {isActive && (
          <span className="text-[10px] uppercase tracking-wide text-white bg-black px-1">
            active
          </span>
        )}
      </span>
      <span className="font-mono">{r.gstin || '—'}</span>
    </button>
  );

  return (
    <div
      role="dialog"
      aria-label="GST Portal Login"
      className="fixed inset-0 z-[10000] bg-black/[0.06] flex items-start justify-center"
    >
      <div className="mt-24 w-[520px] bg-white border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between bg-black text-white font-bold px-3 py-1.5 text-xs">
          <span>GST Portal Login (GSTN Session)</span>
          <button onClick={onClose} className="hover:text-black" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="py-2 border-b border-gray-200">
          {factRow('Provider', status?.provider || '—')}
          {factRow('Mode', status?.sandbox === false ? 'Production' : 'Sandbox')}
          {factRow('Session', activeGstin ? `Active — ${activeGstin}` : 'Not logged in')}
        </div>

        {!configured ? (
          <div className="px-3 py-3 text-xs">
            GST portal connection is not configured. Set{' '}
            <span className="font-bold">GST_PROVIDER=whitebooks</span> and the{' '}
            <span className="font-bold">WHITEBOOKS_*</span> credentials in .env, then restart.
          </div>
        ) : step === 'list' ? (
          <div className="text-xs">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 font-bold">
              <span>List of GST Sessions</span>
              <span>Registration Name / GSTIN</span>
            </div>
            {regs.length === 0 ? (
              <div className="px-3 py-3">
                No GST Registrations found for this company. Create one under Statutory → GST
                Registration first.
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                <div className="px-3 py-1 uppercase tracking-wide text-[10px] text-black bg-black/[0.03]">
                  Active Sessions
                </div>
                {activeRegs.length ? (
                  activeRegs.map((r) => sessionRow(r, true))
                ) : (
                  <div className="px-3 py-1 text-gray-400">None</div>
                )}
                <div className="px-3 py-1 uppercase tracking-wide text-[10px] text-black bg-black/[0.03]">
                  Inactive Sessions
                </div>
                {inactiveRegs.length ? (
                  inactiveRegs.map((r) => sessionRow(r, false))
                ) : (
                  <div className="px-3 py-1 text-gray-400">None</div>
                )}
              </div>
            )}
            {(msg || err) && (
              <div className="px-3 py-2">
                {msg && <div className="text-xs text-black">{msg}</div>}
                {err && <div className="text-xs font-bold">{err}</div>}
              </div>
            )}
          </div>
        ) : step === 'confirm' ? (
          <div
            className="px-3 py-4 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selected?.gst_username) {
                e.preventDefault();
                sendOtp();
              }
            }}
            tabIndex={0}
          >
            <div className="font-bold mb-2">GST Login</div>
            {selected?.gst_username ? (
              <p className="leading-5">
                Press Enter or click Send OTP to send an OTP to the registered mobile number and
                e-mail for GST Username <span className="font-bold">‘{selected.gst_username}’</span>{' '}
                and GST Registration{' '}
                <span className="font-bold">
                  ‘{regName(selected)} ({selected.gstin})’
                </span>
                .
              </p>
            ) : (
              <p className="leading-5">
                This registration has no GST Portal Username set. Add it on the registration
                (Statutory → GST Registration) before logging in.
              </p>
            )}
            {msg && <div className="text-xs text-black mt-2">{msg}</div>}
            {err && <div className="text-xs font-bold mt-2">{err}</div>}
          </div>
        ) : (
          <div className="px-3 py-4 flex flex-col gap-2">
            <div className="text-xs">
              OTP for{' '}
              <span className="font-bold">
                {selected ? `${regName(selected)} (${selected.gstin})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 text-xs text-black">Enter OTP</span>
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
            {msg && <div className="text-xs text-black">{msg}</div>}
            {err && <div className="text-xs font-bold">{err}</div>}
          </div>
        )}

        <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-200 bg-white">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>

          {configured && step === 'list' && activeGstin && (
            <Button variant="secondary" size="sm" onClick={logout} disabled={busy}>
              Logout
            </Button>
          )}

          {configured && step === 'confirm' && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setStep('list');
                  setErr(null);
                  setMsg(null);
                }}
                disabled={busy}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={sendOtp}
                disabled={busy || !selected?.gst_username}
              >
                Send OTP
              </Button>
            </>
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
