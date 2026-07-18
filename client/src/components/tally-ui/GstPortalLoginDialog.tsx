import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEscape } from '@/hooks/useEscape';
import Button from '@/components/ui/Button';
import NotificationBanner from '@/components/ui/NotificationBanner';
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

const OTP_LEN = 6;
const RESEND_COOLDOWN = 30; // seconds

const regName = (r: GSTRegistrationType) =>
  (r.trade_name || r.legal_name || '').trim() || 'GST Registration';

// ─────────────────────────────────────────────────────────────────────────────
// Segmented OTP entry — one box per digit, driven by a single compact string.
// Focus is redirected to the first empty box, so the value can never develop
// interior gaps (which would silently shift digits left on join).
// ─────────────────────────────────────────────────────────────────────────────
function OtpBoxes({
  value,
  onChange,
  onComplete,
  disabled,
  firstRef,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Fires with the finished code — passed explicitly because the parent's `otp`
   *  state has not re-rendered yet at this point (reading it would be stale). */
  onComplete: (code: string) => void;
  disabled?: boolean;
  firstRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = Array.from({ length: OTP_LEN }, (_, i) => value[i] ?? '');

  const focusAt = (i: number) => refs.current[Math.max(0, Math.min(OTP_LEN - 1, i))]?.focus();

  const commit = (next: string[]) => {
    const joined = next.join('').slice(0, OTP_LEN);
    onChange(joined);
    return joined;
  };

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '');
    const next = chars.slice();

    if (!digits) {
      next[i] = '';
      commit(next);
      return;
    }

    // One digit → set + advance. Several (paste / fast typing) → fill forward.
    for (let k = 0; k < digits.length && i + k < OTP_LEN; k++) next[i + k] = digits[k];
    const joined = commit(next);
    const landed = Math.min(i + digits.length, OTP_LEN - 1);
    focusAt(landed);
    if (joined.length === OTP_LEN) onComplete(joined);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = chars.slice();
      if (next[i]) next[i] = '';
      else if (i > 0) {
        next[i - 1] = '';
        focusAt(i - 1);
      }
      commit(next);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusAt(i + 1);
    } else if (e.key === 'Enter' && value.length === OTP_LEN) {
      e.preventDefault();
      onComplete(value);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
            if (i === 0 && firstRef) firstRef.current = el;
          }}
          value={c}
          disabled={disabled}
          inputMode="numeric"
          maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`OTP digit ${i + 1}`}
          // Keep the string gap-free: clicking ahead of what's typed lands on the next empty
          // box. Selecting the digit makes typing overwrite it rather than being blocked by
          // maxLength.
          onFocus={(e) => {
            if (i > value.length) {
              focusAt(value.length);
              return;
            }
            e.currentTarget.select();
          }}
          // maxLength caps typed input at one char, so a pasted code needs its own handler.
          onPaste={(e) => {
            e.preventDefault();
            const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
            if (!digits) return;
            const joined = commit(Array.from({ length: OTP_LEN }, (_, k) => digits[k] ?? ''));
            focusAt(digits.length - 1);
            if (joined.length === OTP_LEN) onComplete(joined);
          }}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`h-12 w-11 rounded border text-center text-xl font-bold text-black outline-none transition-colors
            ${c ? 'border-black' : 'border-zinc-300'}
            focus:border-black focus:ring-2 focus:ring-black/10
            disabled:bg-black/[0.03] disabled:text-black/30`}
        />
      ))}
    </div>
  );
}

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
  const [cooldown, setCooldown] = useState(0);
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
    setCooldown(0);
    refreshStatus();
    window.api.gstRegistration
      .getAll(companyId)
      .then((r) => setRegs((r?.success && r.gstRegistrations) || []))
      .catch(() => setRegs([]));
  }, [open, companyId]);

  // Escape via the central stack: registered above the screen while open,
  // so one Escape closes only this dialog.
  useEscape(onClose, open);

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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
      setOtp('');
      setStep('otp');
      setCooldown(RESEND_COOLDOWN);
      setMsg('OTP sent.');
    } else {
      setMsg(null);
      setErr(r.error || 'Could not send OTP');
    }
  };

  // `code` is passed by OtpBoxes on completion — the `otp` state is still one render
  // behind at that moment, so never read it here without the argument.
  const verify = async (code?: string) => {
    const entered = (code ?? otp).trim();
    if (entered.length !== OTP_LEN) {
      setErr(`Enter all ${OTP_LEN} digits.`);
      return;
    }
    if (!selected?.gstin) return;
    setBusy(true);
    setErr(null);
    setMsg('Verifying OTP…');
    const a = await window.api.gstFiling.authenticate({
      company_id: companyId,
      gstin: selected.gstin,
      otp: entered,
    });
    setBusy(false);
    if (a.success) {
      setMsg('GSTN session active.');
      onAuthenticated?.();
      onClose();
    } else {
      setMsg(null);
      setErr(a.error || 'OTP verification failed');
      setOtp('');
      otpRef.current?.focus();
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
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-black/50">{label}</span>
      <span className="font-semibold text-black">{value}</span>
    </div>
  );

  const sessionRow = (r: GSTRegistrationType, isActive: boolean) => (
    <button
      key={r.gst_id ?? r.gstin}
      onClick={() => pick(r)}
      className="w-full flex items-center justify-between gap-3 px-5 py-2.5 text-xs text-left hover:bg-black/[0.03] border-b border-zinc-100 transition-colors"
    >
      <span className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-black truncate">{regName(r)}</span>
        {!r.gst_username && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-black/50 border border-zinc-300 rounded px-1">
            no username
          </span>
        )}
        {isActive && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-white bg-black rounded px-1.5">
            active
          </span>
        )}
      </span>
      <span className="font-mono text-black/60 shrink-0">{r.gstin || '—'}</span>
    </button>
  );

  return (
    <div
      role="dialog"
      aria-label="GST Portal Login"
      className="fixed inset-0 z-[10000] bg-black/20 backdrop-blur-[1px] flex items-start justify-center"
    >
      <div className="mt-24 w-[520px] bg-white border border-zinc-200 rounded shadow-2xl overflow-hidden animate-fade-in">
        {/* Title bar */}
        <div className="flex items-center justify-between bg-black text-white font-semibold px-5 py-2.5 text-xs">
          <span className="uppercase tracking-wider">GST Portal Login</span>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-sm leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Session facts */}
        <div className="flex items-center gap-6 px-5 py-3 border-b border-zinc-200 bg-black/[0.02]">
          {factRow('Provider', status?.provider || '—')}
          {factRow('Mode', status?.sandbox === false ? 'Production' : 'Sandbox')}
          {factRow('Session', activeGstin ? 'Active' : 'Not logged in')}
        </div>

        {!configured ? (
          <div className="px-5 py-6 text-xs leading-5 text-black/70">
            GST portal connection is not configured. Set{' '}
            <span className="font-semibold text-black">GST_PROVIDER=whitebooks</span> and the{' '}
            <span className="font-semibold text-black">WHITEBOOKS_*</span> credentials in .env, then
            restart.
          </div>
        ) : step === 'list' ? (
          <div>
            <div className="px-5 pt-4 pb-2">
              <div className="text-sm font-bold text-black">Choose a GST registration</div>
              <p className="mt-1 text-xs text-black/50">
                An OTP is sent to the mobile &amp; e-mail registered with it.
              </p>
            </div>
            {regs.length === 0 ? (
              <div className="px-5 pb-5 text-xs text-black/70 leading-5">
                No GST Registrations found for this company. Create one under Statutory → GST
                Registration first.
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border-t border-zinc-100">
                <div className="px-5 py-1.5 uppercase tracking-wider text-[10px] font-semibold text-black/40 bg-black/[0.02]">
                  Active
                </div>
                {activeRegs.length ? (
                  activeRegs.map((r) => sessionRow(r, true))
                ) : (
                  <div className="px-5 py-2 text-xs text-black/30">None</div>
                )}
                <div className="px-5 py-1.5 uppercase tracking-wider text-[10px] font-semibold text-black/40 bg-black/[0.02]">
                  Inactive
                </div>
                {inactiveRegs.length ? (
                  inactiveRegs.map((r) => sessionRow(r, false))
                ) : (
                  <div className="px-5 py-2 text-xs text-black/30">None</div>
                )}
              </div>
            )}
          </div>
        ) : step === 'confirm' ? (
          <div
            className="px-5 py-6"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && selected?.gst_username) {
                e.preventDefault();
                sendOtp();
              }
            }}
            tabIndex={0}
          >
            <div className="text-sm font-bold text-black">Send OTP</div>
            {selected?.gst_username ? (
              <>
                <p className="mt-2 text-xs leading-5 text-black/70">
                  We’ll send a one-time password to the mobile number and e-mail registered for GST
                  username <span className="font-semibold text-black">{selected.gst_username}</span>
                  .
                </p>
                <div className="mt-4 border border-zinc-200 rounded px-4 py-3">
                  <div className="text-xs font-semibold text-black">{regName(selected)}</div>
                  <div className="mt-0.5 text-[11px] font-mono text-black/50">{selected.gstin}</div>
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs leading-5 text-black/70">
                This registration has no GST Portal Username set. Add it on the registration
                (Statutory → GST Registration) before logging in.
              </p>
            )}
          </div>
        ) : (
          /* ── OTP ─────────────────────────────────────────────────────────── */
          <div className="px-5 pt-7 pb-6 flex flex-col items-center text-center">
            <div className="text-sm font-bold text-black">Enter the OTP</div>
            <p className="mt-2 text-xs leading-5 text-black/60 max-w-[380px]">
              We sent a {OTP_LEN}-digit code to the mobile number and e-mail registered with{' '}
              <span className="font-semibold text-black">{selected ? regName(selected) : ''}</span>
            </p>
            {selected?.gstin && (
              <div className="mt-1 text-[11px] font-mono text-black/40">{selected.gstin}</div>
            )}

            <div className="mt-6">
              <OtpBoxes
                value={otp}
                onChange={(v) => {
                  setErr(null);
                  setOtp(v);
                }}
                onComplete={verify}
                disabled={busy}
                firstRef={otpRef}
              />
            </div>

            <div className="mt-5 text-[11px] text-black/50">
              Didn’t receive it?{' '}
              <button
                onClick={sendOtp}
                disabled={busy || cooldown > 0}
                className="font-semibold text-black underline underline-offset-2 disabled:no-underline disabled:text-black/30"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {(err || msg) && (
          <div className="px-5">
            {err ? (
              <NotificationBanner type="error" message={err} onDismiss={() => setErr(null)} />
            ) : (
              <div className="pb-3 text-xs text-black/50 text-center">{msg}</div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-200">
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => verify()}
              disabled={busy || otp.length !== OTP_LEN}
            >
              {busy ? 'Verifying…' : 'Verify & Login'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
