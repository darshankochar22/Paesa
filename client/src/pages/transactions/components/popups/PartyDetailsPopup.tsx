import { useState, useCallback, useEffect, useRef } from 'react';
import { INDIAN_STATES } from '../../../../constants/states';
import LedgerListPanel from '../LedgerListPanel';
import { TallyFieldPopup } from '@/components/tally-ui/TallyFieldPopup';
import { useCompany } from '@/context/CompanyContext';

export interface PartyDetails {
  supplier_name?: string;
  mailing_name?: string;
  address?: string;
  address_type?: string;
  pincode?: string;
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
  consignee_pincode?: string;
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

const ADDRESS_TYPES = ['Primary', 'Other'];

// Option-list items for the right-side pickers. Built once at module scope so the
// panel keeps a stable `items` identity across renders (its highlight depends on it).
const toItems = (names: string[]) => names.map((name) => ({ name }));
const ADDRESS_TYPE_ITEMS = toItems(ADDRESS_TYPES);
const STATE_ITEMS = toItems(INDIAN_STATES);
const GST_TYPE_ITEMS = toItems(GST_REGISTRATION_TYPES);

// 2 digits + 5 letters + 4 digits + letter + alnum + 'Z' + alnum (15 chars).
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

// Tally sub-form field: borderless resting state, active field gets a gray fill
// (theme substitute for Tally's yellow) + underline. Compact row height.
const inputCls =
  'flex-1 min-w-0 text-[13px] bg-transparent border-b border-gray-300 px-1 py-0 outline-none focus:bg-gray-200 focus:border-black';

// List-backed field: same chrome as a typed field, but the value only ever comes
// from the right-side picker that opens on focus.
const pickerCls = `${inputCls} cursor-pointer caret-transparent`;

const ledgerAddress = (l: any) =>
  [l?.address1, l?.address2, l?.city, l?.pincode].filter(Boolean).join('\n');

// One party side (Buyer/Supplier or Consignee). Rendered twice so both columns
// stay identical — extend here, never duplicate the markup per side.
type ColKey =
  | 'name'
  | 'mailingName'
  | 'address'
  | 'pincode'
  | 'state'
  | 'country'
  | 'gstType'
  | 'gstin'
  | 'addressType';
type PickSide = 'buyer' | 'consignee';
/** Fields backed by a right-side list panel. */
type PickField = 'name' | 'addressType' | 'state' | 'gstType' | 'placeOfSupply';
interface ColValues {
  name: string;
  mailingName: string;
  address: string;
  pincode: string;
  state: string;
  country: string;
  gstType: string;
  gstin: string;
  addressType: string;
}
function PartyColumn({
  side,
  title,
  values,
  onChange,
  onPick,
  autoFocusName,
  showAddressType,
}: {
  side: 'buyer' | 'consignee';
  title: string;
  values: ColValues;
  onChange: (key: ColKey, value: string) => void;
  /** Focusing a list-backed field opens its right-side picker. */
  onPick: (key: PickField) => void;
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
          data-pd-field={`${side}.name`}
          className={inputCls}
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          onFocus={() => onPick('name')}
          autoFocus={autoFocusName}
        />
      </div>

      {showAddressType && (
        <div className="flex items-center gap-2">
          <span className="w-32 text-sm text-black shrink-0">Address Type</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            readOnly
            data-pd-field={`${side}.addressType`}
            className={pickerCls}
            value={values.addressType || 'Primary'}
            onFocus={() => onPick('addressType')}
          />
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
        <input
          type="text"
          readOnly
          data-pd-field={`${side}.state`}
          className={pickerCls}
          value={values.state}
          onFocus={() => onPick('state')}
        />
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

      <div className="flex items-center gap-2">
        <span className="w-32 text-sm text-black shrink-0">Pincode</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          inputMode="numeric"
          className={inputCls}
          value={values.pincode}
          // digits only, max 6 — a full PIN triggers the state/country lookup
          onChange={(e) => onChange('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
          maxLength={6}
          placeholder="Optional"
        />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-300">
        <span className="w-32 text-sm text-black shrink-0">GST Reg. type</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          readOnly
          data-pd-field={`${side}.gstType`}
          className={pickerCls}
          value={values.gstType || 'Regular'}
          onFocus={() => onPick('gstType')}
        />
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
  pincode: 'pincode',
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
  pincode: 'consignee_pincode',
  state: 'consignee_state',
  country: 'consignee_country',
  gstType: 'consignee_gst_registration_type',
  gstin: 'consignee_gstin',
  addressType: 'address_type',
};

// Tally's "New Party" quick-create: a name-only box that returns the typed name
// to the Party Details form (no full Ledger Creation screen). Enter on the single
// field accepts (TallyFieldPopup's last-field rule); Esc cancels.
function NewPartyPopup({
  onCancel,
  onAccept,
}: {
  onCancel: () => void;
  onAccept: (name: string) => void;
}) {
  const [name, setName] = useState('');
  const accept = () => {
    const n = name.trim();
    if (n) onAccept(n);
  };
  return (
    <TallyFieldPopup title="New Party" width={320} onClose={onCancel} onAccept={accept}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-black shrink-0">Name</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          type="text"
          autoFocus
          className={`${inputCls} w-full`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </TallyFieldPopup>
  );
}

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
  // Company's own state/country — Tally treats a party with no mailing state as
  // local to the company, so we fall back to these when the ledger has none
  // (seeded/quick-created parties often store no address). "Not Applicable" or
  // a non-Indian-state value is treated as "no usable state".
  const { selectedCompany } = useCompany();
  const companyState =
    selectedCompany?.state && INDIAN_STATES.includes(selectedCompany.state)
      ? selectedCompany.state
      : '';
  const companyCountry = selectedCompany?.country || 'India';

  // Buyer-side defaults, reused as the Consignee fallback so a fresh voucher's
  // Ship-to mirrors the Bill-to (matches TallyPrime, where consignee defaults to buyer).
  const dName = initialDetails?.supplier_name ?? partyLedger?.name ?? '';
  const dMailing =
    initialDetails?.mailing_name ?? partyLedger?.mailing_name ?? partyLedger?.name ?? '';
  const dAddress = initialDetails?.address ?? ledgerAddress(partyLedger);
  const dPincode = initialDetails?.pincode ?? partyLedger?.pincode ?? '';
  // State/Country fall back to the company's when the party ledger has none, so
  // the field is populated (blank State breaks GST place-of-supply).
  const dState = initialDetails?.state ?? partyLedger?.state ?? companyState ?? '';
  const dCountry = initialDetails?.country ?? partyLedger?.country ?? companyCountry;
  // The ledger master column is `registration_type` (default 'Unregistered'),
  // NOT `gst_registration_type` — read the real column so the party's actual GST
  // registration shows instead of silently defaulting to Regular.
  const dGstType =
    initialDetails?.gst_registration_type ??
    partyLedger?.registration_type ??
    partyLedger?.gst_registration_type ??
    'Regular';
  const dGstin = initialDetails?.gstin ?? partyLedger?.gstin ?? '';

  const [form, setForm] = useState<PartyDetails>({
    supplier_name: dName,
    mailing_name: dMailing,
    address: dAddress,
    address_type: initialDetails?.address_type ?? 'Primary',
    pincode: dPincode,
    state: dState,
    country: dCountry,
    gst_registration_type: dGstType,
    gstin: dGstin,
    nature_of_return: initialDetails?.nature_of_return ?? '',
    place_of_supply: initialDetails?.place_of_supply ?? partyLedger?.place_of_supply ?? dState,
    consignee_name: initialDetails?.consignee_name ?? dName,
    consignee_mailing_name: initialDetails?.consignee_mailing_name ?? dMailing,
    consignee_address: initialDetails?.consignee_address ?? dAddress,
    consignee_pincode: initialDetails?.consignee_pincode ?? dPincode,
    consignee_state: initialDetails?.consignee_state ?? dState,
    consignee_country: initialDetails?.consignee_country ?? dCountry,
    consignee_gst_registration_type: initialDetails?.consignee_gst_registration_type ?? dGstType,
    consignee_gstin: initialDetails?.consignee_gstin ?? dGstin,
  });

  // Every list-backed field (party, address type, state, GST reg. type, place of
  // supply) opens the same right-side panel; this says which one is open.
  const [picker, setPicker] = useState<{ side: PickSide; field: PickField } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Which side's "New Party" quick-create box is open (null = none). While open,
  // the ledger picker is closed and the parent popup's keys are suspended so the
  // small box owns Enter/Ctrl+A/Esc.
  const [newParty, setNewParty] = useState<PickSide | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // Set while we programmatically restore focus to a field whose list must stay shut.
  const quietFocusRef = useRef(false);

  // Move keyboard focus to the field right after the one that owns the picker, so
  // closing the panel hands control back into the form and Enter keeps advancing
  // (mouse never required). We focus the *next* field, not the field itself —
  // refocusing it would re-open its picker (onFocus) and loop.
  const focusAfterField = (side: PickSide, field: PickField) => {
    const root = contentRef.current;
    if (!root) return;
    const fields = Array.from(root.querySelectorAll<HTMLElement>('input, select, textarea')).filter(
      (el) => !(el as HTMLInputElement).disabled && el.offsetParent !== null,
    );
    const el = root.querySelector<HTMLElement>(`[data-pd-field="${side}.${field}"]`);
    const idx = el ? fields.indexOf(el) : -1;
    const next = idx >= 0 ? fields[idx + 1] : undefined;
    if (next) {
      next.focus();
      if (next.tagName === 'INPUT' && !(next as HTMLInputElement).readOnly)
        (next as HTMLInputElement).select();
      return;
    }
    // Last field in the form (Place of Supply): nothing to advance to, so put
    // focus back on it — quietly, or its own onFocus would re-open the list we
    // just closed. Enter there accepts the form (TallyFieldPopup's last-field rule).
    if (el) {
      quietFocusRef.current = true;
      el.focus();
      setTimeout(() => {
        quietFocusRef.current = false;
      }, 0);
    }
  };

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

  // Fetch State/Country from the backend PIN resolver and fill the matching
  // side. Best-effort: a malformed/unknown PIN or an offline call is a no-op,
  // and we never overwrite a State the user already picked for another PIN.
  const applyPincode = useCallback(async (side: 'buyer' | 'consignee', pin: string) => {
    if (pin.length !== 6) return;
    try {
      const res = await window.api.pincode.lookup(pin);
      if (!res?.matched || !res.state) return;
      setForm((prev) => {
        const map = side === 'consignee' ? CONSIGNEE_MAP : BUYER_MAP;
        const next: PartyDetails = { ...prev };
        next[map.state] = res.state;
        if (res.country) next[map.country] = res.country;
        // Keep Place of Supply synced to the Buyer's State unless diverged.
        if (side === 'buyer' && (!prev.place_of_supply || prev.place_of_supply === prev.state)) {
          next.place_of_supply = res.state;
        }
        return next;
      });
    } catch {
      /* offline / handler missing — leave the fields for manual entry */
    }
  }, []);

  // Per-side field change: normal set, plus a PIN lookup once 6 digits are in.
  const handleColChange = (side: 'buyer' | 'consignee', k: ColKey, v: string) => {
    set(side === 'consignee' ? CONSIGNEE_MAP[k] : BUYER_MAP[k], v);
    if (k === 'pincode') applyPincode(side, v);
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
        [map.pincode]: item.pincode || '',
        // Fall back to the company's state/country when the picked ledger stores
        // none, so the field stays populated (mirrors the initial defaults).
        [map.state]: item.state || companyState || '',
        [map.country]: item.country || companyCountry,
        [map.gstin]: item.gstin || '',
        // Ledger master exposes `registration_type`; fall back to the legacy
        // key just in case a caller passes an already-mapped object.
        [map.gstType]: item.registration_type || item.gst_registration_type || 'Regular',
      };
      // Buyer state always re-derives Place of Supply on a fresh party selection.
      if (target === 'buyer') next.place_of_supply = item.state || companyState || '';
      return next;
    });

  // Apply the row chosen in whichever picker is open, then hand focus back into
  // the form so Enter continues to the next field.
  const handlePickSelect = (item: any) => {
    if (!picker) return;
    const { side, field } = picker;
    if (field === 'name') fillFromLedger(item, side);
    else if (field === 'placeOfSupply') set('place_of_supply', item.name);
    else set(side === 'consignee' ? CONSIGNEE_MAP[field] : BUYER_MAP[field], item.name);
    closePicker();
  };

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
        if (!picker) fetchDetails();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fetchDetails, picker]);

  const openPicker = (side: PickSide, field: PickField) => {
    if (quietFocusRef.current) return;
    setSearchTerm('');
    setPicker({ side, field });
  };

  // Close the picker and return focus to the form (Enter keeps flowing).
  const closePicker = () => {
    const prev = picker;
    setPicker(null);
    setSearchTerm('');
    if (prev) setTimeout(() => focusAfterField(prev.side, prev.field), 0);
  };

  // "New Party": close the ledger picker, remember the side, open the name box.
  const openNewParty = (side: PickSide) => {
    setPicker(null);
    setSearchTerm('');
    setNewParty(side);
  };
  // Typed name → fill that side's Name + Mailing Name, then hand focus back to
  // the form so Enter keeps advancing.
  const acceptNewParty = (name: string) => {
    const side = newParty;
    if (!side) return;
    const map = side === 'consignee' ? CONSIGNEE_MAP : BUYER_MAP;
    setForm((prev) => ({ ...prev, [map.name]: name, [map.mailingName]: name }));
    setNewParty(null);
    setTimeout(() => focusAfterField(side, 'name'), 0);
  };
  const cancelNewParty = () => {
    const side = newParty;
    setNewParty(null);
    if (side) setTimeout(() => focusAfterField(side, 'name'), 0);
  };

  // While a picker is open, Esc / Cancel should close the picker, not the whole
  // popup (preserves the previous guarded-Escape behavior).
  const handleClose = () => {
    if (picker) closePicker();
    else onClose();
  };

  // Ctrl+A accepts from anywhere (Tally), including with a list open — a field's
  // list is up almost all the time here, so gating on it would make Ctrl+A look
  // dead. The open list is simply abandoned: only picked values are saved.
  const handleAccept = () => {
    setPicker(null);
    handleSave();
  };

  // What the open picker shows: its title, rows, and the value to land on.
  const pickerConfig: {
    title: string;
    items: any[];
    highlight: string;
    onCreateNew?: () => void;
    createLabel?: string;
    onNewParty?: () => void;
  } | null = (() => {
    if (!picker) return null;
    const { side, field } = picker;
    const cur = (k: PickField) =>
      k === 'placeOfSupply'
        ? (form.place_of_supply ?? '')
        : ((form[side === 'consignee' ? CONSIGNEE_MAP[k] : BUYER_MAP[k]] as string) ?? '');
    switch (field) {
      case 'name':
        return {
          title: 'List of Ledger Accounts',
          items: allLedgers,
          highlight: cur('name'),
          onCreateNew: onCreateLedger,
          createLabel: 'Create',
          onNewParty: () => openNewParty(side),
        };
      case 'addressType':
        return {
          title: 'List of Address Types',
          items: ADDRESS_TYPE_ITEMS,
          highlight: cur('addressType') || 'Primary',
        };
      case 'gstType':
        return {
          title: 'List of Registration Types',
          items: GST_TYPE_ITEMS,
          highlight: cur('gstType') || 'Regular',
        };
      default:
        return { title: 'List of States', items: STATE_ITEMS, highlight: cur(field) };
    }
  })();

  return (
    <>
      <TallyFieldPopup
        title="Party Details"
        onClose={handleClose}
        onAccept={handleAccept}
        width={840}
        disabled={newParty !== null}
      >
        <div ref={contentRef} className="space-y-2">
          {natureOfReturnLabel && (
            <div className="flex items-center gap-2 pb-2 border-b border-gray-300">
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

          <div className="flex gap-6">
            <PartyColumn
              side="buyer"
              title={buyerLabel}
              autoFocusName={!natureOfReturnLabel}
              showAddressType
              onPick={(k) => openPicker('buyer', k)}
              values={{
                name: form.supplier_name ?? '',
                mailingName: form.mailing_name ?? '',
                address: form.address ?? '',
                pincode: form.pincode ?? '',
                state: form.state ?? '',
                country: form.country ?? '',
                gstType: form.gst_registration_type ?? 'Regular',
                gstin: form.gstin ?? '',
                addressType: form.address_type ?? 'Primary',
              }}
              onChange={(k, v) => handleColChange('buyer', k, v)}
            />
            <PartyColumn
              side="consignee"
              title="Consignee (Ship to)"
              onPick={(k) => openPicker('consignee', k)}
              values={{
                name: form.consignee_name ?? '',
                mailingName: form.consignee_mailing_name ?? '',
                address: form.consignee_address ?? '',
                pincode: form.consignee_pincode ?? '',
                state: form.consignee_state ?? '',
                country: form.consignee_country ?? '',
                gstType: form.consignee_gst_registration_type ?? 'Regular',
                gstin: form.consignee_gstin ?? '',
                addressType: 'Primary',
              }}
              onChange={(k, v) => handleColChange('consignee', k, v)}
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-300">
            <span className="w-44 text-sm text-black shrink-0">Place of Supply</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              readOnly
              data-pd-field="buyer.placeOfSupply"
              className="w-64 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black cursor-pointer caret-transparent"
              value={form.place_of_supply ?? ''}
              onFocus={() => openPicker('buyer', 'placeOfSupply')}
            />
          </div>

          <div className="pt-1 text-[11px] italic text-gray-500">
            Press Alt+L to fetch details using GSTIN/UIN
          </div>
        </div>
      </TallyFieldPopup>

      {pickerConfig && (
        <div className="fixed inset-y-0 right-0 z-[60] shadow-2xl">
          <LedgerListPanel
            title={pickerConfig.title}
            items={pickerConfig.items}
            initialHighlight={pickerConfig.highlight}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelect={handlePickSelect}
            onClose={closePicker}
            onCreateNew={pickerConfig.onCreateNew}
            createLabel={pickerConfig.createLabel}
            onNewParty={pickerConfig.onNewParty}
            height="h-screen"
          />
        </div>
      )}

      {newParty && <NewPartyPopup onCancel={cancelNewParty} onAccept={acceptNewParty} />}
    </>
  );
}
