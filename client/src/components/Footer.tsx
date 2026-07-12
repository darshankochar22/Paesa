import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { popEscape } from '../lib/escapeStack';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import CompanyFeatures from './CompanyFeatures';

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [showConfigure, setShowConfigure] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [enableSound, setEnableSound] = useState(true);
  const [highDensity, setHighDensity] = useState(false);
  const [showSubBadges, setShowSubBadges] = useState(true);

  const dispatchKey = (
    key: string,
    modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {},
  ) => {
    const event = new KeyboardEvent('keydown', {
      key: key,
      code: key,
      bubbles: true,
      cancelable: true,
      ctrlKey: modifiers.ctrlKey || false,
      altKey: modifiers.altKey || false,
      metaKey: modifiers.metaKey || false,
    });
    window.dispatchEvent(event);
  };

  // Global F11 (Company Features) / F12 (Configure) — work everywhere, even
  // while typing or with a dialog open, like TallyPrime.
  useShortcuts(
    [
      {
        keys: 'F11',
        handler: () => setShowFeatures((prev) => !prev),
        allowInInputs: true,
        allowInDialogs: true,
      },
      {
        keys: 'F12',
        handler: () => setShowConfigure((prev) => !prev),
        allowInInputs: true,
        allowInDialogs: true,
      },
      {
        // Global Escape = Quit. Runs deferred: only fires if no popup/dialog on
        // the escape stack and no per-screen Escape handler already claimed the
        // key. Guarantees Escape always quits one level — pops one page from
        // history (stack-style), never a jump to the gateway.
        keys: 'Escape',
        handler: () => {
          if (location.pathname !== '/') navigate(-1);
        },
        defer: true,
        allowInInputs: true,
        allowInDialogs: true,
      },
    ],
    { priority: PRIORITY.GLOBAL },
  );

  const handleQuit = () => {
    // Pop exactly one layer off the central escape stack (popup → drill →
    // screen). Falls back to the legacy synthetic-Escape path only for
    // screens not yet registered on the stack.
    if (popEscape()) return;

    const currentPath = location.pathname;
    dispatchKey('Escape');

    setTimeout(() => {
      // Fallback only — the screen had no Escape handler of its own. Pop exactly
      // one page from history (stack-style), never a jump straight to the
      // gateway. Each Quit/Escape releases one layer at a time.
      if (location.pathname === currentPath && currentPath !== '/') {
        navigate(-1);
      }
    }, 60);
  };

  const handleAccept = () => {
    // Alt+A is the app-wide Accept combo: every master screen registers Alt+A,
    // and voucher entry accepts on Alt+A OR Ctrl+A — so a single Alt+A dispatch
    // reliably drives Accept everywhere. (Was Ctrl+A, which masters ignored.)
    dispatchKey('a', { altKey: true });
  };

  const handleDelete = () => {
    dispatchKey('d', { altKey: true });
  };

  const handleCancel = () => {
    if (popEscape()) return;
    dispatchKey('Escape');
  };

  const handleVch = () => {
    dispatchKey('F8');

    // Fallback: Navigate directly to Vouchers if no voucher entry catches it
    setTimeout(() => {
      if (location.pathname !== '/transactions/vouchers') {
        navigate('/transactions/vouchers');
      }
    }, 60);
  };

  const handleConfigure = () => {
    dispatchKey('F12');
    setShowConfigure(true);
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="flex flex-row items-center justify-between px-10 py-10 border-t bg-white select-none text-zinc-800">
        <button onClick={handleQuit} className="hover:underline focus:outline-none transition-all">
          Quit
        </button>
        <button
          onClick={handleAccept}
          className="hover:underline focus:outline-none transition-all"
        >
          Accept
        </button>
        <button
          onClick={handleDelete}
          className="hover:underline focus:outline-none transition-all"
        >
          Delete
        </button>
        <button
          onClick={handleCancel}
          className="hover:underline focus:outline-none transition-all"
        >
          Cancel
        </button>
        <button onClick={handleVch} className="hover:underline focus:outline-none transition-all">
          Vch
        </button>
        <button
          onClick={() => setShowFeatures((prev) => !prev)}
          className="hover:underline focus:outline-none transition-all"
        >
          Features
        </button>
        <button
          onClick={handleConfigure}
          className="hover:underline focus:outline-none transition-all"
        >
          Configure
        </button>
      </div>

      {showConfigure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-96 overflow-hidden select-none flex flex-col font-sans">
            {/* Header */}
            <div className="bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-800 border-b border-zinc-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded">F12</span>
                <span>System Configuration</span>
              </div>
              <button
                onClick={() => setShowConfigure(false)}
                className="text-zinc-450 hover:text-black font-semibold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Form Settings Content */}
            <div className="p-5 flex flex-col gap-5 text-xs text-zinc-700 flex-1 overflow-y-auto">
              {/* Preferences Section */}
              <div className="flex flex-col gap-2.5">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">
                  User Preferences
                </h4>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={enableSound}
                    onChange={(e) => setEnableSound(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>Enable Beep Audio Alerts</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={highDensity}
                    onChange={(e) => setHighDensity(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>High Density Layout View</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={showSubBadges}
                    onChange={(e) => setShowSubBadges(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>Show Hotkey Shortcut Badges</span>
                </label>
              </div>

              <hr className="border-zinc-100" />

              {/* Active State Diagnosis Details */}
              <div className="flex flex-col gap-2 text-[11px] bg-zinc-50 p-3.5 border border-zinc-200/60 rounded-md">
                <h4 className="font-bold text-[9px] uppercase tracking-wider text-zinc-400 select-none mb-1">
                  Active Context Diagnosis
                </h4>
                <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-450">Active Company</span>
                  <span className="font-bold text-zinc-900">
                    {selectedCompany?.name || 'None Selected'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-450">Company Database</span>
                  <span className="text-zinc-600 font-semibold">
                    {selectedCompany?.company_id
                      ? `Active (ID: ${selectedCompany.company_id})`
                      : 'No Connection'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-450">Active FY Period</span>
                  <span className="text-zinc-700 font-semibold">
                    {activeFY ? `${formatDate(activeFY.start_date)}` : 'Not Configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action buttons */}
            <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2.5 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowConfigure(false)}
                className="font-semibold text-white bg-black hover:bg-zinc-800 px-4 py-1.5 rounded transition-all shadow-sm"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <CompanyFeatures
        open={showFeatures}
        onClose={() => setShowFeatures(false)}
        company={selectedCompany}
      />
    </>
  );
}
