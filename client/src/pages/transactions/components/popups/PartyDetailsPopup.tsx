import { useState, useCallback, useEffect } from 'react';
import { INDIAN_STATES } from '../../../../constants/states';
import LedgerListPanel from '../LedgerListPanel';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

export interface PartyDetails {
  supplier_name?: string;
  mailing_name?: string;
  address?: string;
  address_type?: string;
  state?: string;
  country?: string;
  gst_registration_type?: string;
  gstin?: string;
  nature_of_return?: string;
  place_of_supply?: string;
  // Consignee (Ship to) — the address where goods are delivered, which may differ
  // from the Buyer (Bill to). Defaults to a mirror of the buyer for a fresh voucher.
  consignee_name?: string;
  consignee_mailing_name?: string;
  consignee_address?: string;
  consignee_state?: string;
  consignee_country?: string;
  consignee_gst_registration_type?: string;
  consignee_gstin?: string;
}

interface Props {
  partyLedger: any;
  allLedgers: any[];
  initialDetails?: PartyDetails | null;
  onClose: () => void;
  onSave: (details: PartyDetails) => void;
  onCreateLedger: () => void;
  buyerLabel?: string;
  /** Pass e.g. "Nature of Sales Return" for Credit Note, "Nature of Purchase Return" for
   *  Debit Note. Leave undefined for Sales/Purchase — the field will be hidden. */
  natureOfReturnLabel?: string;
}

const GST_REGISTRATION_TYPES = [
  'Regular',
  'Composition',
  'Unregistered',
  'Consumer',
  'Overseas',
  'Special Economic Zone',
  'Deemed Export',
  'UIN Holders',
];

// Standard GST "Nature of Return" reasons (plain values — no diamond glyphs).
const NATURE_OF_RETURN_OPTIONS = [
  'Not Applicable',
  '01-Sales Return',
  '02-Post Sale Discount',
  '03-Deficiency in services',
  '04-Correction in Invoice',
  '05-Change in POS',
  '06-Finalization of Provisional assessment',
  '07-Others',
];

// Registration types for which a GSTIN does not exist.
const NO_GSTIN_TYPES = ['Consumer', 'Unregistered'];

// 2 digits + 5 letters + 4 digits + letter + alnum + 'Z' + alnum (15 chars).
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

const inputCls =
  'flex-1 min-w-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black';

const ledgerAddress = (l: any) =>
  [l?.address1, l?.address2, l?.city, l?.pincode].filter(Boolean).join('\n');

// One party side (Buyer/Supplier or Consignee). Rendered twice so both columns
// stay identical — extend here, never duplicate the markup per side.
type ColKey =
  'name' | 'mailingName' | 'address' | 'state' | 'country' | 'gstType' | 'gstin' | 'addressType';
