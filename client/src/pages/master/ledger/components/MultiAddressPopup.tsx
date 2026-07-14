import { useState, useEffect } from 'react';
import type { LedgerAddress } from '@/types/api';
import { INDIAN_STATES } from '@/constants/states';

interface Props {
  ledgerName?: string;
  initial: LedgerAddress[];
  onSave: (rows: LedgerAddress[]) => void;
  onClose: () => void;
}

const inputCls =
  'w-full text-xs px-1.5 py-0.5 border border-gray-400 bg-white outline-none focus:border-black';
const labelCls = 'w-24 shrink-0 text-[11px] text-gray-600 pt-0.5';

const blankRow = (): LedgerAddress => ({
  address_type: '',
  mailing_name: '',
  address1: '',
  address2: '',
  state: '',
  country: 'India',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
  is_default: 0,
});

// F11 "Enable multiple addresses" sub-screen: manage a party ledger's named
// addresses (Head Office, Branch…). Strict black/white — no color; the default
// address is marked with weight/label, not hue.
export default function MultiAddressPopup({ ledgerName, initial, onSave, onClose }: Props) {
  const [rows, setRows] = useState<LedgerAddress[]>(
    initial.length ? initial.map((r) => ({ ...r })) : [blankRow()],
  );

  const update = (idx: number, patch: Partial<LedgerAddress>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, blankRow()]);
  const removeRow = (idx: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [blankRow()]));

  // Exactly one default; picking one clears the others.
  const setDefault = (idx: number) =>
    setRows((prev) => prev.map((r, i) => ({ ...r, is_default: i === idx ? 1 : 0 })));

  const accept = () => {
    // Keep only rows with any identifying text; renumber display order.
    const filled = rows.filter((r) =>
      (r.address_type || r.mailing_name || r.address1 || r.address2 || '').trim(),
    );
    onSave(filled.map((r, i) => ({ ...r, display_order: i })));
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        accept();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return (
    <div
      data-enter-nav-ignore
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/10 pt-16"
    >
      <div
        className="bg-white border border-black shadow-lg flex flex-col"
        style={{ width: 620, maxHeight: '80vh' }}
      >
        <div className="border-b border-black text-center py-1 select-none">
          <span className="text-[11px] text-gray-600">Address List for: </span>
          <span className="text-[11px] font-bold text-black">{ledgerName || '—'}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="border border-gray-400 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-black">
                  <input
                    type="radio"
                    name="default-address"
                    checked={!!r.is_default}
                    onChange={() => setDefault(idx)}
                    className="accent-black"
                  />
                  Default address
                </label>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-[11px] text-gray-500 hover:text-black underline"
                >
                  Remove
                </button>
              </div>

              <div className="flex items-start">
                <span className={labelCls}>Address type</span>
                <input
                  className={inputCls}
                  value={r.address_type || ''}
                  onChange={(e) => update(idx, { address_type: e.target.value })}
                  placeholder="e.g. Head Office"
                />
              </div>
              <div className="flex items-start">
                <span className={labelCls}>Mailing name</span>
                <input
                  className={inputCls}
                  value={r.mailing_name || ''}
                  onChange={(e) => update(idx, { mailing_name: e.target.value })}
                />
              </div>
              <div className="flex items-start">
                <span className={labelCls}>Address</span>
                <div className="flex-1 space-y-1">
                  <input
                    className={inputCls}
                    value={r.address1 || ''}
                    onChange={(e) => update(idx, { address1: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    value={r.address2 || ''}
                    onChange={(e) => update(idx, { address2: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-start">
                <span className={labelCls}>State</span>
                <select
                  className={inputCls}
                  value={r.state || ''}
                  onChange={(e) => update(idx, { state: e.target.value })}
                >
                  <option value="">Select</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-start gap-2">
                <span className={labelCls}>Country</span>
                <input
                  className={inputCls}
                  value={r.country || ''}
                  onChange={(e) => update(idx, { country: e.target.value })}
                />
                <span className="w-16 shrink-0 text-[11px] text-gray-600 pt-0.5">Pincode</span>
                <input
                  className={inputCls}
                  value={r.pincode || ''}
                  onChange={(e) => update(idx, { pincode: e.target.value })}
                />
              </div>
              <div className="flex items-start gap-2">
                <span className={labelCls}>Phone</span>
                <input
                  className={inputCls}
                  value={r.phone || ''}
                  onChange={(e) => update(idx, { phone: e.target.value })}
                />
                <span className="w-16 shrink-0 text-[11px] text-gray-600 pt-0.5">GSTIN</span>
                <input
                  className={inputCls}
                  value={r.gstin || ''}
                  onChange={(e) => update(idx, { gstin: e.target.value })}
                />
              </div>
              <div className="flex items-start">
                <span className={labelCls}>Email</span>
                <input
                  className={inputCls}
                  value={r.email || ''}
                  onChange={(e) => update(idx, { email: e.target.value })}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="text-[11px] font-semibold text-black border border-black px-2 py-1 hover:bg-gray-100"
          >
            + Add address
          </button>
        </div>

        <div className="border-t border-black flex justify-end gap-2 px-3 py-2 select-none">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-3 py-1 border border-black bg-white text-black hover:bg-gray-100"
          >
            Cancel (Esc)
          </button>
          <button
            type="button"
            onClick={accept}
            className="text-[11px] px-3 py-1 bg-black text-white hover:bg-gray-800"
          >
            Accept (Alt+A)
          </button>
        </div>
      </div>
    </div>
  );
}