interface ColValues {
  name: string;
  mailingName: string;
  address: string;
  state: string;
  country: string;
  gstType: string;
  gstin: string;
  addressType: string;
}
function PartyColumn({
  title,
  values,
  onChange,
  onNameFocus,
  autoFocusName,
  showAddressType,
}: {
  title: string;
  values: ColValues;
  onChange: (key: ColKey, value: string) => void;
  onNameFocus?: () => void;
  autoFocusName?: boolean;
  showAddressType?: boolean;
}) {
  const showGstin = !NO_GSTIN_TYPES.includes(values.gstType);
  return (
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-32 text-sm font-semibold text-black shrink-0">{title}</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          className={inputCls}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          onFocus={onNameFocus}
          autoFocus={autoFocusName}
        />
      </div>

      {showAddressType && (
        <div className="flex items-center gap-2">
          <span className="w-32 text-sm text-black shrink-0">Address Type</span>
          <span className="text-sm text-black shrink-0">:</span>
          <select
            className={inputCls}
            value={values.addressType || 'Primary'}
            onChange={(e) => onChange('addressType', e.target.value)}
          >
            <option value="Primary">♦ Primary</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="w-32 text-sm text-black shrink-0">Mailing Name</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          className={inputCls}
          value={values.mailingName}
          onChange={(e) => onChange('mailingName', e.target.value)}
        />
      </div>

      <div className="flex items-start gap-2">
        <span className="w-32 text-sm text-black shrink-0 pt-0.5">Address</span>
        <span className="text-sm text-black shrink-0 pt-0.5">:</span>
        <textarea
          className={`${inputCls} resize-none h-16`}
          value={values.address}
          onChange={(e) => onChange('address', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="w-32 text-sm text-black shrink-0">State</span>
        <span className="text-sm text-black shrink-0">:</span>
        <select
          className={inputCls}
          value={values.state}
          onChange={(e) => onChange('state', e.target.value)}
        >
          <option value="">Select State</option>
          {INDIAN_STATES.map((s: string) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="w-32 text-sm text-black shrink-0">Country</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          className={inputCls}
          value={values.country}
          onChange={(e) => onChange('country', e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-300">
        <span className="w-32 text-sm text-black shrink-0">GST Reg. type</span>
        <span className="text-sm text-black shrink-0">:</span>
        <select
          className={inputCls}
          value={values.gstType || 'Regular'}
          onChange={(e) => onChange('gstType', e.target.value)}
        >
          {GST_REGISTRATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {showGstin && (
        <div className="flex items-start gap-2">
          <span className="w-32 text-sm text-black shrink-0 pt-0.5">GSTIN/UIN</span>
          <span className="text-sm text-black shrink-0 pt-0.5">:</span>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              className={`${inputCls} w-full uppercase`}
              value={values.gstin}
              onChange={(e) => onChange('gstin', e.target.value.toUpperCase())}
              maxLength={15}
              placeholder="Optional"
            />
            {values.gstin !== '' && !GSTIN_RE.test(values.gstin) && (
              <div className="text-[11px] font-bold text-black mt-0.5">
                Warning: does not look like a valid GSTIN (e.g. 22AAAAA0000A1Z5)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Generic column key -> actual PartyDetails field, per side.
const BUYER_MAP: Record<ColKey, keyof PartyDetails> = {
  name: 'supplier_name',
  mailingName: 'mailing_name',
  address: 'address',
  state: 'state',
  country: 'country',
  gstType: 'gst_registration_type',
  gstin: 'gstin',
  addressType: 'address_type',
};
const CONSIGNEE_MAP: Record<ColKey, keyof PartyDetails> = {
  name: 'consignee_name',
  mailingName: 'consignee_mailing_name',
  address: 'consignee_address',
  state: 'consignee_state',
  country: 'consignee_country',
  gstType: 'consignee_gst_registration_type',
  gstin: 'consignee_gstin',
  addressType: 'address_type',
};

export default function PartyDetailsPopup({
  partyLedger,
  allLedgers,
  initialDetails,
  onClose,
  onSave,
  onCreateLedger,
  buyerLabel = 'Supplier (Bill from)',
  natureOfReturnLabel,
}: Props) {
  // Buyer-side defaults, reused as the Consignee fallback so a fresh voucher's
  // Ship-to mirrors the Bill-to (matches TallyPrime, where consignee defaults to buyer).
  const dName = initialDetails?.supplier_name ?? partyLedger?.name ?? '';
  const dMailing =
    initialDetails?.mailing_name ?? partyLedger?.mailing_name ?? partyLedger?.name ?? '';
  const dAddress = initialDetails?.address ?? ledgerAddress(partyLedger);
  const dState = initialDetails?.state ?? partyLedger?.state ?? '';
  const dCountry = initialDetails?.country ?? partyLedger?.country ?? 'India';
  const dGstType =
    initialDetails?.gst_registration_type ?? partyLedger?.gst_registration_type ?? 'Regular';
  const dGstin = initialDetails?.gstin ?? partyLedger?.gstin ?? '';

  const [form, setForm] = useState<PartyDetails>({
    supplier_name: dName,
    mailing_name: dMailing,
    address: dAddress,
    address_type: initialDetails?.address_type ?? 'Primary',
    state: dState,
    country: dCountry,
    gst_registration_type: dGstType,
    gstin: dGstin,
    nature_of_return: initialDetails?.nature_of_return ?? '',
    place_of_supply: initialDetails?.place_of_supply ?? partyLedger?.state ?? '',
    consignee_name: initialDetails?.consignee_name ?? dName,
    consignee_mailing_name: initialDetails?.consignee_mailing_name ?? dMailing,
    consignee_address: initialDetails?.consignee_address ?? dAddress,
    consignee_state: initialDetails?.consignee_state ?? dState,
    consignee_country: initialDetails?.consignee_country ?? dCountry,
    consignee_gst_registration_type: initialDetails?.consignee_gst_registration_type ?? dGstType,
    consignee_gstin: initialDetails?.consignee_gstin ?? dGstin,
  });

  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  // Which side the ledger picker fills when a row is chosen.
  const [pickerTarget, setPickerTarget] = useState<'buyer' | 'consignee'>('buyer');

  const set = (field: keyof PartyDetails, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // keep Place of Supply synced to the Buyer's State unless the user diverged it
      if (field === 'state' && (!prev.place_of_supply || prev.place_of_supply === prev.state)) {
        next.place_of_supply = value;
      }
      return next;
    });
  };

  const handleSave = () => onSave(form);

  // Autofill one side from a ledger master row.
  const fillFromLedger = (item: any, target: 'buyer' | 'consignee') =>
    setForm((prev) => {
      const map = target === 'consignee' ? CONSIGNEE_MAP : BUYER_MAP;
      const next: PartyDetails = {
        ...prev,
        [map.name]: item.name,
        [map.mailingName]: item.mailing_name || item.name,
        [map.address]: ledgerAddress(item),
        [map.state]: item.state || '',
        [map.country]: item.country || 'India',
        [map.gstin]: item.gstin || '',
        [map.gstType]: item.gst_registration_type || 'Regular',
      };
      // Buyer state always re-derives Place of Supply on a fresh party selection.
      if (target === 'buyer') next.place_of_supply = item.state || '';
      return next;
    });

  const handleLedgerSelect = useCallback(
    (item: any) => {
      fillFromLedger(item, pickerTarget);
      setShowLedgerPanel(false);
      setLedgerSearchTerm('');
    },
    [pickerTarget],
  );

  // Alt+L — "Fetch Details Using GSTIN/UIN". Autofills the Buyer side from the
  // party ledger master (matched by the typed GSTIN if present, else the selected
  // party). This is the offline equivalent of Tally's GST-portal fetch.
  const fetchDetails = useCallback(() => {
    const typed = (form.gstin ?? '').trim().toUpperCase();
    const byGstin = typed ? allLedgers.find((l) => (l.gstin || '').toUpperCase() === typed) : null;
    const src = byGstin || partyLedger;
    if (src) fillFromLedger(src, 'buyer');
  }, [form.gstin, allLedgers, partyLedger]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        if (!showLedgerPanel) fetchDetails();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fetchDetails, showLedgerPanel]);

  const openPicker = (target: 'buyer' | 'consignee') => {
    setPickerTarget(target);
    setShowLedgerPanel(true);
    setLedgerSearchTerm('');
  };

  // While the ledger picker is open, Esc / Cancel should close the picker,
  // not the whole popup (preserves the previous guarded-Escape behavior).
  const handleClose = () => {
    if (showLedgerPanel) {
      setShowLedgerPanel(false);
      setLedgerSearchTerm('');
    } else {
      onClose();
    }
  };

  const handleAccept = () => {
    if (!showLedgerPanel) handleSave();
  };

  return (
    <>
      <VoucherPopupShell
        title="Party Details"
        headerRight={partyLedger?.name}
        onClose={handleClose}
        onAccept={handleAccept}
      >
        <div className="max-w-[900px] space-y-3">
          {natureOfReturnLabel && (
            <div className="flex items-center gap-2 pb-3 border-b border-gray-300">
              <span className="w-44 text-sm text-black shrink-0">{natureOfReturnLabel}</span>
              <span className="text-sm text-black shrink-0">:</span>
              <select
                className={inputCls}
                // Empty stored value displays as "Not Applicable"; a stored
                // out-of-list value is shown as-is until the user changes it.
                value={
                  (form.nature_of_return ?? '') === '' ? 'Not Applicable' : form.nature_of_return
                }
                onChange={(e) => set('nature_of_return', e.target.value)}
                autoFocus
              >
                {(form.nature_of_return ?? '') !== '' &&
                  !NATURE_OF_RETURN_OPTIONS.includes(form.nature_of_return!) && (
                    <option value={form.nature_of_return}>{form.nature_of_return}</option>
                  )}
                {NATURE_OF_RETURN_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-8">
            <PartyColumn
              title={buyerLabel}
              autoFocusName={!natureOfReturnLabel}
              showAddressType
              onNameFocus={() => openPicker('buyer')}
              values={{
                name: form.supplier_name ?? '',
                mailingName: form.mailing_name ?? '',
                address: form.address ?? '',
                state: form.state ?? '',
                country: form.country ?? '',
                gstType: form.gst_registration_type ?? 'Regular',
                gstin: form.gstin ?? '',
                addressType: form.address_type ?? 'Primary',
              }}
              onChange={(k, v) => set(BUYER_MAP[k], v)}
            />
            <PartyColumn
              title="Consignee (Ship to)"
              onNameFocus={() => openPicker('consignee')}
              values={{
                name: form.consignee_name ?? '',
                mailingName: form.consignee_mailing_name ?? '',
                address: form.consignee_address ?? '',
                state: form.consignee_state ?? '',
                country: form.consignee_country ?? '',
                gstType: form.consignee_gst_registration_type ?? 'Regular',
                gstin: form.consignee_gstin ?? '',
                addressType: 'Primary',
              }}
              onChange={(k, v) => set(CONSIGNEE_MAP[k], v)}
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-300">
            <span className="w-44 text-sm text-black shrink-0">Place of Supply</span>
            <span className="text-sm text-black shrink-0">:</span>
            <select
              className="w-64 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
              value={form.place_of_supply ?? ''}
              onChange={(e) => set('place_of_supply', e.target.value)}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1 text-[11px] italic text-gray-500">
            Press Alt+L to fetch details using GSTIN/UIN
          </div>
        </div>
      </VoucherPopupShell>

      {showLedgerPanel && (
        <div className="fixed inset-y-0 right-0 z-[60] shadow-2xl">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={ledgerSearchTerm}
            onSearchChange={setLedgerSearchTerm}
            onSelect={handleLedgerSelect}
            onClose={() => {
              setShowLedgerPanel(false);
              setLedgerSearchTerm('');
            }}
            onCreateNew={onCreateLedger}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}
    </>
  );
}
